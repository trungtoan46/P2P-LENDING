/**
 * @description Notification Routes - Định tuyến API thông báo
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

// Lấy danh sách thông báo
router.get('/my', notificationController.getMyNotifications);

// Đánh dấu đã đọc
router.put('/:id/read', notificationController.markAsRead);

// Đánh dấu đọc tất cả
router.put('/read-all', notificationController.markAllAsRead);

module.exports = router;
