/**
 * @description Utils - Format numbers
 */

export const formatMoney = (amount, currency = 'VND') => {
    if (amount === null || amount === undefined) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

// Alias for formatMoney
export const formatCurrency = formatMoney;

export const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(Number(num))) return '0';
    return Number(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const formatPercent = (num, decimals = 2) => {
    if (num === null || num === undefined) return '0%';
    return `${num.toFixed(decimals)}%`;
};

export const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('vi-VN');
    } catch (e) {
        return 'N/A';
    }
};

export default { formatMoney, formatCurrency, formatNumber, formatPercent, formatDate };

