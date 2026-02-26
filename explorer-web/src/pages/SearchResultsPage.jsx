import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Search, Box, ArrowRight, Wallet, TrendingUp, History, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import Navbar from '../components/layout/Navbar';
import blockchainApi from '../api/blockchainApi';

const SearchResultsPage = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const navigate = useNavigate();

    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSearch = async () => {
            if (!query.trim()) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await blockchainApi.search(query);
                const data = response.data || response;

                // If it's a direct match, auto-navigate
                if (['block', 'transaction', 'asset', 'loan'].includes(data.type) && data.results?.length > 0) {
                    navigate(data.results[0].link, { replace: true });
                } else {
                    setResults(data);
                }
            } catch (error) {
                console.error('Search error:', error);
                setResults({ type: 'error', results: [] });
            } finally {
                setLoading(false);
            }
        };

        fetchSearch();
    }, [query, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-900">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                        <p className="text-slate-400">Đang tìm kiếm trên mạng lưới...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <Search className="w-6 h-6 text-primary-500" />
                        Search Results
                    </h1>
                    <p className="text-slate-400">
                        Kết quả cho <span className="text-white font-mono break-all bg-dark-700 px-2 py-0.5 rounded">"{query}"</span>
                    </p>
                </div>

                {!query.trim() ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <Search className="w-12 h-12 text-slate-600 mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">Tìm kiếm trống</h3>
                            <p className="text-slate-400">Vui lòng nhập số khối, mã giao dịch, mã khoản vay hoặc mục đích.</p>
                        </CardContent>
                    </Card>
                ) : !results || results.results?.length === 0 || results.type === 'none' ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                                <Search className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Không tìm thấy kết quả</h3>
                            <p className="text-slate-400 mb-6 max-w-sm">Không tìm thấy khối, giao dịch, tài sản hoặc khoản vay phù hợp với từ khóa của bạn.</p>
                            <Link to="/">
                                <Button>Quay lại Tổng quan</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : results.type === 'loans' ? (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white mb-4">Tìm thấy {results.results.length} khoản vay liên quan</h2>
                        {results.results.map((item, idx) => (
                            <Link key={idx} to={item.link} className="block group">
                                <Card className="hover:border-primary-500/30 transition-colors">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary-500/10 rounded-xl text-primary-400">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-medium group-hover:text-primary-400 transition-colors">{item.title}</h3>
                                                <p className="text-sm text-slate-400 mt-1">{item.subtitle}</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-primary-400 transition-colors" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    // Fallback for unexpected direct matches that didn't auto-redirect
                    <div className="space-y-4">
                        {results.results.map((item, idx) => (
                            <Link key={idx} to={item.link} className="block group">
                                <Card className="hover:border-primary-500/30 transition-colors">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary-500/10 rounded-xl text-primary-400">
                                                <Search className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-medium">{item.title}</h3>
                                                <p className="text-sm text-slate-400 truncate max-w-md">{item.subtitle}</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-primary-400 transition-colors" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchResultsPage;
