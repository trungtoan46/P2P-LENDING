/**
 * @description Notification Controller - Xử lý API thông báo
 */

const notificationService = require('../services/notification.service');
const { successResponse } = require('../utils/response');

class NotificationController {
    /**
     * Lấy danh sách thông báo của tôi
     */
    async getMyNotifications(req, res) {
        const notifications = await notificationService.getMyNotifications(req.user.id);
        return successResponse(res, notifications, 'Notifications retrieved successfully');
    }

    /**
     * Đánh dấu đã đọc
     */
    async markAsRead(req, res) {
        const { id } = req.params;
        const notification = await notificationService.markAsRead(id, req.user.id);
        return successResponse(res, notification, 'Marked as read');
    }

    /**
     * Đánh dấu đọc tất cả
     */
    async markAllAsRead(req, res) {
        await notificationService.markAllAsRead(req.user.id);
        return successResponse(res, null, 'Đã đọc tất cả');
    }
}

module.exports = new NotificationController();
