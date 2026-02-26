/**
 * Service khớp lệnh - Hỗ trợ cả Manual Matching (WaitingRoom) và Auto-Invest Strategy
 */

const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const WaitingRoom = require('../models/WaitingRoom');
const AutoInvest = require('../models/AutoInvest');
const investmentService = require('./investment.service');
const { LOAN_STATUS, BASE_UNIT_PRICE } = require('../constants');
const logger = require('../utils/logger');
const { normalizeVietnameseString, tokenize, getBigrams } = require('../utils/string.util');

class MatchingService {

    // ============================================
    // MANUAL MATCHING (WAITING ROOM - AUTO QUEUE)
    // ============================================

    /**
     * Tìm các phòng chờ (Manual Queue) phù hợp với khoản vay
     * @param {String} loanId - ID khoản vay
     * @returns {Array} Danh sách phòng chờ phù hợp
     */
    async findMatchingRooms(loanId) {
        const loan = await Loan.findById(loanId);

        if (!loan || loan.status !== LOAN_STATUS.APPROVED) {
            return [];
        }

        const remainingNotes = loan.totalNotes - loan.investedNotes;
        if (remainingNotes <= 0) {
            return [];
        }

        // Tìm các phòng chờ phù hợp (Manual Queue cho Loan cụ thể)
        const waitingRooms = await WaitingRoom.find({
            loanId: loanId, // Match đích danh loan
            status: 'waiting',
            amount: { $lte: loan.capital }, // Logic cũ: amount <= loan.capital. Có thể cần sửa lại nếu cho phép partial.
            // Nhưng hiện tại giữ nguyên logic cũ của server hiện tại
            expiresAt: { $gt: new Date() },
            notes: { $lte: remainingNotes }
        })
            .sort({ priority: -1, createdAt: 1 })
            .limit(50);

        return waitingRooms;
    }

    /**
     * Thực hiện khớp lệnh Manual Queue
     * @param {Object} loan - Document Loan
     * @returns {Object} Kết quả khớp
     */
    async performManualMatching(loan) {
        const matchingRooms = await this.findMatchingRooms(loan._id);
        if (matchingRooms.length === 0) {
            return { matched: 0, message: 'Không tìm thấy phòng chờ thủ công phù hợp' };
        }

        let matchedCount = 0;
        let matchedNotes = 0;
        let notesToMatch = loan.totalNotes - loan.investedNotes;

        for (const room of matchingRooms) {
            if (notesToMatch <= 0) break;

            // Logic hiện tại: Chỉ khớp nếu room.notes <= notesToMatch
            // Nếu room.notes > notesToMatch thì skip (không partial match cho manual queue?)
            // Để an toàn, giữ nguyên logic cũ.
            if (room.notes > notesToMatch) continue;

            try {
                await investmentService.createInvestmentFromWaitingRoom(room._id, loan._id);
                matchedCount++;
                matchedNotes += room.notes;
                notesToMatch -= room.notes;
                logger.info(`[Manual Match] Phòng chờ ${room._id} -> Khoản vay ${loan._id}`);
            } catch (error) {
                logger.error(`[Manual Match] Lỗi khớp phòng ${room._id}:`, error);
            }
        }

        return { matched: matchedCount, matchedNotes, message: `Đã khớp thủ công ${matchedCount} phòng chờ` };
    }

    // ============================================
    // AUTO-INVEST MATCHING (STRATEGY BASED)
    // ============================================

    /**
     * Tìm các gói Auto-Invest phù hợp
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
            // Nếu đã invest vào loan này rồi -> Skip (hoặc check quota xem còn invest thêm được không?)
            // Giả định: Mỗi AutoInvest chỉ invest 1 lần vào 1 Loan để đơn giản hóa.
            const existingInvestment = ai.loans.find(l => l.loanId && l.loanId.toString() === loan._id.toString());
            if (existingInvestment) {
                // Nếu đã invest rồi, ta tạm thời skip để tránh double spending hoặc phức tạp logic
                return { ai, score: -1 };
            }

            // Check Max Capital Per Loan limit
            // Số tiền tối đa được phép invest vào loan này
            const maxInvestAmount = ai.maxCapitalPerLoan || ai.capital;
            // Số nodes tối đa
            const maxNodes = Math.floor(maxInvestAmount / BASE_UNIT_PRICE);

            // Nếu maxNodes <= 0 -> Skip
            if (maxNodes <= 0) return { ai, score: -1 };

            // Scoring Purpose
            let score = 0;
            const aiPurposes = ai.purpose || [];

            if (aiPurposes.length === 0) {
                // Nếu không set purpose -> Chấp nhận mọi purpose (Low priority)
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
        }).filter(item => item.score > 0); // Chỉ lấy score > 0 (score -1 là bị loại)

        // 3. Sort: Score DESC -> CreatedAt ASC (FIFO)
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
            // 4. Số tiền còn lại trong ví của Investor (Check realtime là tốt nhất, nhưng ở đây ta check sau khi match cũng được, nếu fail thì rollback)

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
                // Nếu thất bại -> Phải Rollback AutoInvest
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
     * Thực hiện khớp lệnh toàn diện (Manual trước -> Auto sau)
     * @param {String} loanId - ID khoản vay
     * @returns {Object} Kết quả khớp lệnh
     */
    async performMatching(loanId) {
        const loan = await Loan.findById(loanId);
        if (!loan || loan.status !== LOAN_STATUS.APPROVED) {
            return { matched: 0, message: 'Khoản vay chưa sẵn sàng' };
        }

        logger.info(`--- Bắt đầu khớp lệnh cho Loan ${loanId} ---`);

        // 1. Manual Matching
        const manualResult = await this.performManualMatching(loan);

        // Refresh Loan state after manual match
        const refreshedLoan = await Loan.findById(loanId);
        if (refreshedLoan.investedNotes >= refreshedLoan.totalNotes) {
            logger.info(`Done: Khoản vay đã được fill đầy bởi lệnh thủ công.`);
            return {
                success: true,
                manualMatch: manualResult,
                autoMatch: { matched: 0 },
                message: 'Khoản vay đã được lấp đầy (Manual)'
            };
        }

        // 2. Auto Matching (Lấp đầy phần còn thiếu)
        const autoResult = await this.performAutoMatching(refreshedLoan);

        logger.info(`--- Kết thúc khớp lệnh ---`);

        const totalMatched = (manualResult.matchedNotes || 0) + (autoResult.matched || 0);

        return {
            success: true,
            manualMatch: manualResult,
            autoMatch: autoResult,
            totalMatchedNotes: totalMatched,
            message: `Khớp lệnh hoàn tất. Tổng: ${totalMatched} notes.`
        };
    }

    /**
     * Khớp một phòng chờ cụ thể với khoản vay (Dành cho Manual Trigger từ Admin/User)
     */
    async matchWaitingRoomWithLoan(waitingRoomId, loanId) {
        return await investmentService.createInvestmentFromWaitingRoom(waitingRoomId, loanId);
    }
}

module.exports = new MatchingService();
