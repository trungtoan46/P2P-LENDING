/**
 * @description Investments API
 */

import httpClient from '../httpClient';
import { ENDPOINTS } from '../config';

const InvestmentsApi = {
    async getMyInvestments(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        );
        const query = new URLSearchParams(cleanParams).toString();
        const endpoint = query ? `${ENDPOINTS.INVESTMENTS.MY_INVESTMENTS}?${query}` : ENDPOINTS.INVESTMENTS.MY_INVESTMENTS;
        return httpClient.get(endpoint);
    },

    async create(data) {
        return httpClient.post(ENDPOINTS.INVESTMENTS.CREATE, data);
    },

    async getByLoan(loanId, params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        );
        const query = new URLSearchParams(cleanParams).toString();
        const endpoint = query ? `${ENDPOINTS.INVESTMENTS.BY_LOAN(loanId)}?${query}` : ENDPOINTS.INVESTMENTS.BY_LOAN(loanId);
        return httpClient.get(endpoint);
    },

    async getDetail(investmentId) {
        return httpClient.get(ENDPOINTS.INVESTMENTS.DETAIL(investmentId));
    },

    async performMatching(loanId) {
        return httpClient.post(ENDPOINTS.INVESTMENTS.MATCH(loanId));
    },

    async confirm(investmentId) {
        return httpClient.post(ENDPOINTS.INVESTMENTS.CONFIRM(investmentId));
    },
};

export default InvestmentsApi;
