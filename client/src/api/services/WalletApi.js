/**
 * @description Wallet API
 */

import httpClient from '../httpClient';
import { ENDPOINTS } from '../config';

const WalletApi = {
    async getBalance() {
        return httpClient.get(ENDPOINTS.WALLET.BALANCE);
    },

    async deposit(amount) {
        return httpClient.post(ENDPOINTS.WALLET.DEPOSIT, { amount });
    },

    async mockDeposit(amount) {
        return httpClient.post(ENDPOINTS.WALLET.MOCK_DEPOSIT, { amount });
    },

    async withdraw(data) {
        return httpClient.post(ENDPOINTS.WALLET.WITHDRAW, data);
    },

    async getTransactions(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `${ENDPOINTS.WALLET.TRANSACTIONS}?${query}` : ENDPOINTS.WALLET.TRANSACTIONS;
        return httpClient.get(endpoint);
    },
};

export default WalletApi;
