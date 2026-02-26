/**
 * Các hàm tiện ích hỗ trợ cho hệ thống
 */

const moment = require('moment-timezone');
const bcrypt = require('bcryptjs');
const {
    BASE_UNIT_PRICE,
    CAPITAL_COEFFICIENT,
    FICO_COEFFICIENT,
    MONTH_COEFFICIENT,
    FACTOR_CONSTANT,
    SERVICE_FEE,
    DEFAULT_CREDIT_SCORE
} = require('../constants');

/**
 * Mã hóa mật khẩu bằng bcrypt
 * @param {String} password - Mật khẩu dạng text
 * @returns {Promise<String>} Mật khẩu đã mã hóa
 */
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

/**
 * So sánh mật khẩu với bản mã hóa
 * @param {String} password - Mật khẩu dạng text
 * @param {String} hash - Mật khẩu đã mã hóa
 * @returns {Promise<Boolean>} True nếu khớp
 */
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

/**
 * Tạo mã OTP ngẫu nhiên (6 chữ số)
 * @param {Number} length - Độ dài mã OTP (mặc định: 6)
 * @returns {String} Mã OTP
 */
const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
};

/**
 * Định dạng ngày tháng theo múi giờ Việt Nam
 * @param {Date} date - Đối tượng ngày tháng
 * @param {String} format - Định dạng (mặc định: DD/MM/YYYY HH:mm:ss)
 * @returns {String} Ngày tháng đã định dạng
 */
const formatDate = (date, format = 'DD/MM/YYYY HH:mm:ss') => {
    return moment(date).tz('Asia/Ho_Chi_Minh').format(format);
};

/**
 * Thêm số ngày vào ngày tháng
 * @param {Date} date - Ngày bắt đầu
 * @param {Number} days - Số ngày cần thêm
 * @returns {Date} Ngày mới
 */
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 * Thêm số tháng vào ngày tháng
 * @param {Date} date - Ngày bắt đầu
 * @param {Number} months - Số tháng cần thêm
 * @returns {Date} Ngày mới
 */
const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
};

/**
 * Tính lãi suất dựa trên điểm tín dụng, số tiền vay và kỳ hạn
 * - Điểm tín dụng càng thấp → lãi suất càng cao
 * - Số tiền vay càng lớn → lãi suất càng cao
 * - Kỳ hạn càng dài → lãi suất càng cao
 * 
 * @param {Number} creditScore - Điểm tín dụng (mặc định: 580)
 * @param {Number} capital - Số tiền vay
 * @param {Number} termMonths - Kỳ hạn vay (tháng)
 * @returns {Number} Lãi suất (dạng số thập phân, ví dụ: 0.12 = 12%)
 */
const calculateInterestRate = (creditScore = DEFAULT_CREDIT_SCORE, capital, termMonths) => {
    // Tính các hệ số
    const ficoFactor = FICO_COEFFICIENT * (850 - creditScore); // Điểm tín dụng
    const capitalFactor = CAPITAL_COEFFICIENT * capital; // Số tiền vay
    const monthFactor = MONTH_COEFFICIENT * termMonths; // Kỳ hạn

    // Tính lãi suất
    const rate = (ficoFactor + capitalFactor + monthFactor) / FACTOR_CONSTANT;

    // Đảm bảo lãi suất nằm trong khoảng 8% - 18%
    return Math.max(0.08, Math.min(0.18, rate));
};

/**
 * Tính số tiền trả hàng tháng cho khoản vay (công thức trả góp)
 * @param {Number} principal - Số tiền vay
 * @param {Number} rate - Lãi suất tháng (dạng số thập phân, ví dụ: 0.02 = 2%)
 * @param {Number} termMonths - Kỳ hạn vay (tháng)
 * @returns {Number} Số tiền trả hàng tháng
 */
const calculateMonthlyPayment = (principal, rate, termMonths) => {
    const monthlyRate = rate / 12; // Chuyển lãi suất năm sang lãi suất tháng

    // Nếu không có lãi suất, chia đều số tiền
    if (monthlyRate === 0) {
        return principal / termMonths;
    }

    // Công thức tính trả góp: P * (r * (1+r)^n) / ((1+r)^n - 1)
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1);

    return Math.round(payment);
};

/**
 * Tính tổng số tiền lãi phải trả
 * @param {Number} principal - Số tiền vay
 * @param {Number} monthlyPayment - Số tiền trả hàng tháng
 * @param {Number} termMonths - Kỳ hạn vay (tháng)
 * @returns {Number} Tổng số tiền lãi
 */
const calculateTotalInterest = (principal, monthlyPayment, termMonths) => {
    // Tổng lãi = (Số tiền trả hàng tháng * Số tháng) - Số tiền vay
    return (monthlyPayment * termMonths) - principal;
};

/**
 * Tính lợi nhuận đầu tư
 * @param {Number} investmentAmount - Số tiền đầu tư
 * @param {Number} loanInterestRate - Lãi suất của khoản vay
 * @param {Number} termMonths - Kỳ hạn đầu tư (tháng)
 * @returns {Object} { monthlyReturn, totalReturn, grossProfit, netProfit, serviceFee }
 */
const calculateInvestmentReturns = (investmentAmount, loanInterestRate, termMonths) => {
    // Tính số tiền nhận hàng tháng
    const monthlyPayment = calculateMonthlyPayment(investmentAmount, loanInterestRate, termMonths);

    // Tổng số tiền nhận được
    const totalReturn = monthlyPayment * termMonths;

    // Lợi nhuận gộp (trước khi trừ phí)
    const grossProfit = totalReturn - investmentAmount;

    // Lợi nhuận ròng (sau khi trừ phí dịch vụ)
    const netProfit = grossProfit * (1 - SERVICE_FEE);

    // Phí dịch vụ
    const serviceFee = grossProfit * SERVICE_FEE;

    return {
        monthlyReturn: Math.round(monthlyPayment), // Tiền nhận hàng tháng
        totalReturn: Math.round(totalReturn), // Tổng tiền nhận được
        grossProfit: Math.round(grossProfit), // Lợi nhuận gộp
        netProfit: Math.round(netProfit), // Lợi nhuận ròng
        serviceFee: Math.round(serviceFee) // Phí dịch vụ
    };
};

/**
 * Tính số lượng notes (phiếu) cho khoản vay
 * Mỗi note = 500,000 VND
 * @param {Number} capital - Số tiền vay
 * @returns {Number} Số lượng notes
 */
const calculateNotes = (capital) => {
    return Math.ceil(capital / BASE_UNIT_PRICE);
};

/**
 * Làm sạch thông tin user (xóa các trường nhạy cảm như mật khẩu)
 * @param {Object} user - Đối tượng user
 * @returns {Object} Đối tượng user đã làm sạch
 */
const sanitizeUser = (user) => {
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password; // Xóa mật khẩu
    delete userObj.refreshToken; // Xóa refresh token
    delete userObj.tokenVersion; // Xóa phiên bản token
    delete userObj.__v; // Xóa trường version của MongoDB
    return userObj;
};

/**
 * Generate random string
 * @param {Number} length - Length of string
 * @returns {String} Random string
 */
const generateRandomString = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

module.exports = {
    hashPassword,
    comparePassword,
    generateOTP,
    formatDate,
    addDays,
    addMonths,
    calculateInterestRate,
    calculateMonthlyPayment,
    calculateTotalInterest,
    calculateInvestmentReturns,
    calculateNotes,
    sanitizeUser,
    generateRandomString
};
