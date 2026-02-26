/**
 * @description Lender Dashboard Screen - Pro Fintech Design
 * Ưu tiên: Minh bạch & An tâm cho nhà đầu tư
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Dimensions,
    Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-gifted-charts';
import { Colors, Spacing, Typography } from '../../constants';
import { useAuth } from '../../hooks';
import { InvestmentsApi, WalletApi } from '../../api';
import { Loading, EmptyState } from '../../components';
import { formatMoney } from '../../utils';

const { width } = Dimensions.get('window');

// ============ SKELETON LOADING ============
const SkeletonBox = ({ width: w, height, style }) => {
    const animatedValue = new Animated.Value(0);

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(animatedValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                { width: w, height, backgroundColor: '#e0e0e0', borderRadius: 6, opacity },
                style
            ]}
        />
    );
};

const DashboardSkeleton = () => (
    <View style={styles.container}>
        <View style={[styles.header, { paddingBottom: 80 }]}>
            <View>
                <SkeletonBox width={80} height={14} style={{ marginBottom: 8 }} />
                <SkeletonBox width={150} height={24} />
            </View>
            <SkeletonBox width={44} height={44} style={{ borderRadius: 22 }} />
        </View>
        <View style={{ marginHorizontal: 16, marginTop: -40 }}>
            <SkeletonBox width={width - 32} height={220} style={{ borderRadius: 16 }} />
        </View>
        <View style={{ flexDirection: 'row', padding: 16, gap: 10 }}>
            <SkeletonBox width={(width - 52) / 3} height={48} style={{ borderRadius: 10 }} />
            <SkeletonBox width={(width - 52) / 3} height={48} style={{ borderRadius: 10 }} />
            <SkeletonBox width={(width - 52) / 3} height={48} style={{ borderRadius: 10 }} />
        </View>
        <View style={{ paddingHorizontal: 16 }}>
            <SkeletonBox width={width - 32} height={120} style={{ borderRadius: 12, marginBottom: 12 }} />
            <SkeletonBox width={width - 32} height={80} style={{ borderRadius: 10, marginBottom: 8 }} />
            <SkeletonBox width={width - 32} height={80} style={{ borderRadius: 10 }} />
        </View>
    </View>
);

// ============ HERO ASSET CARD WITH GRADIENT ============
const AssetCard = memo(({
    totalAsset,
    availableBalance,
    investedCapital,
    accumulatedProfit,
    hideAmount,
    onToggleHide
}) => {
    const displayValue = useCallback(
        (value) => hideAmount ? '******' : formatMoney(value),
        [hideAmount]
    );

    return (
        <LinearGradient
            colors={['#1e3a5f', '#0f2744', '#0a1929']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={assetStyles.container}
        >
            {/* Header with hide toggle */}
            <View style={assetStyles.header}>
                <Text style={assetStyles.headerTitle}>Tổng quan tài sản</Text>
                <TouchableOpacity onPress={onToggleHide} style={assetStyles.eyeButton}>
                    <MaterialCommunityIcons
                        name={hideAmount ? "eye-off" : "eye"}
                        size={20}
                        color="rgba(255,255,255,0.8)"
                    />
                </TouchableOpacity>
            </View>

            {/* Total Asset - Số to nhất */}
            <View style={assetStyles.totalSection}>
                <Text style={assetStyles.totalLabel}>Tổng tài sản thực</Text>
                <Text style={assetStyles.totalValue}>{displayValue(totalAsset)}</Text>
            </View>

            {/* Sub metrics grid */}
            <View style={assetStyles.metricsGrid}>
                <View style={assetStyles.metricsRow}>
                    <View style={assetStyles.metricItem}>
                        <View style={[assetStyles.metricIcon, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
                            <MaterialCommunityIcons name="wallet" size={16} color="#22c55e" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={assetStyles.metricLabel}>Số dư khả dụng</Text>
                            <Text style={assetStyles.metricValue}>{displayValue(availableBalance)}</Text>
                        </View>
                    </View>

                    <View style={assetStyles.metricItem}>
                        <View style={[assetStyles.metricIcon, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
                            <MaterialCommunityIcons name="briefcase" size={16} color="#3b82f6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={assetStyles.metricLabel}>Vốn đang đầu tư</Text>
                            <Text style={assetStyles.metricValue}>{displayValue(investedCapital)}</Text>
                        </View>
                    </View>
                </View>

                <View style={assetStyles.profitRow}>
                    <View style={[assetStyles.metricIcon, { backgroundColor: 'rgba(251,191,36,0.2)' }]}>
                        <MaterialCommunityIcons name="trending-up" size={16} color="#fbbf24" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={assetStyles.metricLabel}>Lợi nhuận tích lũy</Text>
                        <Text style={[assetStyles.metricValue, { color: '#22c55e', fontSize: 18 }]}>
                            +{displayValue(accumulatedProfit)}
                        </Text>
                    </View>
                </View>
            </View>
        </LinearGradient>
    );
});

const assetStyles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginTop: -50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    eyeButton: {
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
    },
    totalSection: {
        marginBottom: 20,
    },
    totalLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginBottom: 4,
    },
    totalValue: {
        color: '#fff',
        fontSize: 34,
        fontWeight: 'bold',
        letterSpacing: -1,
    },
    metricsGrid: {
        gap: 12,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    metricItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 10,
        borderRadius: 12,
    },
    profitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(34,197,94,0.1)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.2)',
    },
    metricIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
    },
    metricValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

