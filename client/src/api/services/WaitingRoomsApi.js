/**
 * @description Waiting Rooms API
 */

import httpClient from '../httpClient';
import { ENDPOINTS } from '../config';

const WaitingRoomsApi = {
    async create(data) {
        return httpClient.post(ENDPOINTS.WAITING_ROOMS.CREATE, data);
    },

    async getMyRooms(status = null) {
        let endpoint = ENDPOINTS.WAITING_ROOMS.MY_ROOMS;
        if (status) endpoint += `?status=${status}`;
        return httpClient.get(endpoint);
    },

    async getDetail(roomId) {
        return httpClient.get(ENDPOINTS.WAITING_ROOMS.DETAIL(roomId));
    },

    async cancel(roomId) {
        return httpClient.post(ENDPOINTS.WAITING_ROOMS.CANCEL(roomId));
    },
};

export default WaitingRoomsApi;
