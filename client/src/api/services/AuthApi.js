/**
 * @description Auth API
 */

import httpClient from '../httpClient';
import { ENDPOINTS, TokenManager } from '../config';

const AuthApi = {
    async register(phone) {
        return httpClient.post(ENDPOINTS.AUTH.REGISTER, { phone }, { auth: false });
    },

    async verifyOtp(phone, code, password, category) {
        const response = await httpClient.post(
            ENDPOINTS.AUTH.VERIFY_OTP,
            { phone, code, password, category },
            { auth: false }
        );
        if (response.success && response.data?.token) {
            await TokenManager.setAccessToken(response.data.token);
            if (response.data.refreshToken) {
                await TokenManager.setRefreshToken(response.data.refreshToken);
            }
            if (response.data.user) {
                await TokenManager.setUserInfo(response.data.user);
            }
        }
        return response;
    },

    async login(phone, password) {
        const response = await httpClient.post(
            ENDPOINTS.AUTH.LOGIN,
            { phone, password },
            { auth: false }
        );
        if (response.success && response.data?.token) {
            await TokenManager.setAccessToken(response.data.token);
            if (response.data.refreshToken) {
                await TokenManager.setRefreshToken(response.data.refreshToken);
            }
            if (response.data.user) {
                await TokenManager.setUserInfo(response.data.user);
            }
        }
        return response;
    },

    async logout() {
        await TokenManager.clearTokens();
        return { success: true };
    },

    async isLoggedIn() {
        const token = await TokenManager.getAccessToken();
        return !!token;
    },

    async getCurrentUser() {
        return TokenManager.getUserInfo();
    },
};

export default AuthApi;
