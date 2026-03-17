/**
 * @description Notifications Screen - Thông báo chung cho tất cả người dùng
 * Hiển thị: thông báo về khoản vay, đầu tư, thanh toán, v.v.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { NotificationsApi } from '../../api';
import { Loading } from '../../components';
import { Colors, Spacing } from '../../constants';
import { formatMoney, formatDate } from '../../utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const NotificationsScreen = ({ navigation }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const result = await NotificationsApi.getMyNotifications();

            if (result?.success) {
                const notificationsData = result.data?.data || result.data || [];
                const notificationsArray = Array.isArray(notificationsData) ? notificationsData : [];

                const notifications = notificationsArray.map(n => ({
                    ...n,
                    date: new Date(n.createdAt),
                    icon: getNotificationIcon(n.type),
                    iconBg: getNotificationColor(n.type),
                    isUnread: n.status === 'unread',
                }));

                // Sort by date descending
                notifications.sort((a, b) => b.date - a.date);
                setItems(notifications);
            }
        } catch (error) {
            console.log('[LenderNotifications] Load data error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'investment_success': return 'briefcase-check';
            case 'interest_received': return 'cash-plus';
            case 'principal_received': return 'bank-transfer-in';
            case 'loan_completed': return 'check-decagram';
            case 'loan_disbursed': return 'rocket-launch';
            case 'repayment_received': return 'cash-check';
            case 'new_loan_available': return 'file-document-plus';
            case 'investment_matured': return 'calendar-check';
            case 'payment_reminder': return 'clock-alert-outline';
            case 'loan_signed': return 'file-sign';
            case 'loan_created': return 'file-document-plus-outline';
            case 'loan_funded': return 'hand-coin';
            case 'loan_approved': return 'check-circle-outline';
            case 'repayment_success': return 'cash-check';
            default: return 'bell-outline';
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'investment_success': return Colors.primary;
            case 'interest_received': return Colors.success;
            case 'principal_received': return Colors.success;
            case 'loan_completed': return Colors.success;
            case 'loan_disbursed': return '#8b5cf6';
            case 'repayment_received': return Colors.success;
            case 'repayment_success': return Colors.success;
            case 'new_loan_available': return '#3b82f6';
            case 'investment_matured': return '#f59e0b';
            case 'payment_reminder': return '#f59e0b';
            case 'loan_signed': return '#10b981';
            case 'loan_created': return '#3b82f6';
            case 'loan_funded': return '#10b981';
            case 'loan_approved': return '#10b981';
            default: return '#6b7280';
        }
    };

    const getTimeAgo = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date)) return '';
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút`;
        if (diffHours < 24) return `${diffHours} giờ`;
        if (diffDays < 7) return `${diffDays} ngày`;
        return formatDate(date);
    };

    const getDateGroup = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date)) return 'Trước đó';
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (itemDate.getTime() === today.getTime()) return 'Hôm nay';
        if (itemDate.getTime() === yesterday.getTime()) return 'Hôm qua';
        return 'Trước đó';
    };

    const handleMarkAllRead = async () => {
        try {
            await NotificationsApi.markAllAsRead();
            setItems(prev => prev.map(i => ({ ...i, isUnread: false })));
        } catch (error) {
            console.log('Mark all read error:', error);
        }
    };

    const handleMarkAsRead = async (item) => {
        if (!item.isUnread) return;
        try {
            await NotificationsApi.markAsRead(item._id);
            setItems(prev => prev.map(i =>
                i._id === item._id ? { ...i, isUnread: false } : i
            ));
        } catch (error) {
            console.log('Mark as read error:', error);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleItemPress = async (item) => {
        await handleMarkAsRead(item);

        // Navigate based on notification type and data
        if (item.data?.loanId) {
            navigation.navigate('LoanDetail', {
                loanId: item.data.loanId,
                isMarketplace: false
            });
        } else if (item.data?.investmentId) {
            navigation.navigate('Investments');
        }
    };

    const renderItem = ({ item, index }) => {
        const prevItem = index > 0 ? items[index - 1] : null;
        const currentGroup = getDateGroup(item.date);
        const prevGroup = prevItem ? getDateGroup(prevItem.date) : null;
        const showHeader = currentGroup !== prevGroup;

        return (
            <>
                {showHeader && (
                    <Text style={styles.sectionHeader}>{currentGroup}</Text>
                )}
                <TouchableOpacity
                    style={[styles.card, item.isUnread && styles.cardUnread]}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconContainer, { backgroundColor: `${item.iconBg}20` }]}>
                        <MaterialCommunityIcons name={item.icon} size={22} color={item.iconBg} />
                    </View>
                    <View style={styles.content}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.title, item.isUnread && styles.titleUnread]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <View style={styles.timeRow}>
                                <Text style={styles.time}>{getTimeAgo(item.date)}</Text>
                                {item.isUnread && <View style={styles.unreadDot} />}
                            </View>
                        </View>
                        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                        {item.data?.amount && (
                            <View style={styles.amountBadge}>
                                <Text style={styles.amountText}>+{formatMoney(item.data.amount)}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </>
        );
    };

    if (loading) return <Loading fullScreen />;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông báo</Text>
                <TouchableOpacity onPress={handleMarkAllRead}>
                    <View style={styles.markAllBtn}>
                        <MaterialCommunityIcons name="check-all" size={18} color={Colors.primary} />
                        <Text style={styles.markAllText}>Đọc tất cả</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{items.filter(i => i.isUnread).length}</Text>
                    <Text style={styles.summaryLabel}>Chưa đọc</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{items.length}</Text>
                    <Text style={styles.summaryLabel}>Tổng thông báo</Text>
                </View>
            </View>

            {/* List */}
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item, index) => item._id || index.toString()}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="bell-off-outline" size={64} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>Chưa có thông báo</Text>
                        <Text style={styles.emptySubtext}>Thông báo về đầu tư sẽ hiển thị tại đây</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingTop: 60,
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 4,
        marginRight: Spacing.sm,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    markAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    markAllText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    summaryContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryDivider: {
        width: 1,
        backgroundColor: '#e5e7eb',
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    summaryLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    list: {
        padding: Spacing.lg,
        paddingTop: Spacing.md,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: Spacing.md,
        borderRadius: 12,
        marginBottom: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    cardUnread: {
        backgroundColor: '#f0f9ff',
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    content: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.text,
        flex: 1,
        marginRight: Spacing.sm,
    },
    titleUnread: {
        fontWeight: '700',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    time: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
        marginLeft: 6,
    },
    body: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    amountBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.success + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 8,
    },
    amountText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.success,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
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
    },
});

export default NotificationsScreen;
