/**
 * @description Reminder Scheduler - Gửi nhắc hẹn tự động
 */

const reminderService = require('../services/reminder.service');
const logger = require('../utils/logger');

class ReminderScheduler {
    start() {
        // Chạy mỗi giờ kiểm tra và gửi nhắc hẹn
        setInterval(async () => {
            try {
                const result = await reminderService.sendDueReminders();
                if (result.sentCount > 0 || result.failedCount > 0) {
                    logger.info(`Reminder scheduler: ${result.sentCount} sent, ${result.failedCount} failed`);
                }
            } catch (error) {
                logger.error('Lỗi khi gửi nhắc hẹn:', error);
            }
        }, 60 * 60 * 1000); // 1 giờ

        // Chạy ngay lần đầu sau 10 giây (để server khởi động xong)
        setTimeout(() => {
            reminderService.sendDueReminders().catch(err => {
                logger.error('Lỗi khi gửi nhắc hẹn lần đầu:', err);
            });
        }, 10000);

        logger.info('Reminder scheduler started (runs every hour)');
    }
}

module.exports = new ReminderScheduler();
