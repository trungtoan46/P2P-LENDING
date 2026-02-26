import { httpClient, ENDPOINTS } from '../index';

export const AutoInvestApi = {
    /**
     * Tạo hoặc cập nhật cấu hình Auto Invest
     * @param {Object} data - { capital, maxCapitalPerLoan, interestRange, periodRange, purpose, status, _id }
     */
    upsertConfig: async (data) => {
        if (data._id) {
            return httpClient.put(`${ENDPOINTS.AUTO_INVEST.BASE}/${data._id}`, data);
        }
        return httpClient.post(ENDPOINTS.AUTO_INVEST.BASE, data);
    },

    /**
     * Lấy danh sách cấu hình
     * @param {Object} params - { page, limit, status }
     */
    getMyConfigs: async (params) => {
        return httpClient.get(ENDPOINTS.AUTO_INVEST.BASE, { params });
    },

    /**
     * Lấy chi tiết
     * @param {String} id
     */
    getDetail: async (id) => {
        return httpClient.get(`${ENDPOINTS.AUTO_INVEST.BASE}/${id}`);
    },

    /**
     * Đổi trạng thái (active/paused/cancelled)
     * @param {String} id
     * @param {String} status
     */
    toggleStatus: async (id, status) => {
        return httpClient.patch(`${ENDPOINTS.AUTO_INVEST.BASE}/${id}/status`, { status });
    }
};
