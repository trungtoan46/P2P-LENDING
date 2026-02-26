import api from '../../../lib/axios';
import type { User, UserDetails } from '../../../types';

// Lấy danh sách users với filters
export const getUsers = async (params?: {
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}): Promise<User[]> => {
    try {
        const response = await api.get('/users', { params });
        // API trả về dạng paginated response
        return response.data.data || response.data || [];
    } catch (error) {
        console.error('Lỗi khi lấy danh sách users:', error);
        return [];
    }
};

// Lấy thông tin user theo ID
export const getUserById = async (id: string): Promise<User | null> => {
    try {
        const response = await api.get(`/users/${id}`);
        return response.data.data || response.data;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin user:', error);
        return null;
    }
};

// Lấy thông tin chi tiết user (bao gồm UserDetails)
export const getUserDetails = async (userId: string): Promise<UserDetails | null> => {
    try {
        const response = await api.get(`/users/${userId}`);
        const data = response.data.data || response.data;
        return data?.details || data;
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết user:', error);
        return null;
    }
};

// Lấy danh sách users có KYC chờ duyệt
export const getPendingKycUsers = async (): Promise<UserDetails[]> => {
    try {
        const response = await api.get('/users/kyc/pending');
        return response.data.data || response.data || [];
    } catch (error) {
        console.error('Lỗi khi lấy danh sách KYC chờ duyệt:', error);
        return [];
    }
};

// Duyệt KYC - POST /users/:id/kyc/approve
export const approveKyc = async (userId: string): Promise<boolean> => {
    try {
        await api.post(`/users/${userId}/kyc/approve`);
        return true;
    } catch (error) {
        console.error('Lỗi khi duyệt KYC:', error);
        return false;
    }
};

// Từ chối KYC - POST /users/:id/kyc/reject
export const rejectKyc = async (userId: string, reason: string): Promise<boolean> => {
    try {
        await api.post(`/users/${userId}/kyc/reject`, { reason });
        return true;
    } catch (error) {
        console.error('Lỗi khi từ chối KYC:', error);
        return false;
    }
};

// Kích hoạt user - POST /users/:id/activate
export const activateUser = async (userId: string): Promise<boolean> => {
    try {
        await api.post(`/users/${userId}/activate`);
        return true;
    } catch (error) {
        console.error('Lỗi khi kích hoạt user:', error);
        return false;
    }
};

// Vô hiệu hóa user - POST /users/:id/deactivate
export const deactivateUser = async (userId: string): Promise<boolean> => {
    try {
        await api.post(`/users/${userId}/deactivate`);
        return true;
    } catch (error) {
        console.error('Lỗi khi vô hiệu hóa user:', error);
        return false;
    }
};

// Toggle trạng thái user
export const toggleUserStatus = async (userId: string, isActive: boolean): Promise<boolean> => {
    if (isActive) {
        return activateUser(userId);
    } else {
        return deactivateUser(userId);
    }
};
