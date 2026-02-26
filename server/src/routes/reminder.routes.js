/**
 * @description Reminder Routes
 */

const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminder.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Lấy danh sách nhắc hẹn của tôi
router.get('/my-reminders',
    authenticate,
    (req, res, next) => reminderController.getMyReminders(req, res, next)
);

// Lấy nhắc hẹn sắp tới (7 ngày)
router.get('/upcoming',
    authenticate,
    (req, res, next) => reminderController.getUpcomingReminders(req, res, next)
);

// Đánh dấu tất cả đã đọc (phải đặt TRƯỚC route có :id)
router.put('/mark-all-read',
    authenticate,
    (req, res, next) => reminderController.markAllAsRead(req, res, next)
);

// Đánh dấu đã đọc một nhắc hẹn
router.put('/:id/mark-read',
    authenticate,
    (req, res, next) => reminderController.markAsRead(req, res, next)
);

module.exports = router;
