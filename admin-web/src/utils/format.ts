import { LOCALE, CURRENCY } from '../config/constants';

/**
 * Format so tien theo dinh dang VND
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: CURRENCY,
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format so tien ngan gon (1M, 1K)
 */
export const formatCompactCurrency = (amount: number): string => {
    if (amount >= 1000000000) {
        return `${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
        return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
};

/**
 * Format phan tram
 */
export const formatPercent = (value: number, decimals = 1): string => {
    return `${value.toFixed(decimals)}%`;
};

/**
 * Format Loan ID
 */
export const formatLoanId = (id: string): string => {
    return `#LD-${id.slice(-6).toUpperCase()}`;
};

/**
 * Format User ID
 */
export const formatUserId = (id: string): string => {
    return `#U-${id.slice(-6).toUpperCase()}`;
};

/**
 * Format so dien thoai
 */
export const formatPhone = (phone: string): string => {
    if (phone.startsWith('+84')) {
        return phone.replace('+84', '0');
    }
    return phone;
};
