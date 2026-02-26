/**
 * @description Active Loan Item - Hiển thị thông tin khoản vay
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';
import { formatCurrency } from '../../utils/formatters';
import LoanHealthBadge from './LoanHealthBadge';

const ActiveLoanItem = ({
    loan,
    onPress
}) => {
    // Map đúng field từ API
    const capital = loan?.capital || 0;
    const totalRepayment = loan?.totalRepayment || capital;
    const interestRate = loan?.interestRate || 0;
    const term = loan?.term || 0;
    const loanCode = loan?._id ? `#${loan._id.slice(-6).toUpperCase()}` : '#------';

    // Tính số tiền đã trả từ backend gửi về
    const paidAmount = loan?.paidAmount || 0;
    const remainingAmount = loan?.remainingAmount !== undefined ? loan.remainingAmount : (totalRepayment - paidAmount);

    // Progress dựa trên số tiền đã trả
    const progress = totalRepayment > 0 ? (paidAmount / totalRepayment) * 100 : 0;

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.header}>
                <Text style={styles.loanCode}>{loanCode}</Text>
                <LoanHealthBadge status={loan?.status} />
            </View>

            <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                    <Text style={styles.label}>Số tiền vay</Text>
                    <Text style={styles.value}>{formatCurrency(capital)}</Text>
                </View>
                <View style={styles.infoItem}>
                    <Text style={styles.label}>Lãi suất</Text>
                    <Text style={styles.value}>{interestRate}%/tháng</Text>
                </View>
                <View style={styles.infoItem}>
                    <Text style={styles.label}>Kỳ hạn</Text>
                    <Text style={styles.value}>{term} tháng</Text>
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Tiến độ thanh toán</Text>
                    <Text style={styles.progressValue}>{progress.toFixed(0)}%</Text>
                </View>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
                <View style={styles.amountRow}>
                    <Text style={styles.paidAmount}>Đã trả: {formatCurrency(paidAmount)}</Text>
                    <Text style={styles.remainingAmount}>Còn lại: {formatCurrency(remainingAmount)}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.detailText}>Xem chi tiết</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: Spacing.md,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    loanCode: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.text,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    infoItem: {
        flex: 1,
    },
    label: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    value: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.text,
    },
    progressSection: {
        marginBottom: Spacing.md,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xs,
    },
    progressLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    progressValue: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.primary,
    },
    progressContainer: {
        height: 8,
        backgroundColor: Colors.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 4,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.xs,
    },
    paidAmount: {
        fontSize: Typography.fontSize.xs,
        color: '#22c55e',
    },
    remainingAmount: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    footer: {
        alignItems: 'flex-end',
    },
    detailText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.medium,
    },
});

export default ActiveLoanItem;