// ============ REPAYMENT TIMELINE ============
const RepaymentTimeline = memo(({ timeline, hideAmount, navigation }) => {
    if (hideAmount || !timeline || timeline.length === 0) return null;

    return (
        <View style={timelineStyles.container}>
            <View style={timelineStyles.header}>
                <Text style={timelineStyles.title}>Lịch nhận tiền dự kiến</Text>
                <MaterialCommunityIcons name="calendar-clock" size={20} color={Colors.primary} />
            </View>

            <View style={timelineStyles.list}>
                {timeline.map((item, index) => (
                    <View key={index} style={timelineStyles.item}>
                        <View style={timelineStyles.leftLine}>
                            <View style={[timelineStyles.dot, item.isToday && timelineStyles.dotToday]} />
                            {index !== timeline.length - 1 && <View style={timelineStyles.line} />}
                        </View>
                        <View style={timelineStyles.itemContent}>
                            <View style={timelineStyles.dateRow}>
                                <Text style={[timelineStyles.date, item.isToday && timelineStyles.dateToday]}>
                                    {item.dateLabel}
                                </Text>
                                <Text style={timelineStyles.status}>
                                    {item.isPast ? 'Đã nhận' : 'Sắp tới'}
                                </Text>
                            </View>
                            <View style={timelineStyles.infoCard}>
                                <View style={timelineStyles.infoLeft}>
                                    <Text style={timelineStyles.loanPurpose} numberOfLines={1}>{item.purpose}</Text>
                                    <Text style={timelineStyles.repaymentType}>{item.type}</Text>
                                </View>
                                <Text style={timelineStyles.repaymentAmount}>+{formatMoney(item.amount)}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={timelineStyles.footerBtn}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('RepaymentSchedule')}
            >
                <Text style={timelineStyles.footerBtnText}>Xem toàn bộ lịch trình</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.primary} />
            </TouchableOpacity>
        </View>
    );
});

const timelineStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    list: {
        paddingLeft: 4,
    },
    item: {
        flexDirection: 'row',
        minHeight: 70,
    },
    leftLine: {
        width: 20,
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#e5e7eb',
        zIndex: 1,
        marginTop: 6,
    },
    dotToday: {
        backgroundColor: Colors.primary,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 3,
        borderColor: Colors.primary + '40',
        marginTop: 4,
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 4,
    },
    itemContent: {
        flex: 1,
        paddingBottom: 16,
        paddingLeft: 8,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    date: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    dateToday: {
        color: Colors.primary,
        fontWeight: '700',
    },
    status: {
        fontSize: 11,
        color: Colors.textSecondary,
        backgroundColor: '#f8fafc',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    infoCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    infoLeft: {
        flex: 1,
        marginRight: 8,
    },
    loanPurpose: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    repaymentType: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    repaymentAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#22c55e',
    },
    footerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        gap: 4,
    },
    footerBtnText: {
        fontSize: 13,
        color: Colors.primary,
        fontWeight: '600',
    },
});

