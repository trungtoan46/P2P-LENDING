/**
 * @description Wallet Controller
 */

const walletService = require('../services/wallet.service');
const { successResponse } = require('../utils/response');

const Transaction = require('../models/Transaction');
const { TRANSACTION_TYPES, PAYMENT_STATUS } = require('../constants');

class WalletController {
    /**
     * Get system revenue (total fees collected)
     */
    async getSystemRevenue(req, res) {
        const result = await Transaction.aggregate([
            {
                $match: {
                    type: TRANSACTION_TYPES.FEE,
                    status: PAYMENT_STATUS.COMPLETED
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' }
                }
            }
        ]);

        const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;

        return res.json({
            data: {
                totalRevenue
            }
        });
    }

    /**
     * Get wallet info
     */
    async getBalance(req, res, next) {
        try {
            const balance = await walletService.getBalance(req.user.id);
            return successResponse(res, balance);
        } catch (error) {
            next(error);
        }
    }

    async deposit(req, res, next) {
        try {
            const { amount, description } = req.body;
            const wallet = await walletService.deposit(req.user.id, amount, description);
            return successResponse(res, wallet, 'Nạp tiền thành công');
        } catch (error) {
            next(error);
        }
    }

    async mockDeposit(req, res, next) {
        try {
            const { amount } = req.body;
            const wallet = await walletService.deposit(req.user.id, amount, 'Mock Deposit (Test)');
            return successResponse(res, wallet, 'Nạp tiền (Test) thành công');
        } catch (error) {
            next(error);
        }
    }

    async withdraw(req, res, next) {
        try {
            // Tạm thời vô hiệu hóa tính năng rút tiền theo yêu cầu
            return res.status(400).json({
                success: false,
                message: 'Tính năng rút tiền hiện tại đang bị vô hiệu hóa.'
            });
        } catch (error) {
            next(error);
        }
    }

    async getTransactions(req, res, next) {
        try {
            const { type, status, limit, skip } = req.query;
            const transactions = await walletService.getTransactions(req.user.id, {
                type,
                status,
                limit: limit ? parseInt(limit) : 50,
                skip: skip ? parseInt(skip) : 0
            });
            return successResponse(res, transactions);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Admin nạp tiền cho user bất kỳ
     * POST /api/wallet/admin-deposit
     */
    async adminDeposit(req, res, next) {
        try {
            const { userId, amount, description } = req.body;
            const wallet = await walletService.deposit(
                userId,
                amount,
                description || 'Admin nạp tiền'
            );
            return successResponse(res, wallet, 'Nạp tiền thành công');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Admin lấy tất cả giao dịch
     * GET /api/wallet/all-transactions
     */
    async getAllTransactions(req, res, next) {
        try {
            const { type, status, limit, skip, userId, keyword } = req.query;
            const Transaction = require('../models/Transaction');
            const User = require('../models/User');
            const mongoose = require('mongoose');

            const query = {};
            if (userId) query.userId = userId;
            if (type) query.type = type;
            if (status) query.status = status;

            if (keyword) {
                // Escape regex chars for safety
                const keywordRegex = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(keywordRegex, 'i');

                const orConditions = [
                    { description: regex },
                    { referenceId: regex }
                ];

                // Search users by phone, name, email
                const users = await User.find({
                    $or: [
                        { phone: regex },
                        { fullName: regex },
                        { email: regex }
                    ]
                }).select('_id');

                if (users.length > 0) {
                    orConditions.push({ userId: { $in: users.map(u => u._id) } });
                }

                // Add partial match for _id and loanId using $expr


                orConditions.push({
                    $expr: {
                        $regexMatch: {
                            input: { $toString: "$_id" },
                            regex: keywordRegex,
                            options: "i"
                        }
                    }
                });

                orConditions.push({
                    $expr: {
                        $regexMatch: {
                            input: { $toString: "$loanId" },
                            regex: keywordRegex,
                            options: "i"
                        }
                    }
                });

                if (mongoose.Types.ObjectId.isValid(keyword)) {
                    // Keep exact match if valid ID (optimization)
                    if (users.length === 0) {
                        orConditions.push({ userId: keyword });
                    }
                }

                query.$or = orConditions;
            }

            const transactions = await Transaction.find(query)
                .populate('userId', 'phone category fullName email')
                .populate('loanId', 'capital term purpose')
                .sort({ createdAt: -1 })
                .limit(limit ? parseInt(limit) : 100)
                .skip(skip ? parseInt(skip) : 0);

            return successResponse(res, transactions);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Admin lấy số dư của user bất kỳ
     * GET /api/wallet/user/:userId/balance
     */
    async getUserBalance(req, res, next) {
        try {
            const { userId } = req.params;
            const balance = await walletService.getBalance(userId);
            return successResponse(res, balance);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new WalletController();

