/**
 * @description Loan Scheduler - Check loan deadlines
 */

const cron = require('node-cron');
const Loan = require('../models/Loan');
const { LOAN_STATUS } = require('../constants');
const logger = require('../utils/logger');
const moment = require('moment');

class LoanScheduler {
    constructor() {
        // Run every day at 00:00
        this.schedule = '0 0 * * *';
    }

    start() {
        cron.schedule(this.schedule, async () => {
            await this.checkLoanDeadlines();
        });
        logger.info('Loan scheduler started');
    }

    /**
     * Check for loans that have passed their investing end date
     */
    async checkLoanDeadlines() {
        try {
            logger.info('Running checkLoanDeadlines job...');

            const now = new Date();

            // Find loans that are 'approved' (fundraising) and past deadline
            const loans = await Loan.find({
                status: LOAN_STATUS.APPROVED,
                investingEndDate: { $lte: now }
            });

            logger.info(`Found ${loans.length} loans past deadline`);

            for (const loan of loans) {
                try {
                    // Check if fully funded
                    if (loan.investedNotes >= loan.totalNotes) {
                        // Mark as WAITING (ready effectively)
                        loan.status = LOAN_STATUS.WAITING;
                        logger.info(`Loan ${loan._id} deadline passed but fully funded. Status -> WAITING`);
                    } else {
                        // Not fully funded -> FAIL
                        loan.status = LOAN_STATUS.FAIL;
                        loan.rejectionReason = 'Hết thời gian gọi vốn nhưng không đủ vốn';
                        logger.info(`Loan ${loan._id} deadline passed and not funded (${loan.investedNotes}/${loan.totalNotes}). Status -> FAIL`);
                    }
                    await loan.save();
                } catch (err) {
                    logger.error(`Error processing loan ${loan._id}:`, err);
                }
            }

        } catch (error) {
            logger.error('Error in checkLoanDeadlines:', error);
        }
    }
}

module.exports = new LoanScheduler();
