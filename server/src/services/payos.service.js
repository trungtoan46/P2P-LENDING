/**
 * Service tích hợp PayOS v2 - Cổng thanh toán
 * Simulation: 1,000 VND thực = 1,000,000 VND hệ thống
 * SDK v2: new PayOS() -> payos.paymentRequests.create()
 */

const { PayOS } = require('@payos/node');
const logger = require('../utils/logger');

const SIMULATION_RATE = 1000; // 1 VND thực = 1000 VND hệ thống

let payosInstance = null;

/**
 * Khởi tạo PayOS instance (lazy init)
 * v2: constructor đọc env tự động, hoặc truyền options
 */
function getPayOS() {
    if (!payosInstance) {
        payosInstance = new PayOS({
            clientId: process.env.PAYOS_CLIENT_ID,
            apiKey: process.env.PAYOS_API_KEY,
            checksumKey: process.env.PAYOS_CHECKSUM_KEY,
        });
    }
    return payosInstance;
}

class PayOSService {
    /**
     * Tạo link thanh toán
     * @param {number} systemAmount - Số tiền hệ thống muốn nạp (VD: 1,000,000)
     * @param {string} description - Mô tả thanh toán
     * @param {string} cancelUrl - URL khi huỷ
     * @param {string} returnUrl - URL khi thành công
     * @returns {Object} { checkoutUrl, orderCode, realAmount, systemAmount }
     */
    async createPaymentLink(systemAmount, description, cancelUrl, returnUrl) {
        const realAmount = Math.ceil(systemAmount / SIMULATION_RATE);

        if (realAmount < 2000) {
            throw new Error('Số tiền nạp tối thiểu là 2,000,000 VND hệ thống (tương đương 2,000 VND thực)');
        }

        const orderCode = Number(String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 100)).padStart(2, '0'));

        const paymentData = {
            orderCode,
            amount: realAmount,
            description: description || 'NAP TIEN',
            cancelUrl: cancelUrl || process.env.PAYOS_CANCEL_URL || 'http://localhost:19006/cancel',
            returnUrl: returnUrl || process.env.PAYOS_RETURN_URL || 'http://localhost:19006/success',
            items: [
                {
                    name: `Nap ${systemAmount.toLocaleString('vi-VN')} VND`,
                    quantity: 1,
                    price: realAmount
                }
            ]
        };

        logger.info(`[PayOS] Creating payment link: realAmount=${realAmount}, systemAmount=${systemAmount}, orderCode=${orderCode}`);

        const payos = getPayOS();
        const result = await payos.paymentRequests.create(paymentData);

        return {
            checkoutUrl: result.checkoutUrl,
            qrCode: result.qrCode,
            orderCode: result.orderCode,
            realAmount,
            systemAmount,
            paymentLinkId: result.paymentLinkId
        };
    }

    /**
     * Lấy thông tin thanh toán
     * @param {number|string} orderCode - Mã đơn hàng
     * @returns {Object} Thông tin thanh toán từ PayOS
     */
    async getPaymentInfo(orderCode) {
        const payos = getPayOS();
        const result = await payos.paymentRequests.get(orderCode);

        logger.info(`[PayOS] Payment info for ${orderCode}: status=${result.status}, amountPaid=${result.amountPaid}`);

        return result;
    }

    /**
     * Tính số tiền hệ thống từ số tiền thực
     */
    calculateSystemAmount(realAmount) {
        return realAmount * SIMULATION_RATE;
    }

    /**
     * Tính số tiền thực từ số tiền hệ thống
     */
    calculateRealAmount(systemAmount) {
        return Math.ceil(systemAmount / SIMULATION_RATE);
    }
}

module.exports = new PayOSService();
