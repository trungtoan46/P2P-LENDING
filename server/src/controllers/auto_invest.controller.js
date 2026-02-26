/**
 * AutoInvest Controller - Quản lý cấu hình đầu tư tự động
 */

const AutoInvest = require('../models/AutoInvest');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { paginatedResponse } = require('../utils/response');

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

            // Validate status
            if (status && !['active', 'paused', 'cancelled'].includes(status)) {
                throw new ValidationError('Trạng thái không hợp lệ');
            }

            // Tìm config hiện tại (Mỗi user chỉ có 1 config Auto Invest active/paused tại 1 thời điểm? 
            // Hoặc cho phép nhiều gói? 
            // Logic đơn giản: Cho phép tạo nhiều gói để diversification)

            // Tuy nhiên, để đơn giản cho UI hiện tại, ta sẽ tạo mới.
            // Nếu muốn update, phải gửi ID.

            let autoInvest;
            if (req.body._id || req.params.id) {
                const id = req.body._id || req.params.id;
                autoInvest = await AutoInvest.findOne({ _id: id, investorId: userId });
                if (!autoInvest) throw new NotFoundError('Không tìm thấy cấu hình Auto Invest');

                // Update fields
                if (capital) {
                    // Logic phức tạp: Nếu giảm capital xuống thấp hơn matchedCapital thì sao?
                    // Tạm thời cho phép update, nhưng logic matching sẽ check
                    autoInvest.capital = capital;
                    autoInvest.totalNodes = Math.floor(capital / 500000); // 500k base unit
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
                // Create New
                if (!capital) throw new ValidationError('Vui lòng nhập số vốn đầu tư');

                // Check if user already has an active or paused config
                const existingConfig = await AutoInvest.findOne({
                    investorId: userId,
                    status: { $in: ['active', 'paused'] }
                });

                if (existingConfig) {
                    // Update existing instead of creating new
                    autoInvest = existingConfig;
                    autoInvest.capital = capital;
                    autoInvest.maxCapitalPerLoan = maxCapitalPerLoan || (capital / 5);
                    autoInvest.totalNodes = Math.floor(capital / 500000);
                    autoInvest.interestRange = interestRange || { min: 10, max: 20 };
                    autoInvest.periodRange = periodRange || { min: 1, max: 12 };
                    autoInvest.purpose = purpose || [];
                    autoInvest.status = 'active'; // Re-activate
                    await autoInvest.save();
                } else {
                    autoInvest = await AutoInvest.create({
                        investorId: userId,
                        capital,
                        maxCapitalPerLoan: maxCapitalPerLoan || (capital / 5), // Default max 20% per loan
                        totalNodes: Math.floor(capital / 500000), // Hardcode Base Unit or import const
                        interestRange: interestRange || { min: 10, max: 20 },
                        periodRange: periodRange || { min: 1, max: 12 },
                        purpose: purpose || [],
                        status: 'active'
                    });
                }
            }

            return res.json({
                success: true,
                message: 'Cập nhật cấu hình Auto Invest thành công',
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
            else query.status = { $ne: 'cancelled' }; // Mặc định ẩn cancelled

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
     * Lấy chi tiết
     */
    async getDetail(req, res, next) {
        try {
            const { id } = req.params;
            const config = await AutoInvest.findOne({ _id: id, investorId: req.user.id })
                .populate('loans.loanId', 'loanID capital interestRate term purpose');

            if (!config) throw new NotFoundError('Không tìm thấy gói đầu tư');

            return res.json({
                success: true,
                data: config
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
            const { status } = req.body; // 'active' or 'paused' or 'cancelled'

            const config = await AutoInvest.findOne({ _id: id, investorId: req.user.id });
            if (!config) throw new NotFoundError('Không tìm thấy gói đầu tư');

            config.status = status;
            if (status === 'cancelled') config.cancelledAt = new Date();

            await config.save();

            return res.json({
                success: true,
                message: `Đã chuyển trạng thái sang ${status}`,
                data: config
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AutoInvestController();
