/**
 * Xác nhận khoản vay - Bước 2: Xem chi tiết và xác nhận
 * Dựa trên client_old/src/presentation/component/scene/borrower/loan/LoanConfirm.js
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components';
import { Colors, Spacing, Typography } from '../../constants';
import { LoansApi } from '../../api';

const formatMoney = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN');
};

const LoanPreviewScreen = ({ navigation, route }) => {
    const { capital, term, purpose, disbursementDate, rateData, disbursementData, monthlyIncome } = route.params;
    const [loading, setLoading] = useState(false);

    // Lãi suất hiện tại (dạng %, vd: 12.5)
    const originalRate = rateData?.interestRate || 0;
    const [customRatePercent, setCustomRatePercent] = useState(null); // null = chưa chỉnh sửa
    const [showRateModal, setShowRateModal] = useState(false);
    const [rateInput, setRateInput] = useState('');

    const currentRatePercent = customRatePercent !== null ? customRatePercent : originalRate;
    const isCustomRate = customRatePercent !== null;

    // Client-side recalculation khi thay doi lai suat
    const calcMonthlyPayment = (principal, annualRate, months) => {
        const monthlyRate = annualRate / 12;
        if (monthlyRate === 0) return principal / months;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
            (Math.pow(1 + monthlyRate, months) - 1);
    };

    const effectiveRate = currentRatePercent / 100; // convert % to decimal
    const computedMonthlyPayment = Math.round(calcMonthlyPayment(capital, effectiveRate, term));
    const computedTotalInterest = (computedMonthlyPayment * term) - capital;
    const computedTotalRepayment = capital + computedTotalInterest;
    const monthlyPrincipal = capital && term ? Math.round(capital / term) : 0;
    const monthlyInterest = computedMonthlyPayment - monthlyPrincipal;

    // Auto-submit khi có disbursementData (user vừa quay lại từ DisbursementMethod)
    useEffect(() => {
        if (disbursementData) {
            handleSubmit(disbursementData);
        }
    }, [disbursementData]);

    const handleOpenRateModal = () => {
        setRateInput(String(currentRatePercent));
        setShowRateModal(true);
    };

    const handleConfirmRate = () => {
        const parsed = parseFloat(rateInput);
        if (isNaN(parsed) || parsed < 1 || parsed > 100) {
            Alert.alert('Lỗi', 'Lãi suất phải nằm trong khoảng 1% đến 100%');
            return;
        }
        const rounded = Math.round(parsed * 100) / 100; // 2 decimal places
        setCustomRatePercent(rounded);
        setShowRateModal(false);
    };

    const handleResetRate = () => {
        setCustomRatePercent(null);
        setShowRateModal(false);
    };

    const handleConfirm = () => {
        navigation.navigate('DisbursementMethod', {
            capital,
            term,
            purpose,
            disbursementDate,
            rateData,
            monthlyIncome,
            customInterestRate: isCustomRate ? customRatePercent : undefined
        });
    };

    const handleSubmit = async (disbursementInfo) => {
        setLoading(true);
        try {
            const loanData = {
                capital,
                term,
                purpose,
                disbursementDate,
                ...(monthlyIncome ? { monthlyIncome } : {})
            };

            // Gửi lãi suất tùy chỉnh nếu có
            if (isCustomRate) {
                loanData.interestRate = customRatePercent;
            }

            if (disbursementInfo) {
                loanData.method = disbursementInfo.method;
                if (disbursementInfo.method === 'wallet') {
                    loanData.walletAccountNumber = disbursementInfo.walletAccountNumber;
                } else if (disbursementInfo.method === 'bank') {
                    loanData.bankAccountNumber = disbursementInfo.bankAccountNumber;
                    loanData.bankAccountHolderName = disbursementInfo.bankAccountHolderName;
                }
            }

            const result = await LoansApi.create(loanData);

            if (result.success) {
                const loanId = result.data?.data?._id || result.data?._id;
                Alert.alert(
                    'Thành công',
                    'Đã tạo đơn vay thành công! Đơn vay sẽ được xét duyệt trong 24 giờ.',
                    [
                        {
                            text: 'Xem chi tiết',
                            onPress: () => navigation.replace('LoanDetail', { loanId })
                        },
                        {
                            text: 'Về trang chủ',
                            onPress: () => navigation.popToTop()
                        }
                    ]
                );
            } else {
                Alert.alert('Lỗi', result.data?.message || 'Tạo thất bại');
            }
        } catch (error) {
            Alert.alert('Lỗi', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Xác nhận khoản vay</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Thông tin khoản vay */}
                <View style={styles.card}>
                    <DetailRow icon="cash" label="Số tiền vay" value={formatMoney(capital)} />
                    <DetailRow icon="clock-outline" label="Thời gian" value={`${term} tháng`} />
                    <DetailRow icon="calendar-check" label="Ngày giải ngân" value={formatDate(disbursementDate)} />
                    <DetailRow
                        icon="calendar"
                        label="Ngày đáo hạn"
                        value={rateData?.maturityDate ? formatDate(rateData.maturityDate) : '...'}
                    />
                    <DetailRow icon="bullseye-arrow" label="Mục đích vay" value={purpose} hideDivider />
                </View>

                {/* Chi tiet lai suat */}
                <View style={[styles.card, styles.highlightCard]}>
                    {/* Dong lai suat - co the chinh sua */}
                    <TouchableOpacity onPress={handleOpenRateModal} activeOpacity={0.6} style={styles.rateRowTouchable}>
                        <View style={styles.rateRowContainer}>
                            <View style={styles.rateRowLeft}>
                                <View style={styles.rateIconCircle}>
                                    <MaterialCommunityIcons name="percent-outline" size={18} color={Colors.white} />
                                </View>
                                <View>
                                    <Text style={styles.rateLabel}>Lãi suất</Text>
                                    {isCustomRate && (
                                        <Text style={styles.rateOriginalHint}>Mặc định: {originalRate}%</Text>
                                    )}
                                </View>
                            </View>
                            <View style={styles.rateRowRight}>
                                <View style={[styles.rateValuePill, isCustomRate && styles.rateValuePillCustom]}>
                                    <Text style={[styles.rateValueText, isCustomRate && styles.rateValueTextCustom]}>
                                        {currentRatePercent}%
                                    </Text>
                                    <Text style={[styles.rateValueUnit, isCustomRate && styles.rateValueUnitCustom]}>/năm</Text>
                                </View>
                                <View style={styles.editIconContainer}>
                                    <MaterialCommunityIcons
                                        name="square-edit-outline"
                                        size={16}
                                        color={isCustomRate ? Colors.warning : Colors.primary}
                                    />
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <DetailRow
                        icon="cash-multiple"
                        label="Tiền trả/tháng"
                        value={formatMoney(computedMonthlyPayment)}
                        highlight
                        iconColor="#22c55e"
                    />
                    <View style={styles.subRow}>
                        <MaterialCommunityIcons name="arrow-right" size={16} color="#22c55e" />
                        <Text style={styles.subLabel}>Tiền gốc</Text>
                        <Text style={styles.subValue}>{formatMoney(monthlyPrincipal)}</Text>
                    </View>
                    <View style={styles.subRow}>
                        <MaterialCommunityIcons name="arrow-right" size={16} color="#22c55e" />
                        <Text style={styles.subLabel}>Tiền lãi</Text>
                        <Text style={styles.subValue}>{formatMoney(monthlyInterest)}</Text>
                    </View>
                </View>

                {/* Tổng tiền trả */}
                <View style={styles.card}>
                    <DetailRow
                        icon="cash"
                        label="Tổng tiền trả"
                        value={formatMoney(computedTotalRepayment)}
                        highlight
                        iconColor="#ec4899"
                        hideDivider
                    />
                </View>

                {/* Lưu ý */}
                <View style={styles.noteContainer}>
                    <MaterialCommunityIcons name="information" size={20} color={Colors.primary} />
                    <Text style={styles.noteText}>
                        Đơn vay sẽ được xét duyệt trong vòng 24 giờ. Sau khi được duyệt, khoản vay sẽ mở cho nhà đầu tư.
                    </Text>
                </View>

                {/* Buttons */}
                <Button
                    title="XÁC NHẬN"
                    onPress={handleConfirm}
                    loading={loading}
                    style={styles.submitButton}
                />

                <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                    <Text style={styles.backLinkText}>Quay lại chỉnh sửa</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Modal chinh sua lai suat */}
            <Modal
                visible={showRateModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRateModal(false)}
            >
                <View style={styles.rateModalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowRateModal(false)}
                    />
                    <View style={styles.rateModalContent}>
                        {/* Modal Handle */}
                        <View style={styles.modalHandle} />

                        {/* Header with icon */}
                        <View style={styles.rateModalHeader}>
                            <View style={styles.modalIconCircle}>
                                <MaterialCommunityIcons name="percent-outline" size={22} color={Colors.white} />
                            </View>
                            <Text style={styles.rateModalTitle}>Tùy chỉnh lãi suất</Text>
                        </View>

                        {/* Suggested rate chip */}
                        <View style={styles.suggestedRateChip}>
                            <MaterialCommunityIcons name="lightbulb-outline" size={16} color={Colors.primary} />
                            <Text style={styles.suggestedRateText}>
                                Hệ thống đề nghị: <Text style={{ fontWeight: '700' }}>{originalRate}%/năm</Text>
                            </Text>
                        </View>

                        {/* Input area */}
                        <Text style={styles.rateModalInputLabel}>Nhập lãi suất mong muốn</Text>
                        <View style={styles.rateInputContainer}>
                            <TextInput
                                style={styles.rateInput}
                                value={rateInput}
                                onChangeText={setRateInput}
                                keyboardType="decimal-pad"
                                placeholder="VD: 12.5"
                                placeholderTextColor="#bbb"
                                autoFocus
                                selectTextOnFocus
                            />
                            <View style={styles.rateInputUnitBox}>
                                <Text style={styles.rateInputUnit}>%/năm</Text>
                            </View>
                        </View>
                        <Text style={styles.rateRangeHint}>Phạm vi cho phép: 1% - 30%</Text>

                        {/* Buttons */}
                        <View style={styles.rateModalButtons}>
                            {isCustomRate && (
                                <TouchableOpacity style={styles.resetButton} onPress={handleResetRate} activeOpacity={0.7}>
                                    <MaterialCommunityIcons name="undo-variant" size={16} color={Colors.primary} />
                                    <Text style={styles.resetButtonText}>Về mặc định</Text>
                                </TouchableOpacity>
                            )}
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowRateModal(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmRate} activeOpacity={0.8}>
                                <MaterialCommunityIcons name="check" size={18} color={Colors.white} style={{ marginRight: 4 }} />
                                <Text style={styles.confirmButtonText}>Xác nhận</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Component con hiển thị 1 dòng chi tiết
