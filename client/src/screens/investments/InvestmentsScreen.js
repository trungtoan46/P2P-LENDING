/**
 * Danh sách đầu tư của tôi - Enhanced với Search, Filter, Sort
 */

import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    Pressable
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { InvestmentsApi } from '../../api';
import { Loading, EmptyState } from '../../components';
import { Colors, Spacing } from '../../constants';
import { formatMoney, formatDate } from '../../utils';

// ============ FILTER OPTIONS ============
const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'waiting_disburse', label: 'Chờ giải ngân' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Mới nhất', icon: 'sort-calendar-descending' },
    { value: 'oldest', label: 'Cũ nhất', icon: 'sort-calendar-ascending' },
    { value: 'amount_high', label: 'Số tiền cao', icon: 'sort-numeric-descending' },
    { value: 'amount_low', label: 'Số tiền thấp', icon: 'sort-numeric-ascending' },
    { value: 'profit_high', label: 'Lợi nhuận cao', icon: 'trending-up' },
];

// ============ SEARCH BAR ============
const SearchBar = memo(({ value, onChangeText, onClear }) => (
    <View style={searchStyles.container}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} />
        <TextInput
            style={searchStyles.input}
            placeholder="Tìm theo mục đích vay, số tiền..."
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
        marginVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        height: 46,
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

// ============ FILTER & SORT BAR ============
const FilterSortBar = memo(({
    statusFilter,
    sortBy,
    onStatusPress,
    onSortPress,
    activeCount,
    completedCount
}) => (
    <View style={filterStyles.container}>
        <View style={filterStyles.statusTabs}>
            {STATUS_OPTIONS.slice(0, 3).map(opt => (
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
                        {opt.value === 'active' && activeCount > 0 && ` (${activeCount})`}
                        {opt.value === 'completed' && completedCount > 0 && ` (${completedCount})`}
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
        textAlign: 'center',
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
        fontSize: 12,
        textAlign: 'center',
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
    <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
    >
        <Pressable style={modalStyles.overlay} onPress={onClose}>
            <Pressable style={modalStyles.content} onPress={(e) => e.stopPropagation()}>
                <View style={modalStyles.handle} />
                <Text style={modalStyles.title}>Sắp xếp theo</Text>
                {SORT_OPTIONS.map(opt => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[
                            modalStyles.option,
                            currentSort === opt.value && modalStyles.optionActive
                        ]}
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

// ============ INVESTMENT ITEM ============
const InvestmentItem = memo(({ item, onPress }) => {
    const loan = item.loanId;

    let statusColor = Colors.textSecondary;
    let statusText = 'Chờ xử lý';

    if (item.status === 'active') {
        if (loan?.status === 'approved' || loan?.status === 'waiting_signature' || loan?.status === 'waiting') {
            statusColor = Colors.info;
            statusText = 'Chờ giải ngân';
        } else if (loan?.status === 'active') {
            statusColor = Colors.success;
            statusText = 'Đang hoạt động';
        } else if (loan?.status === 'fail') {
            statusColor = Colors.error;
            statusText = 'Hủy (Không đủ vốn)';
        } else {
            statusColor = Colors.success;
            statusText = 'Đang hoạt động';
        }
    } else if (item.status === 'completed') {
        statusColor = Colors.primary;
        statusText = 'Hoàn thành';
    } else if (item.status === 'cancelled') {
        statusColor = Colors.error;
        statusText = 'Đã hủy';
    } else if (item.status === 'defaulted') {
        statusColor = Colors.error;
        statusText = 'Nợ xấu';
    }

    return (
        <TouchableOpacity style={cardStyles.container} onPress={onPress} activeOpacity={0.7}>
            {/* Header */}
            <View style={cardStyles.header}>
                <View style={cardStyles.headerLeft}>
                    <Text style={cardStyles.purpose} numberOfLines={1}>
                        {loan?.purpose || 'Khoản vay'}
                    </Text>
                    <Text style={cardStyles.date}>
                        {formatDate(item.createdAt)}
                    </Text>
                </View>
                <View style={[cardStyles.badge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[cardStyles.badgeText, { color: statusColor }]}>{statusText}</Text>
                </View>
            </View>

            {/* Amount Row */}
            <View style={cardStyles.amountRow}>
                <View>
                    <Text style={cardStyles.label}>Số tiền đầu tư</Text>
                    <Text style={cardStyles.amount}>{formatMoney(item.amount)}</Text>
                </View>
                <View style={cardStyles.notesInfo}>
                    <Text style={cardStyles.notes}>{item.notes} phần</Text>
                </View>
            </View>

            {/* Stats Row */}
            <View style={cardStyles.statsRow}>
                <View style={cardStyles.statItem}>
                    <MaterialCommunityIcons name="percent" size={14} color={Colors.primary} />
                    <Text style={cardStyles.statLabel}>Lãi suất</Text>
                    <Text style={cardStyles.statValue}>{loan?.interestRate || 0}%/năm</Text>
                </View>
                <View style={cardStyles.statDivider} />
                <View style={cardStyles.statItem}>
                    <MaterialCommunityIcons name="calendar-range" size={14} color={Colors.primary} />
                    <Text style={cardStyles.statLabel}>Kỳ hạn</Text>
                    <Text style={cardStyles.statValue}>{loan?.term || 0} tháng</Text>
                </View>
                <View style={cardStyles.statDivider} />
                <View style={cardStyles.statItem}>
                    <MaterialCommunityIcons name="trending-up" size={14} color={Colors.success} />
                    <Text style={cardStyles.statLabel}>Lợi nhuận</Text>
                    <Text style={[cardStyles.statValue, { color: Colors.success }]}>
                        +{formatMoney(item.netProfit || item.grossProfit || 0)}
                    </Text>
                </View>
            </View>

            {/* Footer */}
            <View style={cardStyles.footer}>
                <Text style={cardStyles.totalLabel}>Tổng nhận về:</Text>
                <Text style={cardStyles.totalValue}>{formatMoney(item.totalReturn)}</Text>
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
        marginBottom: 12,
    },
    headerLeft: {
        flex: 1,
        marginRight: 10,
    },
    purpose: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    date: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    label: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    amount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    notesInfo: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    notes: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#e5e7eb',
    },
    statLabel: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    statValue: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 2,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    totalLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
});

// ============ MAIN COMPONENT ============
const InvestmentsScreen = ({ navigation }) => {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [showSortModal, setShowSortModal] = useState(false);

    useEffect(() => {
        loadInvestments();
    }, []);

    const loadInvestments = async () => {
        try {
            setErrorMessage('');
            const result = await InvestmentsApi.getMyInvestments({ status: 'active,completed,cancelled,defaulted', limit: 100 });
            if (result.success) {
                let list = [];
                if (Array.isArray(result.data)) {
                    list = result.data;
                } else if (Array.isArray(result.data?.data)) {
                    list = result.data.data;
                } else if (Array.isArray(result.data?.investments)) {
                    list = result.data.investments;
                }
                setInvestments(list);
            } else {
                setInvestments([]);
                setErrorMessage('Không tải được danh sách đầu tư');
            }
        } catch (error) {
            console.log('Load investments error:', error);
            setInvestments([]);
            setErrorMessage('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Filter & Sort logic
    const filteredAndSortedInvestments = useMemo(() => {
        let result = [...investments];

        // Filter by status
        if (statusFilter !== 'all') {
            if (statusFilter === 'waiting_disburse') {
                result = result.filter(inv => inv.status === 'active' &&
                    (inv.loanId?.status === 'approved' || inv.loanId?.status === 'waiting_signature' || inv.loanId?.status === 'waiting'));
            } else if (statusFilter === 'active') {
                result = result.filter(inv => inv.status === 'active' && inv.loanId?.status === 'active');
            } else {
                result = result.filter(inv => inv.status === statusFilter);
            }
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(inv => {
                const purpose = inv.loanId?.purpose?.toLowerCase() || '';
                const amount = inv.amount?.toString() || '';
                return purpose.includes(query) || amount.includes(query);
            });
        }

        // Group investments by Loan ID + Status
        const groupedMap = new Map();
        result.forEach(inv => {
            if (!inv.loanId?._id) {
                groupedMap.set(inv._id, inv); // Fallback for invalid loanId
                return;
            }

            const key = `${inv.loanId._id}_${inv.status}`;
            if (groupedMap.has(key)) {
                const existing = groupedMap.get(key);
                existing.amount += inv.amount;
                existing.notes += inv.notes;
                existing.totalReturn += inv.totalReturn;
                existing.netProfit += (inv.netProfit || 0);
                existing.grossProfit += (inv.grossProfit || 0);
                existing.serviceFee += (inv.serviceFee || 0);
                existing.monthlyReturn += (inv.monthlyReturn || 0);
                // Keep the latest createdAt? Or earliest? Let's keep latest to show recent activity
                if (new Date(inv.createdAt) > new Date(existing.createdAt)) {
                    existing.createdAt = inv.createdAt;
                }
                // Add a flag to indicate detailed breakdown if needed later
                existing.investmentCount = (existing.investmentCount || 1) + 1;
            } else {
                groupedMap.set(key, { ...inv, investmentCount: 1 });
            }
        });

        result = Array.from(groupedMap.values());

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'amount_high':
                    return b.amount - a.amount;
                case 'amount_low':
                    return a.amount - b.amount;
                case 'profit_high':
                    return (b.netProfit || 0) - (a.netProfit || 0);
                default:
                    return 0;
            }
        });

        return result;
    }, [investments, statusFilter, searchQuery, sortBy]);

    // Counts
    const activeCount = investments.filter(inv => inv.status === 'active').length;
    const completedCount = investments.filter(inv => inv.status === 'completed').length;

    // Summary
    const totalInvested = filteredAndSortedInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalProfit = filteredAndSortedInvestments.reduce((sum, inv) => sum + (inv.netProfit || inv.grossProfit || 0), 0);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadInvestments();
    }, []);

    const handleInvestmentPress = useCallback((item) => {
        if (item.loanId?._id) {
            navigation.navigate('LoanDetail', {
                loanId: item.loanId._id,
                isMarketplace: false
            });
        }
    }, [navigation]);

    const handleSortSelect = useCallback((value) => {
        setSortBy(value);
        setShowSortModal(false);
    }, []);

    const renderItem = useCallback(({ item }) => (
        <InvestmentItem item={item} onPress={() => handleInvestmentPress(item)} />
    ), [handleInvestmentPress]);

    const keyExtractor = useCallback((item, index) => item._id || index.toString(), []);

    if (loading) return <Loading fullScreen />;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Đầu tư của tôi</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={() => setSearchQuery('')}
            />

            {/* Filter & Sort */}
            <FilterSortBar
                statusFilter={statusFilter}
                sortBy={sortBy}
                onStatusPress={setStatusFilter}
                onSortPress={() => setShowSortModal(true)}
                activeCount={activeCount}
                completedCount={completedCount}
            />

            {errorMessage ? (
                <EmptyState
                    title="Không thể tải dữ liệu"
                    message={errorMessage}
                    actionText="Thử lại"
                    onAction={loadInvestments}
                />
            ) : null}

            {/* Summary */}
            {filteredAndSortedInvestments.length > 0 && (
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Tổng đầu tư</Text>
                        <Text style={styles.summaryValue}>{formatMoney(totalInvested)}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Lợi nhuận</Text>
                        <Text style={[styles.summaryValue, { color: Colors.success }]}>
                            +{formatMoney(totalProfit)}
                        </Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Số khoản</Text>
                        <Text style={styles.summaryValue}>{filteredAndSortedInvestments.length}</Text>
                    </View>
                </View>
            )}

            {/* List */}
            <FlatList
                data={filteredAndSortedInvestments}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <EmptyState
                        title={searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có khoản đầu tư'}
                        message={searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Bắt đầu đầu tư để tạo thu nhập thụ động'}
                        actionText={searchQuery ? undefined : 'Đầu tư ngay'}
                        onAction={searchQuery ? undefined : () => navigation.navigate('InvestLoans', { mode: 'marketplace' })}
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
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    summaryContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    summaryLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 4,
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
    investBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 20,
    },
    investBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default InvestmentsScreen;
