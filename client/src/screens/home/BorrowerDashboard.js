/**
 * @description Borrower Dashboard Screen
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { useAuth } from '../../hooks';
import { LoansApi, PaymentsApi, UserApi, RemindersApi, NotificationsApi } from '../../api';
import {
    Loading,
    EmptyState,
    CreditScoreCard,
    LoanOverviewCard,
    ActiveLoanItem,
    UpcomingPayment,
} from '../../components';
import { formatMoney, formatDate } from '../../utils';

const KYC_STATUS = {
    approved: { label: 'Đã xác minh', color: '#22c55e' },
    pending: { label: 'Chưa xác minh', color: '#eab308' },
    rejected: { label: 'Bị từ chối', color: '#ef4444' },
};

const BorrowerDashboard = ({ navigation }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loans, setLoans] = useState([]);
    const [upcomingPayment, setUpcomingPayment] = useState(null);
    const [notificationCount, setNotificationCount] = useState(0);
    const [creditScore, setCreditScore] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setErrorMessage('');
            const results = await Promise.allSettled([
                LoansApi.getMyLoans(),
                PaymentsApi.getDue(),
                UserApi.getProfile(),
                RemindersApi.getMyReminders(),
                NotificationsApi.getMyNotifications()
            ]);
            const [loansRes, paymentsRes, userRes, remindersRes, notificationsRes] = results;
            const errors = [];

            // Process Loans
            if (loansRes.status === 'fulfilled' && loansRes.value?.success) {
                const loansData = loansRes.value?.data?.data || loansRes.value?.data || [];
                setLoans(Array.isArray(loansData) ? loansData : []);
            } else {
                errors.push('Không tải được danh sách khoản vay');
            }

            // Process Upcoming Payment
            if (paymentsRes.status === 'fulfilled' && paymentsRes.value?.success) {
                const payments = paymentsRes.value?.data?.data?.payments ||
                    paymentsRes.value?.data?.data ||
                    paymentsRes.value?.data?.payments ||
                    paymentsRes.value?.data || [];
                if (Array.isArray(payments) && payments.length > 0) {
                    setUpcomingPayment(payments[0]);
                } else {
                    setUpcomingPayment(null);
                }
            } else {
                errors.push('Không tải được lịch thanh toán');
            }

            // Process Credit Score
            if (userRes.status === 'fulfilled' && userRes.value?.success) {
                const profileData = userRes.value?.data?.data;
                setCreditScore(profileData?.details?.score || 0);
            } else {
                errors.push('Không tải được thông tin người dùng');
            }

            // Process Notification Badge Count
            let totalUnread = 0;
            if (remindersRes.status === 'fulfilled' && remindersRes.value?.success) {
                const reminders = remindersRes.value?.data?.data || remindersRes.value?.data || [];
                const remindersArray = Array.isArray(reminders) ? reminders : [];
                // Nhóm theo paymentId - chỉ đếm pending và chưa đọc
                const unreadReminders = remindersArray.filter(r => r.status === 'pending' && !r.isRead);
                const uniquePaymentIds = new Set(unreadReminders.map(r => r.paymentId?._id || r.paymentId));
                totalUnread += uniquePaymentIds.size;
            } else {
                errors.push('Không tải được nhắc nhở');
            }
            if (notificationsRes.status === 'fulfilled' && notificationsRes.value?.success) {
                const notifications = notificationsRes.value?.data?.data || notificationsRes.value?.data || [];
                const unreadNotifications = Array.isArray(notifications)
                    ? notifications.filter(n => n.status === 'unread').length
                    : 0;
                totalUnread += unreadNotifications;
            } else {
                errors.push('Không tải được thông báo');
            }
            setNotificationCount(totalUnread);
            if (errors.length > 0) {
                setErrorMessage(errors.join('. '));
            }

        } catch (error) {
            console.warn('Load dashboard data error:', error);
            setErrorMessage('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadDashboardData();
    };

    if (loading) return <Loading fullScreen />;

    // Sử dụng kycStatus trực tiếp từ details
    const kycInfo = KYC_STATUS[user?.details?.kycStatus] || KYC_STATUS.pending;
    // Financial calculations from REAL data
    const activeLoans = loans.filter(loan => loan.status === 'active' || loan.status === 'success');
    const totalDebt = activeLoans.reduce((sum, loan) => sum + (loan.remainingAmount || 0), 0);
    const totalPaid = activeLoans.reduce((sum, loan) => sum + (loan.paidAmount || 0), 0);

    const nextPaymentAmount = upcomingPayment?.totalAmount || 0;
    const nextDueDate = upcomingPayment?.dueDate ? new Date(upcomingPayment.dueDate) : null;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
            }
        >
            {errorMessage ? (
                <EmptyState
                    title="Không thể tải dữ liệu"
                    message={errorMessage}
                    actionText="Thử lại"
                    onAction={loadDashboardData}
                />
            ) : null}
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.greeting}>Xin chào,</Text>
                    <Text
                        style={styles.userName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {user?.fullName || user?.phone || 'Người vay'}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.notificationBtn}
                        onPress={() => navigation.navigate('Reminders')}
                    >
                        <MaterialCommunityIcons name="bell-outline" size={26} color={Colors.white} />
                        {notificationCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <View style={[styles.kycBadge, { backgroundColor: `${kycInfo.color}20` }]}>
                        <Text style={[styles.kycText, { color: kycInfo.color }]}>{kycInfo.label}</Text>
                    </View>
                </View>
            </View>

            {/* Credit Score */}
            <CreditScoreCard score={creditScore} />

            {/* Loan Overview Cards */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tổng quan tài chính</Text>
                <View style={styles.overviewCards}>
                    <LoanOverviewCard
                        title="Đã thanh toán"
                        value={totalPaid}
                        iconName="cash-check"
                        color={Colors.success}
                    />
                    <LoanOverviewCard
                        title="Dư nợ còn lại"
                        value={totalDebt}
                        iconName="cash-minus"
                        color="#ef4444"
                    />
                </View>
                <TouchableOpacity
                    style={styles.overviewCards}
                    onPress={() => navigation.navigate('Payments')}
                >
                    <LoanOverviewCard
                        title="Kỳ tiếp theo"
                        value={nextPaymentAmount}
                        iconName="cash-clock"
                        color="#eab308"
                    />
                    <LoanOverviewCard
                        title="Hạn thanh toán"
                        value={formatDate(nextDueDate)}
                        iconName="calendar-clock"
                        color="#3b82f6"
                    />
                </TouchableOpacity>
            </View>

            {/* Upcoming Payment */}
            {upcomingPayment && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thanh toán sắp tới</Text>
                    <UpcomingPayment
                        amount={upcomingPayment.totalAmount}
                        dueDate={upcomingPayment.dueDate}
                        loanCode={upcomingPayment.loanId?.purpose || 'Khoản vay'}
                        penalty={upcomingPayment.penaltyAmount || 0}
                        onPayNow={() => navigation.navigate('Payments')}
                    />
                </View>
            )}

            {/* Active Loans List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Khoản vay đang hoạt động</Text>
                {activeLoans.length > 0 ? (
                    activeLoans.map(loan => (
                        <ActiveLoanItem
                            key={loan._id}
                            loan={loan}
                            onPress={() => navigation.navigate('LoanDetail', { loanId: loan._id })}
                        />
                    ))
                ) : (
                    <EmptyState
                        title="Chưa có khoản vay"
                        message="Bạn chưa có khoản vay nào đang hoạt động"
                        actionText="Tạo khoản vay mới"
                        onAction={() => navigation.navigate('CreateLoan')}
                    />
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('CreateLoan')}
                >
                    <View style={styles.actionIconContainer}>
                        <MaterialCommunityIcons name="plus" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.actionText}>Vay mới</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('PaymentsTab')}
                >
                    <View style={styles.actionIconContainer}>
                        <MaterialCommunityIcons name="cash-multiple" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.actionText}>Thanh toán</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <View style={styles.actionIconContainer}>
                        <MaterialCommunityIcons name="account" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.actionText}>Cá nhân</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacing} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.primary,
        paddingTop: 60,
        paddingBottom: Spacing.xl,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerLeft: {
        flex: 1,
        paddingRight: Spacing.md,
        minWidth: 0,
    },
    greeting: {
        fontSize: Typography.fontSize.sm,
        color: 'rgba(255,255,255,0.8)',
    },
    userName: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: '#fff',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationBtn: {
        marginRight: Spacing.md,
        padding: 4,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#ef4444',
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    badgeText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    kycBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Spacing.sm,
    },
    kycText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    section: {
        padding: Spacing.lg,
        paddingBottom: 0,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    overviewCards: {
        flexDirection: 'row',
        marginBottom: Spacing.sm,
        marginHorizontal: -Spacing.xs,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        marginTop: Spacing.lg,
        marginHorizontal: Spacing.lg,
        borderRadius: Spacing.md,
    },
    actionButton: {
        alignItems: 'center',
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${Colors.primary}20`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    actionText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text,
    },
    bottomSpacing: {
        height: Spacing.xl,
    },
});

export default BorrowerDashboard;
