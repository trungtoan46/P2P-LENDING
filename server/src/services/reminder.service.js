/**
 * @description Reminder Service - Xử lý nhắc hẹn thanh toán
 */

const Reminder = require('../models/Reminder');
const Payment = require('../models/Payment');
const User = require('../models/User');
const firebaseService = require('../external/firebase');
const logger = require('../utils/logger');
const { SETTLEMENT_STATUS } = require('../constants');

const { REMINDER_TYPE, REMINDER_STATUS } = Reminder;

class ReminderService {
    /**
     * Tạo nhắc hẹn cho một payment
     * Tạo 4 nhắc: trước 3 ngày, trước 1 ngày, đúng hạn, quá hạn 1 ngày
     */
    async createRemindersForPayment(paymentId) {
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw new Error('Không tìm thấy payment');
        }

        // Kiểm tra đã có reminder chưa
        const existing = await Reminder.findOne({ paymentId });
        if (existing) {
            logger.info(`Reminders already exist for payment ${paymentId}`);
            return [];
        }

        const dueDate = new Date(payment.dueDate);
        const reminders = [];

        // Nhắc trước 3 ngày
        const before3Days = new Date(dueDate);
        before3Days.setDate(before3Days.getDate() - 3);
        before3Days.setHours(9, 0, 0, 0); // 9h sáng

        if (before3Days > new Date()) {
            reminders.push({
                userId: payment.borrowerId,
                paymentId: payment._id,
                loanId: payment.loanId,
                type: REMINDER_TYPE.BEFORE_3_DAYS,
                scheduledAt: before3Days
            });
        }

        // Nhắc trước 1 ngày
        const before1Day = new Date(dueDate);
        before1Day.setDate(before1Day.getDate() - 1);
        before1Day.setHours(9, 0, 0, 0);

        if (before1Day > new Date()) {
            reminders.push({
                userId: payment.borrowerId,
                paymentId: payment._id,
                loanId: payment.loanId,
                type: REMINDER_TYPE.BEFORE_1_DAY,
                scheduledAt: before1Day
            });
        }

        // Nhắc đúng ngày đến hạn
        const dueDayReminder = new Date(dueDate);
        dueDayReminder.setHours(9, 0, 0, 0);

        if (dueDayReminder > new Date()) {
            reminders.push({
                userId: payment.borrowerId,
                paymentId: payment._id,
                loanId: payment.loanId,
                type: REMINDER_TYPE.DUE_DAY,
                scheduledAt: dueDayReminder
            });
        }

        // Nhắc quá hạn 1 ngày
        const overdue = new Date(dueDate);
        overdue.setDate(overdue.getDate() + 1);
        overdue.setHours(9, 0, 0, 0);

        reminders.push({
            userId: payment.borrowerId,
            paymentId: payment._id,
            loanId: payment.loanId,
            type: REMINDER_TYPE.OVERDUE,
            scheduledAt: overdue
        });

        if (reminders.length > 0) {
            await Reminder.insertMany(reminders);
            logger.info(`Created ${reminders.length} reminders for payment ${paymentId}`);
        }