const DetailRow = ({ icon, label, value, highlight, iconColor, hideDivider }) => (
    <View style={[styles.row, !hideDivider && styles.rowBorder]}>
        <View style={styles.rowLeft}>
            <MaterialCommunityIcons
                name={icon}
                size={20}
                color={iconColor || Colors.primary}
            />
            <Text style={[styles.label, highlight && styles.highlightText]}>{label}</Text>
        </View>
        <Text style={[styles.value, highlight && styles.highlightText]} numberOfLines={2}>
            {value}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
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
    scrollView: { flex: 1, padding: Spacing.md },
    card: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e5e5',
        borderRadius: 0,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.lg,
    },
    highlightCard: {
        borderColor: Colors.primary,
        borderWidth: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    label: {
        marginLeft: Spacing.sm,
        fontSize: 14,
        color: Colors.text,
    },
    value: {
        fontSize: 14,
        color: Colors.text,
        textAlign: 'right',
        maxWidth: '50%',
    },
    highlightText: {
        fontWeight: 'bold',
    },
    // === Rate Row Inline Styles ===
    rateRowTouchable: {
        marginVertical: 2,
    },
    rateRowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    rateRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rateIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.warning,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    rateLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    rateOriginalHint: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    rateRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rateValuePill: {
        flexDirection: 'row',
        alignItems: 'baseline',
        backgroundColor: Colors.gray50,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.primaryLight,
    },
    rateValuePillCustom: {
        backgroundColor: '#fffbeb',
        borderColor: Colors.warning,
    },
    rateValueText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.primary,
    },
    rateValueTextCustom: {
        color: Colors.warning,
    },
    rateValueUnit: {
        fontSize: 11,
        color: Colors.primary,
        marginLeft: 1,
    },
    rateValueUnitCustom: {
        color: Colors.warning,
    },
    editIconContainer: {
        marginLeft: 6,
        opacity: 0.6,
    },
    recalcNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 4,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.warning,
    },
    recalcNoteText: {
        fontSize: 12,
        color: Colors.gray700,
        marginLeft: 8,
        flex: 1,
        lineHeight: 16,
    },
    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingLeft: 32,
    },
    subLabel: {
        marginLeft: Spacing.sm,
        fontSize: 13,
        color: '#666',
        flex: 1,
    },
    subValue: {
        fontSize: 13,
        color: '#666',
    },
    noteContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: `${Colors.primary}10`,
        padding: Spacing.md,
        borderRadius: 8,
        marginBottom: Spacing.lg,
    },
    noteText: {
        flex: 1,
        marginLeft: Spacing.sm,
        fontSize: 13,
        color: Colors.text,
        lineHeight: 18,
    },
    submitButton: {
        marginBottom: Spacing.md,
    },
    backLink: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
        marginBottom: Spacing.xl,
    },
    backLinkText: {
        fontSize: 14,
        color: Colors.primary,
    },
    // === Rate Modal Styles ===
    rateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    rateModalContent: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 24,
        width: '100%',
        maxWidth: 380,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.gray200,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.warning,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    rateModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    rateModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    suggestedRateChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray50,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    suggestedRateText: {
        fontSize: 13,
        color: Colors.primaryDark,
        marginLeft: 6,
    },
    rateModalInputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    rateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.gray200,
        borderRadius: 14,
        backgroundColor: Colors.gray50,
        overflow: 'hidden',
        marginBottom: 6,
    },
    rateInput: {
        flex: 1,
        height: 56,
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    rateInputUnitBox: {
        backgroundColor: Colors.gray100,
        paddingHorizontal: 14,
        height: 56,
        justifyContent: 'center',
        borderLeftWidth: 1,
        borderLeftColor: Colors.gray200,
    },
    rateInputUnit: {
        fontSize: 14,
        color: Colors.gray500,
        fontWeight: '600',
    },
    rateRangeHint: {
        fontSize: 11,
        color: Colors.textDisabled,
        textAlign: 'center',
        marginBottom: 20,
    },
    rateModalButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: Colors.gray50,
    },
    resetButtonText: {
        fontSize: 13,
        color: Colors.primary,
        marginLeft: 4,
        fontWeight: '500',
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 8,
        borderRadius: 8,
    },
    cancelButtonText: {
        fontSize: 15,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    confirmButtonText: {
        fontSize: 15,
        color: Colors.white,
        fontWeight: '700',
    },
});

export default LoanPreviewScreen;
