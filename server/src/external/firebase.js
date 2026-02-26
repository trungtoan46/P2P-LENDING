/**
 * @description Firebase Push Notification Service
 */

const config = require('../config');
const logger = require('../utils/logger');

class FirebaseService {
    constructor() {
        this.admin = null;
        this.initialized = false;
        this.init();
    }

    init() {
        try {
            if (config.firebase?.projectId && config.firebase?.privateKey && config.firebase?.clientEmail) {
                const admin = require('firebase-admin');

                const privateKey = config.firebase.privateKey.replace(/\\n/g, '\n');

                this.admin = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: config.firebase.projectId,
                        privateKey: privateKey,
                        clientEmail: config.firebase.clientEmail
                    })
                });

                this.initialized = true;
                logger.info('Firebase service initialized');
            } else {
                logger.warn('Firebase credentials not configured. Push notifications will be skipped.');
            }
        } catch (error) {
            logger.error('Failed to initialize Firebase:', error);
        }
    }

    /**
     * Gửi push notification đến một device
     * @param {String} fcmToken - Firebase Cloud Messaging token của device
     * @param {String} title - Tiêu đề thông báo
     * @param {String} body - Nội dung thông báo
     * @param {Object} data - Dữ liệu bổ sung (optional)
     */
    async sendPushNotification(fcmToken, title, body, data = {}) {
        if (!this.initialized) {
            logger.warn(`Firebase not initialized. Notification: ${title} - ${body}`);
            return { success: false, message: 'Firebase not configured' };
        }

        if (!fcmToken) {
            logger.warn('No FCM token provided');
            return { success: false, message: 'No FCM token' };
        }

        try {
            const message = {
                notification: {
                    title,
                    body
                },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                token: fcmToken
            };

            const response = await this.admin.messaging().send(message);
            logger.info(`Push notification sent: ${response}`);
            return { success: true, messageId: response };
        } catch (error) {
            logger.error(`Failed to send push notification:`, error);

            // Nếu token không hợp lệ, trả về thông tin để xử lý
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                return { success: false, message: 'Invalid FCM token', invalidToken: true };
            }

            throw error;
        }
    }

    /**
     * Gửi push notification đến nhiều devices
     * @param {Array<String>} fcmTokens - Danh sách FCM tokens
     * @param {String} title - Tiêu đề
     * @param {String} body - Nội dung
     * @param {Object} data - Dữ liệu bổ sung
     */
    async sendMultiplePushNotifications(fcmTokens, title, body, data = {}) {
        if (!this.initialized) {
            logger.warn(`Firebase not initialized. Notification to ${fcmTokens.length} devices: ${title}`);
            return { success: false, message: 'Firebase not configured' };
        }

        if (!fcmTokens || fcmTokens.length === 0) {
            return { success: false, message: 'No FCM tokens provided' };
        }

        try {
            const message = {
                notification: {
                    title,
                    body
                },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                tokens: fcmTokens
            };

            const response = await this.admin.messaging().sendEachForMulticast(message);

            logger.info(`Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`);

            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
                responses: response.responses
            };
        } catch (error) {
            logger.error('Failed to send multiple push notifications:', error);
            throw error;
        }
    }

    /**
     * Gửi nhắc hẹn thanh toán
     * @param {String} fcmToken - Token của người dùng
     * @param {Object} payment - Thông tin thanh toán
     * @param {String} type - Loại nhắc: 'before_due', 'due_day', 'overdue'
     */
    async sendPaymentReminder(fcmToken, payment, type) {
        const messages = {
            before_due: {
                title: 'Nhắc nhở thanh toán',
                body: `Kỳ thanh toán ${payment.orderNo} sẽ đến hạn vào ${new Date(payment.dueDate).toLocaleDateString('vi-VN')}. Số tiền: ${payment.totalAmount.toLocaleString('vi-VN')} VND`
            },
            due_day: {
                title: 'Đến hạn thanh toán',
                body: `Hôm nay là ngày đến hạn thanh toán kỳ ${payment.orderNo}. Số tiền: ${payment.totalAmount.toLocaleString('vi-VN')} VND`
            },
            overdue: {
                title: 'Thanh toán quá hạn',
                body: `Kỳ thanh toán ${payment.orderNo} đã quá hạn. Vui lòng thanh toán ngay để tránh phí phạt.`
            }
        };

        const msg = messages[type] || messages.before_due;

        return await this.sendPushNotification(fcmToken, msg.title, msg.body, {
            type: 'payment_reminder',
            paymentId: payment._id?.toString(),
            loanId: payment.loanId?.toString()
        });
    }
}

module.exports = new FirebaseService();
