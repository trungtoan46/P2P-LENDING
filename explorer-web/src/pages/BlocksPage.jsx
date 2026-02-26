import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import Navbar from '../components/layout/Navbar';
import blockchainApi from '../api/blockchainApi';

const BlocksPage = () => {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentHeight, setCurrentHeight] = useState(0);
    const [page, setPage] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        const fetchBlocks = async () => {
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
                    setBlocks(response.data || response);
                }
            } catch (error) {
                console.error("Error fetching blocks:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBlocks();
    }, [page, currentHeight]);

    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white">Các khối</h1>
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
                                        <th className="px-6 py-3.5">Khối</th>
                                        <th className="px-6 py-3.5">Thời gian</th>
                                        <th className="px-6 py-3.5">Số GD</th>
                                        <th className="px-6 py-3.5">Người tạo</th>
                                        <th className="px-6 py-3.5">Mã băm</th>
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
                                    ) : blocks.map((block) => (
                                        <tr key={block.number} className="hover:bg-white/3 transition-colors">
                                            <td className="px-6 py-4 font-medium text-primary-400">
                                                <Link to={`/blocks/${block.number}`} className="hover:text-primary-300">
                                                    {block.number}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {block.timestamp ? new Date(block.timestamp).toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {block.txCount}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                                {block.transactions && block.transactions[0]?.creatorMsp}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500 truncate max-w-xs">
                                                {block.dataHash?.substring(0, 20)}...
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default BlocksPage;
