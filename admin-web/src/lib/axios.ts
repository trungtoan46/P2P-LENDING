import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

// Tạo axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - tự động gắn token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - xử lý lỗi chung
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const message = error.response?.data?.message || 'Phiên làm việc hết hạn';

            // Xóa token trước
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');

            // Hiển thị thông báo và redirect
            if (!window.location.pathname.includes('/login')) {
                // Sử dụng alert cơ bản hoặc nếu app đã cài antd thì dùng Modal
                alert(message);
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
