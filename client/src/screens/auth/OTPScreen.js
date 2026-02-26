/**
 * OTP Screen - Xác thực mã OTP và chọn loại tài khoản
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Input } from '../../components';
import { useAuth } from '../../hooks';
import { Colors, Spacing, Typography } from '../../constants';

const CATEGORIES = [
    { value: 'borrower', label: 'Người vay' },
    { value: 'lender', label: 'Nhà đầu tư' },
];

const OTPScreen = ({ route, navigation }) => {
    const { phone } = route.params;
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [category, setCategory] = useState('borrower');
    const [loading, setLoading] = useState(false);
    const { verifyOtp } = useAuth();

    const handleVerify = async () => {
        if (!code || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập mã OTP và mật khẩu');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);
        try {
            console.log('Verifying OTP...', { phone, code, category });
            const result = await verifyOtp(phone, code, password, category);
            console.log('Verify result:', result);

            if (result.success) {
                Alert.alert('Thành công', 'Đăng ký thành công!');
                // useAuth sẽ tự động chuyển isLoggedIn = true
            } else {
                Alert.alert('Lỗi', result.data?.message || 'Xác thực thất bại');
            }
        } catch (error) {
            console.log('Verify error:', error);
            Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Xác thực OTP</Text>
            <Text style={styles.subtitle}>Mã OTP đã được gửi đến {phone}</Text>

            <Input
                label="Mã OTP"
                value={code}
                onChangeText={setCode}
                placeholder="Nhập mã OTP (6 số)"
                keyboardType="number-pad"
            />

            <Input
                label="Tạo mật khẩu"
                value={password}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                secureTextEntry
            />

            <Text style={styles.label}>Loại tài khoản</Text>
            <View style={styles.categoryContainer}>
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.value}
                        style={[
                            styles.categoryButton,
                            category === cat.value && styles.categoryButtonActive
                        ]}
                        onPress={() => setCategory(cat.value)}
                    >
                        <Text style={[
                            styles.categoryText,
                            category === cat.value && styles.categoryTextActive
                        ]}>
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Button
                title="Xác nhận đăng ký"
                onPress={handleVerify}
                loading={loading}
                style={styles.button}
            />

            <Button
                title="Quay lại"
                onPress={() => navigation.goBack()}
                variant="outline"
                style={styles.backButton}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Spacing.xl, justifyContent: 'center', flexGrow: 1 },
    title: { fontSize: Typography.fontSize['2xl'], fontWeight: 'bold', textAlign: 'center', marginBottom: Spacing.sm },
    subtitle: { color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
    label: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.md },
    categoryContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
    categoryButton: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.gray300,
        alignItems: 'center',
    },
    categoryButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    categoryText: { color: Colors.textSecondary, fontWeight: '500' },
    categoryTextActive: { color: Colors.white },
    button: { marginTop: Spacing.xl },
    backButton: { marginTop: Spacing.md },
});

export default OTPScreen;
