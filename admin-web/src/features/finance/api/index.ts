import api from '../../../lib/axios';
import type { Transaction } from '../../../types';

// Get all transactions with filters (admin)
export const getTransactions = async (params?: {
    type?: string;
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
}): Promise<Transaction[]> => {
    try {
        const response = await api.get('/wallet/all-transactions', { params });
        return response.data.data || response.data || [];
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
};

// Get transaction by ID
export const getTransactionById = async (id: string): Promise<Transaction | null> => {
    try {
        const response = await api.get(`/wallet/transactions/${id}`);
        return response.data.data || response.data;
    } catch (error) {
        console.error('Error fetching transaction:', error);
        return null;
    }
};

// Admin nạp tiền cho user
export const adminDeposit = async (userId: string, amount: number, description?: string): Promise<boolean> => {
    try {
        await api.post('/wallet/admin-deposit', { userId, amount, description });
        return true;
    } catch (error) {
        console.error('Error depositing:', error);
        return false;
    }
};

// --- Configs & Revenue ---

export const getConfigs = async () => {
    try {
        const response = await api.get('/configs');
        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching configs:', error);
        return [];
    }
};

export const updateConfig = async (key: string, value: any) => {
    try {
        const response = await api.put(`/configs/${key}`, { value });
        return response.data.data;
    } catch (error) {
        console.error('Error updating config:', error);
        throw error;
    }
};

export const getSystemRevenue = async (): Promise<number> => {
    try {
        const response = await api.get('/wallet/revenue');
        return response.data.data.totalRevenue || 0;
    } catch (error) {
        console.error('Lỗi khi lấy doanh thu hệ thống:', error);
        return 0;
    }
};

export const getUserBalance = async (userId: string): Promise<any> => {
    try {
        const response = await api.get(`/wallet/user/${userId}/balance`);
        return response.data.data;
    } catch (error) {
        console.error('Lỗi khi lấy số dư user:', error);
        return null;
    }
};
