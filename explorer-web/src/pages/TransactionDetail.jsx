import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/layout/Navbar';
import blockchainApi from '../api/blockchainApi';

const TransactionDetailIdx = () => {
    const { txId } = useParams();
    const [tx, setTx] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTx = async () => {
            try {
                const response = await blockchainApi.getTransaction(txId);
                setTx(response.data || response);
            } catch (error) {
                console.error("Error fetching tx:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTx();
    }, [txId]);

    if (loading) return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        </div>
    );

    if (!tx) return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="flex justify-center items-center h-[calc(100vh-64px)] text-slate-400">Không tìm thấy giao dịch</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Link to="/" className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại Tổng quan
                </Link>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-white">Chi tiết giao dịch</h1>
                    <Badge variant={tx.validationCode === 0 ? "success" : "destructive"} className="text-sm px-3 py-1">
                        {tx.validationCode === 0 ? "HỢP LỆ" : "KHÔNG HỢP LỆ"}
                    </Badge>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tổng quan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm font-medium text-slate-400 mb-1">Mã giao dịch</p>
                                    <p className="text-sm font-mono text-slate-200 bg-dark-700 px-3 py-2 rounded-lg border border-white/5 break-all select-all">{tx.txId}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-400 mb-1">Kênh</p>
                                    <p className="text-sm font-mono text-slate-200">{tx.channelId}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-400 mb-1">Thời gian</p>
                                    <p className="text-sm text-slate-200">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-400 mb-1">Creator MSP</p>
                                    <p className="text-sm font-mono text-slate-200">{tx.creatorMsp}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Tập đọc/ghi</CardTitle>
                            <div className="flex items-center text-xs text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20">
                                <Shield className="w-3 h-3 mr-1.5" />
                                Bảo mật quyền riêng tư: Mã người dùng đã được ẩn
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-dark-700 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-white/5">
                                <pre>{JSON.stringify(tx.rwSet || { note: "Dữ liệu thô đang được xử lý" }, null, 2)}</pre>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TransactionDetailIdx;
