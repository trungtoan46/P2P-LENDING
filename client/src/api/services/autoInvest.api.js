import httpClient from '../httpClient';
import { ENDPOINTS } from '../config';

export const AutoInvestApi = {
    /**
     * Tạo hoặc cập nhật cấu hình Auto Invest
     */
    upsertConfig: async (data) => {
        if (data._id) {
            return httpClient.put(`${ENDPOINTS.AUTO_INVEST.BASE}/${data._id}`, data);
        }
        return httpClient.post(ENDPOINTS.AUTO_INVEST.BASE, data);
    },

    /**
     * Lấy danh sách cấu hình
     */
    getMyConfigs: async (params) => {
        return httpClient.get(ENDPOINTS.AUTO_INVEST.BASE, { params });
    },

    /**
     * Lấy chi tiết (kèm waitingRooms + investments)
     */
    getDetail: async (id) => {
        return httpClient.get(`${ENDPOINTS.AUTO_INVEST.BASE}/${id}`);
    },

    /**
     * Đổi trạng thái (active/paused/cancelled)
     */
    toggleStatus: async (id, status) => {
        return httpClient.patch(`${ENDPOINTS.AUTO_INVEST.BASE}/${id}/status`, { status });
    },

    /**
     * Hủy campaign + hoàn tiền
     */
    cancelConfig: async (id) => {
        return httpClient.delete(`${ENDPOINTS.AUTO_INVEST.BASE}/${id}`);
    }
};
