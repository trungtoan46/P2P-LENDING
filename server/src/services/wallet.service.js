/**
 * Service quản lý ví tiền
 */

const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { TRANSACTION_TYPES, PAYMENT_STATUS } = require('../constants');
const { ValidationError, NotFoundError } = require('../utils/errors');

class WalletService {
    /**
     * Lấy hoặc tạo wallet
     */
    async getOrCreateWallet(userId) {
        return await Wallet.getOrCreate(userId);
    }

    /**
     * Lấy số dư
     */
    async getBalance(userId) {
        const wallet = await Wallet.getOrCreate(userId);
        return {
            balance: wallet.balance,
            frozenBalance: wallet.frozenBalance,
            availableBalance: wallet.balance - wallet.frozenBalance
        };
    }

    /**
     * Nạp tiền
     */
    async deposit(userId, amount, description = 'Nạp tiền') {
        if (amount <= 0) {
            throw new ValidationError('Số tiền phải lớn hơn 0');
        }

        const wallet = await Wallet.getOrCreate(userId);
        wallet.balance += amount;
        await wallet.save();

        await Transaction.create({
            userId,
            type: TRANSACTION_TYPES.DEPOSIT,
            amount,
            status: PAYMENT_STATUS.COMPLETED,
            description
        });

        return wallet;
    }

    /**
     * Rút tiền
     */
    async withdraw(userId, amount, description = 'Rút tiền') {
        if (amount <= 0) {
            throw new ValidationError('Số tiền phải lớn hơn 0');
        }

        const wallet = await Wallet.getOrCreate(userId);
        const availableBalance = wallet.balance - wallet.frozenBalance;

        if (availableBalance < amount) {
            throw new ValidationError('Số dư không đủ');
        }

        wallet.balance -= amount;
        await wallet.save();

        await Transaction.create({
            userId,
            type: TRANSACTION_TYPES.WITHDRAW,
            amount,
            status: PAYMENT_STATUS.COMPLETED,
            description
        });

        return wallet;
    }

    /**
     * Thanh toán khoản vay (trừ tiền người vay)
     */
    async repayment(userId, amount, description, loanId = null) {
        if (amount <= 0) {
            throw new ValidationError('Số tiền phải lớn hơn 0');
        }

        const wallet = await Wallet.getOrCreate(userId);
        const availableBalance = wallet.balance - wallet.frozenBalance;

        if (availableBalance < amount) {
            throw new ValidationError('Số dư không đủ');
        }

        wallet.balance -= amount;
        await wallet.save();

        await Transaction.create({
            userId,
            type: TRANSACTION_TYPES.REPAYMENT,
            amount: amount, // Positive value, type determines direction
            status: PAYMENT_STATUS.COMPLETED,
            description,
            loanId
        });

        return wallet;
    }

    /**
     * Trừ tiền (dùng khi đầu tư)
     */
    async deduct(userId, amount, description, loanId = null, investmentId = null, referenceId = null) {
        if (amount <= 0) {
            throw new ValidationError('Số tiền phải lớn hơn 0');
        }

        const wallet = await Wallet.getOrCreate(userId);
        const availableBalance = wallet.balance - wallet.frozenBalance;

        if (availableBalance < amount) {
            throw new ValidationError('Số dư không đủ');
        }

        // Freeze amount, do not deduct from total balance yet
        wallet.frozenBalance += amount;
        await wallet.save();

        const transaction = await Transaction.create({
            userId,
            type: TRANSACTION_TYPES.INVESTMENT,
            amount,
            status: PAYMENT_STATUS.COMPLETED,
            description,
            loanId,
            investmentId,
            referenceId
        });

        return { wallet, transaction };
    }

    /**
     * Giải phóng tiền đóng băng (khi hủy đầu tư / refund)
     */
    async releaseFrozen(userId, amount) {
        const wallet = await Wallet.getOrCreate(userId);

        if (wallet.frozenBalance < amount) {
            throw new ValidationError('Số tiền đóng băng không đủ');
        }

        wallet.frozenBalance -= amount;
        await wallet.save();

        return wallet;
    }

    /**
     * Chuyển tiền từ đóng băng sang người nhận (khi giải ngân)
     * Trừ tiền của người gửi (balance + frozen)
     */
    async disburseFrozen(userId, amount) {
        const wallet = await Wallet.getOrCreate(userId);

        if (wallet.frozenBalance < amount) {
            throw new ValidationError('Số tiền đóng băng không đủ để giải ngân');
        }

        wallet.frozenBalance -= amount;
        wallet.balance -= amount;
        await wallet.save();

        return wallet;
    }

    /**
     * Nhận tiền (khi được thanh toán)
     */
    async receive(userId, amount, description, loanId = null, referenceId = null) {
        if (amount <= 0) {
            throw new ValidationError('Số tiền phải lớn hơn 0');
        }

        const wallet = await Wallet.getOrCreate(userId);
        wallet.balance += amount;
        await wallet.save();

        await Transaction.create({
            userId,
            type: TRANSACTION_TYPES.SETTLEMENT,
            amount,
            status: PAYMENT_STATUS.COMPLETED,
            description,
            loanId,
            referenceId
        });

        return wallet;
    }

