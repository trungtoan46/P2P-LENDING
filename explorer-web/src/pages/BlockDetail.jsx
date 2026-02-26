import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Box, Clock, Hash, FileText, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/layout/Navbar';
import blockchainApi from '../api/blockchainApi';

const BlockDetail = () => {
    const { blockNumber } = useParams();
    const [block, setBlock] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlock = async () => {
            try {
                const response = await blockchainApi.getBlock(blockNumber);
                setBlock(response.data || response);
            } catch (error) {
                console.error("Error fetching block:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlock();
    }, [blockNumber]);

    if (loading) return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        </div>
    );

    if (!block) return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="flex justify-center items-center h-[calc(100vh-64px)] text-slate-400">Không tìm thấy khối</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Link to="/blocks" className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách khối
                </Link>

                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg shadow-blue-500/20">
                        <Box className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Block #{block.number}</h1>
                        <p className="text-slate-400 text-sm">Xem thông tin chi tiết về khối này</p>
                    </div>
                </div>

                <div className="grid gap-6 mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin khối</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400 mb-2">Mã băm dữ liệu</h3>
                                    <div className="flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-slate-500" />
                                        <span className="font-mono text-sm bg-dark-700 text-slate-200 px-3 py-1.5 rounded-lg select-all border border-white/5 break-all">
                                            {block.dataHash}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400 mb-2">Mã băm trước</h3>
                                    <div className="flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-slate-500" />
                                        <span className="font-mono text-sm bg-dark-700 text-slate-200 px-3 py-1.5 rounded-lg select-all border border-white/5 break-all">
                                            {block.previousHash}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400 mb-2">Số giao dịch</h3>
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm font-medium text-white">{block.txCount} giao dịch</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400 mb-2">Thời gian khối</h3>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm text-slate-200">
                                            {block.timestamp
                                                ? new Date(block.timestamp).toLocaleString()
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Giao dịch</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {block.transactions && block.transactions.map((tx, idx) => (
                                    <Link key={idx} to={`/transactions/${tx.txId}`} className="block group">
                                        <div className="flex items-center justify-between p-4 bg-dark-700/40 border border-white/5 rounded-xl hover:bg-dark-700/80 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-mono text-sm text-primary-400 font-medium group-hover:text-primary-300 transition-colors break-all">{tx.txId}</p>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <span className="text-xs text-slate-500">
                                                            MSP: {tx.creatorMsp}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline">Xem chi tiết</Badge>
                                        </div>
                                    </Link>
                                ))}
                                {(!block.transactions || block.transactions.length === 0) && (
                                    <p className="text-center text-slate-500 py-8">Không có giao dịch trong khối này</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default BlockDetail;