// ============ QUICK ACTIONS ============
const QuickActions = memo(({ navigation }) => (
    <View style={quickStyles.container}>
        <TouchableOpacity
            style={[quickStyles.button, quickStyles.primaryButton]}
            onPress={() => navigation.navigate('Wallet', { action: 'deposit' })}
        >
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={quickStyles.primaryText}>Nạp tiền</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[quickStyles.button, { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
            onPress={() => navigation.navigate('AutoInvest')}
        >
            <MaterialCommunityIcons name="robot" size={18} color="#fff" />
            <Text style={quickStyles.primaryText}>Auto</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={quickStyles.button}
            onPress={() => navigation.navigate('Wallet', { action: 'withdraw' })}
        >
            <MaterialCommunityIcons name="arrow-down" size={18} color={Colors.primary} />
            <Text style={quickStyles.buttonText}>Rút tiền</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[quickStyles.button, quickStyles.accentButton]}
            onPress={() => navigation.navigate('InvestLoans', { mode: 'marketplace' })}
        >
            <MaterialCommunityIcons name="rocket-launch" size={18} color="#fff" />
            <Text style={quickStyles.primaryText}>Đầu tư</Text>
        </TouchableOpacity>
    </View>
));

const quickStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 10,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    accentButton: {
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
    },
    buttonText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    primaryText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
});

