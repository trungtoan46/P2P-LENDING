import httpClient from '../httpClient';

/**
 * @description API - Thông báo
 */
const NotificationsApi = {
    /**
     * Lấy danh sách thông báo
     */
    getMyNotifications: async () => {
        try {
            const response = await httpClient.get('/api/notifications/my');
            return response.data || response;
        } catch (error) {
            // Return empty result on error to not break dashboard
            console.log('Notifications fetch error:', error.message);
            return { success: true, data: [] };
        }
    },

    /**
     * Đánh dấu đã đọc
     */
    markAsRead: async (id) => {
        try {
            const response = await httpClient.put(`/api/notifications/${id}/read`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Đọc tất cả
     */
    markAllAsRead: async () => {
        try {
            const response = await httpClient.put('/api/notifications/read-all');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export default NotificationsApi;
