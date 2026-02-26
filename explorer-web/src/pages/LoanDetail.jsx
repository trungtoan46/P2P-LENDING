import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Clock, TrendingUp, Users, FileText, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import Navbar from '../components/layout/Navbar';
import blockchainApi from '../api/blockchainApi';

const statusVariant = (status) => {
    const map = {
        pending: 'warning', approved: 'secondary', active: 'success',
        waiting: 'secondary', completed: 'success', success: 'success',
        clean: 'default', defaulted: 'destructive', fail: 'destructive',
    };
    return map[status] || 'default';
};

const formatVND = (amount) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
};

const LoanDetail = () => {
    const { id } = useParams();
    const [loan, setLoan] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await blockchainApi.getLoanDetail(id);
                const data = response.data || response;
                setLoan(data);

                // Fetch blockchain history if has blockchainContractId
                if (data.blockchainContractId) {
                    try {
                        const historyRes = await blockchainApi.getAssetHistory(data.blockchainContractId);
                        setHistory(historyRes.data || historyRes || []);
                    } catch (e) {
                        console.warn('No blockchain history:', e.message);
                    }
                }
            } catch (error) {
                console.error('Error fetching loan:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-900">
                <Navbar />
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 bg-dark-700/50 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!loan) {
        return (
            <div className="min-h-screen bg-dark-900">
                <Navbar />
                <div className="max-w-5xl mx-auto px-4 py-8 text-center">
                    <p className="text-slate-400 text-lg">Không tìm thấy khoản vay</p>
                    <Link to="/loans">
                        <Button variant="outline" className="mt-4">Quay lại khoản vay</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const infoItems = [
        { label: 'Vốn vay', value: formatVND(loan.capital), icon: Wallet, color: 'text-blue-400' },
        { label: 'Kỳ hạn', value: `${loan.term} tháng`, icon: Clock, color: 'text-amber-400' },
        { label: 'Lãi suất', value: `${loan.interestRate}%`, icon: TrendingUp, color: 'text-emerald-400' },
        { label: 'Trả hàng tháng', value: formatVND(loan.monthlyPayment), icon: Wallet, color: 'text-violet-400' },
    ];

    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Link to="/loans">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Chi tiết khoản vay</h1>
                                <p className="text-xs text-slate-500 font-mono">{id}</p>
                            </div>
                        </div>
                    </div>
                    <Badge variant={statusVariant(loan.status)} className="text-sm px-3 py-1">
                        {loan.status}
                    </Badge>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {infoItems.map((item) => (
                        <Card key={item.label}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <item.icon className={`w-5 h-5 ${item.color}`} />
                                    <div>
                                        <p className="text-xs text-slate-500">{item.label}</p>
                                        <p className="text-lg font-bold text-white">{item.value}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Loan Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin khoản vay</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Tổng hoàn trả</span>
                                    <span className="text-white font-medium">{formatVND(loan.totalRepayment)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Tổng lãi</span>
                                    <span className="text-amber-400 font-medium">{formatVND(loan.totalInterest)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Điểm tín dụng</span>
                                    <span className="text-white font-medium">{loan.creditScore}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Mục đích</span>
                                    <span className="text-white text-right max-w-[200px] truncate">{loan.purpose || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Giải ngân</span>
                                    <span className="text-white">{loan.disbursementDate ? new Date(loan.disbursementDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-slate-400">Đáo hạn</span>
                                    <span className="text-white">{loan.maturityDate ? new Date(loan.maturityDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Investment Progress */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tiến độ đầu tư</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-400">Đã huy động</span>
                                    <span className="text-white font-bold">{loan.completionPercent || 0}%</span>
                                </div>
                                <div className="w-full h-3 bg-dark-600 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${loan.completionPercent || 0}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>{loan.investedNotes || 0} phiếu đã đầu tư</span>
                                    <span>{loan.totalNotes || 0} tổng phiếu</span>
                                </div>
                            </div>

                            {/* Investment Stats */}
                            {loan.investmentInfo && (
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-slate-400 flex items-center gap-2">
                                            <Users className="w-4 h-4" /> Nhà đầu tư
                                        </span>
                                        <span className="text-white font-medium">{loan.investmentInfo.investorCount}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-slate-400">Tổng đầu tư</span>
                                        <span className="text-emerald-400 font-medium">{formatVND(loan.investmentInfo.totalInvested)}</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-400">Lượt đầu tư</span>
                                        <span className="text-white">{loan.investmentInfo.investmentCount}</span>
                                    </div>
                                </div>
                            )}

                            {/* Blockchain Link */}
                            {loan.blockchainContractId && (
                                <div className="mt-4 p-3 bg-dark-700/50 rounded-lg border border-white/5">
                                    <p className="text-xs text-slate-500 mb-1">Hợp đồng Blockchain</p>
                                    <Link
                                        to={`/history/${loan.blockchainContractId}`}
                                        className="text-sm text-primary-400 hover:text-primary-300 font-mono flex items-center gap-1"
                                    >
                                        {loan.blockchainContractId}
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Blockchain History */}
                {history.length > 0 && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Lịch sử Blockchain</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {history.map((entry, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 bg-dark-700/30 rounded-lg border border-white/3">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-slate-500">
                                                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString('vi-VN') : 'N/A'}
                                                </span>
                                                {entry.txId && (
                                                    <Link
                                                        to={`/transactions/${entry.txId}`}
                                                        className="text-xs text-primary-400 hover:text-primary-300 font-mono"
                                                    >
                                                        {entry.txId.substring(0, 12)}...
                                                    </Link>
                                                )}
                                            </div>
                                            <pre className="text-xs text-slate-300 bg-dark-800 p-2 rounded overflow-x-auto">
                                                {typeof entry.value === 'string'
                                                    ? entry.value
                                                    : JSON.stringify(entry.value, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default LoanDetail;
