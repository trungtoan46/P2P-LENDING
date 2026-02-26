import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';
import { Button, Input, Loading } from '../../components';

const CreateAutoInvestScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const config = route.params?.config;
    const isEdit = !!config;

    const [loading, setLoading] = useState(false);
    const [capital, setCapital] = useState(config?.capital ? String(config.capital) : '');
    const [maxCapitalPerLoan, setMaxCapitalPerLoan] = useState(config?.maxCapitalPerLoan ? String(config.maxCapitalPerLoan) : '');

    const [minRate, setMinRate] = useState(config?.interestRange?.min || 10);
    const [maxRate, setMaxRate] = useState(config?.interestRange?.max || 20);

    const [minTerm, setMinTerm] = useState(config?.periodRange?.min || 1);
    const [maxTerm, setMaxTerm] = useState(config?.periodRange?.max || 12);

    // const [purposes, setPurposes] = useState(config?.purpose || []); // TODO: Implement selection

    const handleSubmit = async () => {
        if (!capital || Number(capital) < 1000000) {
            Alert.alert('Lỗi', 'Vốn đầu tư tối thiểu là 1,000,000 VND');
            return;
        }

        setLoading(true);
        try {
            const data = {
                capital: Number(capital),
                maxCapitalPerLoan: maxCapitalPerLoan ? Number(maxCapitalPerLoan) : undefined,
                interestRange: { min: minRate, max: maxRate },
                periodRange: { min: minTerm, max: maxTerm },
                // purpose: purposes,
                status: 'active'
            };

            if (isEdit) data._id = config._id;

            await AutoInvestApi.upsertConfig(data);

            Alert.alert(
                'Thành công',
                `Đã ${isEdit ? 'cập nhật' : 'tạo'} gói đầu tư tự động`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Error saving config:', error);
            Alert.alert('Lỗi', 'Không thể lưu cấu hình');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Cập nhật cấu hình' : 'Tạo gói đầu tư'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vốn đầu tư</Text>

                    <Input
                        label="Tổng vốn cam kết (VND)"
                        value={capital}
                        onChangeText={setCapital}
                        keyboardType="numeric"
                        placeholder="VD: 50,000,000"
                    />

                    <Text style={styles.helperText}>Để phân tán rủi ro, hệ thống sẽ không đầu tư quá số tiền này vào một khoản vay.</Text>
                    <Input
                        label="Tối đa cho mỗi khoản vay (VND)"
                        value={maxCapitalPerLoan}
                        onChangeText={setMaxCapitalPerLoan}
                        keyboardType="numeric"
                        placeholder="Mặc định: 20% tổng vốn"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lãi suất mong muốn (%/năm)</Text>
                    <View style={styles.row}>
                        <Text style={styles.valueText}>Từ: {minRate}%</Text>
                        <Text style={styles.valueText}>Đến: {maxRate}%</Text>
                    </View>
                    <View style={styles.rowInput}>
                        <View style={styles.halfInputContainer}>
                            <Input
                                value={String(minRate)}
                                onChangeText={t => setMinRate(Number(t))}
                                keyboardType="numeric"
                                inputStyle={{ textAlign: 'center' }}
                            />
                        </View>
                        <Text style={styles.dash}>-</Text>
                        <View style={styles.halfInputContainer}>
                            <Input
                                value={String(maxRate)}
                                onChangeText={t => setMaxRate(Number(t))}
                                keyboardType="numeric"
                                inputStyle={{ textAlign: 'center' }}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Kỳ hạn vay (tháng)</Text>
                    <View style={styles.row}>
                        <Text style={styles.valueText}>Từ: {minTerm} tháng</Text>
                        <Text style={styles.valueText}>Đến: {maxTerm} tháng</Text>
                    </View>
                    <View style={styles.rowInput}>
                        <View style={styles.halfInputContainer}>
                            <Input
                                value={String(minTerm)}
                                onChangeText={t => setMinTerm(Number(t))}
                                keyboardType="numeric"
                                inputStyle={{ textAlign: 'center' }}
                            />
                        </View>
                        <Text style={styles.dash}>-</Text>
                        <View style={styles.halfInputContainer}>
                            <Input
                                value={String(maxTerm)}
                                onChangeText={t => setMaxTerm(Number(t))}
                                keyboardType="numeric"
                                inputStyle={{ textAlign: 'center' }}
                            />
                        </View>
                    </View>
                </View>

                <Button
                    title={isEdit ? 'Cập nhật' : 'Tạo gói đầu tư'}
                    onPress={handleSubmit}
                    loading={loading}
                    style={styles.submitButton}
                />
            </ScrollView>
        </View>
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
        backgroundColor: Colors.primary,
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.md,
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
    scrollContainer: {
        flex: 1,
    },
    content: {
        padding: Spacing.m,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: Spacing.m,
        marginBottom: Spacing.m,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: Colors.text,
    },
    submitButton: {
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    dash: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.textSecondary,
    },
    halfInputContainer: {
        flex: 1,
    }
});

export default CreateAutoInvestScreen;
