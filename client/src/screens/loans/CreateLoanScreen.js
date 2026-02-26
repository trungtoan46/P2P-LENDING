/**
 * Tạo khoản vay - Bước 1: Nhập thông tin
 * Dựa trên client_old/src/presentation/component/scene/borrower/loan/LoanCreate.js
 */

import React, { useState, useCallback, memo } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    FlatList,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Button, Input, Loading, DisbursementDatePicker } from '../../components';
import { Colors, Spacing, Typography } from '../../constants';
import { LoansApi } from '../../api';

const PURPOSE_OPTIONS = [
    { name: 'Mua xe máy', position: 1 },
    { name: 'Mua xe ô tô', position: 2 },
    { name: 'Mua nhà/đất', position: 3 },
    { name: 'Sửa chữa nhà', position: 4 },
    { name: 'Đi du lịch', position: 5 },
    { name: 'Đóng học phí', position: 6 },
    { name: 'Kinh doanh', position: 7 },
    { name: 'Mua sắm', position: 8 },
    { name: 'Y tế/sức khỏe', position: 9 },
    { name: 'Cưới hỏi', position: 10 },
    { name: 'Khác', position: 99 },
];

const MONEY_PACKS = [
    { money: 5000000, label: '5 triệu' },
    { money: 10000000, label: '10 triệu' },
    { money: 20000000, label: '20 triệu' },
    { money: 30000000, label: '30 triệu' },
    { money: 50000000, label: '50 triệu' },
];

const TERM_OPTIONS = [1, 3, 6, 9, 12, 18];

const MIN_CAPITAL = 1000000;
const MAX_CAPITAL = 50000000;

const formatMoney = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('vi-VN').format(value);
};

// Memoized MoneyPackItem
const MoneyPackItem = memo(({ pack, isActive, onSelect }) => (
    <TouchableOpacity
        style={[
            styles.moneyPackItem,
            isActive && styles.moneyPackItemActive
        ]}
        onPress={() => onSelect(pack.money)}
    >
        <Text style={[
            styles.moneyPackText,
            isActive && styles.moneyPackTextActive
        ]}>
            {pack.label}
        </Text>
    </TouchableOpacity>
));

// Memoized TermOptionItem
const TermOptionItem = memo(({ term, isActive, onSelect }) => (
    <TouchableOpacity
        style={[
            styles.termOption,
            isActive && styles.termOptionActive
        ]}
        onPress={() => onSelect(term)}
    >
        <Text style={[
            styles.termOptionText,
            isActive && styles.termOptionTextActive
        ]}>
            {term} tháng
        </Text>
    </TouchableOpacity>
));

