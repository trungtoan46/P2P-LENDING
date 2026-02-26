/**
 * Chi tiết khoản vay
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Loading, Button } from '../../components';
import { Colors, Spacing, Typography } from '../../constants';
import { LoansApi, InvestmentsApi, PaymentsApi } from '../../api';
import { useAuth } from '../../hooks';
import { formatMoney, formatDate } from '../../utils';

const LoanDetailScreen = ({ navigation, route }) => {
    const { loanId, isMarketplace } = route.params;
    const { user } = useAuth();
    const [loan, setLoan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [payments, setPayments] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    // Investment State
    const [notesCount, setNotesCount] = useState(1);
    const [investLoading, setInvestLoading] = useState(false);

    // Constants
    const BASE_UNIT_PRICE = 500000; // 500k per note

    // Long press handlers
    const [timer, setTimer] = useState(null);

    const startIncrement = () => {
        const remaining = loan ? (loan.totalNotes - loan.investedNotes) : 100;
        const t = setInterval(() => {
            setNotesCount(prev => Math.min(prev + 1, remaining));
        }, 100);
        setTimer(t);
    };

    const startDecrement = () => {
        const t = setInterval(() => {
            setNotesCount(prev => Math.max(prev - 1, 1));
        }, 100);
        setTimer(t);
    };

    const stopTimer = () => {
        if (timer) clearInterval(timer);
        setTimer(null);
    };

    const loadLoanDetail = async () => {
        try {
            const result = await LoansApi.getDetail(loanId);
            if (result.success) {
                const loanData = result.data?.data || result.data || {};
                setLoan(loanData);

                // If loan is active/disbursed, load payment schedule
                if (['active', 'disbursed', 'completed'].includes(loanData.status)) {
                    loadPaymentSchedule();
                }
            }
        } catch (error) {
            console.log('Load loan detail error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadPaymentSchedule = async () => {
        setScheduleLoading(true);
        try {
            const result = await PaymentsApi.getByLoan(loanId);
            if (result.success) {
                setPayments(result.data?.data || result.data || []);
            }
        } catch (error) {
            console.log('Load payments error:', error);
        } finally {
            setScheduleLoading(false);
        }
    };

    useEffect(() => {
        loadLoanDetail();
    }, [loanId]);

    const onRefresh = () => {
        setRefreshing(true);
        loadLoanDetail();
    };

    const handlePayStep = async (paymentId, orderNo) => {
        Alert.alert(
            'Xác nhận thanh toán',
            `Bạn có chắc chắn muốn thanh toán kỳ thứ ${orderNo} này?`,
            [
                { text: 'Huỷ', style: 'cancel' },
                {
                    text: 'Thanh toán',
                    onPress: async () => {
                        setScheduleLoading(true);
                        try {
                            const result = await PaymentsApi.pay(paymentId);
                            if (result.success) {
                                Alert.alert('Thành công', 'Thanh toán kỳ hạn thành công!');
                                loadLoanDetail(); // Refresh both loan and schedule
                            } else {
                                Alert.alert('Lỗi', result.message || 'Thanh toán thất bại');
                            }
                        } catch (error) {
                            Alert.alert('Lỗi', 'Có lỗi xảy ra khi xử lý thanh toán');
                        } finally {
                            setScheduleLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSignContract = async () => {
        Alert.alert(
            'Ký hợp đồng vay',
            'Bạn cam kết nhận nợ và đồng ý với các điều khoản của khoản vay này?',
            [
                { text: 'Huỷ', style: 'cancel' },
                {
                    text: 'Ký & Nhận tiền',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const result = await LoansApi.sign(loanId);
                            if (result.success) {
                                Alert.alert('Thành công', 'Đã ký hợp đồng nhận nợ thành công! Vui lòng chờ giải ngân.');
                                loadLoanDetail();
                            } else {
                                Alert.alert('Lỗi', result.message || 'Ký hợp đồng thất bại');
                            }
                        } catch (error) {
                            console.log('Sign error:', error);
                            Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi ký hợp đồng');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleInvest = async () => {
        const amount = notesCount * BASE_UNIT_PRICE;

        Alert.alert(
            'Xác nhận đầu tư',
            `Bạn có chắc muốn đầu tư ${formatMoney(amount)} (${notesCount} phần) vào khoản vay này?`,
            [
                { text: 'Huỷ', style: 'cancel' },
                {
                    text: 'Đầu tư',
                    onPress: async () => {
                        setInvestLoading(true);
                        try {
                            const result = await InvestmentsApi.create({
                                loanId,
                                amount
                            });

                            if (result.success) {
                                Alert.alert(
                                    'Thành công',
                                    'Đầu tư thành công! Khoản đầu tư của bạn đã được ghi nhận.',
                                    [
                                        {
                                            text: 'Đóng',
                                            onPress: () => {
                                                setNotesCount(1);
                                                loadLoanDetail();
                                            }
                                        }
                                    ]
                                );
                            } else {
                                Alert.alert('Lỗi', result.message || 'Đầu tư thất bại');
                            }
                        } catch (error) {
                            console.log('Invest error:', error);
                            Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi đầu tư');
                        } finally {
                            setInvestLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) return <Loading fullScreen />;
    if (!loan) return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết khoản vay</Text>
                <View style={{ width: 24 }} />
            </View>
            <View style={styles.centerContent}>
                <Text>Không tìm thấy thông tin khoản vay</Text>
            </View>
        </View>
    );

    const progress = loan.totalNotes > 0 ? (loan.investedNotes / loan.totalNotes) : 0;
    const isFundraising = loan.status === 'approved';
    const remainingNotes = loan.totalNotes - loan.investedNotes;

    // Xác định người xem là borrower hay lender
    const borrowerId = loan.borrowerId?._id || loan.borrowerId;
    const isBorrower = user?._id === borrowerId;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết khoản vay</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Spacing.xl }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Status Badge */}
                <View style={styles.statusCard}>
                    <Text style={styles.statusLabel}>Trạng thái</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loan.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>
                            {getStatusText(loan.status)}
                        </Text>
                    </View>
                </View>

                {/* Investment Progress */}
                {isFundraising && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>TIẾN ĐỘ GỌI VỐN</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <View style={styles.progressLabels}>
                            <Text style={styles.progressText}>
                                Đã gọi: <Text style={styles.highlight}>{loan.investedNotes}/{loan.totalNotes}</Text> phần
                            </Text>
                            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
                        </View>
                        <Text style={styles.minInvestNote}>
                            * Còn lại {remainingNotes} phần ({formatMoney(remainingNotes * BASE_UNIT_PRICE)})
                        </Text>
                    </View>
                )}

                {/* Thông tin chính */}
                <View style={styles.card}>
                    <DetailRow
                        icon="cash"
                        label="Số tiền vay"
                        value={formatMoney(loan.capital)}
                    />
                    <DetailRow
                        icon="clock-outline"
                        label="Kỳ hạn"
                        value={`${loan.term} tháng`}
                    />
                    <DetailRow
                        icon="bullseye-arrow"
                        label="Mục đích"
                        value={loan.purpose}
                        hideDivider
                    />
                </View>

                {/* Chi tiết tài chính */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>CHI TIẾT TÀI CHÍNH</Text>
                    <DetailRow
                        icon="chart-line"
                        label="Lãi suất"
                        value={`${loan.interestRate || 0}%/năm`}
                    />
                    <DetailRow
                        icon="cash-multiple"
                        label="Trả hàng tháng"
                        value={formatMoney(loan.monthlyPayment)}
                    />
                    <DetailRow
                        icon="bank-transfer"
                        label="Tổng lãi phải trả"
                        value={formatMoney(loan.totalInterest)}
                    />
                    <DetailRow
                        icon="hand-coin"
                        label="Tổng thanh toán"
                        value={formatMoney(loan.totalRepayment)}
                    />
                    <DetailRow
                        icon="calendar-check"
                        label="Ngày giải ngân"
                        value={formatDate(loan.disbursementDate)}
                    />
                    <DetailRow
                        icon="calendar"
                        label="Ngày đáo hạn"
                        value={formatDate(loan.maturityDate)}
                        hideDivider
                    />
                </View>

                {/* Sign Contract Button for Borrower */}
                {isBorrower && loan.status === 'waiting_signature' && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>XÁC NHẬN KHOẢN VAY</Text>
                        <Text style={{ color: Colors.textSecondary, marginBottom: 12 }}>
                            Khoản vay đã huy động đủ vốn. Vui lòng ký hợp đồng để nhận giải ngân.
                        </Text>
                        <Button
                            title="KÝ HỢP ĐỒNG & NHẬN TIỀN"
                            onPress={handleSignContract}
                            style={{ backgroundColor: Colors.primary }}
                        />
                    </View>
                )}

                {/* Thông tin giải ngân */}
                {loan.method && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>THÔNG TIN NHẬN TIỀN</Text>
                        <DetailRow
                            icon={loan.method === 'wallet' ? 'wallet' : 'bank'}
                            label="Hình thức"
                            value={loan.method === 'wallet' ? 'Ví điện tử' : 'Ngân hàng'}
                        />
                        {loan.method === 'wallet' ? (
                            <DetailRow
                                icon="phone"
                                label="Số ví"
                                value={loan.walletAccountNumber || 'N/A'}
                                hideDivider
                            />
                        ) : (
                            <>
                                <DetailRow
                                    icon="credit-card"
                                    label="Số tài khoản"
                                    value={loan.bankAccountNumber || 'N/A'}
                                />
                                <DetailRow
                                    icon="account"
                                    label="Chủ tài khoản"
                                    value={loan.bankAccountHolderName || 'N/A'}
                                    hideDivider
                                />
                            </>
                        )}
                    </View>
                )}

                {/* Direct Investment Panel inside ScrollView */}
                {isMarketplace && isFundraising && (
                    <View style={styles.footerPanel}>
                        <Text style={styles.panelTitle}>Đầu tư vào khoản vay này</Text>

                        <View style={styles.investControl}>
                            <TouchableOpacity
                                style={[styles.controlBtn, notesCount <= 1 && styles.disabledBtn]}
                                onPress={() => setNotesCount(prev => Math.max(prev - 1, 1))}
                                onLongPress={startDecrement}
                                onPressOut={stopTimer}
                                disabled={notesCount <= 1}
                            >
                                <MaterialCommunityIcons name="minus" size={24} color={notesCount <= 1 ? Colors.textSecondary : Colors.primary} />
                            </TouchableOpacity>

                            <View style={styles.amountDisplay}>
                                <Text style={styles.notesCount}>{notesCount} phần</Text>
                                <Text style={styles.vndAmount}>{formatMoney(notesCount * BASE_UNIT_PRICE)}</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.controlBtn, notesCount >= remainingNotes && styles.disabledBtn]}
                                onPress={() => setNotesCount(prev => Math.min(prev + 1, remainingNotes))}
                                onLongPress={startIncrement}
                                onPressOut={stopTimer}
                                disabled={notesCount >= remainingNotes}
                            >
                                <MaterialCommunityIcons name="plus" size={24} color={notesCount >= remainingNotes ? Colors.textSecondary : Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <Button
                            title={investLoading ? 'ĐANG XỬ LÝ...' : `ĐẦU TƯ ${formatMoney(notesCount * BASE_UNIT_PRICE)}`}
                            onPress={handleInvest}
                            disabled={investLoading}
                            style={styles.investButton}
                        />
                    </View>
                )}

                {/* Lịch thanh toán (chỉ cho borrower - chủ sở hữu khoản vay) */}
                {isBorrower && payments.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>LỊCH THANH TOÁN</Text>
                        {payments.map((p, idx) => (
                            <View key={p._id || idx} style={[styles.paymentRow, idx === payments.length - 1 && { borderBottomWidth: 0 }]}>
                                <View style={styles.paymentInfo}>
                                    <Text style={styles.paymentOrder}>Kỳ {p.orderNo}</Text>
                                    <Text style={styles.paymentDate}>{formatDate(p.dueDate)}</Text>
                                </View>
                                <View style={styles.paymentMeta}>
                                    <Text style={styles.paymentAmount}>{formatMoney(p.totalAmount)}</Text>
                                    <View style={[styles.smallBadge, { backgroundColor: getPaymentStatusColor(p.status) + '20' }]}>
                                        <Text style={[styles.smallBadgeText, { color: getPaymentStatusColor(p.status) }]}>
                                            {getPaymentStatusText(p.status)}
                                        </Text>
                                    </View>
                                </View>
                                {p.status !== 'settled' && (
                                    <TouchableOpacity
                                        style={styles.payNowBtn}
                                        onPress={() => handlePayStep(p._id, p.orderNo)}
                                        disabled={scheduleLoading}
                                    >
                                        <Text style={styles.payNowText}>Trả ngay</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Lịch thanh toán cho Lender (chỉ xem, không có nút trả) */}
                {!isBorrower && !isMarketplace && payments.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>TIẾN ĐỘ THANH TOÁN</Text>
                        {payments.map((p, idx) => (
                            <View key={p._id || idx} style={[styles.paymentRow, idx === payments.length - 1 && { borderBottomWidth: 0 }]}>
                                <View style={styles.paymentInfo}>
                                    <Text style={styles.paymentOrder}>Kỳ {p.orderNo}</Text>
                                    <Text style={styles.paymentDate}>{formatDate(p.dueDate)}</Text>
                                </View>
                                <View style={styles.paymentMeta}>
                                    <Text style={styles.paymentAmount}>{formatMoney(p.totalAmount)}</Text>
                                    <View style={[styles.smallBadge, { backgroundColor: getPaymentStatusColor(p.status) + '20' }]}>
                                        <Text style={[styles.smallBadgeText, { color: getPaymentStatusColor(p.status) }]}>
                                            {getPaymentStatusText(p.status)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 20 }} />

            </ScrollView>
        </View>
    );
};

const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return Colors.warning;
        case 'approved': return Colors.success;
        case 'waiting_signature': return Colors.warning;
        case 'waiting': return Colors.info; // Full fund, waiting disburse
        case 'active': return Colors.success;
        case 'rejected': return Colors.error;
        case 'disbursed': return Colors.info;
        case 'completed': return Colors.success;
        case 'fail': return Colors.error;
        default: return Colors.textSecondary;
    }
};

const getPaymentStatusColor = (status) => {
    switch (status) {
        case 'settled': return Colors.success;
        case 'overdue': return Colors.error;
        case 'due': return Colors.warning;
        default: return Colors.textSecondary;
    }
};

const getPaymentStatusText = (status) => {
    switch (status) {
        case 'settled': return 'Đã trả';
        case 'overdue': return 'Quá hạn';
        case 'due': return 'Đến hạn';
        case 'undue': return 'Chưa đến hạn';
        default: return status;
    }
};

const getStatusText = (status) => {
    switch (status) {
        case 'pending': return 'Chờ duyệt';
        case 'approved': return 'Đang gọi vốn';
        case 'waiting_signature': return 'Chờ ký HĐ';
        case 'waiting': return 'Chờ giải ngân';
        case 'active': return 'Đang vay';
        case 'rejected': return 'Từ chối';
        case 'disbursed': return 'Đang vay';
        case 'completed': return 'Đã tất toán';
        case 'fail': return 'Gọi vốn thất bại';
        default: return status;
    }
};

const DetailRow = ({ icon, label, value, hideDivider }) => (
    <View style={[styles.row, !hideDivider && styles.rowBorder]}>
        <View style={styles.rowLeft}>
            <MaterialCommunityIcons
                name={icon}
                size={20}
                color={Colors.primary}
            />
            <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    backButton: { padding: Spacing.xs },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    scrollView: { flex: 1, padding: Spacing.md },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statusCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: { fontSize: 16, fontWeight: '600', color: Colors.text },
    statusBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: 16,
    },
    statusText: { fontWeight: 'bold', fontSize: 14 },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        marginLeft: Spacing.sm,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    value: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase'
    },
    // Progress Bar Styles
    progressBarBg: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginVertical: 8,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.success,
        borderRadius: 4
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    progressText: { fontSize: 14, color: Colors.textSecondary },
    highlight: { color: Colors.success, fontWeight: 'bold' },
    progressPercent: { fontWeight: 'bold', color: Colors.text },
    minInvestNote: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },

    // Direct Investment Panel Styles
    footerPanel: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: Spacing.md,
        paddingBottom: Spacing.lg,
        marginTop: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    panelTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.md,
        textAlign: 'center'
    },
    investControl: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.md
    },
    controlBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledBtn: {
        opacity: 0.3
    },
    amountDisplay: {
        alignItems: 'center'
    },
    notesCount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary
    },
    vndAmount: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4
    },
    investButton: {
        width: '100%',
        height: 50
    },
    // Payment Row Styles
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    paymentInfo: {
        flex: 1,
    },
    paymentOrder: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
    },
    paymentDate: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    paymentMeta: {
        alignItems: 'flex-end',
        marginRight: Spacing.md,
    },
    paymentAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
    },
    smallBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 2,
    },
    smallBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    payNowBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    payNowText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default LoanDetailScreen;
