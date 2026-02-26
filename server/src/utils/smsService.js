/**
 * SMS Service - Mock mode (skip SMS, chỉ log OTP)
 * Khi có SMS provider hoạt động, thay thế file này
 */

const logger = require('./logger');

/**
 * Gửi SMS (mock - chỉ log)
 */
const sendSMS = async (phone, content) => {
    logger.info(`[MOCK SMS] To: ${phone}, Content: ${content}`);
    console.log(`\nSMS to ${phone}: ${content}\n`);
    return { success: true, mock: true };
};

/**
 * Gửi OTP (mock - chỉ log)
 */
const sendOTP = async (phone, otp) => {
    const content = `Ma xac thuc OTP: ${otp}. Hieu luc 5 phut.`;
    logger.info(`[MOCK OTP] To: ${phone}, OTP: ${otp}`);
    console.log(`\nOTP for ${phone}: ${otp}\n`);
    return { success: true, mock: true };
};

module.exports = {
    sendSMS,
    sendOTP,
};
