/**
 * Xác nhận khoản vay - Bước 2: Xem chi tiết và xác nhận
 * Dựa trên client_old/src/presentation/component/scene/borrower/loan/LoanConfirm.js
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
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

    // Auto-submit khi có disbursementData (user vừa quay lại từ DisbursementMethod)
    useEffect(() => {
        if (disbursementData) {
            handleSubmit(disbursementData);
        }
    }, [disbursementData]);

    const handleConfirm = () => {
        // Navigate to disbursement method selection with all loan details
        navigation.navigate('DisbursementMethod', {
            capital,
            term,
            purpose,
            disbursementDate,
            rateData,
            monthlyIncome
        });
    };

    const handleSubmit = async (disbursementInfo) => {
        setLoading(true);
        try {
            const loanData = {
                capital,
                term,
                purpose,
                disbursementDate: disbursementDate, // Đã là ISO string từ CreateLoanScreen
                ...(monthlyIncome ? { monthlyIncome } : {})
            };

            // Chỉ thêm disbursement fields nếu có data
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

    // Tính tiền gốc và lãi hàng tháng
    const monthlyPrincipal = capital && term ? Math.round(capital / term) : 0;
    const monthlyInterest = rateData ? (rateData.monthlyPayment - monthlyPrincipal) : 0;

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
                    <DetailRow
                        icon="cash"
                        label="Số tiền vay"
                        value={formatMoney(capital)}
                    />
                    <DetailRow
                        icon="clock-outline"
                        label="Thời gian"
                        value={`${term} tháng`}
                    />
                    <DetailRow
                        icon="calendar-check"
                        label="Ngày giải ngân"
                        value={formatDate(disbursementDate)}
                    />
                    <DetailRow
                        icon="calendar"
                        label="Ngày đáo hạn"
                        value={rateData?.maturityDate ? formatDate(rateData.maturityDate) : '...'}
                    />
                    <DetailRow
                        icon="bullseye-arrow"
                        label="Mục đích vay"
                        value={purpose}
                        hideDivider
                    />
                </View>

                {/* Chi tiết lãi suất */}
                <View style={[styles.card, styles.highlightCard]}>
                    <DetailRow
                        icon="chart-line"
                        label="Lãi suất"
                        value={`${rateData?.interestRate || 0}%/năm`}
                        highlight
                        iconColor="#f59e0b"
                    />
                    <DetailRow
                        icon="cash-multiple"
                        label="Tiền trả/tháng"
                        value={formatMoney(rateData?.monthlyPayment || 0)}
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
                        value={formatMoney(rateData?.totalRepayment || 0)}
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

                <TouchableOpacity
                    style={styles.backLink}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backLinkText}>Quay lại chỉnh sửa</Text>
                </TouchableOpacity>
            </ScrollView>
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
});

export default LoanPreviewScreen;
