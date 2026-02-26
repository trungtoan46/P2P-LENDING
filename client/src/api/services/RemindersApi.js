/**
 * @description Reminders API
 */

import httpClient from '../httpClient';
import { ENDPOINTS } from '../config';

const RemindersApi = {
    async getMyReminders(status = null) {
        let endpoint = ENDPOINTS.REMINDERS.MY_REMINDERS;
        if (status) endpoint += `?status=${status}`;
        return httpClient.get(endpoint);
    },

    async getUpcoming() {
        return httpClient.get(ENDPOINTS.REMINDERS.UPCOMING);
    },

    async markAsRead(id) {
        return httpClient.put(`/api/reminders/${id}/mark-read`);
    },

    async markAllAsRead() {
        return httpClient.put('/api/reminders/mark-all-read');
    },
};

export default RemindersApi;
