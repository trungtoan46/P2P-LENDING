/**
 * @description Payments API
 */

import httpClient from '../httpClient';
import { ENDPOINTS } from '../config';

const PaymentsApi = {
    async getAll(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        );
        const query = new URLSearchParams(cleanParams).toString();
        const endpoint = query ? `${ENDPOINTS.PAYMENTS.ALL}?${query}` : ENDPOINTS.PAYMENTS.ALL;
        return httpClient.get(endpoint);
    },

    async getDue() {
        return httpClient.get(ENDPOINTS.PAYMENTS.DUE);
    },

    async getHistory(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        );
        const query = new URLSearchParams(cleanParams).toString();
        const endpoint = query ? `${ENDPOINTS.PAYMENTS.HISTORY}?${query}` : ENDPOINTS.PAYMENTS.HISTORY;
        return httpClient.get(endpoint);
    },

    async getByLoan(loanId) {
        return httpClient.get(ENDPOINTS.PAYMENTS.BY_LOAN(loanId));
    },

    async pay(paymentId) {
        return httpClient.post(ENDPOINTS.PAYMENTS.PAY(paymentId));
    },

    async payMultiple(paymentIds) {
        return httpClient.post(ENDPOINTS.PAYMENTS.PAY_MULTIPLE, { paymentIds });
    },
};

export default PaymentsApi;
