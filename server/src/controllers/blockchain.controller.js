/**
 * @description Blockchain Controller
 * Reads from BlockchainCache for performance, falls back to Fabric for cache misses
 */

const fabricService = require('../external/FabricService');
const blockchainCache = require('../services/BlockchainCache');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * GET /api/blockchain/health
 */
exports.checkHealth = async (req, res, next) => {
    try {
        const startTime = Date.now();
        const isEnabled = process.env.BLOCKCHAIN_ENABLED === 'true';

        if (!isEnabled) {
            return successResponse(res, {
                status: 'disabled',
                enabled: false,
                message: 'Blockchain is disabled in environment config',
            });
        }

        let connectionStatus = 'disconnected';
        let error = null;

        try {
            const isAvailable = await fabricService.isAvailable();
            connectionStatus = isAvailable ? 'connected' : 'error';
        } catch (err) {
            connectionStatus = 'error';
            error = err.message;
        }

        const responseTime = Date.now() - startTime;
        const cachedInfo = blockchainCache.getChainInfo();

        const healthData = {
            status: connectionStatus,
            enabled: true,
            responseTime: `${responseTime}ms`,
            cache: {
                chainInfo: cachedInfo ? 'available' : 'empty',
                blocksCount: blockchainCache.getLatestBlocks(100).length,
                eventListener: blockchainCache.isListening ? 'active' : 'inactive',
            },
            config: {
                channel: process.env.FABRIC_CHANNEL || 'mychannel',
                chaincode: process.env.FABRIC_CHAINCODE || 'p2plending',
            },
        };

        if (error) {
            healthData.error = error;
        }

        return successResponse(res, healthData);
    } catch (error) {
        logger.error(`[Blockchain] Health check error: ${error.message}`);
        return errorResponse(res, 'Failed to check blockchain health', 500);
    }
};

/**
 * GET /api/blockchain/info
 */
exports.getInfo = async (req, res, next) => {
    try {
        const info = {
            enabled: process.env.BLOCKCHAIN_ENABLED === 'true',
            channel: process.env.FABRIC_CHANNEL || 'mychannel',
            chaincode: process.env.FABRIC_CHAINCODE || 'p2plending',
            cache: {
                eventListener: blockchainCache.isListening ? 'active' : 'polling',
            },
            status: {
                gateway: fabricService.gateway ? 'connected' : 'disconnected',
                network: fabricService.network ? 'active' : 'inactive',
                contract: fabricService.contract ? 'ready' : 'not ready'
            }
        };

        return successResponse(res, info);
    } catch (error) {
        logger.error(`[Blockchain] Get info error: ${error.message}`);
        return errorResponse(res, 'Failed to get blockchain info', 500);
    }
};

/**
 * POST /api/blockchain/test
 */
exports.testConnection = async (req, res, next) => {
    try {
        const startTime = Date.now();
        await fabricService.disconnect();
        await fabricService.connect();
        const responseTime = Date.now() - startTime;

        return successResponse(res, {
            status: 'success',
            message: 'Blockchain connection test successful',
            responseTime: `${responseTime}ms`,
        });
    } catch (error) {
        logger.error(`[Blockchain] Test connection error: ${error.message}`);
        return errorResponse(res, error.message, 503);
    }
};

/**
 * GET /api/blockchain/chain-info
 * Reads from cache (instant)
 */
exports.getChainInfo = async (req, res, next) => {
    try {
        // Try cache first
        let info = blockchainCache.getChainInfo();

        // Fallback to direct Fabric query
        if (!info) {
            info = await fabricService.queryChainInfo();
        }

        return successResponse(res, info);
    } catch (error) {
        logger.error(`[Blockchain] Get chain info error: ${error.message}`);
        return errorResponse(res, 'Failed to get chain info', 500);
    }
};

/**
 * GET /api/blockchain/blocks?from=100&limit=10
 * Reads from cache
 */
exports.getBlocks = async (req, res, next) => {
    try {
        const { from, limit } = req.query;
        const limitNum = limit ? parseInt(limit) : 10;

        // If requesting latest blocks (no 'from' or from == latest), use cache
        const cachedInfo = blockchainCache.getChainInfo();
        const latestHeight = cachedInfo ? cachedInfo.height - 1 : 0;

        if (!from || parseInt(from) >= latestHeight - 20) {
            // Serve from cache
            const cachedBlocks = blockchainCache.getLatestBlocks(50);
            let result = cachedBlocks;

            if (from) {
                const fromNum = parseInt(from);
                result = cachedBlocks.filter(b => Number(b.number) <= fromNum);
            }

            return successResponse(res, result.slice(0, limitNum));
        }

        // Cache miss for older blocks - query Fabric
        const blocks = await fabricService.queryBlocks(
            from ? parseInt(from) : undefined,
            limitNum
        );
        return successResponse(res, blocks);
    } catch (error) {
        logger.error(`[Blockchain] Get blocks error: ${error.message}`);
        return errorResponse(res, 'Failed to get blocks', 500);
    }
};

/**
 * GET /api/blockchain/blocks/:blockNumber
 * Cache with Fabric fallback
 */
exports.getBlock = async (req, res, next) => {
    try {
        const { blockNumber } = req.params;
        const block = await blockchainCache.getBlockWithFallback(blockNumber);
        return successResponse(res, block);
    } catch (error) {
        logger.error(`[Blockchain] Get block error: ${error.message}`);
        return errorResponse(res, 'Failed to get block', 500);
    }
};

/**
 * GET /api/blockchain/transactions/:txId
 */
exports.getTransaction = async (req, res, next) => {
    try {
        const { txId } = req.params;
        const transaction = await fabricService.queryTransaction(txId);
        return successResponse(res, transaction);
    } catch (error) {
        logger.error(`[Blockchain] Get transaction error: ${error.message}`);
        return errorResponse(res, 'Failed to get transaction', 500);
    }
};

/**
 * GET /api/blockchain/history/:key
 */
exports.getAssetHistory = async (req, res, next) => {
    try {
        const { key } = req.params;
        const history = await fabricService.queryHistory(key);
        return successResponse(res, history);
    } catch (error) {
        logger.error(`[Blockchain] Get history error: ${error.message}`);
        return errorResponse(res, 'Failed to get asset history', 500);
    }
};
