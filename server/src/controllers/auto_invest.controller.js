/**
 * AutoInvest Controller - Quản lý cấu hình đầu tư tự động
 */

const AutoInvest = require('../models/AutoInvest');
const WaitingRoom = require('../models/WaitingRoom');
const Investment = require('../models/Investment');
const Loan = require('../models/Loan');
const walletService = require('../services/wallet.service');
const matchingService = require('../services/matching.service');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');

const MAX_CAMPAIGNS_PER_USER = 5;

class AutoInvestController {
    /**
     * Tạo hoặc cập nhật cấu hình Auto Invest
     */
    async upsertConfig(req, res, next) {
        try {
            const userId = req.user.id;
            const {
                capital,
                maxCapitalPerLoan,
                interestRange,
                periodRange,
                purpose,
                status
            } = req.body;

            if (status && !['active', 'paused', 'cancelled'].includes(status)) {
                throw new ValidationError('Trạng thái không hợp lệ');
            }

            // Validate inputs
            if (capital && capital < 1000000) {
                throw new ValidationError('Vốn đầu tư tối thiểu là 1,000,000 VND');
            }
            if (interestRange) {
                if (interestRange.min < 0 || interestRange.max < 0) throw new ValidationError('Lãi suất không được âm');
                if (interestRange.min > interestRange.max) throw new ValidationError('Lãi suất tối thiểu phải nhỏ hơn tối đa');
                if (interestRange.max > 50) throw new ValidationError('Lãi suất tối đa không quá 50%/năm');
            }
            if (periodRange) {
                if (periodRange.min < 1) throw new ValidationError('Kỳ hạn tối thiểu là 1 tháng');
                if (periodRange.min > periodRange.max) throw new ValidationError('Kỳ hạn tối thiểu phải nhỏ hơn tối đa');
                if (periodRange.max > 18) throw new ValidationError('Kỳ hạn tối đa không quá 60 tháng');
            }
            if (maxCapitalPerLoan && capital && maxCapitalPerLoan > capital) {
                throw new ValidationError('Tối đa mỗi khoản vay không được lớn hơn tổng vốn');
            }

            let autoInvest;
            if (req.body._id || req.params.id) {
                const id = req.body._id || req.params.id;
                autoInvest = await AutoInvest.findOne({ _id: id, investorId: userId });
                if (!autoInvest) throw new NotFoundError('Không tìm thấy cấu hình Auto Invest');

                // Không cho sửa config đã hủy
                if (autoInvest.status === 'cancelled') {
                    throw new ValidationError('Không thể chỉnh sửa gói đã hủy');
                }

                // Không cho giảm vốn dưới mức đã dùng
                if (capital && capital < (autoInvest.matchedCapital || 0)) {
                    throw new ValidationError(`Không thể giảm vốn dưới ${autoInvest.matchedCapital?.toLocaleString()} VND (đã dùng)`);
                }

                if (capital) {
                    autoInvest.capital = capital;
                    autoInvest.totalNodes = Math.floor(capital / 500000);
                }
                if (maxCapitalPerLoan) autoInvest.maxCapitalPerLoan = maxCapitalPerLoan;
                if (interestRange) autoInvest.interestRange = interestRange;
                if (periodRange) autoInvest.periodRange = periodRange;
                if (purpose) autoInvest.purpose = purpose;
                if (status) {
                    autoInvest.status = status;
                    if (status === 'cancelled') autoInvest.cancelledAt = new Date();
                }

                await autoInvest.save();
            } else {
                // Create New - Cho phép nhiều campaign
                if (!capital) throw new ValidationError('Vui lòng nhập số vốn đầu tư');

                // Giới hạn số campaign active/paused
                const activeCount = await AutoInvest.countDocuments({
                    investorId: userId,
                    status: { $in: ['active', 'paused'] }
                });

                if (activeCount >= MAX_CAMPAIGNS_PER_USER) {
                    throw new ValidationError(`Tối đa ${MAX_CAMPAIGNS_PER_USER} gói đầu tư tự động`);
                }

                autoInvest = await AutoInvest.create({
                    investorId: userId,
                    capital,
                    maxCapitalPerLoan: maxCapitalPerLoan || (capital / 5),
                    totalNodes: Math.floor(capital / 500000),
                    interestRange: interestRange || { min: 10, max: 20 },
                    periodRange: periodRange || { min: 1, max: 12 },
                    purpose: purpose || [],
                    status: status || 'active'
                });
            }

            // Sau khi tạo mới campaign active, scan khoản vay hiện có
            let initialMatches = 0;
            if (!req.body._id && !req.params.id && autoInvest.status === 'active') {
                try {
                    const availableLoans = await Loan.find({
                        status: 'approved',
                        $expr: { $gt: ['$totalNotes', '$investedNotes'] }
                    }).sort({ createdAt: 1 }).limit(20);

                    for (const loan of availableLoans) {
                        const result = await matchingService.performAutoMatching(loan);
                        initialMatches += (result.matched || 0);
                    }
                    logger.info(`[AutoInvest] Initial scan: ${initialMatches} notes matched for new campaign ${autoInvest._id}`);
                } catch (scanErr) {
                    logger.error(`[AutoInvest] Initial scan error: ${scanErr.message}`);
                }
            }

            return res.json({
                success: true,
                message: initialMatches > 0
                    ? `Tạo gói thành công! Đã khớp ${initialMatches} notes từ khoản vay hiện có.`
                    : 'Cập nhật cấu hình Auto Invest thành công',
                data: autoInvest
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy danh sách Auto Invest của user
     */
    async getMyConfigs(req, res, next) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;

            const query = { investorId: userId };
            if (status) query.status = status;
            else query.status = { $ne: 'cancelled' };

            const items = await AutoInvest.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await AutoInvest.countDocuments(query);

            return paginatedResponse(res, items, page, limit, total);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy chi tiết (populate loans)
     */
    async getDetail(req, res, next) {
        try {
            const { id } = req.params;
            const config = await AutoInvest.findOne({ _id: id, investorId: req.user.id })
                .populate('loans.loanId', 'loanID capital interestRate term purpose status');

            if (!config) throw new NotFoundError('Không tìm thấy gói đầu tư');

            // Load WaitingRooms chưa chuyển thành Investment (chỉ status waiting)
            const waitingRooms = await WaitingRoom.find({
                autoInvestId: id,
                status: 'waiting'
            }).populate('loanId', 'purpose capital interestRate term');

            // Load Investments liên quan
            const investments = await Investment.find({
                autoInvestId: id,
                status: { $in: ['pending', 'active', 'completed'] }
            }).populate('loanId', 'purpose capital interestRate term status');

            return res.json({
                success: true,
                data: {
                    ...config.toObject(),
                    waitingRooms,
                    investments
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Tạm dừng / Tiếp tục
     */
    async toggleStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status || !['active', 'paused'].includes(status)) {
                throw new ValidationError('Trạng thái chỉ được chuyển giữa active và paused');
            }

            const config = await AutoInvest.findOne({ _id: id, investorId: req.user.id });
            if (!config) throw new NotFoundError('Không tìm thấy gói đầu tư');

            if (config.status === 'cancelled') {
                throw new ValidationError('Không thể kích hoạt gói đã hủy. Vui lòng tạo gói mới.');
            }
            if (config.status === 'completed') {
                throw new ValidationError('Gói đã hoàn thành, không thể thay đổi trạng thái');
            }

            // Kiểm tra quota khi kích hoạt lại
            if (status === 'active' && config.matchedCapital >= config.capital) {
                throw new ValidationError('Gói đã sử dụng hết vốn. Tăng vốn trước khi kích hoạt lại.');
            }

            config.status = status;
            await config.save();

            const statusLabel = status === 'active' ? 'Đã kích hoạt' : 'Đã tạm dừng';
            return res.json({
                success: true,
                message: statusLabel,
                data: config
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Hủy campaign + rollback WaitingRoom + refund Investment pending
     */
    async cancelConfig(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const config = await AutoInvest.findOne({ _id: id, investorId: userId });
            if (!config) throw new NotFoundError('Không tìm thấy gói đầu tư');
            if (config.status === 'cancelled') {
                throw new ValidationError('Gói đầu tư đã được hủy trước đó');
            }

            let refundedAmount = 0;
            let cancelledRooms = 0;
            let cancelledInvestments = 0;
            let uncancellableCount = 0;

            // 1. Hủy tất cả WaitingRoom đang chờ
            const waitingRooms = await WaitingRoom.find({
                autoInvestId: id,
                status: 'waiting'
            });

            for (const room of waitingRooms) {
                room.status = 'cancelled';
                room.cancelledAt = new Date();
                room.cancellationReason = 'Hủy gói đầu tư tự động';
                await room.save();
                cancelledRooms++;
            }

            // 2. Xử lý Investments
            const investments = await Investment.find({
                autoInvestId: id,
                status: { $in: ['pending'] }
            });

            for (const inv of investments) {
                try {
                    // Hoàn tiền frozen
                    await walletService.releaseFrozen(userId, inv.amount);
                    inv.status = 'cancelled';
                    inv.cancelledAt = new Date();
                    await inv.save();

                    refundedAmount += inv.amount;
                    cancelledInvestments++;

                    logger.info(`[Cancel AI] Refunded ${inv.amount} for investment ${inv._id}`);
                } catch (refundErr) {
                    logger.error(`[Cancel AI] Failed to refund investment ${inv._id}: ${refundErr.message}`);
                    uncancellableCount++;
                }
            }

            // 3. Đếm investments active (không thể hủy)
            const activeInvestments = await Investment.countDocuments({
                autoInvestId: id,
                status: { $in: ['active', 'completed'] }
            });
            uncancellableCount += activeInvestments;

            // 4. Cập nhật config status
            config.status = 'cancelled';
            config.cancelledAt = new Date();
            await config.save();

            return res.json({
                success: true,
                message: 'Đã hủy gói đầu tư',
                data: {
                    refundedAmount,
                    cancelledRooms,
                    cancelledInvestments,
                    uncancellableCount,
                    config
                }
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AutoInvestController();

