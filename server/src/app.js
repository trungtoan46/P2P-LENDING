const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const errorHandler = require('./middlewares/error.middleware');
const { authenticate } = require('./middlewares/auth.middleware');
const { errorResponse } = require('./utils/response');
const { apiLimiter, authLimiter, otpLimiter, sanitizeInput } = require('./middlewares/security.middleware');
const logger = require('./utils/logger');

function createApp() {
    const app = express();

    // Security Headers
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // CORS Configuration
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000', 'http://localhost:3001',
            'http://localhost:5173', 'http://localhost:8080',
            'http://localhost'];

    app.use(cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, curl, etc.)
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1) {
                return callback(null, true);
            }
            // Allow any localhost/127.0.0.1 in development
            if (process.env.NODE_ENV === 'development' &&
                (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
                return callback(null, true);
            }
            console.log('Blocked CORS origin:', origin);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true
    }));

    // Body Parser
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

    // XSS Sanitization
    app.use(sanitizeInput);

    // Rate Limiting
    app.use('/api/', apiLimiter);
    app.use('/api/auth', authLimiter);

    // Serve static files
    const path = require('path');
    app.use('/uploads', authenticate, express.static(path.join(__dirname, '../uploads')));

    // Request logging
    app.use((req, res, next) => {
        logger.info(`${req.method} ${req.path}`);
        next();
    });

    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });

    // API Routes
    const authRoutes = require('./routes/auth.routes');
    const loanRoutes = require('./routes/loan.routes');
    const userRoutes = require('./routes/user.routes');
    const investmentRoutes = require('./routes/investment.routes');
    const waitingRoomRoutes = require('./routes/waitingRoom.routes');
    const walletRoutes = require('./routes/wallet.routes');
    const paymentRoutes = require('./routes/payment.routes');
    const reminderRoutes = require('./routes/reminder.routes');
    const notificationRoutes = require('./routes/notification.routes');
    const configRoutes = require('./routes/config.routes');
    const ekycRoutes = require('./routes/ekyc.routes');
    const creditScoringRoutes = require('./routes/creditScoring.routes');
    const blockchainRoutes = require('./routes/blockchain.routes');
    const payosRoutes = require('./routes/payos.routes');
    const explorerRoutes = require('./routes/explorer.routes');
    const autoInvestRoutes = require('./routes/auto_invest.routes');

    app.use('/api/auth', authRoutes);
    app.use('/api/loans', loanRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/investments', investmentRoutes);
    app.use('/api/waiting-rooms', waitingRoomRoutes);
    app.use('/api/wallet', walletRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/reminders', reminderRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/configs', configRoutes);
    app.use('/api/ekyc', ekycRoutes);
    app.use('/api/credit-scoring', creditScoringRoutes);
    app.use('/api/blockchain', blockchainRoutes);
    app.use('/api/payos', payosRoutes);
    app.use('/api/explorer', explorerRoutes);
    app.use('/api/auto-invest', autoInvestRoutes);

    app.use((req, res) => {
        return errorResponse(res, 'Route not found', 404);
    });

    app.use(errorHandler);

    return app;
}

module.exports = createApp;
