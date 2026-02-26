const mongoose = require('mongoose');
const config = require('../../config');
const logger = require('../../shared/utils/logger');

class DatabaseConnection {
    constructor() {
        this.connection = null;
    }

    async connect() {
        try {
            this.connection = await mongoose.connect(config.database.uri, config.database.options);
            logger.info('MongoDB connected successfully');
            logger.info(`Database: ${this.connection.connection.name}`);
            return this.connection;
        } catch (error) {
            logger.error('MongoDB connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await mongoose.disconnect();
            logger.info('MongoDB disconnected');
        } catch (error) {
            logger.error('MongoDB disconnection error:', error);
            throw error;
        }
    }

    getConnection() {
        return this.connection;
    }

    getConnectionStatus() {
        if (!this.connection) {
            return { connected: false };
        }
        return {
            connected: mongoose.connection.readyState === 1,
            name: mongoose.connection.name,
            host: mongoose.connection.host,
            port: mongoose.connection.port
        };
    }
}

module.exports = new DatabaseConnection();
