/**
 * @description Upcoming Payment - Card thanh toán sắp tới
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';
import { formatCurrency } from '../../utils/formatters';
import Button from '../common/Button';

const UpcomingPayment = ({
    amount = 0,
    dueDate,
    penalty = 0,
    loanCode,
    onPayNow
}) => {
    const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString('vi-VN') : 'N/A';
    const daysLeft = dueDate ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    const isOverdue = daysLeft < 0;
    const isCloseDue = daysLeft >= 0 && daysLeft <= 3;

    return (
        <View style={[
            styles.container,
            isOverdue && styles.overdueContainer,
            isCloseDue && styles.closeDueContainer
        ]}>
            <View style={styles.header}>
                <Text style={styles.title}>Thanh toán kỳ này</Text>
                {loanCode && <Text style={styles.loanCode}>{loanCode}</Text>}
            </View>

            <View style={styles.amountSection}>
                <Text style={styles.label}>Số tiền cần trả</Text>
                <Text style={[styles.amount, isOverdue && styles.overdueText]}>
                    {formatCurrency(amount)}
                </Text>
            </View>

            <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                    <Text style={styles.label}>Hạn thanh toán</Text>
                    <Text style={[styles.infoValue, isOverdue && styles.overdueText]}>
                        {formattedDate}
                    </Text>
                </View>
                <View style={styles.infoItem}>
                    <Text style={styles.label}>Còn lại</Text>
                    <Text style={[
                        styles.infoValue,
                        isOverdue && styles.overdueText,
                        isCloseDue && styles.closeDueText
                    ]}>
                        {isOverdue ? `Quá hạn ${Math.abs(daysLeft)} ngày` : `${daysLeft} ngày`}
                    </Text>
                </View>
            </View>

            {penalty > 0 && (
                <View style={styles.penaltySection}>
                    <Text style={styles.penaltyLabel}>Phạt nếu quá hạn:</Text>
                    <Text style={styles.penaltyValue}>{formatCurrency(penalty)}</Text>
                </View>
            )}

            <Button
                title="Thanh toán ngay"
                onPress={onPayNow}
                style={styles.payButton}
            />
        </View>
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
    overdueContainer: {
        borderWidth: 2,
        borderColor: '#ef4444',
    },
    closeDueContainer: {
        borderWidth: 2,
        borderColor: '#eab308',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.text,
    },
    loanCode: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    amountSection: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    amount: {
        fontSize: Typography.fontSize['2xl'],
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    overdueText: {
        color: '#ef4444',
    },
    closeDueText: {
        color: '#eab308',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
    },
    infoItem: {
        flex: 1,
    },
    infoValue: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.text,
    },
    penaltySection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fef2f2',
        padding: Spacing.sm,
        borderRadius: Spacing.sm,
        marginBottom: Spacing.md,
    },
    penaltyLabel: {
        fontSize: Typography.fontSize.sm,
        color: '#ef4444',
    },
    penaltyValue: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: '#ef4444',
    },
    payButton: {
        marginTop: Spacing.sm,
    },
});

export default UpcomingPayment;
