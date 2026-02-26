/**
 * @description Notification Item - Hiển thị thông báo
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';

const NOTIFICATION_TYPES = {
    warning: { icon: 'alert', color: '#eab308', bgColor: '#fef9c3' },
    error: { icon: 'close-circle', color: '#ef4444', bgColor: '#fee2e2' },
    success: { icon: 'check-circle', color: '#22c55e', bgColor: '#dcfce7' },
    info: { icon: 'information', color: '#3b82f6', bgColor: '#dbeafe' },
};

const NotificationItem = ({
    type = 'info',
    title,
    message,
    timestamp,
    onPress
}) => {
    const typeStyle = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
    const formattedTime = timestamp ? new Date(timestamp).toLocaleDateString('vi-VN') : '';

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: typeStyle.bgColor }]}>
                <MaterialCommunityIcons name={typeStyle.icon} size={20} color={typeStyle.color} />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                {message && <Text style={styles.message} numberOfLines={2}>{message}</Text>}
                {formattedTime && <Text style={styles.timestamp}>{formattedTime}</Text>}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: Spacing.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.text,
        marginBottom: 2,
    },
    message: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    timestamp: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textTertiary,
    },
});

export default NotificationItem;
