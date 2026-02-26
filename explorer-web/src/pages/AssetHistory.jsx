import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, History, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/layout/Navbar';
import blockchainApi from '../api/blockchainApi';

const AssetHistory = () => {
    const { key } = useParams();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await blockchainApi.getAssetHistory(key);
                setHistory(Array.isArray(response.data) ? response.data : (response || []));
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [key]);

    if (loading) return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
                <Link to="/" className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại Tổng quan
                </Link>

                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl shadow-lg shadow-violet-500/20">
                        <History className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Lịch sử tài sản</h1>
                        <p className="text-slate-400 font-mono text-sm mt-1">{key}</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Dòng thời gian vòng đời</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative border-l-2 border-dark-500 ml-3 space-y-8 pl-8 py-4">
                            {history.length === 0 ? (
                                <p className="text-slate-500 italic">Không tìm thấy lịch sử cho tài sản này.</p>
                            ) : (
                                history.map((item, idx) => (
                                    <div key={idx} className="relative">
                                        {/* Dot */}
                                        <div className="absolute -left-[41px] bg-dark-800 border-2 border-primary-500 rounded-full w-5 h-5 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                                        </div>

                                        <div className="bg-dark-700/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            tx: {item.txId?.substring(0, 8)}...
                                                        </Badge>
                                                        {item.isDelete && (
                                                            <Badge variant="destructive">ĐÃ XÓA</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-400 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(item.timestamp * 1000).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-dark-800 p-3 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-white/5">
                                                <pre>{JSON.stringify(item.value, null, 2)}</pre>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AssetHistory;
