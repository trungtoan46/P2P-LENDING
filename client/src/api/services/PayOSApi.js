/**
 * @description PayOS API - Nạp tiền qua cổng thanh toán PayOS
 */

import httpClient from '../httpClient';
import { ENDPOINTS } from '../config';

const PayOSApi = {
    async createPaymentLink(amount) {
        return httpClient.post(ENDPOINTS.PAYOS.CREATE_LINK, { amount });
    },

    async verifyPayment(orderCode) {
        return httpClient.post(ENDPOINTS.PAYOS.VERIFY(orderCode));
    },

    async getHistory() {
        return httpClient.get(ENDPOINTS.PAYOS.HISTORY);
    },
};

export default PayOSApi;
