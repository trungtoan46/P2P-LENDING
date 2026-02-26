import { Link } from 'react-router-dom';
import { Share2, Github, Twitter, Mail, ExternalLink } from 'lucide-react';
import { useBlockchain } from '../../hooks/useBlockchain';

const Footer = () => {
    const { connected, chainInfo } = useBlockchain();

    return (
        <footer className="bg-dark-900 border-t border-white/5 pt-12 pb-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2">
                        <Link to="/" className="flex items-center gap-3 mb-4 inline-flex">
                            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-xl">
                                <Share2 className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-lg text-white tracking-tight">P2P Explorer</span>
                        </Link>
                        <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
                            Trình khám phá mạng lưới cho vay ngang hàng phi tập trung, minh bạch.
                            Theo dõi khoản vay, xác minh giao dịch và giám sát trạng thái mạng theo thời gian thực.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="#" className="p-2 bg-dark-800 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors">
                                <Twitter className="w-4 h-4" />
                            </a>
                            <a href="#" className="p-2 bg-dark-800 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors">
                                <Github className="w-4 h-4" />
                            </a>
                            <a href="#" className="p-2 bg-dark-800 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors">
                                <Mail className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Khám phá</h3>
                        <ul className="space-y-3">
                            <li><Link to="/loans" className="text-slate-400 hover:text-primary-400 text-sm transition-colors">Khoản vay P2P</Link></li>
                            <li><Link to="/blocks" className="text-slate-400 hover:text-primary-400 text-sm transition-colors">Khối</Link></li>
                            <li><Link to="/transactions" className="text-slate-400 hover:text-primary-400 text-sm transition-colors">Giao dịch</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Trạng thái mạng</h3>
                        <div className="space-y-3 bg-dark-800/50 p-4 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Kết nối</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'} shadow-[0_0_10px_rgba(0,0,0,0.5)] ${connected ? 'shadow-emerald-400/50' : 'shadow-red-400/50'}`} />
                                    <span className="text-xs text-white font-medium">{connected ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Chiều cao</span>
                                <span className="text-xs text-white font-mono">{chainInfo?.height || 0}</span>
                            </div>
                            <a href={import.meta.env.VITE_API_URL?.replace('/api', '')} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-xs text-primary-400 hover:text-primary-300 transition-colors pt-2 border-t border-white/5 mt-2">
                                <span>Tài liệu API</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-xs text-center md:text-left">
                        &copy; {new Date().getFullYear()} Vento P2P Lending Network. Bảo lưu mọi quyền.
                    </p>
                    <div className="flex gap-4">
                        <Link to="#" className="text-slate-500 hover:text-white text-xs transition-colors">Chính sách bảo mật</Link>
                        <Link to="#" className="text-slate-500 hover:text-white text-xs transition-colors">Điều khoản dịch vụ</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
