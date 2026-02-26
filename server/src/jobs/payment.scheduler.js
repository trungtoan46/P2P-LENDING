/**
 * Scheduler tự động cập nhật trạng thái thanh toán
 */

const paymentService = require('../services/payment.service');
const logger = require('../utils/logger');

class PaymentScheduler {
    start() {
        // Chạy mỗi ngày lúc 0h
        setInterval(async () => {
            try {
                await paymentService.updatePaymentStatuses();
                logger.info('Đã cập nhật trạng thái thanh toán');
            } catch (error) {
                logger.error('Lỗi khi cập nhật trạng thái thanh toán:', error);
            }
        }, 24 * 60 * 60 * 1000); // 24 giờ

        // Chạy ngay lần đầu
        paymentService.updatePaymentStatuses().catch(err => {
            logger.error('Lỗi khi cập nhật trạng thái thanh toán lần đầu:', err);
        });
    }
}

module.exports = new PaymentScheduler();

