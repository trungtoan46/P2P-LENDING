/**
 * Danh sách khoản vay - Enhanced với Search, Filter, Sort
 * Dùng cho cả Borrower (my loans) và Lender marketplace
 */

import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Modal,
    Pressable
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LoansApi } from '../../api';
import { Loading, Button, EmptyState } from '../../components';
import { Colors, Spacing } from '../../constants';
import { formatMoney, formatDate } from '../../utils';
import { useDebounce } from '../../hooks';

// ============ CONSTANTS ============
const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'approved', label: 'Đợi đầu tư' },
    { value: 'active', label: 'Đang vay' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Mới nhất', icon: 'sort-calendar-descending' },
    { value: 'oldest', label: 'Cũ nhất', icon: 'sort-calendar-ascending' },
    { value: 'amount_high', label: 'Số tiền cao', icon: 'sort-numeric-descending' },
    { value: 'amount_low', label: 'Số tiền thấp', icon: 'sort-numeric-ascending' },
    { value: 'rate_high', label: 'Lãi suất cao', icon: 'percent' },
    { value: 'term_short', label: 'Kỳ hạn ngắn', icon: 'clock-fast' },
];

// Helper function để hiển thị status bằng tiếng Việt
const getStatusDisplay = (status) => {
    switch (status) {
        case 'pending': return { text: 'Chờ duyệt', color: '#f59e0b' };
        case 'approved': return { text: 'Đợi đầu tư', color: '#3b82f6' };
        case 'waiting_signature': return { text: 'Chờ ký HĐ', color: '#eab308' }; // Yellow-600
        case 'waiting': return { text: 'Chờ giải ngân', color: '#8b5cf6' };
        case 'active': return { text: 'Đang vay', color: '#10b981' };
        case 'completed': return { text: 'Hoàn thành', color: '#6b7280' };
        case 'fail': return { text: 'Thất bại', color: '#ef4444' };
        case 'defaulted': return { text: 'Quá hạn', color: '#dc2626' };
        default: return { text: status, color: Colors.primary };
    }
};

// ============ SEARCH BAR ============
const SearchBar = memo(({ value, onChangeText, onClear, placeholder }) => (
    <View style={searchStyles.container}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} />
        <TextInput
            style={searchStyles.input}
            placeholder={placeholder}
            placeholderTextColor={Colors.textSecondary}
            value={value}
            onChangeText={onChangeText}
            returnKeyType="search"
        />
        {value.length > 0 && (
            <TouchableOpacity onPress={onClear}>
                <MaterialCommunityIcons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
        )}
    </View>
));

const searchStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        height: 44,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: Colors.text,
    },
});

// ============ FILTER BAR ============
const FilterBar = memo(({ statusFilter, onStatusPress, onSortPress, counts }) => (
    <View style={filterStyles.container}>
        <View style={filterStyles.statusTabs}>
            {STATUS_FILTER_OPTIONS.map(opt => (
                <TouchableOpacity
                    key={opt.value}
                    style={[
                        filterStyles.statusTab,
                        statusFilter === opt.value && filterStyles.statusTabActive
                    ]}
                    onPress={() => onStatusPress(opt.value)}
                >
                    <Text style={[
                        filterStyles.statusTabText,
                        statusFilter === opt.value && filterStyles.statusTabTextActive
                    ]}>
                        {opt.label}
                        {opt.value !== 'all' && counts[opt.value] > 0 && ` (${counts[opt.value]})`}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
        <TouchableOpacity style={filterStyles.sortBtn} onPress={onSortPress}>
            <MaterialCommunityIcons name="sort" size={18} color={Colors.primary} />
        </TouchableOpacity>
    </View>
));

const filterStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    statusTabs: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        padding: 4,
    },
    statusTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    statusTabActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statusTabText: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    statusTabTextActive: {
        color: Colors.primary,
        fontWeight: '600',
    },
    sortBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
});

// ============ SORT MODAL ============
const SortModal = memo(({ visible, currentSort, onSelect, onClose }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={modalStyles.overlay} onPress={onClose}>
            <Pressable style={modalStyles.content} onPress={(e) => e.stopPropagation()}>
                <View style={modalStyles.handle} />
                <Text style={modalStyles.title}>Sắp xếp theo</Text>
                {SORT_OPTIONS.map(opt => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[modalStyles.option, currentSort === opt.value && modalStyles.optionActive]}
                        onPress={() => onSelect(opt.value)}
                    >
                        <MaterialCommunityIcons
                            name={opt.icon}
                            size={20}
                            color={currentSort === opt.value ? Colors.primary : Colors.textSecondary}
                        />
                        <Text style={[
                            modalStyles.optionText,
                            currentSort === opt.value && modalStyles.optionTextActive
                        ]}>
                            {opt.label}
                        </Text>
                        {currentSort === opt.value && (
                            <MaterialCommunityIcons name="check" size={20} color={Colors.primary} />
                        )}
                    </TouchableOpacity>
                ))}
            </Pressable>
        </Pressable>
    </Modal>
));

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#e5e7eb',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 16,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 12,
    },
    optionActive: {
        backgroundColor: Colors.primary + '10',
    },
    optionText: {
        flex: 1,
        fontSize: 15,
        color: Colors.text,
    },
    optionTextActive: {
        color: Colors.primary,
        fontWeight: '600',
    },
});

