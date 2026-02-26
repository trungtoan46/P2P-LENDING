/**
 * @description Notification Service - Xử lý thông báo hệ thống
 */

const Notification = require('../models/Notification');
const { NOTIFICATION_TYPE, NOTIFICATION_STATUS } = Notification;
const firebaseService = require('../external/firebase');
const logger = require('../utils/logger');
const User = require('../models/User');

class NotificationService {
    /**
     * Tạo thông báo mới và gửi push nếu có thể
     */
    async createNotification({ userId, type, title, body, data = {} }) {
        try {
            const notification = await Notification.create({
                userId,
                type,
                title,
                body,
                data
            });

            // Gửi push notification nếu user có fcmToken
            const user = await User.findById(userId).select('fcmToken');
            if (user && user.fcmToken) {
                await firebaseService.sendNotification(user.fcmToken, {
                    title,
                    body,
                    data: {
                        ...data,
                        type,
                        notificationId: notification._id.toString()
                    }
                });
                notification.isSent = true;
                await notification.save();
            }

            return notification;
        } catch (error) {
            logger.error('Error creating notification:', error);
            // Vẫn trả về null thay vì throw để không làm gián đoạn flow chính
            return null;
        }
    }

    /**
     * Lấy danh sách thông báo của user
     */
    async getMyNotifications(userId, limit = 20) {
        return await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    /**
     * Đánh dấu đã đọc
     */
    async markAsRead(notificationId, userId) {
        return await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { status: NOTIFICATION_STATUS.READ },
            { new: true }
        );
    }

    /**
     * Đánh dấu đọc tất cả
     */
    async markAllAsRead(userId) {
        return await Notification.updateMany(
            { userId, status: NOTIFICATION_STATUS.UNREAD },
            { status: NOTIFICATION_STATUS.READ }
        );
    }

    /**
     * Thông báo khoản vay được duyệt
     */
    async notifyLoanApproved(loan) {
        return this.createNotification({
            userId: loan.borrowerId,
            type: NOTIFICATION_TYPE.LOAN_APPROVED,
            title: 'Khoản vay đã được duyệt',
            body: `Chúc mừng! Khoản vay "${loan.purpose}" trị giá ${new Intl.NumberFormat('vi-VN').format(loan.capital)}đ của bạn đã được phê duyệt.`,
            data: { loanId: loan._id, amount: loan.capital, purpose: loan.purpose }
        });
    }

    /**
     * Thông báo khoản vay bị từ chối
     */
    async notifyLoanRejected(loan, reason) {
        return this.createNotification({
            userId: loan.borrowerId,
            type: NOTIFICATION_TYPE.LOAN_REJECTED,
            title: 'Khoản vay bị từ chối',
            body: `Rất tiếc, đơn vay "${loan.purpose}" của bạn đã bị từ chối. Lý do: ${reason || 'Không xác định'}`,
            data: { loanId: loan._id, purpose: loan.purpose }
        });
    }

    /**
     * Thông báo giải ngân thành công
     */
    async notifyLoanDisbursed(loan) {
        return this.createNotification({
            userId: loan.borrowerId,
            type: NOTIFICATION_TYPE.LOAN_DISBURSED,
            title: 'Giải ngân thành công',
            body: `Tiền giải ngân ${new Intl.NumberFormat('vi-VN').format(loan.capital)}đ cho khoản vay "${loan.purpose}" đã được chuyển vào ví của bạn.`,
            data: { loanId: loan._id, amount: loan.capital, purpose: loan.purpose }
        });
    }

    /**
     * Thông báo thanh toán thành công
     */
    async notifyRepaymentSuccess(payment, loanProgress = null) {
        return this.createNotification({
            userId: payment.borrowerId,
            type: NOTIFICATION_TYPE.REPAYMENT_SUCCESS,
            title: 'Thanh toán thành công',
            body: `Bạn đã thanh toán thành công ${new Intl.NumberFormat('vi-VN').format(payment.totalAmount)}đ cho kỳ thứ ${payment.orderNo}. Dư nợ đã giảm.`,
            data: {
                loanId: payment.loanId,
                paymentId: payment._id,
                amount: payment.totalAmount,
                orderNo: payment.orderNo
            }
        });
    }

    /**
     * Thông báo tạo đơn vay thành công
     */
    async notifyLoanCreated(loan) {
        return this.createNotification({
            userId: loan.borrowerId,
            type: NOTIFICATION_TYPE.LOAN_CREATED,
            title: 'Tạo đơn vay thành công',
            body: `Đơn vay "${loan.purpose}" trị giá ${new Intl.NumberFormat('vi-VN').format(loan.capital)}đ đã được tạo và đang chờ duyệt.`,
            data: { loanId: loan._id, amount: loan.capital, purpose: loan.purpose }
        });
    }

    /**
     * Thông báo khoản vay đã được đầu tư đủ
     */
    async notifyLoanFunded(loan) {
        return this.createNotification({
            userId: loan.borrowerId,
            type: NOTIFICATION_TYPE.LOAN_FUNDED,
            title: 'Khoản vay đã đủ vốn - Cần xác nhận',
            body: `Khoản vay "${loan.purpose}" đã huy động đủ 100% vốn. Vui lòng vào ứng dụng để ký hợp đồng và nhận giải ngân.`,
            data: { loanId: loan._id, amount: loan.capital, purpose: loan.purpose }
        });
    }

    /**
     * Thông báo đã ký hợp đồng
     */
    async notifyLoanSigned(loan) {
        return this.createNotification({
            userId: loan.borrowerId,
            type: NOTIFICATION_TYPE.LOAN_SIGNED, // Ensure type exists or use Generic
            title: 'Ký hợp đồng thành công',
            body: `Bạn đã ký hợp đồng vay thành công. Hồ sơ đang được chuyển sang bộ phận giải ngân.`,
            data: { loanId: loan._id, amount: loan.capital, purpose: loan.purpose }
        });
    }
}

module.exports = new NotificationService();
