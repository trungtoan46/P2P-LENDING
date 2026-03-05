/**
 * @description HTTP Client với JWT Bearer Token
 */

import { API_BASE_URL, TokenManager } from './config';
import { eventBus, EVENTS } from '../utils';

const REQUEST_TIMEOUT = 60000; // 60s cho eKYC liveness/face matching

const fetchWithTimeout = (url, options, timeout = REQUEST_TIMEOUT) => {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Request timeout'));
        }, timeout);

        fetch(url, options)
            .then(response => {
                clearTimeout(timeoutId);
                resolve(response);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
};

const createHeaders = async (includeAuth = true) => {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    if (includeAuth) {
        const token = await TokenManager.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
};

let isHandlingAuthError = false;

const handleResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (response.ok) {
        return { success: true, data, status: response.status };
    }

    const error = new Error(data?.message || `HTTP Error: ${response.status}`);
    error.status = response.status;
    error.data = data;

    if (response.status === 401) {
        error.isAuthError = true;
        await TokenManager.clearTokens();
        // Chỉ emit AUTH_ERROR 1 lần duy nhất, tránh hiện nhiều Alert
        if (!isHandlingAuthError) {
            isHandlingAuthError = true;
            eventBus.emit(EVENTS.AUTH_ERROR, data?.message || 'Phiên làm việc đã hết hạn');
            setTimeout(() => { isHandlingAuthError = false; }, 2000);
        }
    }

    throw error;
};

const httpClient = {
    async get(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = await createHeaders(options.auth !== false);
        const response = await fetchWithTimeout(url, { method: 'GET', headers });
        return handleResponse(response);
    },

    async post(endpoint, body = {}, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = await createHeaders(options.auth !== false);
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        return handleResponse(response);
    },

    async put(endpoint, body = {}, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = await createHeaders(options.auth !== false);
        const response = await fetchWithTimeout(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
        });
        return handleResponse(response);
    },

    async delete(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = await createHeaders(options.auth !== false);
        const response = await fetchWithTimeout(url, { method: 'DELETE', headers });
        return handleResponse(response);
    },

    async upload(endpoint, formData, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = await TokenManager.getAccessToken();
        const headers = { 'Accept': 'application/json' };
        if (token && options.auth !== false) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers,
            body: formData,
        });
        return handleResponse(response);
    },
};

export default httpClient;