// ============ PORTFOLIO STATUS WITH DONUT CHART ============
const PortfolioStatus = memo(({ onTime, late, overdue, totalInvested }) => {
    const total = onTime + late + overdue;
    if (total === 0) return null;

    const pieData = [
        { value: onTime, color: '#22c55e', text: `${Math.round((onTime / total) * 100)}%` },
        ...(late > 0 ? [{ value: late, color: '#f59e0b', text: `${Math.round((late / total) * 100)}%` }] : []),
        ...(overdue > 0 ? [{ value: overdue, color: '#ef4444', text: `${Math.round((overdue / total) * 100)}%` }] : []),
    ];

    return (
        <View style={portfolioStyles.container}>
            <Text style={portfolioStyles.title}>Trạng thái danh mục</Text>

            <View style={portfolioStyles.content}>
                {/* Donut Chart */}
                <View style={portfolioStyles.chartContainer}>
                    <PieChart
                        data={pieData}
                        donut
                        radius={50}
                        innerRadius={35}
                        innerCircleColor={'#fff'}
                        centerLabelComponent={() => (
                            <View style={portfolioStyles.centerLabel}>
                                <Text style={portfolioStyles.centerCount}>{total}</Text>
                                <Text style={portfolioStyles.centerText}>khoản</Text>
                            </View>
                        )}
                    />
                </View>

                {/* Legend */}
                <View style={portfolioStyles.legend}>
                    <View style={portfolioStyles.legendItem}>
                        <View style={[portfolioStyles.dot, { backgroundColor: '#22c55e' }]} />
                        <View>
                            <Text style={portfolioStyles.legendValue}>{onTime}</Text>
                            <Text style={portfolioStyles.legendText}>Đúng hạn</Text>
                        </View>
                    </View>
                    {late > 0 && (
                        <View style={portfolioStyles.legendItem}>
                            <View style={[portfolioStyles.dot, { backgroundColor: '#f59e0b' }]} />
                            <View>
                                <Text style={portfolioStyles.legendValue}>{late}</Text>
                                <Text style={portfolioStyles.legendText}>Chậm trả</Text>
                            </View>
                        </View>
                    )}
                    {overdue > 0 && (
                        <View style={portfolioStyles.legendItem}>
                            <View style={[portfolioStyles.dot, { backgroundColor: '#ef4444' }]} />
                            <View>
                                <Text style={portfolioStyles.legendValue}>{overdue}</Text>
                                <Text style={portfolioStyles.legendText}>Quá hạn</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
});

const portfolioStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 16,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chartContainer: {
        marginRight: 20,
    },
    centerLabel: {
        alignItems: 'center',
    },
    centerCount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    centerText: {
        fontSize: 10,
        color: Colors.textSecondary,
    },
    legend: {
        flex: 1,
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    legendText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
});

// ============ ACTIVITY ITEM ============
const ActivityItem = memo(({ icon, iconColor, iconBg, title, subtitle, amount, isPositive, onPress }) => (
    <TouchableOpacity style={activityStyles.item} onPress={onPress} activeOpacity={0.7}>
        <View style={[activityStyles.iconContainer, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
        <View style={activityStyles.content}>
            <Text style={activityStyles.title} numberOfLines={1}>{title}</Text>
            <Text style={activityStyles.subtitle}>{subtitle}</Text>
        </View>
        <Text style={[activityStyles.amount, isPositive && { color: '#22c55e' }]}>
            {isPositive ? '+' : ''}{formatMoney(amount)}
        </Text>
    </TouchableOpacity>
));

const activityStyles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    amount: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
});

// ============ HELPER: Lấy trạng thái text ============
const getStatusText = (status) => {
    switch (status) {
        case 'active': return 'Đang hoạt động';
        case 'completed': return 'Hoàn thành';
        case 'pending': return 'Chờ xử lý';
        default: return status;
    }
};

// ============ MAIN COMPONENT ============
const LenderDashboard = ({ navigation }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hideAmount, setHideAmount] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [walletData, setWalletData] = useState({
        balance: 0,
        frozenBalance: 0,
        availableBalance: 0
    });

    const [investments, setInvestments] = useState([]);
    const [repaymentTimeline, setRepaymentTimeline] = useState([]);
    const [stats, setStats] = useState({
        totalInvested: 0,
        totalProfit: 0,
        activeCount: 0,
        completedCount: 0,
        onTimeCount: 0,
        lateCount: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setErrorMessage('');
            const results = await Promise.allSettled([
                InvestmentsApi.getMyInvestments(),
                WalletApi.getBalance()
            ]);
            const [investResult, walletResult] = results;
            const errors = [];

            // Load investments
            if (investResult.status === 'fulfilled' && investResult.value?.success) {
                let list = [];
                if (Array.isArray(investResult.value?.data)) {
                    list = investResult.value.data;
                } else if (Array.isArray(investResult.value?.data?.data)) {
                    list = investResult.value.data.data;
                } else if (Array.isArray(investResult.value?.data?.investments)) {
                    list = investResult.value.data.investments;
                }

                setInvestments(list);

                // Tính toán stats từ dữ liệu thực
                const totalInvested = list.reduce((sum, i) => sum + (i.amount || 0), 0);
                const totalProfit = list.reduce((sum, i) => sum + (i.netProfit || i.grossProfit || 0), 0);
                const activeCount = list.filter(i => i.status === 'active').length;
                const completedCount = list.filter(i => i.status === 'completed').length;

                setStats({
                    totalInvested,
                    totalProfit,
                    activeCount,
                    completedCount,
                    onTimeCount: activeCount + completedCount,
                    lateCount: 0,
                });

                // Tạo lịch trình nhận tiền (Repayment Timeline)
                if (list.length > 0) {
                    const timeline = [];
                    const now = new Date();

                    list.forEach(inv => {
                        if (inv.status === 'active') {
                            const term = inv.loanId?.term || 1;
                            const monthlyReturn = inv.totalReturn / term;
                            const createdAt = new Date(inv.createdAt);

                            // Tạo mốc cho 3 tháng gần nhất để demo (trong thực tế sẽ lấy theo kỳ hạn)
                            for (let i = 1; i <= Math.min(term, 4); i++) {
                                const payDate = new Date(createdAt);
                                payDate.setMonth(payDate.getMonth() + i);

                                // Chỉ lấy các mốc từ tháng này trở đi
                                if (payDate >= new Date(now.getFullYear(), now.getMonth(), 1)) {
                                    timeline.push({
                                        date: payDate,
                                        dateLabel: `Ngày ${payDate.getDate()} thg ${payDate.getMonth() + 1}`,
                                        amount: monthlyReturn,
                                        purpose: inv.loanId?.purpose || 'Khoản đầu tư',
                                        type: i === term ? 'Gốc + Lãi kỳ cuối' : 'Lãi định kỳ',
                                        isToday: payDate.getMonth() === now.getMonth() && payDate.getDate() >= now.getDate() && payDate.getDate() <= now.getDate() + 5,
                                        isPast: payDate < now
                                    });
                                }
                            }
                        }
                    });

                    // Sắp xếp theo ngày gần nhất
                    timeline.sort((a, b) => a.date - b.date);
                    setRepaymentTimeline(timeline.slice(0, 5)); // Lấy 5 mốc gần nhất
                } else {
                    setRepaymentTimeline([]);
                }
            } else {
                setInvestments([]);
                setStats({
                    totalInvested: 0,
                    totalProfit: 0,
                    activeCount: 0,
                    completedCount: 0,
                    onTimeCount: 0,
                    lateCount: 0,
                });
                errors.push('Không tải được danh sách đầu tư');
            }

            // Load wallet
            if (walletResult.status === 'fulfilled' && walletResult.value?.success && walletResult.value?.data?.data) {
                setWalletData(walletResult.value.data.data);
            } else {
                setWalletData({
                    balance: 0,
                    frozenBalance: 0,
                    availableBalance: 0
                });
                errors.push('Không tải được số dư ví');
            }

            if (errors.length > 0) {
                setErrorMessage(errors.join('. '));
            }
        } catch (error) {
            console.error('Load data error:', error);
            setErrorMessage('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    if (loading) return <DashboardSkeleton />;

    // Tính tổng tài sản = số dư khả dụng + vốn đang đầu tư
    const totalAsset = walletData.availableBalance + stats.totalInvested;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            showsVerticalScrollIndicator={false}
        >
            {errorMessage ? (
                <EmptyState
                    title="Không thể tải dữ liệu"
                    message={errorMessage}
                    actionText="Thử lại"
                    onAction={loadData}
                />
            ) : null}
            {/* Header */}
            <LinearGradient
                colors={[Colors.primary, '#1e40af']}
                style={styles.header}
            >
                <View>
                    <Text style={styles.greeting}>Xin chào,</Text>
                    <Text style={styles.userName}>{user?.fullName || user?.phone}</Text>
                </View>
                <TouchableOpacity
                    style={styles.notificationBtn}
                    onPress={() => navigation.navigate('Notifications')}
                >
                    <MaterialCommunityIcons name="bell-outline" size={22} color="#fff" />
                    {/* Badge dot */}
                    <View style={styles.notificationDot} />
                </TouchableOpacity>
            </LinearGradient>

            {/* Hero Asset Card */}
            <AssetCard
                totalAsset={totalAsset}
                availableBalance={walletData.availableBalance}
                investedCapital={stats.totalInvested}
                accumulatedProfit={stats.totalProfit}
                hideAmount={hideAmount}
                onToggleHide={() => setHideAmount(!hideAmount)}
            />

            {/* Quick Actions */}
            <QuickActions navigation={navigation} />

            {/* Repayment Timeline */}
            <RepaymentTimeline timeline={repaymentTimeline} hideAmount={hideAmount} navigation={navigation} />

            {/* Portfolio Status */}
            <PortfolioStatus
                onTime={stats.onTimeCount}
                late={stats.lateCount}
                overdue={0}
                totalInvested={stats.totalInvested}
            />

            {/* Recent Activity */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Investments')}>
                        <Text style={styles.linkText}>Xem tất cả</Text>
                    </TouchableOpacity>
                </View>

                {investments.length > 0 ? (
                    investments.slice(0, 5).map(item => (
                        <ActivityItem
                            key={item._id}
                            icon={item.status === 'completed' ? 'check-circle' : 'briefcase-clock'}
                            iconColor={item.status === 'completed' ? '#22c55e' : '#3b82f6'}
                            iconBg={item.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)'}
                            title={item.loanId?.purpose || 'Khoản vay'}
                            subtitle={`${item.notes} phần - ${getStatusText(item.status)}`}
                            amount={item.amount}
                            isPositive={false}
                            onPress={() => {
                                if (item.loanId?._id) {
                                    navigation.navigate('LoanDetail', {
                                        loanId: item.loanId._id,
                                        isMarketplace: false
                                    });
                                }
                            }}
                        />
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons name="rocket-launch-outline" size={48} color={Colors.textSecondary} />
                        <Text style={styles.emptyTitle}>Chưa có hoạt động</Text>
                        <Text style={styles.emptyText}>Bắt đầu đầu tư để tạo thu nhập thụ động</Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => navigation.navigate('InvestLoans', { mode: 'marketplace' })}
                        >
                            <Text style={styles.emptyButtonText}>Đầu tư ngay</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 70,
    },
    greeting: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 2,
    },
    notificationBtn: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    section: {
        paddingHorizontal: 16,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    linkText: {
        color: Colors.primary,
        fontWeight: '600',
        fontSize: 13,
    },
    emptyCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
        textAlign: 'center',
    },
    emptyButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 20,
    },
    emptyButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default LenderDashboard;
