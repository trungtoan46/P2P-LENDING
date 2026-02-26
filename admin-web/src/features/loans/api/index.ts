import api from '../../../lib/axios';
import type { Loan } from '../../../types';
import { LoanStatus } from '../../../config/enums';

// Lấy danh sách loans với filters
export const getLoans = async (params?: {
    status?: string;
    borrowerId?: string;
    page?: number;
    limit?: number;
}): Promise<Loan[]> => {
    try {
        const response = await api.get('/loans', { params });
        return response.data.data || response.data || [];
    } catch (error) {
        console.error('Lỗi khi lấy danh sách khoản vay:', error);
        return [];
    }
};

// Lấy thông tin loan theo ID
export const getLoanById = async (id: string): Promise<Loan | null> => {
    try {
        const response = await api.get(`/loans/${id}`);
        return response.data.data || response.data;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin khoản vay:', error);
        return null;
    }
};

// Lấy loans chờ duyệt
export const getPendingLoans = async (): Promise<Loan[]> => {
    try {
        const response = await api.get('/loans', { params: { status: LoanStatus.PENDING } });
        return response.data.data || response.data || [];
    } catch (error) {
        console.error('Lỗi khi lấy khoản vay chờ duyệt:', error);
        return [];
    }
};

// Lấy loans đang hoạt động
export const getActiveLoans = async (): Promise<Loan[]> => {
    try {
        const response = await api.get('/loans', { params: { status: LoanStatus.ACTIVE } });
        return response.data.data || response.data || [];
    } catch (error) {
        console.error('Lỗi khi lấy khoản vay đang hoạt động:', error);
        return [];
    }
};

// Lấy loans quá hạn/nợ xấu
export const getOverdueLoans = async (): Promise<Loan[]> => {
    try {
        const response = await api.get('/loans', { params: { status: LoanStatus.DEFAULTED } });
        return response.data.data || response.data || [];
    } catch (error) {
        console.error('Lỗi khi lấy khoản vay quá hạn:', error);
        return [];
    }
};

// Duyệt khoản vay - POST /loans/:id/approve
export const approveLoan = async (loanId: string): Promise<boolean> => {
    try {
        await api.post(`/loans/${loanId}/approve`);
        return true;
    } catch (error) {
        console.error('Lỗi khi duyệt khoản vay:', error);
        return false;
    }
};

// Từ chối khoản vay - POST /loans/:id/reject
export const rejectLoan = async (loanId: string, reason: string): Promise<boolean> => {
    try {
        await api.post(`/loans/${loanId}/reject`, { reason });
        return true;
    } catch (error) {
        console.error('Lỗi khi từ chối khoản vay:', error);
        return false;
    }
};

// Giải ngân khoản vay - POST /loans/:id/disburse
export const disburseLoan = async (loanId: string): Promise<boolean> => {
    try {
        await api.post(`/loans/${loanId}/disburse`);
        return true;
    } catch (error) {
        console.error('Lỗi khi giải ngân khoản vay:', error);
        return false;
    }
};
