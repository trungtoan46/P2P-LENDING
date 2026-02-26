import api from '../../../lib/axios';
import type { Loan } from '../../../types';

// Lấy thống kê dashboard từ API thật
export const getDashboardStats = async () => {
    try {
        // Gọi nhiều API để lấy số liệu thống kê
        const [usersRes, loansRes, investmentsRes] = await Promise.all([
            api.get('/users').catch(() => ({ data: [] })),
            api.get('/loans').catch(() => ({ data: [] })),
            api.get('/investments').catch(() => ({ data: [] })),
        ]);

        const users = usersRes.data.data || usersRes.data || [];
        const loans = loansRes.data.data || loansRes.data || [];
        const investments = investmentsRes.data.data || investmentsRes.data || [];

        // Tính toán thống kê từ dữ liệu thật
        const totalBorrowers = users.filter((u: any) => u.category === 'borrower' || u.category === 'both').length;
        const totalLenders = users.filter((u: any) => u.category === 'lender' || u.category === 'both').length;
        const activeLoans = loans.filter((l: any) => l.status === 'active');
        const pendingLoans = loans.filter((l: any) => l.status === 'pending');

        // Tính tổng dư nợ
        const totalOutstanding = activeLoans.reduce((sum: number, loan: any) => {
            return sum + (loan.capital || 0);
        }, 0);

        return {
            totalUsers: users.length,
            totalBorrowers,
            totalLenders,
            totalLoans: loans.length,
            totalActiveLoans: activeLoans.length,
            totalInvestments: investments.length,
            totalOutstanding,
            pendingKyc: 0, // Sẽ được cập nhật từ API kyc
            pendingLoans: pendingLoans.length,
        };
    } catch (error) {
        console.error('Lỗi khi lấy thống kê dashboard:', error);
        return {
            totalUsers: 0,
            totalBorrowers: 0,
            totalLenders: 0,
            totalLoans: 0,
            totalActiveLoans: 0,
            totalInvestments: 0,
            totalOutstanding: 0,
            pendingKyc: 0,
            pendingLoans: 0,
        };
    }
};

// Lấy danh sách khoản vay gần đây
export const getRecentLoans = async (limit = 5): Promise<Loan[]> => {
    try {
        const response = await api.get('/loans', { params: { limit, sort: '-createdAt' } });
        const loans = response.data.data || response.data || [];
        return loans.slice(0, limit);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách khoản vay gần đây:', error);
        return [];
    }
};

// Lấy số lượng KYC chờ duyệt
export const getPendingKycCount = async (): Promise<number> => {
    try {
        const response = await api.get('/users/kyc/pending');
        const data = response.data.data || response.data || [];
        return Array.isArray(data) ? data.length : 0;
    } catch (error) {
        console.error('Lỗi khi lấy số KYC chờ duyệt:', error);
        return 0;
    }
};