// ============ LOAN ITEM ============
const LoanItem = memo(({ item, onPress, isMarketplace }) => {
    const statusDisplay = getStatusDisplay(item.status);
    const progress = item.totalNotes > 0 ? (item.investedNotes / item.totalNotes) : 0;

    return (
        <TouchableOpacity style={cardStyles.container} onPress={() => onPress(item._id)} activeOpacity={0.7}>
            {/* Header */}
            <View style={cardStyles.header}>
                <View style={cardStyles.headerLeft}>
                    <Text style={cardStyles.purpose} numberOfLines={1}>{item.purpose}</Text>
                    <Text style={cardStyles.date}>{formatDate(item.createdAt)}</Text>
                </View>
                <View style={[cardStyles.badge, { backgroundColor: statusDisplay.color + '20' }]}>
                    <Text style={[cardStyles.badgeText, { color: statusDisplay.color }]}>{statusDisplay.text}</Text>
                </View>
            </View>

            {/* Amount */}
            <View style={cardStyles.amountRow}>
                <Text style={cardStyles.amount}>{formatMoney(item.capital)}</Text>
                <View style={cardStyles.termBadge}>
                    <MaterialCommunityIcons name="calendar-range" size={14} color={Colors.primary} />
                    <Text style={cardStyles.termText}>{item.term} tháng</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={cardStyles.statsRow}>
                <View style={cardStyles.statItem}>
                    <Text style={cardStyles.statLabel}>Lãi suất</Text>
                    <Text style={cardStyles.statValue}>{item.interestRate || 0}%/năm</Text>
                </View>
                <View style={cardStyles.statDivider} />
                <View style={cardStyles.statItem}>
                    <Text style={cardStyles.statLabel}>Trả hàng tháng</Text>
                    <Text style={cardStyles.statValue}>{formatMoney(item.monthlyPayment)}</Text>
                </View>
                {isMarketplace && (
                    <>
                        <View style={cardStyles.statDivider} />
                        <View style={cardStyles.statItem}>
                            <Text style={cardStyles.statLabel}>Còn lại</Text>
                            <Text style={[cardStyles.statValue, { color: Colors.success }]}>
                                {item.totalNotes - item.investedNotes}/{item.totalNotes}
                            </Text>
                        </View>
                    </>
                )}
            </View>

            {/* Progress bar for marketplace */}
            {isMarketplace && item.status === 'approved' && (
                <View style={cardStyles.progressContainer}>
                    <View style={cardStyles.progressBg}>
                        <View style={[cardStyles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={cardStyles.progressText}>{Math.round(progress * 100)}% đã đầu tư</Text>
                </View>
            )}

            {/* Footer */}
            <View style={cardStyles.footer}>
                {isMarketplace ? (
                    <TouchableOpacity style={cardStyles.investBtn} onPress={() => onPress(item._id)}>
                        <Text style={cardStyles.investBtnText}>Đầu tư ngay</Text>
                        <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
                    </TouchableOpacity>
                ) : (
                    <View style={cardStyles.footerInfo}>
                        <Text style={cardStyles.footerLabel}>Tổng trả:</Text>
                        <Text style={cardStyles.footerValue}>{formatMoney(item.totalRepayment)}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

const cardStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    headerLeft: { flex: 1, marginRight: 10 },
    purpose: { fontSize: 15, fontWeight: '600', color: Colors.text },
    date: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    amount: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
    termBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    termText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: '#e5e7eb' },
    statLabel: { fontSize: 10, color: Colors.textSecondary },
    statValue: { fontSize: 12, fontWeight: '600', color: Colors.text, marginTop: 2 },
    progressContainer: {
        marginBottom: 12,
    },
    progressBg: {
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.success,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 4,
        textAlign: 'right',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerLabel: { fontSize: 13, color: Colors.textSecondary },
    footerValue: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
    investBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    investBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

// ============ MAIN COMPONENT ============
const LoansListScreen = ({ navigation, route }) => {
    const { mode } = route.params || {};
    const isMarketplace = mode === 'marketplace';

    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [showSortModal, setShowSortModal] = useState(false);

    useEffect(() => {
        loadLoans();
    }, [isMarketplace]);

    const loadLoans = async () => {
        try {
            setErrorMessage('');
            const params = {
                limit: 100,
                status: isMarketplace ? 'approved' : undefined
            };

            let result;
            if (isMarketplace) {
                result = await LoansApi.getList(params);
            } else {
                result = await LoansApi.getMyLoans(params);
            }

            if (result.success) {
                let loansData = [];
                if (Array.isArray(result.data)) {
                    loansData = result.data;
                } else if (Array.isArray(result.data?.data)) {
                    loansData = result.data.data;
                } else if (Array.isArray(result.data?.loans)) {
                    loansData = result.data.loans;
                } else if (Array.isArray(result.data?.data?.loans)) {
                    loansData = result.data.data.loans;
                }
                setLoans(loansData);
            } else {
                setLoans([]);
                setErrorMessage('Không tải được danh sách khoản vay');
            }
        } catch (error) {
            console.log('Load loans error:', error);
            setLoans([]);
            setErrorMessage('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Filter & Sort logic
    const filteredAndSortedLoans = useMemo(() => {
        let result = [...loans];

        // Filter by status
        if (statusFilter !== 'all') {
            result = result.filter(loan => loan.status === statusFilter);
        }

        // Filter by search
        if (debouncedSearchQuery.trim()) {
            const query = debouncedSearchQuery.toLowerCase();
            result = result.filter(loan => {
                const purpose = loan.purpose?.toLowerCase() || '';
                const amount = loan.capital?.toString() || '';
                return purpose.includes(query) || amount.includes(query);
            });
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
                case 'amount_high': return b.capital - a.capital;
                case 'amount_low': return a.capital - b.capital;
                case 'rate_high': return (b.interestRate || 0) - (a.interestRate || 0);
                case 'term_short': return (a.term || 0) - (b.term || 0);
                default: return 0;
            }
        });

        return result;
    }, [loans, statusFilter, debouncedSearchQuery, sortBy]);

    // Counts
    const counts = useMemo(() => ({
        approved: loans.filter(l => l.status === 'approved').length,
        active: loans.filter(l => l.status === 'active').length,
    }), [loans]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadLoans();
    }, [isMarketplace]);

    const handleLoanPress = useCallback((loanId) => {
        navigation.navigate('LoanDetail', { loanId, isMarketplace });
    }, [navigation, isMarketplace]);

    const handleSortSelect = useCallback((value) => {
        setSortBy(value);
        setShowSortModal(false);
    }, []);

    const renderLoan = useCallback(({ item }) => (
        <LoanItem item={item} onPress={handleLoanPress} isMarketplace={isMarketplace} />
    ), [handleLoanPress, isMarketplace]);

    const keyExtractor = useCallback((item, index) => item._id || index.toString(), []);

    if (loading) return <Loading fullScreen />;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {isMarketplace ? 'Cơ hội đầu tư' : 'Khoản vay của tôi'}
                </Text>
                {isMarketplace && (
                    <Text style={styles.headerSubtitle}>
                        {filteredAndSortedLoans.length} khoản đang gọi vốn
                    </Text>
                )}
            </View>

            {/* Search */}
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={() => setSearchQuery('')}
                placeholder={isMarketplace ? "Tìm theo mục đích, số tiền..." : "Tìm khoản vay..."}
            />

            {/* Filter & Sort */}
            <FilterBar
                statusFilter={statusFilter}
                onStatusPress={setStatusFilter}
                onSortPress={() => setShowSortModal(true)}
                counts={counts}
            />

            {/* Create button for borrower */}
            {!isMarketplace && (
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => navigation.navigate('CreateLoan')}
                >
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    <Text style={styles.createBtnText}>Tạo đơn vay mới</Text>
                </TouchableOpacity>
            )}

            {errorMessage ? (
                <EmptyState
                    title="Không thể tải dữ liệu"
                    message={errorMessage}
                    actionText="Thử lại"
                    onAction={loadLoans}
                />
            ) : null}

            {/* List */}
            <FlatList
                data={filteredAndSortedLoans}
                renderItem={renderLoan}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.list}
                initialNumToRender={5}
                windowSize={5}
                maxToRenderPerBatch={5}
                removeClippedSubviews={true}
                ListEmptyComponent={
                    <EmptyState
                        title={searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có khoản vay'}
                        message={searchQuery
                            ? 'Thử tìm kiếm với từ khóa khác'
                            : isMarketplace
                                ? 'Các khoản vay sẽ hiển thị tại đây'
                                : 'Tạo đơn vay để bắt đầu'}
                        actionText={(!searchQuery && !isMarketplace) ? 'Tạo đơn vay mới' : undefined}
                        onAction={(!searchQuery && !isMarketplace) ? () => navigation.navigate('CreateLoan') : undefined}
                    />
                }
                refreshing={refreshing}
                onRefresh={handleRefresh}
                showsVerticalScrollIndicator={false}
            />

            {/* Sort Modal */}
            <SortModal
                visible={showSortModal}
                currentSort={sortBy}
                onSelect={handleSortSelect}
                onClose={() => setShowSortModal(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    createBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    list: {
        paddingTop: 8,
        paddingBottom: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginTop: Spacing.md,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
        textAlign: 'center',
    },
});

export default LoansListScreen;