const CreateLoanScreen = ({ navigation }) => {
    const [capital, setCapital] = useState('');
    const [term, setTerm] = useState(6);
    const [purpose, setPurpose] = useState('');
    const [customPurpose, setCustomPurpose] = useState('');
    const [monthlyIncome, setMonthlyIncome] = useState('');
    const [showPurposePicker, setShowPurposePicker] = useState(false);
    const [showIncomeModal, setShowIncomeModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [incomeError, setIncomeError] = useState('');

    // Ngày giải ngân mặc định: ngày mai
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const [disbursementDate, setDisbursementDate] = useState(tomorrow);

    const capitalNumber = parseInt(capital.replace(/\D/g, '')) || 0;
    const monthlyIncomeNumber = parseInt(monthlyIncome.replace(/\D/g, '')) || 0;

    const handleMoneyChange = (text) => {
        const number = text.replace(/\D/g, '');
        if (number) {
            setCapital(formatMoney(parseInt(number)));
        } else {
            setCapital('');
        }
        setError('');
    };

    const handleMoneyPackSelect = useCallback((money) => {
        setCapital(formatMoney(money));
        setError('');
    }, []);

    const handleIncomeChange = (text) => {
        const number = text.replace(/\D/g, '');
        if (number) {
            setMonthlyIncome(formatMoney(parseInt(number)));
        } else {
            setMonthlyIncome('');
        }
        setError('');
    };

    const handleTermSelect = useCallback((t) => {
        setTerm(t);
    }, []);

    const handleSelectPurpose = (item) => {
        setPurpose(item.name);
        setShowPurposePicker(false);
        if (item.position !== 99) {
            setCustomPurpose('');
        }
        setError('');
    };

    const validateForm = () => {
        const finalPurpose = purpose === 'Khác' ? customPurpose : purpose;

        if (!capitalNumber) {
            setError('Vui lòng nhập số tiền vay');
            return false;
        }
        if (capitalNumber < MIN_CAPITAL) {
            setError(`Số tiền vay tối thiểu ${formatMoney(MIN_CAPITAL)} VNĐ`);
            return false;
        }
        if (capitalNumber > MAX_CAPITAL) {
            setError(`Số tiền vay tối đa ${formatMoney(MAX_CAPITAL)} VNĐ`);
            return false;
        }
        if (capitalNumber % 500000 !== 0) {
            setError('Số tiền vay phải chia hết cho 500,000 VNĐ');
            return false;
        }
        if (!finalPurpose || finalPurpose.length < 10) {
            setError('Vui lòng chọn hoặc nhập mục đích vay (tối thiểu 10 ký tự)');
            return false;
        }
        return true;
    };

    const handleNext = async () => {
        if (!validateForm()) return;
        setIncomeError('');
        setShowIncomeModal(true);
    };

    const handleConfirmIncome = async () => {
        if (monthlyIncomeNumber <= 0) {
            setIncomeError('Vui lòng nhập thu nhập hàng tháng');
            return;
        }

        const finalPurpose = purpose === 'Khác' ? customPurpose : purpose;

        setLoading(true);
        setError('');
        try {
            // Gọi API để lấy rate từ server
            const result = await LoansApi.calculateRate(capitalNumber, term);

            if (result.success) {
                const rateData = result.data?.data || result.data;
                setShowIncomeModal(false);
                // Chuyển sang màn hình preview
                navigation.navigate('LoanPreview', {
                    capital: capitalNumber,
                    term,
                    purpose: finalPurpose,
                    disbursementDate: disbursementDate.toISOString(),
                    rateData,
                    monthlyIncome: monthlyIncomeNumber
                });
            } else {
                setError(result.data?.message || 'Không thể tính lãi suất');
            }
        } catch (err) {
            setError(err.message || 'Đã có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo khoản vay</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                {/* Số tiền vay */}
                <Text style={styles.sectionTitle}>SỐ TIỀN VAY (VNĐ)</Text>
                <View style={styles.card}>
                    {/* Money pack buttons */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moneyPacks}>
                        {MONEY_PACKS.map((pack) => (
                            <MoneyPackItem
                                key={pack.money}
                                pack={pack}
                                isActive={capitalNumber === pack.money}
                                onSelect={handleMoneyPackSelect}
                            />
                        ))}
                    </ScrollView>

                    {/* Money input với icon */}
                    <View style={styles.moneyInputContainer}>
                        <MaterialCommunityIcons name="cash" size={22} color={Colors.primary} style={styles.moneyIcon} />
                        <TextInput
                            style={styles.moneyTextInput}
                            value={capital}
                            onChangeText={handleMoneyChange}
                            keyboardType="numeric"
                            placeholder="Nhập số tiền vay"
                            placeholderTextColor="#999"
                        />
                        <Text style={styles.moneyUnit}>VNĐ</Text>
                    </View>
                </View>

                {/* Số tháng vay */}
                <Text style={styles.sectionTitle}>SỐ THÁNG VAY</Text>
                <View style={styles.card}>
                    <Text style={styles.termDisplay}>{term} tháng</Text>

                    {/* Slider */}
                    <View style={styles.sliderContainer}>
                        <Text style={styles.sliderLabel}>1</Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={18}
                            step={1}
                            value={term}
                            onValueChange={(value) => setTerm(value)}
                            minimumTrackTintColor={Colors.primary}
                            maximumTrackTintColor={Colors.gray300}
                            thumbTintColor={Colors.primary}
                        />
                        <Text style={styles.sliderLabel}>18</Text>
                    </View>
                </View>

                {/* Mục đích vay */}
                <Text style={styles.sectionTitle}>MỤC ĐÍCH VAY</Text>
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowPurposePicker(true)}
                    >
                        <MaterialCommunityIcons name="bullseye-arrow" size={24} color={Colors.primary} />
                        <Text style={[styles.pickerText, !purpose && styles.placeholder]}>
                            {purpose || 'Chọn mục đích vay'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Custom purpose input */}
                {purpose === 'Khác' && (
                    <>
                        <Text style={styles.sectionTitle}>NHẬP MỤC ĐÍCH KHÁC</Text>
                        <View style={styles.card}>
                            <Input
                                value={customPurpose}
                                onChangeText={(text) => { setCustomPurpose(text); setError(''); }}
                                placeholder="Mô tả mục đích vay (tối thiểu 10 ký tự)"
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </>
                )}

                {/* Ngày giải ngân */}
                <DisbursementDatePicker
                    value={disbursementDate}
                    onChange={setDisbursementDate}
                />

                {/* Error */}
                {error ? (
                    <View style={styles.errorContainer}>
                        <MaterialCommunityIcons name="alert-circle" size={20} color="#ef4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* Submit Button */}
                <Button
                    title="TIẾP TỤC"
                    onPress={handleNext}
                    loading={loading}
                    style={styles.submitButton}
                />
            </View>

            {/* Purpose Picker Modal */}
            <Modal
                visible={showPurposePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPurposePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn mục đích vay</Text>
                            <TouchableOpacity onPress={() => setShowPurposePicker(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={PURPOSE_OPTIONS}
                            keyExtractor={(item) => String(item.position)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.optionItem, purpose === item.name && styles.optionItemActive]}
                                    onPress={() => handleSelectPurpose(item)}
                                >
                                    <Text style={[styles.optionText, purpose === item.name && styles.optionTextActive]}>
                                        {item.name}
                                    </Text>
                                    {purpose === item.name && (
                                        <MaterialCommunityIcons name="check" size={20} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Monthly Income Modal */}
            <Modal
                visible={showIncomeModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowIncomeModal(false)}
            >
                <View style={styles.modalOverlayCenter}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowIncomeModal(false)}
                    />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Thu nhập hàng tháng</Text>
                            <TouchableOpacity onPress={() => setShowIncomeModal(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ padding: Spacing.lg }}>
                            <View style={styles.moneyInputContainer}>
                                <MaterialCommunityIcons name="cash-check" size={22} color={Colors.primary} style={styles.moneyIcon} />
                                <TextInput
                                    style={styles.moneyTextInput}
                                    value={monthlyIncome}
                                    onChangeText={handleIncomeChange}
                                    keyboardType="numeric"
                                    placeholder="Nhập thu nhập hàng tháng"
                                    placeholderTextColor="#999"
                                />
                                <Text style={styles.moneyUnit}>VNĐ</Text>
                            </View>
                            {incomeError ? (
                                <Text style={styles.incomeErrorText}>{incomeError}</Text>
                            ) : null}
                            <View style={{ marginTop: Spacing.lg }}>
                                <Button
                                    title="XÁC NHẬN"
                                    onPress={handleConfirmIncome}
                                    loading={loading}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );

    if (Platform.OS === 'ios') {
        return (
            <KeyboardAvoidingView style={styles.container} behavior="padding">
                {renderContent()}
            </KeyboardAvoidingView>
        );
    }

    return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    scrollView: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    backButton: { padding: Spacing.xs },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    content: { padding: Spacing.md },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.sm,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    moneyPacks: {
        marginBottom: Spacing.md,
    },
    moneyPackItem: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: Spacing.sm,
    },
    moneyPackItemActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    moneyPackText: {
        fontSize: 14,
        color: Colors.text,
    },
    moneyPackTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    moneyInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.sm,
    },
    moneyIcon: {
        marginRight: Spacing.sm,
    },
    moneyTextInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: Colors.text,
    },
    moneyUnit: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginLeft: Spacing.sm,
    },
    termDisplay: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    termOptions: {
        marginTop: Spacing.sm,
    },
    termOption: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: Spacing.sm,
    },
    termOptionActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    termOptionText: {
        fontSize: 14,
        color: Colors.text,
    },
    termOptionTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    slider: {
        flex: 1,
        height: 40,
        marginHorizontal: Spacing.sm,
    },
    sliderLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
        minWidth: 20,
        textAlign: 'center',
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    pickerText: { flex: 1, marginLeft: Spacing.md, fontSize: 16, color: Colors.text },
    placeholder: { color: Colors.textSecondary },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        padding: Spacing.md,
        borderRadius: 8,
        marginTop: Spacing.md,
    },
    errorText: { marginLeft: Spacing.sm, color: '#ef4444', fontSize: 14, flex: 1 },
    submitButton: { marginTop: Spacing.xl, marginBottom: Spacing.xl },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    optionItemActive: { backgroundColor: `${Colors.primary}10` },
    optionText: { fontSize: 16, color: Colors.text },
    optionTextActive: { color: Colors.primary, fontWeight: '600' },
    incomeErrorText: {
        marginTop: Spacing.sm,
        color: Colors.error,
        fontSize: 12
    },
});

export default CreateLoanScreen;
