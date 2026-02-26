/**
 * @description Credit Score Card - Hiển thị điểm tín dụng
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';

const getScoreColor = (score) => {
    if (score >= 750) return '#22c55e'; // Excellent - Green
    if (score >= 650) return '#3b82f6'; // Good - Blue
    if (score >= 550) return '#eab308'; // Fair - Yellow
    return '#ef4444'; // Poor - Red
};

const getScoreLabel = (score) => {
    if (score >= 750) return 'Xuất sắc';
    if (score >= 650) return 'Tốt';
    if (score >= 550) return 'Trung bình';
    return 'Cần cải thiện';
};

const CreditScoreCard = ({ score = 0, maxScore = 850 }) => {
    const scoreColor = getScoreColor(score);
    const scoreLabel = getScoreLabel(score);
    const percentage = (score / maxScore) * 100;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Điểm tín dụng</Text>
            <View style={styles.scoreContainer}>
                <Text style={[styles.score, { color: scoreColor }]}>{score}</Text>
                <Text style={styles.maxScore}>/ {maxScore}</Text>
            </View>
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: scoreColor }]} />
            </View>
            <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
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
        elevation: 3,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    score: {
        fontSize: Typography.fontSize['3xl'],
        fontWeight: Typography.fontWeight.bold,
    },
    maxScore: {
        fontSize: Typography.fontSize.md,
        color: Colors.textSecondary,
        marginLeft: Spacing.xs,
    },
    progressContainer: {
        height: 8,
        backgroundColor: Colors.border,
        borderRadius: 4,
        marginTop: Spacing.sm,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    scoreLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        marginTop: Spacing.sm,
    },
});

export default CreditScoreCard;
