import React, { useEffect, useState, useCallback, memo } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Alert,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    LayoutAnimation,
    Platform,
    UIManager
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PaymentsApi } from '../../api';
import { Loading, EmptyState } from '../../components';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants';
import { formatMoney } from '../../utils';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

// Helper outside component
const getStatusColor = (status) => {
    switch (status) {
        case 'overdue': return Colors.error;
        case 'due': return Colors.warning;
        case 'settled': return Colors.success;
        default: return Colors.info;
    }
};

// Memoized Payment Item
const PaymentItem = memo(({ item, onPay }) => {
    const isPayable = item.status !== 'settled';
    const color = getStatusColor(item.status);

    return (
        <View style={styles.paymentRow}>
            <View style={styles.paymentInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.paymentOrder}>Kỳ {item.orderNo}</Text>
                    <View style={[styles.miniBadge, { backgroundColor: `${color}20` }]}>
                        <Text style={[styles.miniBadgeText, { color }]}>
                            {item.status === 'overdue' ? 'Quá hạn' :
                                item.status === 'due' ? 'Đến hạn' :
                                    item.status === 'settled' ? 'Đã trả' : 'Chưa đến'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.paymentDate}>
                    {new Date(item.dueDate).toLocaleDateString('vi-VN')}
                </Text>
            </View>

            <View style={styles.paymentAction}>
                <Text style={[
                    styles.paymentAmount,
                    { color: item.status === 'settled' ? Colors.success : Colors.text }
                ]}>
                    {formatMoney(item.totalAmount).replace(' VND', '')}
                </Text>
                {isPayable && (
                    <TouchableOpacity
                        style={[
                            styles.payBtnSmall,
                            { backgroundColor: Colors.primary }
                        ]}
                        onPress={() => onPay(item._id)}
                    >
                        <Text style={styles.payBtnText}>Thanh toán</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

// Memoized Loan Group Item
const LoanGroupItem = memo(({ item, isExpanded, onToggleExpand, onPay }) => {
    const progress = item.totalDebt > 0 ? (item.paidAmount / item.totalDebt) * 100 : 0;
    const remainingDebt = item.totalDebt - item.paidAmount;

    return (
        <View style={[styles.card, isExpanded && styles.cardExpanded]}>
            <TouchableOpacity
                style={styles.cardHeader}
                activeOpacity={0.8}
                onPress={() => onToggleExpand(item.loanId)}
            >
                <View style={styles.headerTop}>
                    <View style={styles.loanIcon}>
                        <MaterialCommunityIcons
                            name={item.loanInfo.purpose?.includes('Mua') ? "home-outline" : "cash-fast"}
                            size={24}
                            color={Colors.primary}
                        />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.loanTitle}>{item.loanInfo.purpose || 'Đang tải...'}</Text>
                        <Text style={styles.loanMeta}>Tổng vay: {formatMoney(item.loanInfo.capital || 0)}</Text>
                    </View>
                    <MaterialCommunityIcons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={24}
                        color={Colors.gray400}
                    />
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressLabel}>
                        <Text style={styles.progressText}>Đã trả: {Math.round(progress)}%</Text>
                        <Text style={styles.remainingText}>Còn lại: {formatMoney(remainingDebt)}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.paymentListContainer}>
                    <View style={styles.divider} />
                    {item.payments.map(payment => (
                        <PaymentItem key={payment._id} item={payment} onPay={onPay} />
                    ))}
                </View>
            )}
        </View>
    );
});

