/**
 * Màn hình toàn bộ lịch trình nhận tiền
 * Hiển thị chi tiết dòng tiền tương lai của Lender
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';
import { InvestmentsApi } from '../../api';
import { Loading, EmptyState } from '../../components';
import { formatMoney } from '../../utils';

const RepaymentScheduleScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [investments, setInvestments] = useState([]);
    const [schedule, setSchedule] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const result = await InvestmentsApi.getMyInvestments();
            if (result.success) {
                const list = result.data?.data || result.data || [];
                setInvestments(list);
                calculateSchedule(list);
            }
        } catch (error) {
            console.error('Load schedule error:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateSchedule = (list) => {
        const fullTimeline = [];
        const now = new Date();

        list.forEach(inv => {
            if (inv.status === 'active') {
                const term = inv.loanId?.term || 1;
                const monthlyReturn = inv.totalReturn / term;
                const createdAt = new Date(inv.createdAt);

                for (let i = 1; i <= term; i++) {
                    const payDate = new Date(createdAt);
                    payDate.setMonth(payDate.getMonth() + i);

                    fullTimeline.push({
                        date: payDate,
                        monthKey: `${payDate.getFullYear()}-${payDate.getMonth() + 1}`,
                        dateLabel: `Ngày ${payDate.getDate()} thg ${payDate.getMonth() + 1}`,
                        amount: monthlyReturn,
                        purpose: inv.loanId?.purpose || 'Khoản đầu tư',
                        type: i === term ? 'Gốc + Lãi kỳ cuối' : 'Lãi định kỳ',
                        isPast: payDate < now
                    });
                }
            }
        });

        // Sắp xếp theo ngày
        fullTimeline.sort((a, b) => a.date - b.date);
        setSchedule(fullTimeline);
    };

    // Nhóm theo tháng để hiển thị Header tháng
    const groupedSchedule = useMemo(() => {
        const groups = {};
        schedule.forEach(item => {
            if (!groups[item.monthKey]) {
                groups[item.monthKey] = {
                    title: `Tháng ${item.monthKey.split('-')[1]}/${item.monthKey.split('-')[0]}`,
                    total: 0,
                    data: []
                };
            }
            groups[item.monthKey].data.push(item);
            groups[item.monthKey].total += item.amount;
        });
        return Object.values(groups);
    }, [schedule]);

    if (loading) return <Loading fullScreen />;

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.dateBadge}>
                    <Text style={styles.dateDay}>{item.date.getDate()}</Text>
                    <Text style={styles.dateMonth}>T{item.date.getMonth() + 1}</Text>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.purpose} numberOfLines={1}>{item.purpose}</Text>
                    <Text style={styles.type}>{item.type}</Text>
                </View>
                <View style={styles.amountContainer}>
                    <Text style={styles.amount}>+{formatMoney(item.amount)}</Text>
                    <Text style={[styles.status, item.isPast ? styles.statusPast : styles.statusFuture]}>
                        {item.isPast ? 'Đã nhận' : 'Chờ nhận'}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lịch trình nhận tiền</Text>
                <View style={{ width: 40 }} />
            </View>

            {schedule.length > 0 ? (
                <FlatList
                    data={groupedSchedule}
                    keyExtractor={item => item.title}
                    contentContainerStyle={styles.list}
                    renderItem={({ item: group }) => (
                        <View style={styles.groupContainer}>
                            <View style={styles.groupHeader}>
                                <Text style={styles.groupTitle}>{group.title}</Text>
                                <Text style={styles.groupTotal}>Tổng: {formatMoney(group.total)}</Text>
                            </View>
                            {group.data.map((item, idx) => (
                                <View key={idx}>{renderItem({ item })}</View>
                            ))}
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <EmptyState
                    title="Chưa có lịch trình"
                    message="Bắt đầu đầu tư để thấy dòng tiền tương lai của bạn tại đây."
                    actionText="Đầu tư ngay"
                    onAction={() => navigation.navigate('InvestLoans', { mode: 'marketplace' })}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.primary,
        paddingTop: 10,
        paddingBottom: 20,
        paddingHorizontal: 16,
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
    list: {
        padding: 16,
    },
    groupContainer: {
        marginBottom: 24,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    groupTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: Colors.text,
    },
    groupTotal: {
        fontSize: 14,
        fontWeight: '600',
        color: '#22c55e',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateBadge: {
        width: 44,
        height: 44,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    dateDay: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    dateMonth: {
        fontSize: 10,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
    },
    cardInfo: {
        flex: 1,
    },
    purpose: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    type: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#22c55e',
    },
    status: {
        fontSize: 10,
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    statusPast: {
        backgroundColor: '#f1f5f9',
        color: Colors.textSecondary,
    },
    statusFuture: {
        backgroundColor: Colors.primary + '15',
        color: Colors.primary,
    },
});

export default RepaymentScheduleScreen;