        return reminders;
    }

    /**
     * Tạo nhắc hẹn cho tất cả payments của một loan
     */
    async createRemindersForLoan(loanId) {
        const payments = await Payment.find({ loanId });

        for (const payment of payments) {
            await this.createRemindersForPayment(payment._id);
        }

        logger.info(`Created reminders for all payments of loan ${loanId}`);
    }

    /**
     * Gửi các nhắc hẹn đến hạn
     * Chạy bởi scheduler
     */
    async sendDueReminders() {
        const now = new Date();

        // Lấy các nhắc hẹn pending và đến giờ gửi
        const dueReminders = await Reminder.find({
            status: REMINDER_STATUS.PENDING,
            scheduledAt: { $lte: now }
        }).populate('paymentId').populate('userId', 'phone fcmToken');

        let sentCount = 0;
        let failedCount = 0;

        for (const reminder of dueReminders) {
            try {
                // Kiểm tra payment đã thanh toán chưa
                if (reminder.paymentId?.status === SETTLEMENT_STATUS.SETTLED) {
                    reminder.status = REMINDER_STATUS.CANCELLED;
                    await reminder.save();
                    continue;
                }

                const user = reminder.userId;
                if (!user?.fcmToken) {
                    logger.warn(`User ${user?._id} has no FCM token`);
                    reminder.status = REMINDER_STATUS.FAILED;
                    reminder.errorMessage = 'No FCM token';
                    await reminder.save();
                    failedCount++;
                    continue;
                }

                // Xác định loại tin nhắn
                let messageType = 'before_due';
                if (reminder.type === REMINDER_TYPE.DUE_DAY) {
                    messageType = 'due_day';
                } else if (reminder.type === REMINDER_TYPE.OVERDUE) {
                    messageType = 'overdue';
                }

                // Gửi push notification
                const result = await firebaseService.sendPaymentReminder(
                    user.fcmToken,
                    reminder.paymentId,
                    messageType
                );

                if (result.success) {
                    reminder.status = REMINDER_STATUS.SENT;
                    reminder.sentAt = new Date();
                    sentCount++;
                } else {
                    reminder.status = REMINDER_STATUS.FAILED;
                    reminder.errorMessage = result.message;
                    failedCount++;
                }

                await reminder.save();
            } catch (error) {
                logger.error(`Failed to send reminder ${reminder._id}:`, error);
                reminder.status = REMINDER_STATUS.FAILED;
                reminder.errorMessage = error.message;
                await reminder.save();
                failedCount++;
            }
        }

        logger.info(`Sent ${sentCount} reminders, ${failedCount} failed`);
        return { sentCount, failedCount };
    }

    /**
     * Lấy danh sách nhắc hẹn của user
     */
    async getMyReminders(userId, status = null) {
        const query = { userId };
        if (status) {
            query.status = status;
        }

        return await Reminder.find(query)
            .populate('paymentId', 'orderNo totalAmount dueDate status')
            .populate('loanId', 'capital term purpose')
            .sort({ scheduledAt: 1 });
    }

    /**
     * Lấy nhắc hẹn sắp tới (7 ngày tới)
     */
    async getUpcomingReminders(userId) {
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        return await Reminder.find({
            userId,
            status: REMINDER_STATUS.PENDING,
            scheduledAt: { $gte: now, $lte: nextWeek }
        })
            .populate('paymentId', 'orderNo totalAmount dueDate')
            .sort({ scheduledAt: 1 });
    }

    /**
     * Hủy tất cả reminders của một payment (khi đã thanh toán)
     */
    async cancelRemindersForPayment(paymentId) {
        await Reminder.updateMany(
            {
                paymentId,
                status: REMINDER_STATUS.PENDING
            },
            {
                status: REMINDER_STATUS.CANCELLED
            }
        );
    }

    /**
     * Đánh dấu đã đọc nhắc hẹn (không xóa, chỉ đánh dấu)
     */
    async markAsRead(reminderId, userId) {
        logger.info(`[ReminderService] markAsRead called: reminderId=${reminderId}, userId=${userId}`);
        const reminder = await Reminder.findOne({ _id: reminderId, userId });
        if (!reminder) {
            logger.error(`[ReminderService] Reminder not found: ${reminderId}`);
            throw new Error('Không tìm thấy nhắc hẹn');
        }
        reminder.isRead = true;
        await reminder.save();
        logger.info(`[ReminderService] Reminder marked as read: ${reminderId}, isRead=${reminder.isRead}`);
        return reminder;
    }

    /**
     * Đánh dấu tất cả nhắc hẹn đã đọc
     */
    async markAllAsRead(userId) {
        logger.info(`[ReminderService] markAllAsRead called: userId=${userId}`);
        const result = await Reminder.updateMany(
            { userId, status: REMINDER_STATUS.PENDING, isRead: { $ne: true } },
            { isRead: true }
        );
        logger.info(`[ReminderService] Marked ${result.modifiedCount} reminders as read`);
    }
}

module.exports = new ReminderService();
