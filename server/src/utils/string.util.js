/**
 * String utilities for Auto-Invest Matching (Purpose Scoring)
 */

/**
 * Chuẩn hóa chuỗi tiếng Việt: bỏ dấu và chuyển thành chữ thường
 * @param {string} str - Chuỗi cần chuẩn hóa
 * @returns {string} Chuỗi đã được chuẩn hóa
 */
const normalizeVietnameseString = (str) => {
    if (!str || typeof str !== 'string') return '';

    // Chuyển thành chữ thường
    str = str.toLowerCase();

    // Loại bỏ dấu tiếng Việt
    str = str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu thanh
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd'); // Thay thế đ/Đ

    // Loại bỏ dấu câu/ký tự đặc biệt, chỉ giữ chữ số và khoảng trắng ASCII
    str = str.replace(/[^a-z0-9\s]/g, ' ');

    // Thu gọn khoảng trắng và cắt 2 đầu
    str = str.replace(/\s+/g, ' ').trim();

    return str;
};

// Tách từ (tokens) sau khi đã chuẩn hoá; loại bỏ token ngắn (<2 ký tự)
const tokenize = (normalizedStr) => {
    if (!normalizedStr) return [];
    // Chỉ giữ token có ít nhất 2 ký tự và chứa chữ cái (loại bỏ token toàn số như "1")
    return normalizedStr
        .split(' ')
        .filter(w => w && w.length >= 2 && /[a-z]/.test(w));
};

// Sinh bigram liên tiếp từ danh sách tokens
const getBigrams = (tokens) => {
    const result = [];
    for (let i = 0; i < tokens.length - 1; i++) {
        result.push(tokens[i] + ' ' + tokens[i + 1]);
    }
    return result;
};

module.exports = {
    normalizeVietnameseString,
    tokenize,
    getBigrams
};
