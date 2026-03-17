/**
 * Service khớp lệnh tự động - Auto-Invest Matching Engine
 * Ghép các khoản đầu tư từ nhà đầu tư với các khoản vay phù hợp dựa trên tiêu chí đã định
 * 
 * Cơ chế hoạt động:
 * 1. Nhà đầu tư tạo Waiting Room (AutoInvest config) với các tiêu chí:
 *    - Khoảng lãi suất (interestRange)
 *    - Khoảng kỳ hạn (periodRange)
 *    - Mục đích vay (purpose)
 *    - Số vốn cam kết (capital)
 * 2. Khi khoản vay được approve, system tự động scan các AutoInvest phù hợp
 * 3. Khớp theo priority: Score DESC → FIFO (createdAt ASC)
 */

const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const AutoInvest = require('../models/AutoInvest');
const investmentService = require('./investment.service');
const { LOAN_STATUS, BASE_UNIT_PRICE } = require('../constants');
const logger = require('../utils/logger');
const { normalizeVietnameseString, tokenize, getBigrams } = require('../utils/string.util');

class MatchingService {

    // ============================================
    // AUTO-INVEST MATCHING (CRITERIA BASED)
    // ============================================

    /**
     * Tìm các Auto-Invest phù hợp với khoản vay
     * @param {Object} loan - Loan Document
     * @returns {Array} Danh sách AutoInvest qualified (đã sort theo Score & Priority)
     */
    async findQualifiedAutoInvests(loan) {
        if (!loan || !loan.capital) return [];

        // 1. Filter cơ bản (DB Query)
        // AutoInvest lưu interestRange theo % (ví dụ 10, 15)
        // Loan lưu interestRate theo decimal (ví dụ 0.1, 0.15)
        // Cần convert loan.interestRate sang % để compare
        const loanInterestPercent = loan.interestRate * 100;

        // Tìm các AutoInvest đang active, còn quota
        const candidates = await AutoInvest.find({
            status: 'active',
            'interestRange.min': { $lte: loanInterestPercent },
            'interestRange.max': { $gte: loanInterestPercent },
            'periodRange.min': { $lte: loan.term },
            'periodRange.max': { $gte: loan.term },
            $expr: {
                $gt: [{ $subtract: ["$totalNodes", "$matchedNodes"] }, 0]
            }
        }).sort({ createdAt: 1 }); // FIFO ban đầu

        if (candidates.length === 0) return [];

        // 2. Scoring & Advanced Filter (In-memory)
        const loanPurposeNormalized = normalizeVietnameseString(loan.purpose || '');
        const loanTokens = tokenize(loanPurposeNormalized);
        const loanBigrams = getBigrams(loanTokens);

        const qualified = candidates.map(ai => {
            // Check Max Capital Per Loan rule
            // Nếu đã invest vào loan này rồi → Skip
            const existingInvestment = ai.loans.find(l => l.loanId && l.loanId.toString() === loan._id.toString());
            if (existingInvestment) {
                return { ai, score: -1 };
            }

            // Check Max Capital Per Loan limit
            const maxInvestAmount = ai.maxCapitalPerLoan || ai.capital;
            const maxNodes = Math.floor(maxInvestAmount / BASE_UNIT_PRICE);

            if (maxNodes <= 0) return { ai, score: -1 };

            // Scoring Purpose (NLP-based)
            let score = 0;
            const aiPurposes = ai.purpose || [];

            if (aiPurposes.length === 0) {
                // Nếu không set purpose → Chấp nhận mọi purpose (Low priority)
                score = 50;
            } else {
                let highestScore = 0;
                for (const p of aiPurposes) {
                    const roomPurposeNorm = normalizeVietnameseString(p);
                    const roomTokens = tokenize(roomPurposeNorm);
                    const roomBigrams = getBigrams(roomTokens);

                    const tokenOverlap = loanTokens.filter(t => roomTokens.includes(t));
                    const bigramOverlap = loanBigrams.filter(b => roomBigrams.includes(b));
                    const isShortMatch = roomTokens.length > 0 && roomTokens.length <= 2 && roomTokens.every(rt => loanTokens.includes(rt));

                    if (bigramOverlap.length >= 1) {
                        if (90 > highestScore) highestScore = 90;
                    } else if (tokenOverlap.length >= 2 || isShortMatch) {
                        if (70 > highestScore) highestScore = 70;
                    }
                }
                score = highestScore;
            }

            return { ai, score, maxNodesLimit: maxNodes };
        }).filter(item => item.score > 0);

        // 3. Sort: Score DESC → CreatedAt ASC (FIFO)
        qualified.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(a.ai.createdAt) - new Date(b.ai.createdAt);
        });

        return qualified;
    }

    /**
     * Thực hiện khớp lệnh Auto-Invest cho Loan
     * @param {Object} loan - Loan document
     * @returns {Object} Result
     */
    async performAutoMatching(loan) {
        if (!loan || loan.status !== LOAN_STATUS.APPROVED) return { matched: 0 };

        let notesToMatch = loan.totalNotes - loan.investedNotes;
        if (notesToMatch <= 0) return { matched: 0 };

        // Lấy danh sách AutoInvest phù hợp
        const qualifiedList = await this.findQualifiedAutoInvests(loan);
        if (qualifiedList.length === 0) return { matched: 0, message: 'Không tìm thấy Auto-Invest phù hợp' };

        let totalMatchedNotes = 0;

        for (const item of qualifiedList) {
            if (notesToMatch <= 0) break;

            const { ai, maxNodesLimit } = item;

            // Tính số nodes có thể match từ AutoInvest này
            // 1. Available nodes của AI
            const aiAvailableNodes = ai.totalNodes - ai.matchedNodes;
            // 2. Limit per loan
            const limitPerLoan = maxNodesLimit;
            // 3. Nhu cầu của Loan

            const matchNodes = Math.min(notesToMatch, aiAvailableNodes, limitPerLoan);

            if (matchNodes <= 0) continue;

            const matchAmount = matchNodes * BASE_UNIT_PRICE;

            try {
                // ATOMIC UPDATE AutoInvest
                // Phải đảm bảo vẫn còn đủ quota
                const updatedAi = await AutoInvest.findOneAndUpdate(
                    {
                        _id: ai._id,
                        status: 'active',
                        $expr: { $gte: [{ $subtract: ["$totalNodes", "$matchedNodes"] }, matchNodes] },
                        'loans.loanId': { $ne: loan._id } // Prevent concurrent double-investing
                    },
                    {
                        $inc: { matchedNodes: matchNodes, matchedCapital: matchAmount },
                        $push: {
                            loans: {
                                loanId: loan._id,
                                nodeMatch: matchNodes,
                                amount: matchAmount,
                                matchedAt: new Date()
                            }
                        }
                    },
                    { new: true }
                );

                if (!updatedAi) {
                    logger.warn(`[Auto Match] Skip AI ${ai._id}: Không đủ quota hoặc trạng thái thay đổi`);
                    continue;
                }

                // Tạo Investment & Trừ tiền
                // Nếu thất bại → Phải Rollback AutoInvest
                try {
                    await investmentService.createAutoInvestment(updatedAi, loan, matchAmount, matchNodes);

                    totalMatchedNotes += matchNodes;
                    notesToMatch -= matchNodes;

                    // Check if AI completed
                    if (updatedAi.matchedNodes >= updatedAi.totalNodes) {
                        await AutoInvest.findByIdAndUpdate(updatedAi._id, { status: 'completed', completedAt: new Date() });
                    }

                    logger.info(`[Auto Match] Success: AI ${ai._id} matched ${matchNodes} notes (${matchAmount} VND)`);

                } catch (invError) {
                    logger.error(`[Auto Match] Create Investment Failed: ${invError.message}. Rolling back AutoInvest ${ai._id}`);

                    // Rollback AutoInvest
                    await AutoInvest.findByIdAndUpdate(ai._id, {
                        $inc: { matchedNodes: -matchNodes, matchedCapital: -matchAmount },
                        $pull: { loans: { loanId: loan._id } }
                    });
                }

            } catch (error) {
                logger.error(`[Auto Match] System Error processing AI ${ai._id}:`, error);
            }
        }

        return { matched: totalMatchedNotes, message: `Auto Match hoàn tất: ${totalMatchedNotes} notes` };
    }

    // ============================================
    // MAIN ENTRY POINT
    // ============================================

    /**
     * Thực hiện khớp lệnh tự động cho Loan
     * @param {String} loanId - ID khoản vay
     * @returns {Object} Kết quả khớp lệnh
     */
    async performMatching(loanId) {
        const loan = await Loan.findById(loanId);
        if (!loan || loan.status !== LOAN_STATUS.APPROVED) {
            return { matched: 0, message: 'Khoản vay chưa sẵn sàng' };
        }

        logger.info(`--- Bắt đầu Auto-Invest Matching cho Loan ${loanId} ---`);

        // Auto-Invest Matching (100% tự động)
        const autoResult = await this.performAutoMatching(loan);

        logger.info(`--- Kết thúc Auto-Invest Matching ---`);

        return {
            success: true,
            autoMatch: autoResult,
            totalMatchedNotes: autoResult.matched || 0,
            message: `Khớp lệnh hoàn tất. Tổng: ${autoResult.matched || 0} notes.`
        };
    }
}

module.exports = new MatchingService();
