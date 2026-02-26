/**
 * @description PayOS Controller - Xử lý nạp tiền qua PayOS
 * Simulation: 1k VND thực = 1M VND hệ thống
 */

const payosService = require('../services/payos.service');
const walletService = require('../services/wallet.service');
const Transaction = require('../models/Transaction');
const { successResponse } = require('../utils/response');
const { ValidationError } = require('../utils/errors');
const { TRANSACTION_TYPES, PAYMENT_STATUS } = require('../constants');
const logger = require('../utils/logger');

class PayOSController {
    /**
     * Tạo link thanh toán PayOS
     * POST /api/payos/create-link
     * Body: { amount, cancelUrl?, returnUrl? }
     *   amount = Số tiền hệ thống muốn nạp (VD: 1000000 = 1 triệu)
     */
    async createPaymentLink(req, res, next) {
        try {
            const { amount, cancelUrl, returnUrl } = req.body;

            if (!amount || amount <= 0) {
                throw new ValidationError('Số tiền phải lớn hơn 0');
            }

            if (amount < 1000000) {
                throw new ValidationError('Số tiền nạp tối thiểu là 1,000,000 VND hệ thống');
            }

            const result = await payosService.createPaymentLink(
                amount,
                'NAP TIEN',
                cancelUrl,
                returnUrl
            );

            // Lưu pending transaction để track
            await Transaction.create({
                userId: req.user.id,
                type: TRANSACTION_TYPES.DEPOSIT,
                amount: result.systemAmount,
                status: PAYMENT_STATUS.PENDING,
                description: `Nạp tiền qua PayOS - Thanh toán ${result.realAmount.toLocaleString('vi-VN')} VND thực`,
                referenceId: `PAYOS_${result.orderCode}`
            });

            return successResponse(res, {
                checkoutUrl: result.checkoutUrl,
                qrCode: result.qrCode,
                orderCode: result.orderCode,
                realAmount: result.realAmount,
                systemAmount: result.systemAmount,
                message: `Thanh toán ${result.realAmount.toLocaleString('vi-VN')} VND thực để nhận ${result.systemAmount.toLocaleString('vi-VN')} VND hệ thống`
            }, 'Tạo link thanh toán thành công');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Xác thực thanh toán (Client gọi sau khi thanh toán xong)
     * POST /api/payos/verify/:orderCode
     */
    async verifyPayment(req, res, next) {
        try {
            const { orderCode } = req.params;

            if (!orderCode) {
                throw new ValidationError('Thiếu mã đơn hàng');
            }

            const referenceId = `PAYOS_${orderCode}`;

            // Kiểm tra đã xử lý chưa (idempotency)
            const existingTx = await Transaction.findOne({
                userId: req.user.id,
                referenceId,
                type: TRANSACTION_TYPES.DEPOSIT,
                status: PAYMENT_STATUS.COMPLETED
            });

            if (existingTx) {
                return successResponse(res, {
                    status: 'ALREADY_PROCESSED',
                    systemAmount: existingTx.amount,
                    message: 'Giao dịch này đã được xử lý trước đó'
                });
            }

            // Lấy thông tin từ PayOS
            const paymentInfo = await payosService.getPaymentInfo(orderCode);

            if (paymentInfo.status === 'PAID') {
                // Tính số tiền hệ thống
                const systemAmount = payosService.calculateSystemAmount(paymentInfo.amount);

                // Nạp tiền vào ví
                await walletService.deposit(
                    req.user.id,
                    systemAmount,
                    `Nạp tiền qua PayOS (${paymentInfo.amount.toLocaleString('vi-VN')} VND thực x1000)`
                );

                // Cập nhật transaction pending -> completed
                await Transaction.findOneAndUpdate(
                    { userId: req.user.id, referenceId, type: TRANSACTION_TYPES.DEPOSIT, status: PAYMENT_STATUS.PENDING },
                    { status: PAYMENT_STATUS.COMPLETED }
                );

                logger.info(`[PayOS] Payment verified: user=${req.user.id}, orderCode=${orderCode}, realAmount=${paymentInfo.amount}, systemAmount=${systemAmount}`);

                return successResponse(res, {
                    status: 'PAID',
                    realAmountPaid: paymentInfo.amount,
                    systemAmount,
                    message: `Nạp thành công ${systemAmount.toLocaleString('vi-VN')} VND vào ví`
                }, 'Xác thực thanh toán thành công');

            } else if (paymentInfo.status === 'CANCELLED') {
                // Cập nhật transaction -> cancelled
                await Transaction.findOneAndUpdate(
                    { userId: req.user.id, referenceId, type: TRANSACTION_TYPES.DEPOSIT, status: PAYMENT_STATUS.PENDING },
                    { status: PAYMENT_STATUS.CANCELLED }
                );

                return successResponse(res, {
                    status: 'CANCELLED',
                    message: 'Thanh toán đã bị huỷ'
                });

            } else {
                // PENDING hoặc PROCESSING
                return successResponse(res, {
                    status: paymentInfo.status,
                    message: 'Thanh toán chưa hoàn tất. Vui lòng thanh toán và thử lại.'
                });
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy lịch sử nạp tiền qua PayOS
     * GET /api/payos/history
     */
    async getPayOSHistory(req, res, next) {
        try {
            const transactions = await Transaction.find({
                userId: req.user.id,
                referenceId: { $regex: /^PAYOS_/ }
            }).sort({ createdAt: -1 }).limit(20);

            return successResponse(res, transactions);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PayOSController();
