/**
 * @description Loan Health Badge - Badge trạng thái khoản vay
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, Typography } from '../../constants';

const HEALTH_STATUS = {
    GOOD: { label: 'Tốt', color: '#22c55e', bgColor: '#dcfce7' },
    CLOSE_DUE: { label: 'Sắp đến hạn', color: '#eab308', bgColor: '#fef9c3' },
    OVERDUE: { label: 'Quá hạn', color: '#ef4444', bgColor: '#fee2e2' },
    PENDING: { label: 'Chờ duyệt', color: '#6b7280', bgColor: '#f3f4f6' },
    WAITING: { label: 'Chờ đầu tư', color: '#3b82f6', bgColor: '#dbeafe' },
    ACTIVE: { label: 'Đang hoạt động', color: '#22c55e', bgColor: '#dcfce7' },
    COMPLETED: { label: 'Hoàn thành', color: '#8b5cf6', bgColor: '#ede9fe' },
};

const getHealthStatus = (daysUntilDue) => {
    if (daysUntilDue < 0) return HEALTH_STATUS.OVERDUE;
    if (daysUntilDue <= 7) return HEALTH_STATUS.CLOSE_DUE;
    return HEALTH_STATUS.GOOD;
};

const LoanHealthBadge = ({ daysUntilDue, status }) => {
    // Map loan status to health status
    let healthStatus;

    if (status) {
        const statusUpper = status.toUpperCase();

        // Map based on loan lifecycle
        switch (statusUpper) {
            case 'PENDING':
                healthStatus = HEALTH_STATUS.PENDING; // Chờ admin duyệt
                break;
            case 'APPROVED':
            case 'WAITING':
                healthStatus = HEALTH_STATUS.WAITING; // Đã duyệt, chờ đầu tư
                break;
            case 'ACTIVE':
                healthStatus = HEALTH_STATUS.ACTIVE; // Đang trả nợ
                break;
            case 'COMPLETED':
            case 'SUCCESS':
            case 'CLEAN':
                healthStatus = HEALTH_STATUS.COMPLETED; // Hoàn thành
                break;
            case 'DEFAULTED':
            case 'FAIL':
                healthStatus = HEALTH_STATUS.OVERDUE; // Nợ xấu
                break;
            default:
                healthStatus = HEALTH_STATUS.GOOD;
        }
    } else if (daysUntilDue !== undefined && daysUntilDue !== null) {
        healthStatus = getHealthStatus(daysUntilDue);
    } else {
        healthStatus = HEALTH_STATUS.GOOD;
    }

    return (
        <View style={[styles.badge, { backgroundColor: healthStatus.bgColor }]}>
            <Text style={[styles.text, { color: healthStatus.color }]}>
                {healthStatus.label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Spacing.sm,
    },
    text: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
});

export default LoanHealthBadge;
