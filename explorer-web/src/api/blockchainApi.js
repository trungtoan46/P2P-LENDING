import axiosClient from './axiosClient';

const blockchainApi = {
    getChainInfo: () => axiosClient.get('/blockchain/chain-info'),

    getBlocks: (from, limit = 10) => axiosClient.get(`/blockchain/blocks?from=${from}&limit=${limit}`),

    getBlock: (blockNumber) => axiosClient.get(`/blockchain/blocks/${blockNumber}`),

    getTransaction: (txId) => axiosClient.get(`/blockchain/transactions/${txId}`),

    getAssetHistory: (key) => axiosClient.get(`/blockchain/history/${key}`),

    getNetworkInfo: () => axiosClient.get('/blockchain/info'),

    // P2P Explorer APIs
    getDashboardStats: () => axiosClient.get('/explorer/dashboard'),

    getPublicLoans: (params = {}) => {
        const { status, page = 1, limit = 10 } = params;
        let url = `/explorer/loans?page=${page}&limit=${limit}`;
        if (status && status !== 'all') url += `&status=${status}`;
        return axiosClient.get(url);
    },

    getLoanDetail: (id) => axiosClient.get(`/explorer/loans/${id}`),

    getRecentActivities: (limit = 20) => axiosClient.get(`/explorer/activities?limit=${limit}`),

    search: (query) => axiosClient.get(`/explorer/search?q=${encodeURIComponent(query)}`),
};

export default blockchainApi;
