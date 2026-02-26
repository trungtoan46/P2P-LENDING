/**
 * @description Credit Scoring Service
 * Gọi Credit Scoring API để đánh giá điểm tín dụng
 * API chạy trên port 8000 (cấu hình qua CREDIT_SCORING_URL)
 */

const axios = require('axios');
const logger = require('../utils/logger');

class CreditScoringService {
    constructor() {
        this.baseUrl = process.env.CREDIT_SCORING_URL;
        this.timeout = parseInt(process.env.CREDIT_SCORING_TIMEOUT) || 10000;
        this.maxRetries = 3;
    }

    /**
     * Kiểm tra service có sẵn sàng không
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        try {
            const response = await axios.get(`${this.baseUrl}/health`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            logger.warn(`[CreditScoring] Health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Lấy điểm tín dụng từ API
     * @param {Object} userData - Dữ liệu người dùng và khoản vay
     * @returns {Promise<Object>} Kết quả scoring
     */
    async getCreditScore(userData) {
        const requestData = this._mapToApiFormat(userData);
        const missingFields = this._validateRequiredFields(requestData);
        if (missingFields.length > 0) {
            const message = `Thiếu dữ liệu bắt buộc: ${missingFields.join(', ')}`;
            logger.warn(`[CreditScoring] ${message}`);
            return {
                success: false,
                error: message,
                creditScore: null,
                grade: null,
                decision: null
            };
        }

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                logger.info(`[CreditScoring] Attempt ${attempt}/${this.maxRetries} - Calling API...`);

                const response = await axios.post(`${this.baseUrl}/score`, requestData, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: this.timeout
                });

                if (response.data.status === 'success' && response.data.data) {
                    const result = response.data.data;
                    logger.info(`[CreditScoring] Success - Score: ${result.credit_score}, Grade: ${result.grade}, Decision: ${result.decision}`);
                    return {
                        success: true,
                        creditScore: result.credit_score,
                        grade: result.grade,
                        decision: result.decision,
                        pdPercent: result.pd_percent,
                        expectedLossVnd: result.expected_loss_vnd,
                        eadVnd: result.ead_vnd,
                        lgdPercent: result.lgd_percent
                    };
                }

                throw new Error(response.data.error || 'Unknown error from Credit Scoring API');

            } catch (error) {
                const status = error.response?.status;
                const responseData = error.response?.data;
                const detail = status ? `status=${status}` : 'no-response';
                logger.error(`[CreditScoring] Attempt ${attempt} failed: ${error.message} (${detail})`);
                if (responseData) {
                    logger.error(`[CreditScoring] Response data: ${JSON.stringify(responseData)}`);
                }

                if (attempt === this.maxRetries) {
                    return {
                        success: false,
                        error: error.message,
                        creditScore: null,
                        grade: null,
                        decision: null
                    };
                }

                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Map dữ liệu từ hệ thống sang format API yêu cầu
     * @param {Object} data - Dữ liệu đầu vào
     * @returns {Object} Dữ liệu theo format API
     */
    _mapToApiFormat(data) {
        const request = {};

        // Required fields
        if (data.loanAmount) {
            request.loan_amount = parseInt(data.loanAmount);
        }
        if (data.annualIncome) {
            request.annual_income = parseInt(data.annualIncome);
        } else if (data.monthlyIncome) {
            request.annual_income = parseInt(data.monthlyIncome) * 12;
        }
        if (data.term) {
            request.term = this._formatTerm(data.term);
        }
        if (data.interestRate) {
            request.interest_rate = parseFloat(data.interestRate);
        }
        if (data.homeOwnership) {
            request.home_ownership = this._mapHomeOwnership(data.homeOwnership);
        }
        if (data.purpose) {
            request.purpose = this._mapPurpose(data.purpose);
        }
        if (data.region || data.city) {
            request.region = this._mapRegion(data.region || data.city);
        }

        // Optional fields
        if (data.employmentLength || data.empLength) {
            request.employment_length = this._formatEmploymentLength(data.employmentLength || data.empLength);
        }
        if (data.dti !== undefined) {
            request.dti = parseFloat(data.dti);
        }

        return request;
    }

    /**
     * Kiểm tra dữ liệu bắt buộc trước khi gọi API
     */
    _validateRequiredFields(request) {
        const missing = [];
        if (!request.loan_amount || request.loan_amount <= 0) missing.push('loan_amount');
        if (!request.annual_income || request.annual_income <= 0) missing.push('annual_income');
        if (!request.term) missing.push('term');
        if (request.interest_rate === undefined || request.interest_rate === null) missing.push('interest_rate');
        if (!request.home_ownership) missing.push('home_ownership');
        if (!request.purpose) missing.push('purpose');
        if (!request.region) missing.push('region');
        return missing;
    }

    /**
     * Format term: số -> "X months"
     */
    _formatTerm(term) {
        if (typeof term === 'string' && term.toLowerCase().includes('month')) {
            return term;
        }
        const months = parseInt(term);
        return isNaN(months) ? '12 months' : `${months} months`;
    }

    /**
     * Format employment length: số -> "X years"
     */
    _formatEmploymentLength(empLength) {
        if (typeof empLength === 'string' && empLength.toLowerCase().includes('year')) {
            return empLength;
        }
        const years = parseInt(empLength);
        if (isNaN(years)) return '< 1 year';
        if (years === 0) return '< 1 year';
        if (years === 1) return '1 year';
        if (years >= 10) return '10+ years';
        return `${years} years`;
    }

    /**
     * Map home ownership từ tiếng Việt sang English
     */
    _mapHomeOwnership(value) {
        if (!value) return 'rent';
        const lower = value.toLowerCase();
        if (lower.includes('chính chủ') || lower.includes('own')) return 'own';
        if (lower.includes('trả góp') || lower.includes('mortgage')) return 'mortgage';
        return 'rent';
    }

    /**
     * Map purpose từ tiếng Việt sang English
     */
    _mapPurpose(value) {
        if (!value) return 'major_purchase';
        const lower = value.toLowerCase();
        if (lower.includes('ô tô') || lower.includes('xe') || lower.includes('car')) return 'car';
        if (lower.includes('kinh doanh') || lower.includes('business')) return 'small_business';
        if (lower.includes('sửa nhà') || lower.includes('home')) return 'home_improvement';
        if (lower.includes('trả nợ') || lower.includes('debt')) return 'debt_consolidation';
        return 'major_purchase';
    }

    /**
     * Map region từ city/address
     */
    _mapRegion(value) {
        if (!value) return 'south';
        const lower = value.toLowerCase();

        // Miền Bắc
        const northCities = ['hà nội', 'hải phòng', 'quảng ninh', 'bắc ninh', 'hải dương', 'nam định', 'thái bình', 'north'];
        if (northCities.some(city => lower.includes(city))) return 'north';

        // Miền Trung
        const centralCities = ['đà nẵng', 'huế', 'nghệ an', 'hà tĩnh', 'quảng nam', 'quảng ngãi', 'bình định', 'khánh hòa', 'central'];
        if (centralCities.some(city => lower.includes(city))) return 'central';

        // Mặc định là Miền Nam
        return 'south';
    }
}

module.exports = new CreditScoringService();
