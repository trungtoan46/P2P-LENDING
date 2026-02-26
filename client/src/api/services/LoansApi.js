/**
 * @description Loans API
 */

import httpClient from '../httpClient';
import { ENDPOINTS } from '../config';

const LoansApi = {
    async getList(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        );
        const query = new URLSearchParams(cleanParams).toString();
        const endpoint = query ? `${ENDPOINTS.LOANS.LIST}?${query}` : ENDPOINTS.LOANS.LIST;
        return httpClient.get(endpoint);
    },

    async getMyLoans(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        );
        const query = new URLSearchParams(cleanParams).toString();
        const endpoint = query ? `${ENDPOINTS.LOANS.MY_LOANS}?${query}` : ENDPOINTS.LOANS.MY_LOANS;
        return httpClient.get(endpoint);
    },

    async getDetail(loanId) {
        return httpClient.get(ENDPOINTS.LOANS.DETAIL(loanId));
    },

    async create(data) {
        return httpClient.post(ENDPOINTS.LOANS.CREATE, data);
    },

    async approve(loanId) {
        return httpClient.post(ENDPOINTS.LOANS.APPROVE(loanId));
    },

    async reject(loanId, reason) {
        return httpClient.post(ENDPOINTS.LOANS.REJECT(loanId), { reason });
    },

    async sign(loanId) {
        return httpClient.post(ENDPOINTS.LOANS.SIGN(loanId));
    },

    async calculateRate(capital, term) {
        return httpClient.post('/api/loans/calculate-rate', { capital, term });
    },

    async cancel(loanId, reason) {
        return httpClient.post(ENDPOINTS.LOANS.CANCEL(loanId), { reason });
    },
};

export default LoansApi;
