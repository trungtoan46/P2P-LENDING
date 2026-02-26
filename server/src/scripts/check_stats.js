
const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Investment = require('../models/Investment');
const User = require('../models/User');
require('dotenv').config();

const { LOAN_STATUS } = require('../constants');

async function debugStats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('LOAN_STATUS enum:', LOAN_STATUS);

        const totalLoans = await Loan.countDocuments();
        const activeLoans = await Loan.countDocuments({ status: { $in: ['active', 'approved', 'waiting'] } });
        const completedLoans = await Loan.countDocuments({ status: { $in: ['completed', 'clean', 'success'] } });

        console.log('--- Counts ---');
        console.log('Total Loans:', totalLoans);
        console.log('Active Loans (active, approved, waiting):', activeLoans);
        console.log('Completed Loans (completed, clean, success):', completedLoans);

        const allLoanStatuses = await Loan.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        console.log('Loan Status Distribution:', allLoanStatuses);

        const loanAgg = await Loan.aggregate([
            {
                $group: {
                    _id: null,
                    totalVolume: { $sum: '$capital' },
                    avgInterestRate: { $avg: '$interestRate' },
                    avgTerm: { $avg: '$term' },
                    totalRepayment: { $sum: '$totalRepayment' }
                }
            }
        ]);
        console.log('Loan Aggregation:', loanAgg[0]);

        const investmentAgg = await Investment.aggregate([
            {
                $group: {
                    _id: null,
                    totalInvested: { $sum: '$amount' },
                    totalProfit: { $sum: '$netProfit' },
                    uniqueInvestors: { $addToSet: '$investorId' }
                }
            }
        ]);
        console.log('Investment Aggregation:', investmentAgg[0]);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugStats();
