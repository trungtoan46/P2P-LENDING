/**
 * Màn hình danh sách phòng chờ & đầu tư (Portfolio)
 * Hiển thị phòng chờ thủ công + các khoản đầu tư đã khớp
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WaitingRoomsApi, InvestmentsApi } from '../../api';
import { Loading } from '../../components';
import { Colors } from '../../constants';
import { formatMoney } from '../../utils';

const WaitingRoomScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('all');
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        try {
            const [roomsResult, investmentsResult] = await Promise.all([
                WaitingRoomsApi.getMyRooms(),
                InvestmentsApi.getMyInvestments({ status: 'pending', limit: 100 })
            ]);

            let allItems = [];

            if (roomsResult.success && roomsResult.data?.data && Array.isArray(roomsResult.data.data)) {
                allItems = [...allItems, ...roomsResult.data.data.map(r => ({ ...r, type: 'manual' }))];
            }

            const investmentsData = investmentsResult.data?.data;
            if (investmentsData && Array.isArray(investmentsData)) {
                const invs = investmentsData.map(i => ({
                    ...i,
                    type: 'investment',
                    status: i.status
                }));
                allItems = [...allItems, ...invs];
            }

            allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRooms(allItems);
        } catch (error) {
            console.log('Load rooms error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadRooms();
    };

    const handleConfirm = (item) => {
        Alert.alert(
            'Xác nhận đầu tư',
            `Bạn có chắc chắn muốn xác nhận khoản đầu tư ${formatMoney(item.amount)} không?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await InvestmentsApi.confirm(item._id);
                            Alert.alert('Thành công', 'Đã xác nhận đầu tư thành công');
                            loadRooms();
                        } catch (error) {
                            console.log('Confirm error:', error);
                            Alert.alert('Lỗi', 'Không thể xác nhận đầu tư. Vui lòng thử lại.');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => {
        const isAuto = item.autoInvestId || (item.type === 'investment' && item.status === 'matched');

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={styles.card}
                onPress={() => item.loanId && navigation.navigate('LoanDetail', { loanId: item.loanId._id || item.loanId })}
            >
                <View style={[styles.row, { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{
                            width: 32, height: 32, borderRadius: 16,
                            backgroundColor: isAuto ? '#E0E7FF' : '#FEF3C7',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <MaterialCommunityIcons
                                name={isAuto ? "robot" : "hand-coin"}
                                size={18}
                                color={isAuto ? Colors.primary : '#D97706'}
                            />
                        </View>
                        <View>
                            <Text style={styles.title}>
                                {isAuto ? 'Auto Invest' : 'Thủ công'}
                            </Text>
                            <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                                #{item._id.slice(-6).toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: getStatusColor(item.status) + '15' }}>
                        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                            {item.status === 'matched' ? 'Đã khớp' : item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Số tiền đầu tư</Text>
                    <Text style={[styles.value, { color: Colors.primary, fontSize: 16 }]}>
                        {formatMoney(item.amount)}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Lợi nhuận dự kiến</Text>
                    <Text style={styles.value}>
                        {item.totalReturn ? formatMoney(item.totalReturn - item.amount) : '---'}
                    </Text>
                </View>

                {item.loanId && (
                    <View style={[styles.row, { marginTop: 4 }]}>
                        <Text style={styles.label}>Khoản vay</Text>
                        <Text style={[styles.value, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                            {item.loanId.purpose || 'Mục đích vay vốn'}
                        </Text>
                    </View>
                )}

                {item.status === 'pending' && (
                    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
                        <TouchableOpacity
                            style={{
                                backgroundColor: Colors.primary,
                                paddingVertical: 10,
                                borderRadius: 8,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 8
                            }}
                            onPress={() => handleConfirm(item)}
                        >
                            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Xác nhận đầu tư</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'matched': return Colors.success;
            case 'pending': return Colors.warning;
            case 'cancelled': return Colors.error;
            default: return Colors.text;
        }
    };

    const getFilteredData = () => {
        if (activeTab === 'all') return rooms;
        if (activeTab === 'manual') return rooms.filter(r => r.type === 'manual');
        if (activeTab === 'auto') return rooms.filter(r => r.type === 'investment' && r.autoInvestId);
        return rooms;
    };

    if (loading) return <Loading fullScreen />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Danh mục đầu tư</Text>
                <Text style={styles.headerSubtitle}>Quản lý các khoản đầu tư và phòng chờ</Text>
            </View>

            <View style={styles.tabContainer}>
                {['all', 'manual', 'auto'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'all' ? 'Tất cả' : tab === 'manual' ? 'Thủ công' : 'Tự động'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={getFilteredData()}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="clipboard-text-outline" size={60} color={Colors.gray300} />
                        <Text style={styles.empty}>Chưa có dữ liệu</Text>
                        <Text style={styles.emptySub}>
                            {activeTab === 'auto'
                                ? 'Chưa có khoản đầu tư tự động nào.'
                                : 'Bạn chưa thực hiện khoản đầu tư nào.'}
                        </Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AutoInvest')}
                activeOpacity={0.9}
            >
                <MaterialCommunityIcons name="robot-confused" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F9FC' },
    header: {
        backgroundColor: Colors.white,
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F6',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    activeTab: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    activeTabText: {
        color: '#fff',
    },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    card: {
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    title: { fontSize: 16, fontWeight: '700', color: Colors.text },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    label: { color: Colors.textSecondary, fontSize: 14 },
    value: { fontWeight: '600', fontSize: 15, color: Colors.text },
    status: { fontWeight: '700', fontSize: 12 },
    emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
    empty: { textAlign: 'center', color: Colors.text, fontSize: 18, fontWeight: '600', marginTop: 16 },
    emptySub: { textAlign: 'center', color: Colors.textSecondary, fontSize: 14, marginTop: 8, lineHeight: 20 },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});

export default WaitingRoomScreen;