const PaymentsScreen = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loanGroups, setLoanGroups] = useState([]);
    const [expandedLoanId, setExpandedLoanId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const loadPayments = useCallback(async () => {
        try {
            setErrorMessage('');
            const result = await PaymentsApi.getAll({ limit: 100 });
            if (result.success) {
                const allPayments = result.data?.data || result.data || [];
                const groups = groupPaymentsByLoan(allPayments);
                setLoanGroups(groups);
            } else {
                setLoanGroups([]);
                setErrorMessage('Không tải được danh sách thanh toán');
            }
        } catch (error) {
            console.log('Load payments error:', error);
            setLoanGroups([]);
            setErrorMessage('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadPayments();
    }, [loadPayments]);

    const groupPaymentsByLoan = (payments) => {
        const groups = {};
        payments.forEach(payment => {
            const loanId = payment.loanId?._id || payment.loanId;
            if (!groups[loanId]) {
                const loanData = typeof payment.loanId === 'object' ? payment.loanId : {};
                groups[loanId] = {
                    loanId,
                    loanInfo: loanData,
                    payments: [],
                    totalDebt: 0,
                    paidAmount: 0,
                    nextDueDate: null,
                    status: 'active' // active | completed
                };
            }

            groups[loanId].payments.push(payment);
            groups[loanId].totalDebt += payment.totalAmount;

            if (payment.status === 'settled') {
                groups[loanId].paidAmount += payment.totalAmount;
            } else {
                // Find nearest due date
                const dueDate = new Date(payment.dueDate);
                if (!groups[loanId].nextDueDate || dueDate < groups[loanId].nextDueDate) {
                    groups[loanId].nextDueDate = dueDate;
                }
            }
        });

        // Convert object to array and sort
        return Object.values(groups).map(group => {
            // Sort payments: Overdue -> Due -> Undue -> Settled
            group.payments.sort((a, b) => a.orderNo - b.orderNo);

            // Determine status
            const isCompleted = group.payments.every(p => p.status === 'settled');
            group.status = isCompleted ? 'completed' : 'active';

            return group;
        }).sort((a, b) => {
            // Active loans first
            if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
            return 0;
        });
    };

    const toggleExpand = useCallback((loanId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedLoanId(prev => prev === loanId ? null : loanId);
    }, []);

    const handlePay = useCallback((paymentId) => {
        Alert.alert(
            'Xác nhận thanh toán',
            'Bạn có chắc chắn muốn thanh toán khoản này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Thanh toán',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const result = await PaymentsApi.pay(paymentId);
                            if (result.success) {
                                Alert.alert('Thành công', 'Thanh toán thành công');
                                loadPayments();
                            }
                        } catch (error) {
                            Alert.alert('Lỗi', error.message);
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    }, [loadPayments]);

    const renderLoanGroup = useCallback(({ item }) => (
        <LoanGroupItem
            item={item}
            isExpanded={expandedLoanId === item.loanId}
            onToggleExpand={toggleExpand}
            onPay={handlePay}
        />
    ), [expandedLoanId, toggleExpand, handlePay]);

    const keyExtractor = useCallback((item) => item.loanId, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadPayments();
    }, [loadPayments]);

    if (loading) return <Loading fullScreen />;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
            <View style={styles.topHeader}>
                <Text style={styles.screenTitle}>Quản lý thanh toán</Text>
                <Text style={styles.screenSubtitle}>{loanGroups.length} khoản vay</Text>
            </View>

            {errorMessage ? (
                <EmptyState
                    title="Không thể tải dữ liệu"
                    message={errorMessage}
                    actionText="Thử lại"
                    onAction={loadPayments}
                />
            ) : null}

            <FlatList
                contentContainerStyle={styles.listContent}
                data={loanGroups}
                renderItem={renderLoanGroup}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    <EmptyState
                        title="Không có khoản vay"
                        message="Bạn không có khoản vay nào cần thanh toán."
                    />
                }
                initialNumToRender={5}
                windowSize={5}
                maxToRenderPerBatch={5}
                removeClippedSubviews={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.gray50,
    },
    topHeader: {
        backgroundColor: Colors.primary,
        paddingTop: 60,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: Spacing.md,
    },
    screenTitle: {
        fontSize: Typography.fontSize['2xl'],
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    screenSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: Typography.fontSize.sm,
        marginTop: 4,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    cardExpanded: {
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: {
        padding: Spacing.lg,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    loanIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${Colors.primary}10`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    headerText: {
        flex: 1,
    },
    loanTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.text,
        marginBottom: 2,
    },
    loanMeta: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    progressContainer: {
        marginTop: Spacing.xs,
    },
    progressLabel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.success,
        fontWeight: '600',
    },
    remainingText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.error,
        fontWeight: '600',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: Colors.gray200,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.success,
        borderRadius: 3,
    },
    paymentListContainer: {
        backgroundColor: Colors.gray50,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.gray200,
    },
    paymentRow: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    paymentInfo: {
        flex: 1,
    },
    paymentOrder: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
        color: Colors.text,
        marginRight: 8,
    },
    paymentDate: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    paymentAction: {
        alignItems: 'flex-end',
    },
    paymentAmount: {
        fontSize: Typography.fontSize.sm,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    payBtnSmall: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    payBtnText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: '600',
    },
    miniBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: Spacing.md,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.md,
        textAlign: 'center',
    },
});

export default PaymentsScreen;
