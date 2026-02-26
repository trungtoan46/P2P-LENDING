import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/layout/Navbar';
import blockchainApi from '../api/blockchainApi';

const STATUS_FILTERS = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Chờ duyệt', value: 'pending' },
    { label: 'Đã duyệt', value: 'approved' },
    { label: 'Hoạt động', value: 'active' },
    { label: 'Hoàn thành', value: 'completed' },
    { label: 'Quá hạn', value: 'defaulted' },
];

const statusVariant = (status) => {
    const map = {
        pending: 'warning',
        approved: 'secondary',
        active: 'success',
        waiting: 'secondary',
        completed: 'success',
        success: 'success',
        clean: 'default',
        defaulted: 'destructive',
        fail: 'destructive',
    };
    return map[status] || 'default';
};

const formatVND = (amount) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
};

const LoansPage = () => {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchLoans = async (page = 1, status = statusFilter) => {
        try {
            setLoading(true);
            const response = await blockchainApi.getPublicLoans({ status, page, limit: 10 });
            const data = response.data || response;
            setLoans(data.loans || []);
            setPagination(data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
        } catch (error) {
            console.error('Error fetching loans:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoans(1, statusFilter);
    }, [statusFilter]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLoans(newPage);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Khoản vay P2P</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {pagination.total} khoản vay trên mạng lưới
                        </p>
                    </div>
                </div>

                {/* Status Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {STATUS_FILTERS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${statusFilter === f.value
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                : 'bg-dark-700 text-slate-400 hover:bg-dark-600 hover:text-white border border-white/5'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Loans Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vốn vay</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Kỳ hạn</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Lãi suất</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tiến độ</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Trạng thái</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ngày tạo</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={8} className="px-4 py-4">
                                                    <div className="h-8 bg-dark-700/50 rounded animate-pulse" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : loans.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                                Không tìm thấy khoản vay
                                            </td>
                                        </tr>
                                    ) : (
                                        loans.map((loan) => (
                                            <tr key={loan.id} className="border-b border-white/3 hover:bg-dark-700/40 transition-colors">
                                                <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                                                    {loan.loanIndex}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-semibold text-white">{formatVND(loan.capital)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-300">{loan.term} tháng</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-amber-400 font-medium">{loan.interestRate}%</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-dark-600 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all"
                                                                style={{ width: `${loan.completionPercent}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-slate-400">{loan.completionPercent}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={statusVariant(loan.status)}>{loan.status}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500">
                                                    {new Date(loan.createdAt).toLocaleDateString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link to={`/loans/${loan.id}`}>
                                                        <Button variant="ghost" size="sm" className="text-primary-400 hover:text-primary-300">
                                                            <ArrowRight className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-slate-500">
                            Trang {pagination.page} / {pagination.totalPages} (tổng số {pagination.total})
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoansPage;
