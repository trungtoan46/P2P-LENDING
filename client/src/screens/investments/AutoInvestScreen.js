import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing } from '../../constants';
import { AutoInvestApi } from '../../api';
import { formatMoney } from '../../utils';
import { Button, Input, Loading } from '../../components';

const formatNumber = (num) => {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const AutoInvestScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Initial State
    const [configId, setConfigId] = useState(null);
    const [isEnabled, setIsEnabled] = useState(false);

    // Form Data
    const [capital, setCapital] = useState('');
    const [maxCapitalPerLoan, setMaxCapitalPerLoan] = useState('');
    const [minRate, setMinRate] = useState('10');
    const [maxRate, setMaxRate] = useState('20');
    const [minTerm, setMinTerm] = useState('1');
    const [maxTerm, setMaxTerm] = useState('12');

    // Stats - lay tu config.loans de dong bo voi backend
    const [matchedCapital, setMatchedCapital] = useState(0);
    const [matchedCount, setMatchedCount] = useState(0);
    const [matchesToday, setMatchesToday] = useState(0);

    const isToday = (date) => {
        if (!date) return false;
        const d = new Date(date);
        const t = new Date();
        return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    };

    const loadConfig = useCallback(async () => {
        try {
            const result = await AutoInvestApi.getMyConfigs({ limit: 1 });
            const configs = result.data?.data || result.data || [];

            if (configs.length > 0) {
                const cfg = configs[0];
                setConfigId(cfg._id);
                setIsEnabled(cfg.status === 'active');
                setCapital(cfg.capital ? formatNumber(cfg.capital) : '');
                setMaxCapitalPerLoan(cfg.maxCapitalPerLoan ? formatNumber(cfg.maxCapitalPerLoan) : '');
                setMinRate(cfg.interestRange?.min?.toString() || '10');
                setMaxRate(cfg.interestRange?.max?.toString() || '20');
                setMinTerm(cfg.periodRange?.min?.toString() || '1');
                setMaxTerm(cfg.periodRange?.max?.toString() || '12');
                setMatchedCapital(cfg.matchedCapital || 0);
                const loans = cfg.loans || [];
                setMatchedCount(loans.length);
                setMatchesToday(loans.filter(l => isToday(l.matchedAt)).length);
            } else {
                setConfigId(null);
                setIsEnabled(false);
                setCapital('');
                setMaxCapitalPerLoan('');
                setMatchedCapital(0);
                setMatchedCount(0);
                setMatchesToday(0);
            }
        } catch (error) {
            console.error('Error loading config:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const onRefresh = () => {
        setRefreshing(true);
        loadConfig();
    };

    const handleSave = async (shouldActivate = null) => {
        const rawCapital = capital ? Number(capital.replace(/\./g, '')) : 0;
        if (!rawCapital || rawCapital < 1000000) {
            Alert.alert('Lưu ý', 'Vốn đầu tư tối thiểu là 1,000,000 VND');
            return;
        }

        setSaving(true);
        try {
            const statusToSave = shouldActivate !== null
                ? (shouldActivate ? 'active' : 'paused')
                : (isEnabled ? 'active' : 'paused');

            const rawCapital = capital ? Number(capital.replace(/\./g, '')) : 0;
            const rawMaxCapital = maxCapitalPerLoan ? Number(maxCapitalPerLoan.replace(/\./g, '')) : undefined;

            const data = {
                capital: rawCapital,
                maxCapitalPerLoan: rawMaxCapital,
                interestRange: { min: Number(minRate), max: Number(maxRate) },
                periodRange: { min: Number(minTerm), max: Number(maxTerm) },
                status: statusToSave
            };

            if (configId) data._id = configId;

            const result = await AutoInvestApi.upsertConfig(data);

            if (result.data?._id) setConfigId(result.data._id);
            if (shouldActivate !== null) setIsEnabled(shouldActivate);

            Alert.alert('Thành công', 'Đã lưu cấu hình Auto-Invest');
        } catch (error) {
            console.error('Error saving:', error);
            Alert.alert('Lỗi', 'Không thể lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    const toggleSwitch = () => {
        const newState = !isEnabled;
        setIsEnabled(newState);
        if (configId) {
            handleSave(newState);
        }
    };

    const dStyle = {
        titleColor: isEnabled ? '#fff' : Colors.text,
        subTextColor: isEnabled ? 'rgba(255,255,255,0.8)' : Colors.textSecondary,
    };

    if (loading) return <Loading fullScreen />;

    return (
        <View style={styles.overlay}>
            <View style={styles.dialog}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Đầu tư tự động</Text>
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialCommunityIcons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* Main Switch Card */}
                    <View style={[styles.mainCard, isEnabled ? styles.cardActive : styles.cardInactive]}>
                        <View style={styles.statusRow}>
                            <View style={styles.statusInfo}>
                                <Text style={[styles.statusTitle, { color: dStyle.titleColor }]}>Auto-Invest</Text>
                                <Text style={[styles.statusText, { color: dStyle.subTextColor }]}>
                                    {isEnabled ? 'Đang hoạt động' : 'Đang tạm dừng'}
                                </Text>
                            </View>
                            <Switch
                                trackColor={{ false: '#d1d5db', true: '#a78bfa' }}
                                thumbColor={isEnabled ? '#fff' : '#f4f3f4'}
                                onValueChange={toggleSwitch}
                                value={isEnabled}
                                style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }}
                            />
                        </View>
                        {isEnabled && (
                            <View style={styles.statsContainer}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Đã đầu tư</Text>
                                    <Text style={styles.statValue}>{formatMoney(matchedCapital)}</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Lệnh đã khớp</Text>
                                    <Text style={styles.statValue}>{matchedCount} lệnh</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Khớp hôm nay</Text>
                                    <Text style={styles.statValue}>{matchesToday} lệnh</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <Text style={styles.sectionHeader}>Cấu hình đầu tư</Text>

                    {/* Capital Section */}
                    <View style={styles.configCard}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="wallet-outline" size={22} color={Colors.primary} />
                            <Text style={styles.cardTitle}>Nguồn vốn</Text>
                        </View>

                        <Input
                            label="Tổng vốn cam kết (VND)"
                            value={capital}
                            onChangeText={(text) => {
                                const clean = text.replace(/[^0-9]/g, '');
                                setCapital(clean ? formatNumber(clean) : '');
                            }}
                            keyboardType="numeric"
                            placeholder="VD: 50,000,000"
                            style={{ marginBottom: 12 }}
                        />
                        <Input
                            label="Tối đa mỗi khoản vay (VND)"
                            value={maxCapitalPerLoan}
                            onChangeText={(text) => {
                                const clean = text.replace(/[^0-9]/g, '');
                                setMaxCapitalPerLoan(clean ? formatNumber(clean) : '');
                            }}
                            keyboardType="numeric"
                            placeholder="Để trống = 20% tổng vốn"
                        />
                    </View>

                    {/* Criteria Section */}
                    <View style={styles.configCard}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="tune-vertical" size={22} color={Colors.primary} />
                            <Text style={styles.cardTitle}>Tiêu chí lựa chọn</Text>
                        </View>

                        {/* Interest Rate */}
                        <View style={styles.criteriaRow}>
                            <Text style={styles.criteriaLabel}>Lãi suất (%/năm)</Text>
                            <View style={styles.rangeInputs}>
                                <Input
                                    value={minRate}
                                    onChangeText={setMinRate}
                                    keyboardType="numeric"
                                    inputStyle={styles.smallInput}
                                    style={{ flex: 1, marginBottom: 0 }}
                                />
                                <Text style={styles.rangeSep}>-</Text>
                                <Input
                                    value={maxRate}
                                    onChangeText={setMaxRate}
                                    keyboardType="numeric"
                                    inputStyle={styles.smallInput}
                                    style={{ flex: 1, marginBottom: 0 }}
                                />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Term */}
                        <View style={styles.criteriaRow}>
                            <Text style={styles.criteriaLabel}>Kỳ hạn (tháng)</Text>
                            <View style={styles.rangeInputs}>
                                <Input
                                    value={minTerm}
                                    onChangeText={setMinTerm}
                                    keyboardType="numeric"
                                    inputStyle={styles.smallInput}
                                    style={{ flex: 1, marginBottom: 0 }}
                                />
                                <Text style={styles.rangeSep}>-</Text>
                                <Input
                                    value={maxTerm}
                                    onChangeText={setMaxTerm}
                                    keyboardType="numeric"
                                    inputStyle={styles.smallInput}
                                    style={{ flex: 1, marginBottom: 0 }}
                                />
                            </View>
                        </View>
                    </View>
                    <View style={{ height: 20 }} />
                </ScrollView>

                {/* Bottom Action Bar */}
                <View style={styles.bottomBar}>
                    <Button
                        title="Áp dụng cấu hình"
                        onPress={() => handleSave(null)}
                        disabled={saving}
                        style={styles.saveBtn}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    dialog: {
        width: '100%',
        height: '90%', // Increased from 80%
        backgroundColor: '#f5f7fa',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeBtn: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 14,
    },
    scrollContent: {
        padding: 16,
    },
    mainCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    cardActive: {
        backgroundColor: Colors.primary,
    },
    cardInactive: {
        backgroundColor: '#fff',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statusText: {
        fontSize: 13,
        marginTop: 2,
    },
    statsContainer: {
        flexDirection: 'row',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 12,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    configCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.text,
    },
    criteriaRow: {
        marginBottom: 0,
    },
    criteriaLabel: {
        fontSize: 13,
        color: Colors.text,
        fontWeight: '500',
        marginBottom: 6,
    },
    rangeInputs: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    smallInput: {
        textAlign: 'center',
        height: 36,
        paddingVertical: 4,
        fontSize: 14,
    },
    rangeSep: {
        fontSize: 18,
        color: Colors.textSecondary,
        marginHorizontal: 8,
        fontWeight: 'bold',
    },
    bottomBar: {
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    saveBtn: {
        borderRadius: 12,
    },
});

export default AutoInvestScreen;
