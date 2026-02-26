import { Share2, Search, Loader2, Box, ArrowRight, FileText } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import blockchainApi from '../../api/blockchainApi';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();

    const isHomePage = location.pathname === '/';

    const navLinks = [
        { to: '/', label: 'Tổng quan' },
        { to: '/loans', label: 'Khoản vay P2P' },
        { to: '/blocks', label: 'Khối' },
        { to: '/transactions', label: 'Giao dịch' },
    ];

    const isActive = (path) => location.pathname === path;

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

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setShowSuggestions(false);
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery('');
        setIsMenuOpen(false);
    };

    return (
        <nav className="bg-dark-800/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-xl shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow">
                                <Share2 className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-lg text-white tracking-tight">P2P Explorer</span>
                        </Link>
                        <div className="hidden sm:ml-10 sm:flex sm:space-x-1">
                            {navLinks.map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(link.to)
                                        ? 'bg-primary-600/15 text-primary-400'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center">
                        {!isHomePage && (
                            <form onSubmit={handleSearch} className="relative group mr-4" ref={searchRef}>
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-full opacity-0 group-focus-within:opacity-20 blur transition-opacity" />
                                <div className="relative flex items-center bg-dark-700/80 backdrop-blur-xl rounded-full border border-white/10 h-9 px-3 w-64">
                                    <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent px-2 text-white placeholder-slate-500 focus:outline-none text-xs"
                                        placeholder="Tìm kiếm mạng lưới..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => { if (searchQuery.length >= 2) setShowSuggestions(true); }}
                                    />
                                    {isSearching && <Loader2 className="w-3.5 h-3.5 text-primary-500 animate-spin shrink-0" />}
                                </div>

                                {/* Navbar Suggestions Dropdown */}
                                {showSuggestions && suggestions && (
                                    <div className="absolute top-full right-0 mt-2 w-72 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                        {suggestions.type === 'none' ? (
                                            <div className="p-3 text-center text-xs text-slate-400">
                                                Không tìm thấy kết quả
                                            </div>
                                        ) : (
                                            <div className="py-1">
                                                {suggestions.results?.slice(0, 4).map((res, idx) => (
                                                    <Link
                                                        key={idx}
                                                        to={res.link}
                                                        onClick={() => { setShowSuggestions(false); setSearchQuery(''); }}
                                                        className="flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="p-1.5 bg-primary-500/10 rounded-md text-primary-400 shrink-0">
                                                                {suggestions.type === 'block' ? <Box className="w-3 h-3" /> :
                                                                    suggestions.type === 'transaction' ? <ArrowRight className="w-3 h-3" /> :
                                                                        <FileText className="w-3 h-3" />}
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="text-xs font-medium text-white truncate">{res.title}</p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center sm:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="sm:hidden border-t border-white/5 bg-dark-800/95 backdrop-blur-xl">
                    <div className="px-3 py-3 space-y-1">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setIsMenuOpen(false)}
                                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive(link.to)
                                    ? 'bg-primary-600/15 text-primary-400'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {!isHomePage && (
                            <div className="px-4 py-3 mt-2 border-t border-white/5">
                                <form onSubmit={handleSearch} className="relative flex items-center bg-dark-700/80 rounded-xl border border-white/10 h-10 px-3">
                                    <Search className="h-4 w-4 text-slate-500 shrink-0" />
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent px-2 text-white placeholder-slate-500 focus:outline-none text-sm"
                                        placeholder="Tìm kiếm mạng lưới..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
