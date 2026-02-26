/**
 * @description Reminder Controller
 */

const reminderService = require('../services/reminder.service');
const { successResponse } = require('../utils/response');

class ReminderController {
    /**
     * Lấy danh sách nhắc hẹn của tôi
     */
    async getMyReminders(req, res, next) {
        try {
            const { status } = req.query;
            const reminders = await reminderService.getMyReminders(req.user.id, status);
            return successResponse(res, reminders);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy nhắc hẹn sắp tới (7 ngày)
     */
    async getUpcomingReminders(req, res, next) {
        try {
            const reminders = await reminderService.getUpcomingReminders(req.user.id);
            return successResponse(res, reminders);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Đánh dấu đã đọc nhắc hẹn
     */
    async markAsRead(req, res, next) {
        try {
            const { id } = req.params;
            const reminder = await reminderService.markAsRead(id, req.user.id);
            return successResponse(res, reminder, 'Đã đánh dấu đã đọc');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Đánh dấu tất cả nhắc hẹn đã đọc
     */
    async markAllAsRead(req, res, next) {
        try {
            await reminderService.markAllAsRead(req.user.id);
            return successResponse(res, null, 'Đã đọc tất cả');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ReminderController();
