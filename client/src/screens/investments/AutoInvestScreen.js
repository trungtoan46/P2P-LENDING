/**
 * AutoInvestScreen - List of Auto Invest Campaigns
 */

import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Platform, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants';
import { AutoInvestApi } from '../../api';
import { formatMoney } from '../../utils';
import { Loading } from '../../components';

const AutoInvestScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [campaigns, setCampaigns] = useState([]);

    const loadCampaigns = useCallback(async () => {
        try {
            const result = await AutoInvestApi.getMyConfigs({ limit: 20 });
            const data = result.data?.data || result.data || [];
            setCampaigns(data);
        } catch (error) {
            console.error('Load campaigns error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadCampaigns();
        }, [loadCampaigns])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadCampaigns();
    };

    const togglePause = async (campaign) => {
        const newStatus = campaign.status === 'active' ? 'paused' : 'active';
        try {
            await AutoInvestApi.toggleStatus(campaign._id, newStatus);
            loadCampaigns();
        } catch (err) {
            Alert.alert('Lỗi', 'Không thể thay đổi trạng thái');
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'active': return { label: 'Hoạt động', color: '#10B981', bg: '#ECFDF5', icon: 'play-circle' };
            case 'paused': return { label: 'Tạm dừng', color: '#F59E0B', bg: '#FFFBEB', icon: 'pause-circle' };
            case 'completed': return { label: 'Hoàn thành', color: '#6B7280', bg: '#F3F4F6', icon: 'check-circle' };
            case 'cancelled': return { label: 'Đã hủy', color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle' };
            default: return { label: status, color: '#6B7280', bg: '#F3F4F6', icon: 'help-circle' };
        }
    };

    const renderCampaign = ({ item, index }) => {
        const st = getStatusConfig(item.status);
        const capitalPercent = item.capital > 0 ? Math.min((item.matchedCapital || 0) / item.capital * 100, 100) : 0;
        const nodesPercent = item.totalNodes > 0 ? Math.min((item.matchedNodes || 0) / item.totalNodes * 100, 100) : 0;
        const isActive = item.status === 'active';
        const isPaused = item.status === 'paused';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('AutoInvestDetail', { configId: item._id })}
                activeOpacity={0.7}
            >
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.cardIcon, { backgroundColor: st.bg }]}>
                            <MaterialCommunityIcons name="robot" size={20} color={st.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Gói #{index + 1}</Text>
                            <Text style={styles.cardCapital}>{formatMoney(item.capital)}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <MaterialCommunityIcons name={st.icon} size={14} color={st.color} />
                        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                </View>

                {/* Progress */}
                <View style={styles.progressSection}>
                    <View style={styles.progressRow}>
                        <Text style={styles.progressLabel}>Vốn đã dùng</Text>
                        <Text style={styles.progressValue}>
                            {formatMoney(item.matchedCapital || 0)} ({capitalPercent.toFixed(0)}%)
                        </Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, {
                            width: `${capitalPercent}%`,
                            backgroundColor: capitalPercent >= 90 ? '#EF4444' : capitalPercent >= 70 ? '#F59E0B' : Colors.primary
                        }]} />
                    </View>

                    <View style={[styles.progressRow, { marginTop: 8 }]}>
                        <Text style={styles.progressLabel}>Notes đã khớp</Text>
                        <Text style={styles.progressValue}>
                            {item.matchedNodes || 0}/{item.totalNodes || 0}
                        </Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, {
                            width: `${nodesPercent}%`,
                            backgroundColor: nodesPercent >= 90 ? '#EF4444' : '#10B981'
                        }]} />
                    </View>
                </View>

                {/* Criteria summary */}
                <View style={styles.criteriaRow}>
                    <View style={styles.criteriaChip}>
                        <MaterialCommunityIcons name="percent" size={12} color={Colors.textSecondary} />
                        <Text style={styles.criteriaText}>
                            {item.interestRange?.min}-{item.interestRange?.max}%
                        </Text>
                    </View>
                    <View style={styles.criteriaChip}>
                        <MaterialCommunityIcons name="calendar-range" size={12} color={Colors.textSecondary} />
                        <Text style={styles.criteriaText}>
                            {item.periodRange?.min}-{item.periodRange?.max} tháng
                        </Text>
                    </View>
                    <View style={styles.criteriaChip}>
                        <MaterialCommunityIcons name="file-document-multiple" size={12} color={Colors.textSecondary} />
                        <Text style={styles.criteriaText}>
                            {(item.loans || []).length} khoản
                        </Text>
                    </View>
                </View>

                {/* Quick Actions */}
                {(isActive || isPaused) && (
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: isActive ? '#FEF3C7' : '#ECFDF5' }]}
                            onPress={(e) => { e.stopPropagation(); togglePause(item); }}
                        >
                            <MaterialCommunityIcons
                                name={isActive ? 'pause' : 'play'}
                                size={16}
                                color={isActive ? '#D97706' : '#10B981'}
                            />
                            <Text style={[styles.actionText, { color: isActive ? '#D97706' : '#10B981' }]}>
                                {isActive ? 'Tạm dừng' : 'Kích hoạt'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]}
                            onPress={(e) => { e.stopPropagation(); navigation.navigate('AutoInvestDetail', { configId: item._id }); }}
                        >
                            <MaterialCommunityIcons name="pencil" size={16} color={Colors.textSecondary} />
                            <Text style={[styles.actionText, { color: Colors.textSecondary }]}>Chi tiết</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) return <Loading fullScreen />;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Đầu tư tự động</Text>
                    <Text style={styles.headerSub}>{campaigns.length} gói đầu tư</Text>
                </View>
                <TouchableOpacity
                    style={styles.headerAddBtn}
                    onPress={() => navigation.navigate('AutoInvestDetail', {})}
                >
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    <Text style={styles.headerAddText}>Tạo mới</Text>
                </TouchableOpacity>
            </View>

            {/* Summary Bar */}
            {campaigns.length > 0 && (
                <View style={styles.summaryBar}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {campaigns.filter(c => c.status === 'active').length}
                        </Text>
                        <Text style={styles.summaryLabel}>Đang hoạt động</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {formatMoney(campaigns.reduce((s, c) => s + (c.matchedCapital || 0), 0))}
                        </Text>
                        <Text style={styles.summaryLabel}>Tổng đã đầu tư</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {campaigns.reduce((s, c) => s + (c.matchedNodes || 0), 0)}
                        </Text>
                        <Text style={styles.summaryLabel}>Notes đã khớp</Text>
                    </View>
                </View>
            )}

            <FlatList
                data={campaigns}
                renderItem={renderCampaign}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="robot-off" size={64} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>Chưa có gói đầu tư</Text>
                        <Text style={styles.emptySub}>
                            Tạo gói đầu tư tự động để hệ thống tự khớp lệnh cho bạn
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyBtn}
                            onPress={() => navigation.navigate('AutoInvestDetail', {})}
                        >
                            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                            <Text style={styles.emptyBtnText}>Tạo gói đầu tiên</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* FAB */}
            {campaigns.length > 0 && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('AutoInvestDetail', {})}
                    activeOpacity={0.9}
                >
                    <MaterialCommunityIcons name="plus" size={28} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F9FC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingTop: Platform.OS === 'ios' ? 56 : 40,
        paddingBottom: 16,
        paddingHorizontal: 16,
        gap: 12,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    headerAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    },
    headerAddText: { fontSize: 13, fontWeight: '600', color: '#fff' },

    summaryBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 14,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryValue: { fontSize: 15, fontWeight: '700', color: Colors.text },
    summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
    summaryDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 },

    list: { padding: 16, paddingBottom: 100 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardIcon: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    cardTitle: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    cardCapital: { fontSize: 17, fontWeight: '700', color: Colors.text, marginTop: 2 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    statusText: { fontSize: 12, fontWeight: '600' },

    progressSection: { marginBottom: 12 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    progressLabel: { fontSize: 12, color: Colors.textSecondary },
    progressValue: { fontSize: 12, fontWeight: '600', color: Colors.text },
    progressBar: { height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },

    criteriaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    criteriaChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#F7F9FC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    criteriaText: { fontSize: 11, color: Colors.textSecondary },

    quickActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 8, borderRadius: 10,
    },
    actionText: { fontSize: 13, fontWeight: '600' },

    emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 16 },
    emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 24,
        borderRadius: 12, marginTop: 20,
    },
    emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

    fab: {
        position: 'absolute', bottom: 30, right: 20,
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
        elevation: 8, shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
});

export default AutoInvestScreen;
