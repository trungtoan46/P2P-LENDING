/**
 * @description Blockchain Cache Service
 * Cache blockchain data in memory + listen for Fabric block events
 * Push updates to connected clients via Socket.io
 */

const fabricService = require('../external/FabricService');
const logger = require('../utils/logger');

class BlockchainCache {
    constructor() {
        this.chainInfo = null;
        this.latestBlocks = [];  // Latest 20 blocks, sorted desc
        this.blockMap = new Map(); // blockNumber -> blockData
        this.io = null;
        this.eventListener = null;
        this.isListening = false;
        this.maxCachedBlocks = 50;
        this.refreshInterval = null;
    }

    /**
     * Initialize cache with Socket.io instance
     */
    async init(io) {
        this.io = io;
        logger.info('[BlockchainCache] Initializing...');

        // Initial data load
        try {
            await this._loadInitialData();
            logger.info(`[BlockchainCache] Loaded ${this.latestBlocks.length} blocks, height: ${this.chainInfo?.height}`);
        } catch (error) {
            logger.error(`[BlockchainCache] Initial load failed: ${error.message}`);
        }

        // Start Fabric event listener
        await this._startEventListener();

        // Fallback: refresh chain info periodically (every 30s)
        // In case event listener misses something
        this.refreshInterval = setInterval(() => this._refreshChainInfo(), 30000);

        return this;
    }

    /**
     * Load initial data from Fabric
     */
    async _loadInitialData() {
        const isAvailable = await fabricService.isAvailable();
        if (!isAvailable) {
            logger.warn('[BlockchainCache] Fabric not available, cache empty');
            return;
        }

        // Get chain info
        this.chainInfo = await fabricService.queryChainInfo();

        // Load latest 20 blocks
        if (this.chainInfo && this.chainInfo.height > 0) {
            this.latestBlocks = await fabricService.queryBlocks(
                this.chainInfo.height - 1,
                Math.min(20, this.chainInfo.height)
            );

            // Index blocks
            for (const block of this.latestBlocks) {
                this.blockMap.set(String(block.number), block);
            }
        }
    }

    /**
     * Refresh chain info only (lightweight)
     */
    async _refreshChainInfo() {
        try {
            const isAvailable = await fabricService.isAvailable();
            if (!isAvailable) return;

            const newInfo = await fabricService.queryChainInfo();
            if (!newInfo) return;

            const oldHeight = this.chainInfo?.height || 0;
            this.chainInfo = newInfo;

            // If height increased, fetch new blocks
            if (newInfo.height > oldHeight) {
                const newBlockCount = Math.min(newInfo.height - oldHeight, 10);
                for (let i = 0; i < newBlockCount; i++) {
                    const blockNum = newInfo.height - 1 - i;
                    if (!this.blockMap.has(String(blockNum))) {
                        try {
                            const block = await fabricService.queryBlock(blockNum);
                            this._addBlock(block);
                        } catch (e) {
                            // Skip
                        }
                    }
                }

                // Push update to clients
                this._emitUpdate();
            }
        } catch (error) {
            logger.error(`[BlockchainCache] Refresh failed: ${error.message}`);
        }
    }

    /**
     * Start listening for Fabric block events
     */
    async _startEventListener() {
        try {
            const isAvailable = await fabricService.isAvailable();
            if (!isAvailable) {
                logger.warn('[BlockchainCache] Fabric not available, event listener not started');
                return;
            }

            // Use Fabric SDK network to listen for block events
            if (fabricService.network) {
                const listener = async (event) => {
                    try {
                        logger.info(`[BlockchainCache] New block event: ${event.blockNumber}`);

                        // Fetch the new block data
                        const blockNumber = event.blockNumber.toString();
                        const block = await fabricService.queryBlock(blockNumber);

                        // Update cache
                        this._addBlock(block);

                        // Update chain info
                        this.chainInfo = await fabricService.queryChainInfo();

                        // Push to clients
                        this._emitUpdate();
                    } catch (error) {
                        logger.error(`[BlockchainCache] Event handler error: ${error.message}`);
                    }
                };

                await fabricService.network.addBlockListener(listener);
                this.isListening = true;
                logger.info('[BlockchainCache] Fabric block event listener started');
            }
        } catch (error) {
            logger.warn(`[BlockchainCache] Event listener failed: ${error.message}. Using polling fallback.`);
        }
    }

    /**
     * Add block to cache
     */
    _addBlock(block) {
        if (!block) return;

        const key = String(block.number);
        this.blockMap.set(key, block);

        // Update latestBlocks array (sorted desc by number)
        this.latestBlocks = this.latestBlocks.filter(b => String(b.number) !== key);
        this.latestBlocks.unshift(block);
        this.latestBlocks.sort((a, b) => Number(b.number) - Number(a.number));

        // Trim to max
        if (this.latestBlocks.length > this.maxCachedBlocks) {
            const removed = this.latestBlocks.splice(this.maxCachedBlocks);
            for (const r of removed) {
                this.blockMap.delete(String(r.number));
            }
        }
    }

    /**
     * Emit update to all connected Socket.io clients
     */
    _emitUpdate() {
        if (!this.io) return;

        this.io.emit('blockchain:update', {
            chainInfo: this.chainInfo,
            latestBlocks: this.latestBlocks.slice(0, 10),
            timestamp: Date.now()
        });

        logger.info(`[BlockchainCache] Pushed update to clients (height: ${this.chainInfo?.height})`);
    }

    // ===== PUBLIC API (used by controllers) =====

    getChainInfo() {
        return this.chainInfo;
    }

    getLatestBlocks(limit = 10) {
        return this.latestBlocks.slice(0, limit);
    }

    getBlock(blockNumber) {
        return this.blockMap.get(String(blockNumber)) || null;
    }

    /**
     * Get block, fetch from Fabric if not cached
     */
    async getBlockWithFallback(blockNumber) {
        const cached = this.getBlock(blockNumber);
        if (cached) return cached;

        // Cache miss - fetch from Fabric
        try {
            const block = await fabricService.queryBlock(blockNumber);
            this._addBlock(block);
            return block;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cleanup
     */
    async destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        logger.info('[BlockchainCache] Destroyed');
    }
}

// Singleton
module.exports = new BlockchainCache();
