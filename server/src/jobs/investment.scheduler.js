/**
 * @description Investment Scheduler - Check for expired pending investments
 */

const cron = require('node-cron');
const Investment = require('../models/Investment');
const Loan = require('../models/Loan');
const walletService = require('../services/wallet.service');
const Notification = require('../models/Notification');
const { INVESTMENT_STATUS } = require('../constants');
const logger = require('../utils/logger');

class InvestmentScheduler {
    constructor() {
        // Run every 5 minutes
        this.schedule = '*/5 * * * *';
    }

    start() {
        cron.schedule(this.schedule, async () => {
            await this.checkExpiredInvestments();
        });
        logger.info('Investment scheduler started');
    }

    /**
     * Check & Cancel Expired Pending Investments
     * TTL: 60 minutes
     */
    async checkExpiredInvestments() {
        logger.info('--- Job: Checking Expired Investments ---');

        try {
            const expirationTime = new Date(Date.now() - 60 * 60 * 1000); // 60 minutes ago

            const expiredInvestments = await Investment.find({
                status: INVESTMENT_STATUS.PENDING,
                createdAt: { $lt: expirationTime }
            });

            if (expiredInvestments.length === 0) {
                logger.info('No expired investments found.');
                // return; // Don't return here, just let it log end job
            } else {
                logger.info(`Found ${expiredInvestments.length} expired investments.`);

                for (const investment of expiredInvestments) {
                    try {
                        logger.info(`Processing expired investment ${investment._id}...`);

                        // 1. Release Frozen Money in Wallet
                        // Note: createAutoInvestment calls walletService.deduct which increases frozenBalance.
                        // So we need to releaseFrozen to return money to available balance.
                        await walletService.releaseFrozen(investment.investorId, investment.amount);

                        // 2. Release Notes in Loan
                        await Loan.findByIdAndUpdate(investment.loanId, {
                            $inc: { investedNotes: -investment.notes }
                        });

                        // 3. Update Investment Status
                        investment.status = 'cancelled';
                        investment.cancellationReason = 'Expired (Auto-invest confirmation timeout)';
                        investment.completedAt = new Date();
                        await investment.save();

                        // 4. Notify User
                        await Notification.create({
                            recipient: investment.investorId,
                            type: 'system',
                            title: 'Lệnh đầu tư tự động hết hạn',
                            content: `Lệnh đầu tư vào khoản vay đã bị hủy do quá thời gian xác nhận (60 phút). Số tiền ${investment.amount.toLocaleString()} VND đã được hoàn lại vào ví.`,
                            data: { investmentId: investment._id, type: 'investment_expired' }
                        });

                        logger.info(`Cancelled expired investment ${investment._id}`);

                    } catch (err) {
                        logger.error(`Failed to cancel investment ${investment._id}:`, err);
                    }
                }
            }

        } catch (error) {
            logger.error('Error in checkExpiredInvestments job:', error);
        }

        logger.info('--- End Job ---');
    }
}

module.exports = new InvestmentScheduler();
