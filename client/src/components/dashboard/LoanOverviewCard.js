/**
 * @description Loan Overview Card - Card tổng quan khoản vay
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { formatCurrency } from '../../utils/formatters';

const LoanOverviewCard = ({ title, value, subtitle, iconName = 'file-document-outline', color = Colors.primary }) => {
    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                <MaterialCommunityIcons name={iconName} size={20} color={color} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={[styles.value, { color }]}>
                {typeof value === 'number' ? formatCurrency(value) : value}
            </Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: Spacing.md,
        padding: Spacing.md,
        marginHorizontal: Spacing.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    value: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
    },
    subtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
});

export default LoanOverviewCard;
