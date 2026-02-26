import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks';
import { Colors, Spacing } from '../../constants';

const ProfileScreen = ({ navigation }) => {
    const { user, logout, refreshProfile } = useAuth();
    const [refreshing, setRefreshing] = React.useState(false);

    // Auto refresh khi focus vào màn hình
    useFocusEffect(
        useCallback(() => {
            refreshProfile();
        }, [])
    );

    // Kéo để refresh thủ công
    const onRefresh = async () => {
        setRefreshing(true);
        await refreshProfile();
        setRefreshing(false);
    };

    // Xác định vai trò hiển thị
    const getRoleDisplay = () => {
        switch (user?.category) {
            case 'lender':
                return { label: 'Nhà đầu tư', color: '#10B981', icon: 'account-cash' };
            case 'borrower':
                return { label: 'Người vay', color: '#ffffffff', icon: 'account-arrow-left' };
            case 'admin':
                return { label: 'Quản trị viên', color: '#8B5CF6', icon: 'shield-account' };
            default:
                return { label: 'Người dùng', color: Colors.primary, icon: 'account' };
        }
    };

    // Trạng thái KYC
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

    const role = getRoleDisplay();
    const kyc = getKycStatus();
    const isVerified = user?.details?.kycStatus === 'approved';

    // Menu items
    const menuItems = [
        {
            id: 'ekyc',
            icon: 'card-account-details-star',
            label: 'Xác thực eKYC',
            onPress: () => navigation?.navigate('Ekyc'),
            highlight: !user?.isVerified,
        },

        {
            id: 'wallet',
            icon: 'wallet',
            label: 'Ví của tôi',
            onPress: () => navigation?.navigate('Wallet'),
        },
        {
            id: 'notifications',
            icon: 'bell-outline',
            label: 'Thông báo',
            onPress: () => navigation?.navigate('Notifications'),
        },

    ];

    // Helper giới tính
    const getGenderLabel = (sex) => {
        if (sex === 'male') return 'Nam';
        if (sex === 'female') return 'Nữ';
        return 'Khác';
    };

    return (
        <View style={styles.container}>
            {/* Header với Gradient */}
            <LinearGradient
                colors={[Colors.primary, Colors.primaryDark || '#1a56db']}
                style={styles.header}
            >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(user?.fullName || user?.details?.name || 'U')?.[0]?.toUpperCase()}
                        </Text>
                    </View>
                    {isVerified && (
                        <View style={styles.verifiedBadge}>
                            <MaterialCommunityIcons name="check-decagram" size={20} color="#10B981" />
                        </View>
                    )}
                </View>

                {/* Thông tin người dùng */}
                <Text style={styles.userName}>
                    {user?.fullName || user?.details?.name || 'Chưa cập nhật tên'}
                </Text>
                <Text style={styles.userPhone}>{user?.phone}</Text>

                {/* Badge vai trò */}
                <View style={[styles.roleBadge, { backgroundColor: role.color + '20' }]}>
                    <MaterialCommunityIcons name={role.icon} size={16} color={role.color} />
                    <Text style={[styles.roleText, { color: role.color }]}>{role.label}</Text>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Thông tin nhanh */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{user?.details?.score || 0}</Text>
                        <Text style={styles.statLabel}>Điểm tín dụng</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <View style={[styles.kycBadge, { backgroundColor: kyc.color + '20' }]}>
                            <MaterialCommunityIcons name={kyc.icon} size={18} color={kyc.color} />
                        </View>
                        <Text style={[styles.statLabel, { color: kyc.color }]}>{kyc.label}</Text>
                    </View>
                </View>

                {/* Thông tin cá nhân cơ bản */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>THÔNG TIN CÁ NHÂN</Text>
                    <View style={styles.card}>
                        <InfoRow icon="phone" label="Số điện thoại" value={user?.phone} />
                        <InfoRow icon="email" label="Email" value={user?.email || 'Chưa cập nhật'} />
                        <InfoRow icon="calendar" label="Ngày tham gia" value={formatDate(user?.createdAt)} />
                    </View>
                </View>

                {/* Thông tin eKYC (chỉ hiện khi có dữ liệu) */}
                {
                    user?.details && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>THÔNG TIN XÁC THỰC (eKYC)</Text>
                            <View style={styles.card}>
                                <InfoRow
                                    icon="account-details"
                                    label="Họ tên"
                                    value={user.details.name || 'Chưa cập nhật'}
                                />
                                <InfoRow
                                    icon="card-account-details-outline"
                                    label="Số CCCD"
                                    value={user.details.ssn || 'Chưa cập nhật'}
                                />
                                {user.details.sex && (
                                    <InfoRow
                                        icon="gender-male-female"
                                        label="Giới tính"
                                        value={getGenderLabel(user.details.sex)}
                                    />
                                )}
                                {user.details.birth && (
                                    <InfoRow
                                        icon="cake-variant-outline"
                                        label="Ngày sinh"
                                        value={formatDate(user.details.birth)}
                                    />
                                )}
                                <InfoRow
                                    icon="map-marker-outline"
                                    label="Địa chỉ"
                                    value={user.details.address || 'Chưa cập nhật'}
                                />
                            </View>
                        </View>
                    )
                }

                {/* Menu */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CÀI ĐẶT</Text>
                    <View style={styles.card}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.menuItem,
                                    index < menuItems.length - 1 && styles.menuItemBorder
                                ]}
                                onPress={item.onPress}
                                activeOpacity={0.7}
                            >
                                <View style={styles.menuItemLeft}>
                                    <View style={styles.menuIconContainer}>
                                        <MaterialCommunityIcons
                                            name={item.icon}
                                            size={22}
                                            color={Colors.primary}
                                        />
                                    </View>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                </View>
                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={22}
                                    color={Colors.gray400}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Nút đăng xuất */}
                <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>

                {/* Footer */}
                <Text style={styles.version}>Phiên bản 1.0.0</Text>
            </ScrollView >
        </View >
    );
};

// Component InfoRow
const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
        <View style={styles.infoRowLeft}>
            <MaterialCommunityIcons name={icon} size={20} color={Colors.gray400} />
            <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

// Helper format date
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarText: {
        fontSize: 36,
        color: '#fff',
        fontWeight: 'bold',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 2,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 12,
    },
    userPhone: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
        gap: 6,
    },
    roleText: {
        fontSize: 13,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        marginTop: -15,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.gray500,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.gray200,
        marginHorizontal: 20,
    },
    kycBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.gray500,
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    infoRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: Colors.gray500,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        fontSize: 15,
        color: Colors.text,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 20,
        paddingVertical: 14,
        backgroundColor: '#FEE2E2',
        borderRadius: 12,
        gap: 8,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        color: Colors.gray400,
        marginTop: 20,
        marginBottom: 30,
    },
});

export default ProfileScreen;
