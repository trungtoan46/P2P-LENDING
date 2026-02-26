/**
 * @description User API
 */

import httpClient from '../httpClient';
import { ENDPOINTS, TokenManager } from '../config';

const UserApi = {
    async getProfile() {
        const response = await httpClient.get(ENDPOINTS.USER.PROFILE);
        if (response.success && response.data) {
            await TokenManager.setUserInfo(response.data);
        }
        return response;
    },

    async updateProfile(data) {
        const response = await httpClient.put(ENDPOINTS.USER.PROFILE, data);
        if (response.success && response.data) {
            await TokenManager.setUserInfo(response.data);
        }
        return response;
    },

    async uploadKYC(formData) {
        return httpClient.upload(ENDPOINTS.USER.KYC_UPLOAD, formData);
    },

    async updateCategory(category) {
        return httpClient.put(ENDPOINTS.USER.CATEGORY, { category });
    },

    async getUserById(userId) {
        return httpClient.get(ENDPOINTS.USER.GET_BY_ID(userId));
    },
};

export default UserApi;
