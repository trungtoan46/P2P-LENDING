/**
 * @description Home Screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components';
import { useAuth } from '../../hooks';
import { Colors, Spacing, Typography } from '../../constants';

const HomeScreen = ({ navigation }) => {
    const { user, logout, refreshProfile } = useAuth();

    useEffect(() => {
        refreshProfile();
    }, []);

    // Trạng thái KYC (Logic tương tự Profile)
    const getKycStatus = () => {
        const status = user?.details?.kycStatus;
        switch (status) {
            case 'approved':
                return { label: 'Đã xác thực', color: '#10B981', icon: 'check-decagram' };
            case 'pending':
                return { label: 'Đang xét duyệt', color: '#F59E0B', icon: 'clock-outline' };
            case 'rejected':
                return { label: 'Bị từ chối', color: '#EF4444', icon: 'close-circle' };
            default:
                return { label: 'Chưa xác thực', color: '#6B7280', icon: 'alert-circle-outline' };
        }
    };

    const kyc = getKycStatus();
    const isVerified = user?.details?.kycStatus === 'approved';

    const handleLogout = async () => {
        await logout();
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.welcome}>Xin chào,</Text>
                        <View style={styles.nameRow}>
                            <Text style={styles.name}>{user?.fullName || user?.details?.name || user?.phone || 'User'}</Text>
                            {isVerified && (
                                <MaterialCommunityIcons name="check-decagram" size={20} color="#10B981" style={styles.verifiedIcon} />
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.kycBadge, { backgroundColor: kyc.color + '15' }]}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <MaterialCommunityIcons name={kyc.icon} size={14} color={kyc.color} />
                        <Text style={[styles.kycBadgeText, { color: kyc.color }]}>{kyc.label}</Text>
                    </TouchableOpacity>
                </View>

                {!isVerified && (user?.kycStatus !== 'pending') && (
                    <TouchableOpacity onPress={() => navigation.navigate('Ekyc')}>
                        <LinearGradient
                            colors={[Colors.primary, '#4F46E5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.kycBanner}
                        >
                            <View style={styles.kycBannerLeft}>
                                <View style={styles.kycIconContainer}>
                                    <MaterialCommunityIcons name="shield-check" size={24} color="#fff" />
                                </View>
                                <View>
                                    <Text style={styles.kycBannerTitle}>Xác thực tài khoản</Text>
                                    <Text style={styles.kycBannerSub}>Tăng hạn mức và độ tin cậy</Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.menuGrid}>
                <View style={styles.menuRow}>
                    <Button
                        title="Vay tiền"
                        onPress={() => navigation.navigate('Loans')}
                        style={styles.menuButton}
                    />
                    <Button
                        title="Đầu tư"
                        onPress={() => navigation.navigate('Investments')}
                        variant="secondary"
                        style={styles.menuButton}
                    />
                </View>
                <View style={styles.menuRow}>
                    <Button
                        title="Ví tiền"
                        onPress={() => navigation.navigate('Wallet')}
                        variant="outline"
                        style={styles.menuButton}
                    />
                    <Button
                        title="Thanh toán"
                        onPress={() => navigation.navigate('Payments')}
                        variant="outline"
                        style={styles.menuButton}
                    />
                </View>
            </View>

            <Button
                title="Đăng xuất"
                onPress={handleLogout}
                variant="outline"
                style={styles.logoutButton}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: Spacing.base,
    },
    header: {
        marginBottom: Spacing.xl,
        marginTop: Platform.OS === 'ios' ? 40 : 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.lg,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    welcome: {
        fontSize: Typography.fontSize.md,
        color: Colors.gray500,
    },
    name: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
    },
    verifiedIcon: {
        marginLeft: 2,
    },
    kycBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    kycBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    kycBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        marginTop: 8,
    },
    kycBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    kycIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    kycBannerTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    kycBannerSub: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    menuGrid: {
        marginBottom: Spacing['2xl'],
    },
    menuRow: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
    },
    menuButton: {
        flex: 1,
        marginHorizontal: Spacing.xs,
    },
    logoutButton: {
        marginTop: Spacing.xl,
    },
});

export default HomeScreen;
