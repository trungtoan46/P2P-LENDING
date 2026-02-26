const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const config = require('./config');
const logger = require('./utils/logger');
const paymentScheduler = require('./jobs/payment.scheduler');
const reminderScheduler = require('./jobs/reminder.scheduler');
const loanScheduler = require('./jobs/loan.scheduler');
const investmentScheduler = require('./jobs/investment.scheduler');
const blockchainCache = require('./services/BlockchainCache');
console.log("MONGO URI:", process.env.MONGODB_URI);
async function startServer() {
    try {
        logger.info('Starting server...');
        logger.info(`Environment: ${config.env}`);

        // Connect to database
        await connectDB();

        // Create Express app
        const app = createApp();

        // Create HTTP server + Socket.io
        const server = http.createServer(app);
        // Parse allowed origins for Socket.io CORS
        const allowedOrigins = process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',')
            : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'];

        const io = new Server(server, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        // Socket.io connection handling
        io.on('connection', (socket) => {
            logger.info(`[Socket.io] Client connected: ${socket.id}`);

            // Send current cache data immediately
            const chainInfo = blockchainCache.getChainInfo();
            const latestBlocks = blockchainCache.getLatestBlocks(10);
            if (chainInfo) {
                socket.emit('blockchain:update', {
                    chainInfo,
                    latestBlocks,
                    timestamp: Date.now()
                });
            }

            socket.on('disconnect', () => {
                logger.info(`[Socket.io] Client disconnected: ${socket.id}`);
            });
        });

        // Make io available to controllers via app
        app.set('io', io);

        // Initialize blockchain cache with Socket.io
        if (process.env.BLOCKCHAIN_ENABLED === 'true') {
            blockchainCache.init(io).catch(err => {
                logger.error(`[BlockchainCache] Init error: ${err.message}`);
            });
        }

        // Start schedulers
        paymentScheduler.start();
        reminderScheduler.start();
        loanScheduler.start();
        investmentScheduler.start();

        // Start server
        server.listen(config.port, '0.0.0.0', () => {
            logger.info(`Server running on port ${config.port}`);
            logger.info(`Socket.io ready on port ${config.port}`);
            logger.info(`Health check: http://localhost:${config.port}/health`);
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            logger.info(`${signal} received, shutting down...`);

            await blockchainCache.destroy();

            server.close(async () => {
                logger.info('HTTP server closed');
                await disconnectDB();
                process.exit(0);
            });

            setTimeout(() => {
                logger.error('Forced shutdown');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
