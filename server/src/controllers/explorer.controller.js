/**
 * @description Explorer Controller - Public API for P2P Lending Explorer
 * No authentication required - privacy-safe data only
 */

const Loan = require('../models/Loan');
const Investment = require('../models/Investment');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

class ExplorerController {
    /**
     * GET /api/explorer/dashboard
     * Aggregate P2P lending network statistics
     */
    async getDashboardStats(req, res, next) {
        try {
            const [
                totalLoans,
                activeLoans,
                completedLoans,
                totalInvestments,
                loanAggregation,
                investmentAggregation,
                statusDistribution
            ] = await Promise.all([
                Loan.countDocuments(),
                Loan.countDocuments({ status: { $in: ['active', 'approved', 'waiting'] } }),
                Loan.countDocuments({ status: { $in: ['completed', 'clean', 'success'] } }),
                Investment.countDocuments(),
                Loan.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalVolume: { $sum: '$capital' },
                            avgInterestRate: { $avg: '$interestRate' },
                            avgTerm: { $avg: '$term' },
                            totalRepayment: { $sum: '$totalRepayment' }
                        }
                    }
                ]),
                Investment.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalInvested: { $sum: '$amount' },
                            totalProfit: { $sum: '$netProfit' },
                            uniqueInvestors: { $addToSet: '$investorId' }
                        }
                    }
                ]),
                Loan.aggregate([
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ])
            ]);

            const loanStats = loanAggregation[0] || { totalVolume: 0, avgInterestRate: 0, avgTerm: 0, totalRepayment: 0 };
            const investStats = investmentAggregation[0] || { totalInvested: 0, totalProfit: 0, uniqueInvestors: [] };

            return successResponse(res, {
                overview: {
                    totalLoans,
                    activeLoans,
                    completedLoans,
                    totalInvestments,
                    totalInvestors: investStats.uniqueInvestors?.length || 0,
                },
                financial: {
                    totalLendingVolume: loanStats.totalVolume,
                    totalInvested: investStats.totalInvested,
                    totalRepayment: loanStats.totalRepayment,
                    totalProfit: investStats.totalProfit,
                    avgInterestRate: Math.round(loanStats.avgInterestRate * 10000) / 100,
                    avgTerm: Math.round(loanStats.avgTerm * 10) / 10,
                },
                statusDistribution: statusDistribution.map(s => ({
                    status: s._id,
                    count: s.count
                }))
            });
        } catch (error) {
            logger.error(`[Explorer] Dashboard stats error: ${error.message}`);
            return errorResponse(res, 'Failed to get dashboard stats', 500);
        }
    }

    /**
     * GET /api/explorer/loans?status=active&page=1&limit=10
     * Public loan listing (privacy-safe)
     */
    async getPublicLoans(req, res, next) {
        try {
            const { status, page = 1, limit = 10 } = req.query;
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
            const skip = (pageNum - 1) * limitNum;

            const filter = {};
            if (status && status !== 'all') {
                filter.status = status;
            }

            const [loans, total] = await Promise.all([
                Loan.find(filter)
                    .select('capital term interestRate status totalNotes investedNotes monthlyPayment totalInterest totalRepayment creditScore disbursementDate maturityDate blockchainContractId createdAt purpose')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                Loan.countDocuments(filter)
            ]);

            // Transform for privacy
            const publicLoans = loans.map((loan, index) => ({
                id: loan._id,
                loanIndex: skip + index + 1,
                capital: loan.capital,
                term: loan.term,
                interestRate: Math.round(loan.interestRate * 10000) / 100,
                status: loan.status,
                purpose: loan.purpose,
                totalNotes: loan.totalNotes,
                investedNotes: loan.investedNotes,
                completionPercent: loan.totalNotes > 0
                    ? Math.round((loan.investedNotes / loan.totalNotes) * 100)
                    : 0,
                monthlyPayment: loan.monthlyPayment,
                totalRepayment: loan.totalRepayment,
                creditScore: loan.creditScore,
                disbursementDate: loan.disbursementDate,
                maturityDate: loan.maturityDate,
                blockchainId: loan.blockchainContractId,
                createdAt: loan.createdAt,
            }));

            return successResponse(res, {
                loans: publicLoans,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
        } catch (error) {
            logger.error(`[Explorer] Public loans error: ${error.message}`);
            return errorResponse(res, 'Failed to get loans', 500);
        }
    }

    /**
     * GET /api/explorer/loans/:id
     * Public loan detail with investment info
     */
    async getPublicLoanDetail(req, res, next) {
        try {
            const { id } = req.params;

            const loan = await Loan.findById(id)
                .select('-borrowerId -bankAccountNumber -bankAccountHolderName -bankName -walletAccountNumber -approvedBy -rejectionReason')
                .lean();

            if (!loan) {
                return errorResponse(res, 'Loan not found', 404);
            }

            // Get investment stats for this loan
            const investmentStats = await Investment.aggregate([
                { $match: { loanId: loan._id } },
                {
                    $group: {
                        _id: null,
                        totalInvested: { $sum: '$amount' },
                        investorCount: { $addToSet: '$investorId' },
                        investmentCount: { $sum: 1 }
                    }
                }
            ]);

            const invStats = investmentStats[0] || { totalInvested: 0, investorCount: [], investmentCount: 0 };

            return successResponse(res, {
                ...loan,
                interestRate: Math.round(loan.interestRate * 10000) / 100,
                completionPercent: loan.totalNotes > 0
                    ? Math.round((loan.investedNotes / loan.totalNotes) * 100)
                    : 0,
                investmentInfo: {
                    totalInvested: invStats.totalInvested,
                    investorCount: invStats.investorCount?.length || 0,
                    investmentCount: invStats.investmentCount
                }
            });
        } catch (error) {
            logger.error(`[Explorer] Loan detail error: ${error.message}`);
            return errorResponse(res, 'Failed to get loan detail', 500);
        }
    }

    /**
     * GET /api/explorer/activities?limit=20
     * Recent P2P lending activities
     */
    async getRecentActivities(req, res, next) {
        try {
            const limit = Math.min(50, parseInt(req.query.limit) || 20);

            const [recentLoans, recentInvestments] = await Promise.all([
                Loan.find()
                    .select('capital term status createdAt blockchainContractId interestRate')
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean(),
                Investment.find()
                    .select('amount notes status createdAt blockchainContractId loanId')
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean()
            ]);

            // Merge and sort by time
            const activities = [
                ...recentLoans.map(l => ({
                    type: 'loan',
                    action: l.status === 'pending' ? 'Loan Request' :
                        l.status === 'approved' ? 'Loan Approved' :
                            l.status === 'active' ? 'Loan Active' :
                                l.status === 'completed' ? 'Loan Completed' :
                                    `Loan ${l.status}`,
                    amount: l.capital,
                    detail: `${l.term} thang, ${Math.round(l.interestRate * 10000) / 100}%`,
                    blockchainId: l.blockchainContractId,
                    status: l.status,
                    timestamp: l.createdAt,
                    id: l._id
                })),
                ...recentInvestments.map(i => ({
                    type: 'investment',
                    action: i.status === 'pending' ? 'Investment Made' :
                        i.status === 'active' ? 'Investment Active' :
                            i.status === 'completed' ? 'Investment Completed' :
                                `Investment ${i.status}`,
                    amount: i.amount,
                    detail: `${i.notes} notes`,
                    blockchainId: i.blockchainContractId,
                    status: i.status,
                    timestamp: i.createdAt,
                    loanId: i.loanId,
                    id: i._id
                }))
            ]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);

            return successResponse(res, activities);
        } catch (error) {
            logger.error(`[Explorer] Activities error: ${error.message}`);
            return errorResponse(res, 'Failed to get activities', 500);
        }
    }

    /**
     * GET /api/explorer/search?q=query
     * Global search algorithm
     */
    async search(req, res, next) {
        try {
            const query = req.query.q?.trim() || '';
            if (!query) {
                return successResponse(res, { type: 'empty', results: [] });
            }

            // 1. Check if it's a Block Number (pure digits)
            if (/^\d+$/.test(query) && query.length < 15) {
                return successResponse(res, {
                    type: 'block',
                    id: query,
                    results: [{ title: `Block #${query}`, subtitle: 'Blockchain Block', link: `/blocks/${query}` }]
                });
            }

            // 2. Check if it's a Transaction Hash (64 hex chars)
            if (/^[a-fA-F0-9]{64}$/.test(query)) {
                return successResponse(res, {
                    type: 'transaction',
                    id: query,
                    results: [{ title: `Transaction`, subtitle: query, link: `/transactions/${query}` }]
                });
            }

            // 3. Check if it's an Asset Key (LOAN_... or INVEST_...)
            if (query.startsWith('LOAN_') || query.startsWith('INVEST_')) {
                return successResponse(res, {
                    type: 'asset',
                    id: query,
                    results: [{ title: `Asset History`, subtitle: query, link: `/history/${query}` }]
                });
            }

            // 4. Check if it's a MongoDB ObjectId (24 hex chars)
            if (mongoose.Types.ObjectId.isValid(query) && query.length === 24) {
                const loan = await Loan.findById(query).lean();
                if (loan) {
                    return successResponse(res, {
                        type: 'loan',
                        id: query,
                        results: [{ title: loan.purpose || 'P2P Loan', subtitle: `Status: ${loan.status}`, link: `/loans/${loan._id}` }]
                    });
                }
            }

            // 5. Text search in Loans (purpose or loan amount)
            const searchRegex = new RegExp(query, 'i');
            const loans = await Loan.find({
                $or: [
                    { purpose: searchRegex },
                    { status: searchRegex }
                ]
            }).limit(5).lean();

            if (loans.length > 0) {
                return successResponse(res, {
                    type: 'loans',
                    query,
                    results: loans.map(l => ({
                        title: l.purpose || 'P2P Loan',
                        subtitle: `${l.capital.toLocaleString()} VND - ${l.status}`,
                        link: `/loans/${l._id}`,
                        data: l
                    }))
                });
            }

            // 6. No matches
            return successResponse(res, { type: 'none', query, results: [] });

        } catch (error) {
            logger.error(`[Explorer] Search error: ${error.message}`);
            return errorResponse(res, 'Failed to perform search', 500);
        }
    }
}

module.exports = new ExplorerController();
