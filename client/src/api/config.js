/**
 * @description API Configuration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER_INFO: 'userInfo',
};

// API Base URL

export const API_BASE_URL = "https://api.ventop2p.site";
// export const API_BASE_URL = "http://192.168.50.65:3000";
// API Endpoints
export const ENDPOINTS = {
    AUTH: {
        REGISTER: '/api/auth/register',
        LOGIN: '/api/auth/login',
        VERIFY_OTP: '/api/auth/verify-otp',
        REFRESH: '/api/auth/refresh-token',
        CHANGE_PASSWORD: '/api/auth/change-password',
    },
    USER: {
        PROFILE: '/api/users/profile',
        KYC_UPLOAD: '/api/users/kyc/upload',
        CATEGORY: '/api/users/category',
        GET_BY_ID: (id) => `/api/users/${id}`,
    },
    LOANS: {
        LIST: '/api/loans',
        CREATE: '/api/loans',
        DETAIL: (id) => `/api/loans/${id}`,
        MY_LOANS: '/api/loans/my-loans',
        APPROVE: (id) => `/api/loans/${id}/approve`,
        REJECT: (id) => `/api/loans/${id}/reject`,
        SIGN: (id) => `/api/loans/${id}/sign`,
        CANCEL: (id) => `/api/loans/${id}/cancel`,
    },
    INVESTMENTS: {
        CREATE: '/api/investments',
        MY_INVESTMENTS: '/api/investments/my-investments',
        BY_LOAN: (loanId) => `/api/investments/loan/${loanId}`,
        DETAIL: (id) => `/api/investments/${id}`,
        MATCH: (loanId) => `/api/investments/match/${loanId}`,
        CONFIRM: (id) => `/api/investments/${id}/confirm`,
    },
    WAITING_ROOMS: {
        CREATE: '/api/waiting-rooms',
        MY_ROOMS: '/api/waiting-rooms/my-rooms',
        DETAIL: (id) => `/api/waiting-rooms/${id}`,
        CANCEL: (id) => `/api/waiting-rooms/${id}/cancel`,
    },
    WALLET: {
        BALANCE: '/api/wallet/balance',
        DEPOSIT: '/api/wallet/deposit',
        WITHDRAW: '/api/wallet/withdraw',
        MOCK_DEPOSIT: '/api/wallet/mock-deposit',
        TRANSACTIONS: '/api/wallet/transactions',
    },
    PAYMENTS: {
        ALL: '/api/payments/all',
        DUE: '/api/payments/my-payments',
        HISTORY: '/api/payments/history',
        BY_LOAN: (loanId) => `/api/payments/loan/${loanId}`,
        PAY: (id) => `/api/payments/${id}/pay`,
        PAY_MULTIPLE: '/api/payments/pay-multiple',
    },
    REMINDERS: {
        MY_REMINDERS: '/api/reminders/my-reminders',
        UPCOMING: '/api/reminders/upcoming',
    },
    EKYC: {
        STATUS: '/api/ekyc/status',
        FRONT_ID: '/api/ekyc/front-id',
        BACK_ID: '/api/ekyc/back-id',
        DETECT_FACE: '/api/ekyc/detect-face',
        LIVENESS: '/api/ekyc/liveness',
        PROCESS: '/api/ekyc/process',
    },
    PAYOS: {
        CREATE_LINK: '/api/payos/create-link',
        VERIFY: (orderCode) => `/api/payos/verify/${orderCode}`,
        HISTORY: '/api/payos/history',
    },
    AUTO_INVEST: {
        BASE: '/api/auto-invest',
    }
};

// Token Manager
export const TokenManager = {
    async getAccessToken() {
        return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    },
    async setAccessToken(token) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    },
    async getRefreshToken() {
        return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    },
    async setRefreshToken(token) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    },
    async setTokens(accessToken, refreshToken) {
        await AsyncStorage.multiSet([
            [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
            [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        ]);
    },
    async clearTokens() {
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.ACCESS_TOKEN,
            STORAGE_KEYS.REFRESH_TOKEN,
            STORAGE_KEYS.USER_INFO,
        ]);
    },
    async getUserInfo() {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
        return data ? JSON.parse(data) : null;
    },
    async setUserInfo(userInfo) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
    },
};
