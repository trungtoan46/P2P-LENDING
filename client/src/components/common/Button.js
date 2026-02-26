/**
 * @description Common Button Component
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants';

const Button = ({
    title,
    onPress,
    variant = 'primary', // 'primary', 'secondary', 'outline'
    size = 'medium', // 'small', 'medium', 'large'
    disabled = false,
    loading = false,
    style,
    textStyle,
}) => {
    const getButtonStyle = () => {
        const styles = [buttonStyles.base, buttonStyles[size]];

        if (variant === 'primary') {
            styles.push(buttonStyles.primary);
        } else if (variant === 'secondary') {
            styles.push(buttonStyles.secondary);
        } else if (variant === 'outline') {
            styles.push(buttonStyles.outline);
        }

        if (disabled) {
            styles.push(buttonStyles.disabled);
        }

        return styles;
    };

    const getTextStyle = () => {
        const styles = [textStyles.base, textStyles[size]];

        if (variant === 'outline') {
            styles.push(textStyles.outline);
        } else {
            styles.push(textStyles.filled);
        }

        if (disabled) {
            styles.push(textStyles.disabled);
        }

        return styles;
    };

    return (
        <TouchableOpacity
            style={[...getButtonStyle(), style]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? Colors.primary : Colors.white} />
            ) : (
                <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const buttonStyles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.base,
    },
    small: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    medium: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    large: {
        paddingVertical: Spacing.base,
        paddingHorizontal: Spacing.xl,
    },
    primary: {
        backgroundColor: Colors.primary,
    },
    secondary: {
        backgroundColor: Colors.secondary,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    disabled: {
        backgroundColor: Colors.gray300,
    },
});

const textStyles = StyleSheet.create({
    base: {
        fontWeight: '600',
    },
    small: {
        fontSize: 12,
    },
    medium: {
        fontSize: 14,
    },
    large: {
        fontSize: 16,
    },
    filled: {
        color: Colors.white,
    },
    outline: {
        color: Colors.primary,
    },
    disabled: {
        color: Colors.gray500,
    },
});

export default Button;
