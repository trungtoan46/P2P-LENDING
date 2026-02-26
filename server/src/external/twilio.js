/**
 * @description Twilio SMS Service for sending OTP
 */

const config = require('../config');
const logger = require('../utils/logger');

class TwilioService {
    constructor() {
        this.client = null;
        this.initialized = false;
        this.init();
    }

    init() {
        try {
            if (config.twilio.accountSid && config.twilio.authToken) {
                const twilio = require('twilio');
                this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
                this.initialized = true;
                logger.info('Twilio service initialized');
            } else {
                logger.warn('Twilio credentials not configured. SMS sending will be skipped.');
            }
        } catch (error) {
            logger.error('Failed to initialize Twilio:', error);
        }
    }

    /**
     * Send OTP via SMS
     * @param {String} phone - Phone number
     * @param {String} code - OTP code
     * @returns {Promise<Object>} Twilio response
     */
    async sendOTP(phone, code) {
        if (!this.initialized) {
            logger.warn(`Twilio not initialized. OTP for ${phone}: ${code}`);
            return { success: false, message: 'Twilio not configured' };
        }

        try {
            const message = `Your P2P Lending verification code is: ${code}. Valid for 5 minutes.`;

            const result = await this.client.messages.create({
                body: message,
                from: config.twilio.phoneNumber,
                to: phone
            });

            logger.info(`OTP sent to ${phone}: ${result.sid}`);
            return { success: true, sid: result.sid };
        } catch (error) {
            logger.error(`Failed to send OTP to ${phone}:`, error);
            throw error;
        }
    }

    /**
     * Send custom SMS
     * @param {String} phone - Phone number
     * @param {String} message - Message content
     * @returns {Promise<Object>} Twilio response
     */
    async sendSMS(phone, message) {
        if (!this.initialized) {
            logger.warn(`Twilio not initialized. SMS to ${phone}: ${message}`);
            return { success: false, message: 'Twilio not configured' };
        }

        try {
            const result = await this.client.messages.create({
                body: message,
                from: config.twilio.phoneNumber,
                to: phone
            });

            logger.info(`SMS sent to ${phone}: ${result.sid}`);
            return { success: true, sid: result.sid };
        } catch (error) {
            logger.error(`Failed to send SMS to ${phone}:`, error);
            throw error;
        }
    }
}

module.exports = new TwilioService();
