/**
 * @description Notification Screen - Màn hình thông báo
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { RemindersApi, NotificationsApi } from '../../api';
import { Loading } from '../../components';
import { Colors, Spacing, Typography } from '../../constants';
import { formatMoney, formatDate } from '../../utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ReminderScreen = ({ navigation }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [remindersRes, notificationsRes] = await Promise.all([
                RemindersApi.getMyReminders(),
                NotificationsApi.getMyNotifications()
            ]);

            let mergedItems = [];

            // Handle reminders
            if (remindersRes?.success) {
                const remindersData = remindersRes.data?.data || remindersRes.data || [];
                const remindersArray = Array.isArray(remindersData) ? remindersData : [];

                // Chỉ lấy pending và nhóm theo paymentId
                const pendingReminders = remindersArray.filter(r => r.status === 'pending');
                const groupedByPayment = {};
                pendingReminders.forEach(r => {
                    const paymentId = r.paymentId?._id || r.paymentId;
                    const candidate = groupedByPayment[paymentId];
                    if (!candidate) {
                        groupedByPayment[paymentId] = r;
                        return;
                    }
                    const candidateTime = new Date(candidate.scheduledAt || candidate.paymentId?.dueDate || 0).getTime();
                    const currentTime = new Date(r.scheduledAt || r.paymentId?.dueDate || 0).getTime();
                    if (currentTime < candidateTime) {
                        groupedByPayment[paymentId] = r;
                    }
                });

                const reminders = Object.values(groupedByPayment).map(r => {
                    const scheduledAt = r.scheduledAt ? new Date(r.scheduledAt) : null;
                    const dueDate = r.paymentId?.dueDate ? new Date(r.paymentId.dueDate) : null;
                    const createdAt = r.createdAt ? new Date(r.createdAt) : null;
                    const content = getReminderContent(r, dueDate);
                    return ({
                        ...r,
                        itemType: 'reminder',
                        date: createdAt || scheduledAt || dueDate || new Date(),
                        title: content.title,
                        body: content.body,
                        icon: 'clock-alert-outline',
                        iconBg: Colors.warning,
                        isUnread: !r.isRead,
                    });
                });
                mergedItems = [...mergedItems, ...reminders];
            }

            // Handle notifications
            if (notificationsRes?.success) {
                const notificationsData = notificationsRes.data?.data || notificationsRes.data || [];
                const notificationsArray = Array.isArray(notificationsData) ? notificationsData : [];
                const notifications = notificationsArray.map(n => ({
                    ...n,
                    itemType: 'notification',
                    date: new Date(n.createdAt),
                    icon: getNotificationIcon(n.type),
                    iconBg: getNotificationColor(n.type),
                    isUnread: n.status === 'unread',
                }));
                mergedItems = [...mergedItems, ...notifications];
            }

            // Sort by date descending
            mergedItems.sort((a, b) => b.date - a.date);
            setItems(mergedItems);
        } catch (error) {
            console.log('[ReminderScreen] Load data error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'loan_approved': return 'check-decagram';
            case 'loan_rejected': return 'close-octagon';
            case 'loan_disbursed': return 'cash-plus';
            case 'repayment_success': return 'cash-check';
            default: return 'bell-outline';
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'loan_approved': return Colors.success;
            case 'loan_rejected': return Colors.error;
            case 'loan_disbursed': return Colors.primary;
            case 'repayment_success': return Colors.success;
            default: return Colors.info || '#3b82f6';
        }
    };

    const getTimeAgo = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date)) {
            return '';
        }
        const now = new Date();
        const diffMs = now - date;
        if (diffMs < 0) {
            const futureMins = Math.ceil(Math.abs(diffMs) / 60000);
            const futureHours = Math.ceil(futureMins / 60);
            const futureDays = Math.ceil(futureHours / 24);
            if (futureMins < 60) return `Còn ${futureMins} phút`;
            if (futureHours < 24) return `Còn ${futureHours} giờ`;
            if (futureDays < 7) return `Còn ${futureDays} ngày`;
            return formatDate(date);
        }
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút`;
        if (diffHours < 24) return `${diffHours} giờ`;
        if (diffDays < 7) return `${diffDays} ngày`;
        return formatDate(date);
    };

    const getReminderContent = (reminder, dueDate) => {
        const orderNo = reminder.paymentId?.orderNo || '?';
        const amount = formatMoney(reminder.paymentId?.totalAmount);
        const purpose = reminder.loanId?.purpose || 'N/A';
        const dueText = dueDate ? formatDate(dueDate) : '...';
        const now = new Date();
        switch (reminder.type) {
            case 'before_3_days':
                return {
                    title: `Kỳ ${orderNo} sắp đến hạn (3 ngày)`,
                    body: `Khoản vay "${purpose}" cần thanh toán ${amount} vào ${dueText}`,
                };
            case 'before_1_day':
                return {
                    title: `Kỳ ${orderNo} sắp đến hạn (1 ngày)`,
                    body: `Khoản vay "${purpose}" cần thanh toán ${amount} vào ${dueText}`,
                };
            case 'due_day':
                return {
                    title: `Kỳ ${orderNo} đến hạn hôm nay`,
                    body: `Khoản vay "${purpose}" cần thanh toán ${amount} hôm nay`,
                };
            case 'overdue':
                if (dueDate && now < dueDate) {
                    return {
                        title: `Kỳ ${orderNo} sắp đến hạn`,
                        body: `Khoản vay "${purpose}" cần thanh toán ${amount} vào ${dueText}`,
                    };
                }
                return {
                    title: `Kỳ ${orderNo} đã quá hạn`,
                    body: `Khoản vay "${purpose}" đã quá hạn thanh toán ${amount}`,
                };
            default:
                return {
                    title: `Kỳ ${orderNo} đến hạn`,
                    body: `Khoản vay "${purpose}" cần thanh toán ${amount} vào ${dueText}`,
                };
        }
    };

    const getDateGroup = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date)) {
            return 'Trước đó';
        }
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
            // Đánh dấu tất cả notifications đã đọc
            await NotificationsApi.markAllAsRead();

            // Đánh dấu tất cả reminders đã đọc
            await RemindersApi.markAllAsRead();

            // Cập nhật local state - đánh dấu tất cả đã đọc (không xóa)
            setItems(prev => prev.map(i => ({ ...i, isUnread: false })));
        } catch (error) {
            console.log('Mark all read error:', error);
        }
    };

    const handleMarkAsRead = async (item) => {
        if (!item.isUnread) return;
        try {
            if (item.itemType === 'notification') {
                await NotificationsApi.markAsRead(item._id);
            } else if (item.itemType === 'reminder') {
                await RemindersApi.markAsRead(item._id);
            }
            // Cập nhật local state - đánh dấu đã đọc (không xóa)
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
        // Đánh dấu đã đọc khi nhấn
        await handleMarkAsRead(item);

        if (item.itemType === 'reminder') {
            navigation.navigate('Payments');
        } else if (item.data?.loanId) {
            navigation.navigate('LoanDetail', { loanId: item.data.loanId });
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
                        <MaterialCommunityIcons name="bell-off-outline" size={48} color={Colors.gray400} />
                        <Text style={styles.emptyText}>Không có thông báo nào</Text>
                    </View>
                }
                ListFooterComponent={
                    items.length > 0 ? (
                        <Text style={styles.footer}>Không còn thông báo nào</Text>
                    ) : null
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: Colors.textSecondary,
        marginTop: Spacing.md,
        fontSize: 14,
    },
    footer: {
        textAlign: 'center',
        color: Colors.gray400,
        fontSize: 13,
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl,
    },
});

export default ReminderScreen;
