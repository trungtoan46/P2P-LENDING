/**
 * AutoInvestDetailScreen - Detail/Edit/Create Campaign
 * UX: Phân biệt rõ giữ chỗ (WaitingRoom) vs đã đầu tư (Investment)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, Switch, RefreshControl, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../constants';
import { AutoInvestApi } from '../../api';
import { formatMoney } from '../../utils';
import { Button, Input, Loading } from '../../components';

const formatNumber = (num) => {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const AutoInvestDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const configId = route.params?.configId;
    const isCreateMode = !configId;

    const [loading, setLoading] = useState(!isCreateMode);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    // Config state
    const [isEnabled, setIsEnabled] = useState(true);
    const [configStatus, setConfigStatus] = useState('active');

    // Form
    const [capital, setCapital] = useState('');
    const [maxCapitalPerLoan, setMaxCapitalPerLoan] = useState('');
    const [minRate, setMinRate] = useState('10');
    const [maxRate, setMaxRate] = useState('20');
    const [minTerm, setMinTerm] = useState('1');
    const [maxTerm, setMaxTerm] = useState('12');

    // Progress
    const [totalCapital, setTotalCapital] = useState(0);
    const [matchedCapital, setMatchedCapital] = useState(0);
    const [totalNodes, setTotalNodes] = useState(0);
    const [matchedNodes, setMatchedNodes] = useState(0);

    // Items
    const [waitingRooms, setWaitingRooms] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [matchedLoans, setMatchedLoans] = useState([]);

    const loadDetail = useCallback(async () => {
        if (!configId) return;
        try {
            const result = await AutoInvestApi.getDetail(configId);
            const data = result.data?.data || result.data;
            if (!data) return;

            setConfigStatus(data.status);
            setIsEnabled(data.status === 'active');
            setCapital(data.capital ? formatNumber(data.capital) : '');
            setMaxCapitalPerLoan(data.maxCapitalPerLoan ? formatNumber(data.maxCapitalPerLoan) : '');
            setMinRate(data.interestRange?.min?.toString() || '10');
            setMaxRate(data.interestRange?.max?.toString() || '20');
            setMinTerm(data.periodRange?.min?.toString() || '1');
            setMaxTerm(data.periodRange?.max?.toString() || '12');

            setTotalCapital(data.capital || 0);
            setMatchedCapital(data.matchedCapital || 0);
            setTotalNodes(data.totalNodes || 0);
            setMatchedNodes(data.matchedNodes || 0);

            setMatchedLoans((data.loans || []).filter(l => l.loanId));
            setWaitingRooms(data.waitingRooms || []);
            setInvestments(data.investments || []);
        } catch (error) {
            console.error('Load detail error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [configId]);

    useEffect(() => { loadDetail(); }, [loadDetail]);

    const onRefresh = () => { setRefreshing(true); loadDetail(); };

    const handleSave = async () => {
        const rawCapital = capital ? Number(capital.replace(/\./g, '')) : 0;
        if (!rawCapital || rawCapital < 1000000) {
            Alert.alert('Lưu ý', 'Vốn đầu tư tối thiểu là 1,000,000 VND');
            return;
        }
        const rawMaxCapital = maxCapitalPerLoan ? Number(maxCapitalPerLoan.replace(/\./g, '')) : 0;
        if (rawMaxCapital && rawMaxCapital > rawCapital) {
            Alert.alert('Lưu ý', 'Tối đa mỗi khoản vay không được lớn hơn tổng vốn');
            return;
        }
        const nMinRate = Number(minRate);
        const nMaxRate = Number(maxRate);
        const nMinTerm = Number(minTerm);
        const nMaxTerm = Number(maxTerm);
        if (!nMinRate || !nMaxRate || nMinRate <= 0 || nMaxRate <= 0) {
            Alert.alert('Lưu ý', 'Lãi suất phải lớn hơn 0');
            return;
        }
        if (nMinRate > nMaxRate) {
            Alert.alert('Lưu ý', 'Lãi suất tối thiểu phải nhỏ hơn tối đa');
            return;
        }
        if (nMaxRate > 50) {
            Alert.alert('Lưu ý', 'Lãi suất tối đa không quá 50%/năm');
            return;
        }
        if (!nMinTerm || !nMaxTerm || nMinTerm < 1) {
            Alert.alert('Lưu ý', 'Kỳ hạn tối thiểu là 1 tháng');
            return;
        }
        if (nMinTerm > nMaxTerm) {
            Alert.alert('Lưu ý', 'Kỳ hạn tối thiểu phải nhỏ hơn tối đa');
            return;
        }

        setSaving(true);
        try {
            const data = {
                capital: rawCapital,
                maxCapitalPerLoan: rawMaxCapital || undefined,
                interestRange: { min: nMinRate, max: nMaxRate },
                periodRange: { min: nMinTerm, max: nMaxTerm },
                status: isEnabled ? 'active' : 'paused'
            };

            if (configId) data._id = configId;

            const result = await AutoInvestApi.upsertConfig(data);

            if (isCreateMode && result.data?.data?._id) {
                Alert.alert('Thành công', 'Đã tạo gói đầu tư mới', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Thành công', 'Đã lưu cấu hình');
                loadDetail();
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.data?.message || error.message || 'Không thể lưu cấu hình';
            Alert.alert('Lỗi', msg);
        } finally {
            setSaving(false);
        }
    };

    const toggleSwitch = async () => {
        if (isCreateMode) { setIsEnabled(!isEnabled); return; }
        const newState = !isEnabled;
        setIsEnabled(newState);
        try {
            await AutoInvestApi.toggleStatus(configId, newState ? 'active' : 'paused');
            setConfigStatus(newState ? 'active' : 'paused');
        } catch (err) {
            setIsEnabled(!newState);
            console.error('Toggle error:', err.response?.data || err.message);
            Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Không thể thay đổi trạng thái');
        }
    };

    const handleCancel = () => {
        const activeInvCount = investments.filter(i => i.status === 'active').length;
        const pendingInvCount = investments.filter(i => i.status === 'pending').length;
        const pendingAmount = investments.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);

        let message = 'Bạn có chắc muốn hủy gói đầu tư này?\n\n';
        if (waitingRooms.length > 0) {
            message += `- ${waitingRooms.length} lệnh giữ chỗ sẽ bị hủy (miễn phí)\n`;
        }
        if (pendingInvCount > 0) {
            message += `- ${pendingInvCount} khoản đang chờ giải ngân sẽ hoàn tiền ${formatMoney(pendingAmount)}\n`;
        }
        if (activeInvCount > 0) {
            message += `\n${activeInvCount} khoản đã giải ngân KHÔNG THỂ HỦY.`;
        }

        Alert.alert('Hủy gói đầu tư', message, [
            { text: 'Không', style: 'cancel' },
            {
                text: 'Xác nhận hủy', style: 'destructive',
                onPress: async () => {
                    setCancelling(true);
                    try {
                        const result = await AutoInvestApi.cancelConfig(configId);
                        const d = result.data?.data || result.data;
                        let msg = 'Đã hủy gói đầu tư.';
                        if (d?.refundedAmount > 0) msg += `\nĐã hoàn ${formatMoney(d.refundedAmount)} về ví.`;
                        if (d?.uncancellableCount > 0) msg += `\n${d.uncancellableCount} khoản đang hoạt động không thể hủy.`;
                        Alert.alert('Hoàn tất', msg, [
                            { text: 'OK', onPress: () => navigation.goBack() }
                        ]);
                    } catch (err) {
                        Alert.alert('Lỗi', err.response?.data?.message || 'Không thể hủy');
                    } finally {
                        setCancelling(false);
                    }
                }
            }
        ]);
    };

    // Computed
    const capitalPercent = totalCapital > 0 ? Math.min((matchedCapital / totalCapital) * 100, 100) : 0;
    const nodesPercent = totalNodes > 0 ? Math.min((matchedNodes / totalNodes) * 100, 100) : 0;
    const isCancelled = configStatus === 'cancelled';
    const isCompleted = configStatus === 'completed';
    const isReadOnly = isCancelled || isCompleted;

    if (loading) return <Loading fullScreen />;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isCreateMode ? 'Tạo gói mới' : 'Chi tiết gói đầu tư'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                refreshControl={!isCreateMode ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
                showsVerticalScrollIndicator={false}
            >
                {/* Switch Card */}
                <View style={[styles.switchCard, isEnabled && !isReadOnly ? styles.cardActive : styles.cardInactive]}>
                    <View style={styles.switchRow}>
                        <View>
                            <Text style={[styles.switchTitle, { color: isEnabled && !isReadOnly ? '#fff' : Colors.text }]}>
                                {isCreateMode ? 'Kích hoạt ngay' : 'Auto-Invest'}
                            </Text>
                            <Text style={[styles.switchSub, { color: isEnabled && !isReadOnly ? 'rgba(255,255,255,0.8)' : Colors.textSecondary }]}>
                                {isReadOnly ? (isCancelled ? 'Đã hủy' : 'Đã hoàn thành')
                                    : isEnabled ? 'Đang hoạt động' : 'Đang tạm dừng'}
                            </Text>
                        </View>
                        {!isReadOnly && (
                            <Switch
                                trackColor={{ false: '#d1d5db', true: '#a78bfa' }}
                                thumbColor={isEnabled ? '#fff' : '#f4f3f4'}
                                onValueChange={toggleSwitch}
                                value={isEnabled}
                                style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }}
                            />
                        )}
                    </View>
                </View>

                {/* Progress Card (Edit mode only) */}
                {!isCreateMode && (
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="chart-arc" size={20} color={Colors.primary} />
                            <Text style={styles.sectionTitle}>Tiến trình</Text>
                        </View>

                        <View style={styles.progressItem}>
                            <View style={styles.progressLabelRow}>
                                <Text style={styles.progressLabel}>Vốn đã dùng</Text>
                                <Text style={styles.progressValue}>
                                    {formatMoney(matchedCapital)} / {formatMoney(totalCapital)}
                                </Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, {
                                    width: `${capitalPercent}%`,
                                    backgroundColor: capitalPercent >= 90 ? '#EF4444' : capitalPercent >= 70 ? '#F59E0B' : Colors.primary
                                }]} />
                            </View>
                            <Text style={styles.progressPercent}>{capitalPercent.toFixed(1)}%</Text>
                        </View>

                        <View style={[styles.progressItem, { marginTop: 14 }]}>
                            <View style={styles.progressLabelRow}>
                                <Text style={styles.progressLabel}>Notes đã khớp</Text>
                                <Text style={styles.progressValue}>{matchedNodes} / {totalNodes}</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, {
                                    width: `${nodesPercent}%`,
                                    backgroundColor: nodesPercent >= 90 ? '#EF4444' : '#10B981'
                                }]} />
                            </View>
                            <Text style={styles.progressPercent}>{nodesPercent.toFixed(1)}%</Text>
                        </View>
                    </View>
                )}

                {/* Waiting Rooms - Giữ chỗ */}
                {waitingRooms.length > 0 && (
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="clock-outline" size={20} color="#F59E0B" />
                            <Text style={styles.sectionTitle}>Giữ chỗ ({waitingRooms.length})</Text>
                            <View style={[styles.legendDot, { backgroundColor: '#FEF3C7' }]} />
                            <Text style={styles.legendText}>Chưa tốn tiền</Text>
                        </View>

                        {waitingRooms.map((room, idx) => (
                            <View key={idx} style={[styles.itemCard, { borderLeftColor: '#F59E0B', backgroundColor: '#FFFBEB' }]}>
                                <View style={styles.itemHeader}>
                                    <View style={[styles.itemIconBg, { backgroundColor: '#FEF3C7' }]}>
                                        <MaterialCommunityIcons name="clock-outline" size={16} color="#D97706" />
                                    </View>
                                    <Text style={[styles.itemBadge, { color: '#92400E', backgroundColor: '#FDE68A' }]}>
                                        Giữ chỗ
                                    </Text>
                                </View>
                                <Text style={styles.itemPurpose}>
                                    {room.loanId?.purpose || 'Đang chờ khớp khoản vay'}
                                </Text>
                                <View style={styles.itemMetaRow}>
                                    <Text style={styles.itemMeta}>{formatMoney(room.amount)} - {room.notes} notes</Text>
                                </View>
                                <Text style={styles.itemNote}>Hủy giữ chỗ: Miễn phí, không mất tiền</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Investments - Đã đầu tư */}
                {investments.length > 0 && (
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="cash-check" size={20} color="#10B981" />
                            <Text style={styles.sectionTitle}>Đã đầu tư ({investments.length})</Text>
                            <View style={[styles.legendDot, { backgroundColor: '#D1FAE5' }]} />
                            <Text style={styles.legendText}>Tiền đã xử lý</Text>
                        </View>

                        {investments.map((inv, idx) => {
                            const isPending = inv.status === 'pending';
                            const isActive = inv.status === 'active';
                            const isInvCompleted = inv.status === 'completed';

                            const cardBg = isPending ? '#FFF7ED' : isActive ? '#ECFDF5' : '#F9FAFB';
                            const borderColor = isPending ? '#F59E0B' : isActive ? '#10B981' : '#9CA3AF';
                            const statusLabel = isPending ? 'Chờ giải ngân' : isActive ? 'Đang hoạt động' : isInvCompleted ? 'Hoàn thành' : inv.status;
                            const statusColor = isPending ? '#D97706' : isActive ? '#059669' : '#6B7280';
                            const statusBg = isPending ? '#FDE68A' : isActive ? '#A7F3D0' : '#E5E7EB';

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.itemCard, { borderLeftColor: borderColor, backgroundColor: cardBg }]}
                                    onPress={() => {
                                        if (inv.loanId?._id) navigation.navigate('LoanDetail', { loanId: inv.loanId._id });
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.itemHeader}>
                                        <View style={[styles.itemIconBg, { backgroundColor: `${borderColor}20` }]}>
                                            <MaterialCommunityIcons
                                                name={isPending ? 'timer-sand' : isActive ? 'trending-up' : 'check-circle'}
                                                size={16} color={borderColor}
                                            />
                                        </View>
                                        <Text style={[styles.itemBadge, { color: statusColor, backgroundColor: statusBg }]}>
                                            {statusLabel}
                                        </Text>
                                    </View>

                                    <Text style={styles.itemPurpose}>
                                        {inv.loanId?.purpose || 'Khoản vay'}
                                    </Text>

                                    <View style={styles.itemMetaRow}>
                                        <Text style={[styles.itemAmount, { color: borderColor }]}>
                                            {formatMoney(inv.amount)}
                                        </Text>
                                        <Text style={styles.itemMeta}>{inv.notes} notes</Text>
                                    </View>

                                    {isPending && (
                                        <View style={styles.itemFreezeInfo}>
                                            <MaterialCommunityIcons name="snowflake" size={14} color="#3B82F6" />
                                            <Text style={styles.itemFreezeText}>
                                                Tiền đóng băng: {formatMoney(inv.amount)} - Hủy = hoàn tiền
                                            </Text>
                                        </View>
                                    )}

                                    {isActive && (
                                        <View style={styles.itemFreezeInfo}>
                                            <MaterialCommunityIcons name="lock" size={14} color="#6B7280" />
                                            <Text style={[styles.itemFreezeText, { color: '#6B7280' }]}>
                                                Đã giải ngân - Không thể hủy
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Matched Loans from config.loans[] */}
                {matchedLoans.length > 0 && (
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="handshake-outline" size={20} color={Colors.primary} />
                            <Text style={styles.sectionTitle}>Khoản vay đã khớp ({matchedLoans.length})</Text>
                        </View>
                        {matchedLoans.map((item, idx) => {
                            const loan = item.loanId;
                            return (
                                <TouchableOpacity
                                    key={idx} style={styles.loanItem}
                                    onPress={() => loan?._id && navigation.navigate('LoanDetail', { loanId: loan._id })}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.loanPurpose}>{loan?.purpose || 'Khoản vay'}</Text>
                                        <Text style={styles.loanMeta}>
                                            {item.notes || item.nodeMatch} notes {'\u00B7'} {item.matchedAt ? new Date(item.matchedAt).toLocaleDateString('vi-VN') : '---'}
                                        </Text>
                                    </View>
                                    <Text style={styles.loanAmount}>{formatMoney(item.amount)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Config Section */}
                {!isReadOnly && (
                    <>
                        <Text style={styles.configSectionTitle}>
                            {isCreateMode ? 'CẤU HÌNH GÓI ĐẦU TƯ' : 'CẬP NHẬT CẤU HÌNH'}
                        </Text>

                        <View style={styles.configCard}>
                            <View style={styles.configCardHeader}>
                                <MaterialCommunityIcons name="wallet-outline" size={20} color={Colors.primary} />
                                <Text style={styles.configCardTitle}>Nguồn vốn</Text>
                            </View>
                            <Input
                                label="Tổng vốn cam kết (VND)"
                                value={capital}
                                onChangeText={(t) => { const c = t.replace(/[^0-9]/g, ''); setCapital(c ? formatNumber(c) : ''); }}
                                keyboardType="numeric"
                                placeholder="VD: 50.000.000"
                                style={{ marginBottom: 12 }}
                            />
                            <Input
                                label="Tối đa mỗi khoản vay (VND)"
                                value={maxCapitalPerLoan}
                                onChangeText={(t) => { const c = t.replace(/[^0-9]/g, ''); setMaxCapitalPerLoan(c ? formatNumber(c) : ''); }}
                                keyboardType="numeric"
                                placeholder="Để trống = 20% tổng vốn"
                            />
                        </View>

                        <View style={styles.configCard}>
                            <View style={styles.configCardHeader}>
                                <MaterialCommunityIcons name="tune-vertical" size={20} color={Colors.primary} />
                                <Text style={styles.configCardTitle}>Tiêu chí lựa chọn</Text>
                            </View>
                            <View style={styles.criteriaRow}>
                                <Text style={styles.criteriaLabel}>Lãi suất (%/năm)</Text>
                                <View style={styles.rangeInputs}>
                                    <Input value={minRate} onChangeText={setMinRate} keyboardType="numeric"
                                        inputStyle={styles.smallInput} style={{ flex: 1, marginBottom: 0 }} />
                                    <Text style={styles.rangeSep}>-</Text>
                                    <Input value={maxRate} onChangeText={setMaxRate} keyboardType="numeric"
                                        inputStyle={styles.smallInput} style={{ flex: 1, marginBottom: 0 }} />
                                </View>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.criteriaRow}>
                                <Text style={styles.criteriaLabel}>Kỳ hạn (tháng)</Text>
                                <View style={styles.rangeInputs}>
                                    <Input value={minTerm} onChangeText={setMinTerm} keyboardType="numeric"
                                        inputStyle={styles.smallInput} style={{ flex: 1, marginBottom: 0 }} />
                                    <Text style={styles.rangeSep}>-</Text>
                                    <Input value={maxTerm} onChangeText={setMaxTerm} keyboardType="numeric"
                                        inputStyle={styles.smallInput} style={{ flex: 1, marginBottom: 0 }} />
                                </View>
                            </View>
                        </View>
                    </>
                )}

                {/* Cancel Button */}
                {configId && !isReadOnly && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelling}>
                        <MaterialCommunityIcons name="delete-outline" size={20} color="#DC2626" />
                        <Text style={styles.cancelBtnText}>
                            {cancelling ? 'Đang hủy...' : 'Hủy gói đầu tư'}
                        </Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Bar */}
            {!isReadOnly && (
                <View style={styles.bottomBar}>
                    <Button
                        title={saving ? 'Đang lưu...' : (isCreateMode ? 'Tạo gói đầu tư' : 'Lưu cấu hình')}
                        onPress={handleSave}
                        disabled={saving}
                        style={styles.saveBtn}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F9FC' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.primary,
        paddingTop: Platform.OS === 'ios' ? 56 : 40,
        paddingBottom: 16, paddingHorizontal: 16,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    scrollContent: { padding: 16 },

    // Switch Card
    switchCard: { borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    cardActive: { backgroundColor: Colors.primary },
    cardInactive: { backgroundColor: '#fff' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switchTitle: { fontSize: 20, fontWeight: 'bold' },
    switchSub: { fontSize: 13, marginTop: 2 },

    // Section Card
    sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 'auto' },
    legendText: { fontSize: 11, color: Colors.textSecondary },

    // Progress
    progressItem: {},
    progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    progressValue: { fontSize: 13, color: Colors.text, fontWeight: '600' },
    progressBarBg: { height: 8, borderRadius: 4, backgroundColor: '#E5E7EB', overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    progressPercent: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textAlign: 'right' },

    // Item Cards (WaitingRoom / Investment)
    itemCard: { borderLeftWidth: 4, borderRadius: 12, padding: 14, marginBottom: 10 },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    itemIconBg: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    itemBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
    itemPurpose: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
    itemMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemAmount: { fontSize: 15, fontWeight: '700' },
    itemMeta: { fontSize: 12, color: Colors.textSecondary },
    itemNote: { fontSize: 11, color: '#D97706', marginTop: 6, fontStyle: 'italic' },
    itemFreezeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    itemFreezeText: { fontSize: 12, color: '#3B82F6', fontWeight: '500', flex: 1 },

    // Loan items
    loanItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    loanPurpose: { fontSize: 14, fontWeight: '600', color: Colors.text },
    loanMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    loanAmount: { fontSize: 14, fontWeight: '700', color: Colors.primary },

    // Config
    configSectionTitle: { fontSize: 13, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: 8, marginLeft: 4, marginTop: 8, letterSpacing: 0.5 },
    configCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1 },
    configCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    configCardTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
    criteriaRow: { marginBottom: 0 },
    criteriaLabel: { fontSize: 13, color: Colors.text, fontWeight: '500', marginBottom: 6 },
    rangeInputs: { flexDirection: 'row', alignItems: 'center' },
    smallInput: { textAlign: 'center', height: 36, paddingVertical: 4, fontSize: 14 },
    rangeSep: { fontSize: 18, color: Colors.textSecondary, marginHorizontal: 8, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

    // Cancel Button
    cancelBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
        borderRadius: 12, paddingVertical: 14, marginTop: 8,
    },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },

    // Bottom Bar
    bottomBar: { backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
    saveBtn: { borderRadius: 12 },
});

export default AutoInvestDetailScreen;
