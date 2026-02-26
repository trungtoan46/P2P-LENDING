import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import blockchainApi from '../api/blockchainApi';

// Remove /api and parse correctly for socket.io which understands http/https domains
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3000';
/**
 * Custom hook for blockchain data with Socket.io real-time updates
 * - Initial load via REST API
 * - Updates via WebSocket push (no polling)
 * - Auto-reconnect on disconnect
 */
export function useBlockchain() {
    const [chainInfo, setChainInfo] = useState(null);
    const [latestBlocks, setLatestBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const socketRef = useRef(null);

    // Fetch initial data via REST (fallback)
    const fetchInitialData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const info = await blockchainApi.getChainInfo();
            const chainData = info.data || info;
            setChainInfo(chainData);

            if (chainData?.height > 0) {
                const fromBlock = chainData.height - 1;
                const response = await blockchainApi.getBlocks(fromBlock, 10);
                setLatestBlocks(response.data || response);
            }
        } catch (err) {
            console.error('[useBlockchain] REST fetch error:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // 1. Load initial data via REST
        fetchInitialData();

        // 2. Connect Socket.io for real-time updates
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 10,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[useBlockchain] Socket connected');
            setConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('[useBlockchain] Socket disconnected');
            setConnected(false);
        });

        // Listen for blockchain updates from server
        socket.on('blockchain:update', (data) => {
            console.log('[useBlockchain] Received update, height:', data.chainInfo?.height);

            if (data.chainInfo) {
                setChainInfo(data.chainInfo);
            }
            if (data.latestBlocks && data.latestBlocks.length > 0) {
                setLatestBlocks(data.latestBlocks);
            }
            setLoading(false);
        });

        socket.on('connect_error', (err) => {
            console.warn('[useBlockchain] Socket error:', err.message);
        });

        // Cleanup
        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [fetchInitialData]);

    return {
        chainInfo,
        latestBlocks,
        loading,
        connected,
        error,
        refresh: fetchInitialData,
    };
}