    /**
     * Lấy wallet của Admin (System Escrow)
     */
    async getAdminWallet() {
        // Tìm user admin đầu tiên
        const User = require('../models/User');
        const admin = await User.findOne({ category: 'admin' });

        if (!admin) {
            throw new Error('Hệ thống chưa có Admin Wallet để xử lý giao dịch trung gian');
        }

        return await Wallet.getOrCreate(admin._id);
    }

    /**
     * Thanh toán khoản vay: Người vay -> Admin Escrow
     */
    async repaymentToEscrow(userId, amount, description, loanId = null, referenceId = null) {
        if (amount <= 0) throw new ValidationError('Số tiền phải lớn hơn 0');

        // Idempotency check
        if (referenceId) {
            const existingTx = await Transaction.findOne({ userId, referenceId, type: TRANSACTION_TYPES.REPAYMENT });
            if (existingTx) {
                return { alreadyProcessed: true };
            }
        }

        const userWallet = await Wallet.getOrCreate(userId);
        const adminWallet = await this.getAdminWallet();

        const availableBalance = userWallet.balance - userWallet.frozenBalance;
        if (availableBalance < amount) throw new ValidationError('Số dư không đủ');

        // Trừ tiền người vay
        userWallet.balance -= amount;
        await userWallet.save();

        // Cộng tiền ví Admin
        adminWallet.balance += amount;
        await adminWallet.save();

        // Log giao dịch người vay
        await Transaction.create({
            userId,
            type: TRANSACTION_TYPES.REPAYMENT,
            amount: amount,
            status: PAYMENT_STATUS.COMPLETED,
            description,
            loanId,
            referenceId
        });

        // Log giao dịch Admin nhận tiền giữ hộ
        await Transaction.create({
            userId: adminWallet.userId,
            type: TRANSACTION_TYPES.SETTLEMENT,
            amount: amount,
            status: PAYMENT_STATUS.COMPLETED,
            description: `Nhận tiền trả nợ từ khoản vay ${loanId} (Escrow)`,
            loanId,
            referenceId: referenceId ? `ESCROW_IN_${referenceId}` : `ESCROW_IN_${loanId}`
        });

        return { userWallet, adminWallet };
    }

    /**
     * Trả lợi nhuận cho nhà đầu tư: Admin Escrow -> Nhà đầu tư
     */
    async payoutFromEscrow(investorId, amount, description, loanId = null, serviceFee = 0, investmentId = null, referenceId = null) {
        if (amount <= 0) throw new ValidationError('Số tiền chi trả phải lớn hơn 0');

        // Idempotency check
        if (referenceId) {
            const existingTx = await Transaction.findOne({ userId: investorId, referenceId, type: TRANSACTION_TYPES.SETTLEMENT });
            if (existingTx) {
                return { alreadyProcessed: true };
            }
        }

        const adminWallet = await this.getAdminWallet();
        const investorWallet = await Wallet.getOrCreate(investorId);

        if (adminWallet.balance < amount) {
            throw new Error(`Lỗi hệ thống: Ví Admin Escrow không đủ tiền chi trả (${amount})`);
        }

        // Trừ tiền ví Admin (Số tiền thực trả cho NĐT)
        adminWallet.balance -= amount;
        await adminWallet.save();

        // Cộng tiền nhà đầu tư
        investorWallet.balance += amount;
        await investorWallet.save();

        // Log giao dịch nhận tiền của NĐT
        await Transaction.create({
            userId: investorId,
            type: TRANSACTION_TYPES.SETTLEMENT,
            amount,
            status: PAYMENT_STATUS.COMPLETED,
            description,
            loanId,
            investmentId,
            referenceId
        });

        // Nếu có phí dịch vụ, log thêm 1 dòng cho Admin để biết đây là doanh thu
        if (serviceFee > 0) {
            // Check if fee already logged
            const feeRef = referenceId ? `FEE_${referenceId}` : `FEE_${loanId}`;
            const existingFee = await Transaction.findOne({ userId: adminWallet.userId, referenceId: feeRef });

            if (!existingFee) {
                await Transaction.create({
                    userId: adminWallet.userId,
                    type: TRANSACTION_TYPES.FEE,
                    amount: serviceFee,
                    status: PAYMENT_STATUS.COMPLETED,
                    description: `Thu phí dịch vụ từ khoản vay ${loanId}`,
                    loanId,
                    investmentId,
                    referenceId: feeRef
                });
            }
        }

        return { adminWallet, investorWallet };
    }

    /**
     * Lấy lịch sử giao dịch
     */
    async getTransactions(userId, filters = {}) {
        const query = { userId };
        if (filters.type) query.type = filters.type;
        if (filters.status) query.status = filters.status;

        return await Transaction.find(query)
            .populate('loanId', 'capital term purpose')
            .populate('investmentId', 'amount notes')
            .populate('userId', 'phone fullName email')
            .sort({ createdAt: -1 })
            .limit(filters.limit || 50)
            .skip(filters.skip || 0);
    }
}

module.exports = new WalletService();

