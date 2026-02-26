/**
 * @description Empty State Component - Hiển thị khi danh sách trống
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';
import Button from './Button';

const EmptyState = ({
    title = 'Không có dữ liệu',
    message = 'Chưa có thông tin để hiển thị',
    actionText,
    onAction,
    icon
}) => {
    return (
        <View style={styles.container}>
            {icon && <Text style={styles.icon}>{icon}</Text>}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            {actionText && onAction && (
                <Button
                    title={actionText}
                    onPress={onAction}
                    style={styles.button}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.surface,
        borderRadius: Spacing.md,
        marginVertical: Spacing.md,
    },
    icon: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.text,
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    message: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    button: {
        marginTop: Spacing.sm,
    },
});

export default EmptyState;
