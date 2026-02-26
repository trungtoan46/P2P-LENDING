import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/layout/Navbar';
import blockchainApi from '../api/blockchainApi';

const TransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentHeight, setCurrentHeight] = useState(0);
    const [page, setPage] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        const fetchTxs = async () => {
            setLoading(true);
            try {
                let height = currentHeight;
                if (height === 0) {
                    const info = await blockchainApi.getChainInfo();
                    height = info.data?.height || info.height;
                    setCurrentHeight(height);
                }

                if (height > 0) {
                    const fromBlock = Math.max(0, height - 1 - (page * pageSize));
                    const response = await blockchainApi.getBlocks(fromBlock, pageSize);
                    const blocks = response.data || response;

                    const txs = blocks.flatMap(block =>
                        (block.transactions || []).map(tx => ({
                            ...tx,
                            blockNumber: block.number
                        }))
                    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                    setTransactions(txs);
                }
            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTxs();
    }, [page, currentHeight]);

    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white">Giao dịch</h1>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Mới hơn
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentHeight > 0 && (currentHeight - 1 - ((page + 1) * pageSize)) < 0}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Cũ hơn <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-dark-700/60 text-slate-400 font-medium border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-3.5">Mã GD</th>
                                        <th className="px-6 py-3.5">Khối</th>
                                        <th className="px-6 py-3.5">Thời gian</th>
                                        <th className="px-6 py-3.5">Từ</th>
                                        <th className="px-6 py-3.5">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan="5" className="px-6 py-4">
                                                    <div className="h-5 bg-dark-700/50 rounded animate-pulse" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : transactions.map((tx, idx) => (
                                        <tr key={idx} className="hover:bg-white/3 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-primary-400">
                                                <Link to={`/transactions/${tx.txId}`} className="hover:text-primary-300">
                                                    {tx.txId?.substring(0, 16)}...
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link to={`/blocks/${tx.blockNumber}`} className="text-primary-400 hover:text-primary-300">
                                                    {tx.blockNumber}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                                {tx.creatorMsp}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="success">HỢP LỆ</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!loading && transactions.length === 0) && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                                Không tìm thấy giao dịch trong khoảng này.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TransactionsPage;
