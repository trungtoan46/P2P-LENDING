
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Loan = require('../models/Loan');
const Investment = require('../models/Investment');

async function debugStats() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is undefined. Check .env file path.');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const userCount = await User.countDocuments();
        console.log('Users:', userCount);

        const totalLoans = await Loan.countDocuments();
        console.log('Total Loans:', totalLoans);

        const activeLoans = await Loan.countDocuments({ status: { $in: ['active', 'approved', 'waiting'] } });
        console.log('Active Loans:', activeLoans);

        const completedLoans = await Loan.countDocuments({ status: { $in: ['completed', 'clean', 'success'] } });
        console.log('Completed Loans:', completedLoans);

        const statusDist = await Loan.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        console.log('Status Dist:', JSON.stringify(statusDist));

        const loanAgg = await Loan.aggregate([
            {
                $group: {
                    _id: null,
                    totalVolume: { $sum: '$capital' },
                    avgInterestRate: { $avg: '$interestRate' },
                    totalRepayment: { $sum: '$totalRepayment' }
                }
            }
        ]);
        console.log('Loan Agg:', JSON.stringify(loanAgg[0]));

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
        console.log('Invest Agg:', JSON.stringify(investmentAgg[0]));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugStats();
