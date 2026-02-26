import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Box, Activity, Clock, Database, ArrowRight, Wallet, TrendingUp, Users, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import Navbar from '../components/layout/Navbar';
import { useBlockchain } from '../hooks/useBlockchain';
import blockchainApi from '../api/blockchainApi';

const formatVND = (amount) => {
    if (!amount) return '0';
    if (amount >= 1e9) return (amount / 1e9).toFixed(1) + 'B';
    if (amount >= 1e6) return (amount / 1e6).toFixed(1) + 'M';
    return new Intl.NumberFormat('vi-VN').format(amount);
};

const HomePage = () => {
    const { chainInfo: rawChainInfo, latestBlocks, loading, connected } = useBlockchain();
    const chainInfo = rawChainInfo || { height: 0, currentBlockHash: '' };
    const [searchQuery, setSearchQuery] = useState('');
    const [dashboardStats, setDashboardStats] = useState(null);
    const [activities, setActivities] = useState([]);
    const [p2pLoading, setP2pLoading] = useState(true);

    // Search states
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef(null);

    const navigate = useNavigate();

    // Close suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!searchQuery.trim() || searchQuery.length < 2) {
                setSuggestions(null);
                return;
            }
            try {
                setIsSearching(true);
                const res = await blockchainApi.search(searchQuery);
                const data = res.data || res;
                setSuggestions(data);
                setShowSuggestions(true);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeout = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    // Fetch P2P stats
    useEffect(() => {
        const fetchP2P = async () => {
            try {
                const [statsRes, activitiesRes] = await Promise.all([
                    blockchainApi.getDashboardStats(),
                    blockchainApi.getRecentActivities(10),
                ]);
                setDashboardStats(statsRes.data || statsRes);
                setActivities(activitiesRes.data || activitiesRes || []);
            } catch (err) {
                console.error('P2P stats error:', err.message);
            } finally {
                setP2pLoading(false);
            }
        };
        fetchP2P();
    }, []);

    const handleSearch = () => {
        if (!searchQuery.trim()) return;
        setShowSuggestions(false);
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'N/A';
        const diff = Date.now() - new Date(timestamp).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        return `${Math.floor(hours / 24)} ngày trước`;
    };

    const overview = dashboardStats?.overview || {};
    const financial = dashboardStats?.financial || {};

    const p2pStats = [
        {
            label: 'Tổng cho vay',
            value: formatVND(financial.totalLendingVolume),
            icon: Wallet,
            gradient: 'from-blue-500 to-blue-700',
            glow: 'shadow-blue-500/20',
        },
        {
            label: 'Khoản vay hoạt động',
            value: overview.activeLoans?.toString() || '0',
            icon: FileText,
            gradient: 'from-emerald-500 to-emerald-700',
            glow: 'shadow-emerald-500/20',
        },
        {
            label: 'Nhà đầu tư',
            value: overview.totalInvestors?.toString() || '0',
            icon: Users,
            gradient: 'from-violet-500 to-violet-700',
            glow: 'shadow-violet-500/20',
        },
        {
            label: 'Lãi suất TB',
            value: financial.avgInterestRate ? `${financial.avgInterestRate}%` : '-',
            icon: TrendingUp,
            gradient: 'from-amber-500 to-amber-700',
            glow: 'shadow-amber-500/20',
        },
    ];

    const blockchainStats = [
        {
            label: 'Chiều cao Block',
            value: chainInfo.height?.toLocaleString() || '0',
            icon: Box,
            gradient: 'from-cyan-500 to-cyan-700',
            glow: 'shadow-cyan-500/20',
        },
        {
            label: 'Tổng khoản vay',
            value: overview.totalLoans?.toString() || '0',
            icon: Activity,
            gradient: 'from-rose-500 to-rose-700',
            glow: 'shadow-rose-500/20',
        },
        {
            label: 'Hoàn thành',
            value: overview.completedLoans?.toString() || '0',
            icon: Database,
            gradient: 'from-teal-500 to-teal-700',
            glow: 'shadow-teal-500/20',
        },
        {
            label: 'Tổng lợi nhuận',
            value: formatVND(financial.totalProfit),
            icon: Clock,
            gradient: 'from-orange-500 to-orange-700',
            glow: 'shadow-orange-500/20',
        },
    ];

    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />

            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary-900/30 via-dark-900 to-dark-900" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-600/10 rounded-full blur-3xl animate-pulse-slow" />

                <div className="relative max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl text-center mb-6 animate-fade-in-up">
                        <span className="text-gradient">Phi tập trung</span> Cho vay P2P
                    </h1>
                    <p className="text-center text-slate-400 mb-6 text-lg max-w-2xl mx-auto animate-fade-in-up delay-100">
                        Khám phá dữ liệu mạng cho vay ngang hàng trên blockchain theo thời gian thực. Xác minh giao dịch minh bạch, hợp đồng thông minh và lịch sử khoản vay một cách an toàn.
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-10 animate-fade-in-up delay-200">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-slate-500'}`} />
                        <span className="text-xs text-slate-500">
                            {connected ? 'Cập nhật thời gian thực' : 'Đang kết nối...'}
                        </span>
                    </div>
                    <div className="max-w-3xl mx-auto">
                        <div className="relative group" ref={searchRef}>
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl opacity-20 group-focus-within:opacity-40 blur transition-opacity" />
                            <div className="relative flex items-center bg-dark-700/80 backdrop-blur-xl rounded-2xl border border-white/10 z-20">
                                <Search className="h-5 w-5 text-slate-500 ml-5" />
                                <input
                                    type="text"
                                    className="flex-1 bg-transparent px-4 py-4 text-white placeholder-slate-500 focus:outline-none text-sm"
                                    placeholder="Tìm theo Số Block / Mã giao dịch / Mã khoản vay / Mục đích..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => { if (searchQuery.length >= 2) setShowSuggestions(true); }}
                                    onKeyDown={handleKeyDown}
                                />
                                <div className="pr-2 flex items-center gap-2">
                                    {isSearching && <Loader2 className="w-5 h-5 text-primary-500 animate-spin mr-2" />}
                                    <Button size="sm" onClick={handleSearch} className="rounded-xl">Tìm kiếm</Button>
                                </div>
                            </div>

                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                                    {suggestions.type === 'none' ? (
                                        <div className="p-4 text-center text-sm text-slate-400">
                                            Không tìm thấy kết quả
                                        </div>
                                    ) : (
                                        <div className="py-2">
                                            {suggestions.results?.slice(0, 5).map((res, idx) => (
                                                <Link
                                                    key={idx}
                                                    to={res.link}
                                                    onClick={() => setShowSuggestions(false)}
                                                    className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400 shrink-0">
                                                            {suggestions.type === 'block' ? <Box className="w-4 h-4" /> :
                                                                suggestions.type === 'transaction' ? <ArrowRight className="w-4 h-4" /> :
                                                                    <FileText className="w-4 h-4" />}
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="text-sm font-medium text-white truncate">{res.title}</p>
                                                            <p className="text-xs text-slate-400 truncate">{res.subtitle}</p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-16">
                {/* P2P Lending Stats */}
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 animate-fade-in-up delay-200">
                    <Wallet className="w-5 h-5 text-primary-400" /> Cho vay P2P
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8 animate-fade-in-up delay-300">
                    {p2pStats.map((stat) => (
                        <Card key={stat.label} className="overflow-hidden hover:-translate-y-1 transition-transform duration-300">
                            <CardContent className="p-5 flex items-center">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.glow} mr-4`}>
                                    <stat.icon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                                    <h3 className="text-2xl font-bold text-white tracking-tight">
                                        {p2pLoading ? <div className="h-7 w-20 bg-dark-700 animate-pulse rounded" /> : stat.value}
                                    </h3>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Blockchain Stats */}
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 animate-fade-in-up delay-300">
                    <Box className="w-5 h-5 text-cyan-400" /> Tổng quan mạng lưới
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8 animate-fade-in-up delay-300">
                    {blockchainStats.map((stat) => (
                        <Card key={stat.label} className="overflow-hidden hover:-translate-y-1 transition-transform duration-300">
                            <CardContent className="p-5 flex items-center">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.glow} mr-4`}>
                                    <stat.icon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                                    <h3 className="text-2xl font-bold text-white tracking-tight">
                                        {(loading && p2pLoading) ? <div className="h-7 w-20 bg-dark-700 animate-pulse rounded" /> : stat.value}
                                    </h3>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-fade-in-up delay-300">
                    {/* Recent Activities - P2P */}
                    <Card className="lg:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-bold">Hoạt động gần đây</CardTitle>
                            <Link to="/loans">
                                <Button variant="ghost" size="sm" className="text-primary-400 hover:text-primary-300">
                                    Xem khoản vay
                                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {p2pLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-14 bg-dark-700/50 rounded-xl animate-pulse" />
                                    ))
                                ) : activities.length === 0 ? (
                                    <p className="text-slate-500 text-sm text-center py-4">Chưa có hoạt động nào</p>
                                ) : (
                                    activities.slice(0, 8).map((act, idx) => (
                                        <Link
                                            key={idx}
                                            to={act.type === 'loan' ? `/loans/${act.id}` : `/loans/${act.loanId}`}
                                            className="flex items-center justify-between p-2.5 bg-dark-700/40 rounded-xl hover:bg-dark-700/80 transition-all border border-white/3 group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${act.type === 'loan'
                                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    }`}>
                                                    {act.type === 'loan' ? <FileText className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-slate-200 group-hover:text-white">{act.action}</p>
                                                    <p className="text-[10px] text-slate-500">{act.detail}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-semibold text-white">{formatVND(act.amount)}</p>
                                                <p className="text-[10px] text-slate-500">{formatTimeAgo(act.timestamp)}</p>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Latest Blocks */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-bold">Block mới nhất</CardTitle>
                            <Link to="/blocks">
                                <Button variant="ghost" size="sm" className="text-primary-400 hover:text-primary-300">
                                    Xem tất cả
                                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-16 bg-dark-700/50 rounded-xl animate-pulse" />
                                    ))
                                ) : (
                                    latestBlocks.slice(0, 5).map((block) => (
                                        <Link
                                            key={block.number}
                                            to={`/blocks/${block.number}`}
                                            className="flex items-center justify-between p-3 bg-dark-700/40 rounded-xl hover:bg-dark-700/80 transition-all duration-200 border border-white/3 cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center justify-center p-1.5 bg-primary-600/10 rounded-lg text-primary-400 font-mono w-10 h-10 border border-primary-500/20">
                                                    <span className="text-[9px] opacity-70">BK</span>
                                                    <span className="font-bold text-xs">{block.number}</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-slate-200 font-mono group-hover:text-white">
                                                        {block.dataHash?.substring(0, 10)}...
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {formatTimeAgo(block.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px]">{block.txCount} GD</Badge>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Latest Transactions */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-bold">Giao dịch mới nhất</CardTitle>
                            <Link to="/transactions">
                                <Button variant="ghost" size="sm" className="text-primary-400 hover:text-primary-300">
                                    Xem tất cả
                                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-16 bg-dark-700/50 rounded-xl animate-pulse" />
                                    ))
                                ) : (
                                    latestBlocks.flatMap(b => b.transactions || []).slice(0, 5).map((tx, idx) => (
                                        <Link
                                            key={idx}
                                            to={tx.txId ? `/transactions/${tx.txId}` : '#'}
                                            className="flex items-center justify-between p-3 bg-dark-700/40 rounded-xl hover:bg-dark-700/80 transition-all duration-200 border border-white/3 cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-primary-400 font-mono truncate w-28 group-hover:text-primary-300">
                                                        {tx.txId?.substring(0, 14)}...
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{tx.creatorMsp}</p>
                                                </div>
                                            </div>
                                            <Badge variant="success" className="text-[10px]">Hợp lệ</Badge>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
