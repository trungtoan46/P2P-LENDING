/**
 * @description Modern Register Screen with gradient background and animations
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Animated,
    Dimensions,
    StatusBar,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthApi } from '../../api';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants';

const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const logoScale = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const validateForm = () => {
        const newErrors = {};

        if (!phone) {
            newErrors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(phone)) {
            newErrors.phone = 'Số điện thoại không hợp lệ';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const result = await AuthApi.register(phone);
            if (result.success) {
                navigation.navigate('OTP', { phone });
            } else {
                Alert.alert('Lỗi', result.data?.message || 'Đăng ký thất bại');
            }
        } catch (error) {
            Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" />

            {/* Centered Content */}
            <KeyboardAvoidingView
                style={styles.formContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View
                        style={[
                            styles.contentWrapper,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }
                        ]}
                    >
                        {/* Back Button */}
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>

                        {/* Logo Section */}
                        <Animated.View
                            style={[
                                styles.logoContainer,
                                { transform: [{ scale: logoScale }] }
                            ]}
                        >
                            <View style={styles.logoCircle}>
                                <Ionicons name="person-add-outline" size={36} color="#667eea" />
                            </View>
                            <Text style={styles.logoText}>Tạo tài khoản</Text>
                            <Text style={styles.logoSubtext}>Bắt đầu hành trình tài chính của bạn</Text>
                        </Animated.View>

                        {/* Form Card */}
                        <View style={styles.formCard}>
                            <Text style={styles.welcomeText}>Đăng ký tài khoản</Text>
                            <Text style={styles.subtitleText}>Nhập số điện thoại để nhận mã OTP</Text>

                            {/* Phone Input */}
                            <View style={styles.inputWrapper}>
                                <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                                    <Ionicons name="call-outline" size={20} color={Colors.gray400} style={styles.inputIcon} />
                                    <View style={styles.inputFieldContainer}>
                                        <Text style={[styles.inputLabel, phone && styles.inputLabelFilled]}>Số điện thoại</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={phone}
                                            onChangeText={(text) => {
                                                setPhone(text);
                                                if (errors.phone) setErrors({});
                                            }}
                                            keyboardType="phone-pad"
                                            placeholder="0912 345 678"
                                            placeholderTextColor={Colors.gray400}
                                        />
                                    </View>
                                </View>
                                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                            </View>

                            {/* Info Box */}
                            <View style={styles.infoBox}>
                                <Ionicons name="information-circle-outline" size={20} color="#667eea" />
                                <Text style={styles.infoText}>
                                    Chúng tôi sẽ gửi mã xác thực OTP đến số điện thoại này
                                </Text>
                            </View>

                            {/* Register Button */}
                            <TouchableOpacity
                                style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                                onPress={handleRegister}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={loading ? ['#a0a0a0', '#808080'] : ['#667eea', '#764ba2']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.registerButtonGradient}
                                >
                                    {loading ? (
                                        <Text style={styles.registerButtonText}>Đang gửi...</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.registerButtonText}>Tiếp tục</Text>
                                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Terms */}
                            <Text style={styles.termsText}>
                                Bằng việc đăng ký, bạn đồng ý với{' '}
                                <Text style={styles.termsLink}>Điều khoản sử dụng</Text>
                                {' '}và{' '}
                                <Text style={styles.termsLink}>Chính sách bảo mật</Text>
                            </Text>

                            {/* Login Link */}
                            <View style={styles.loginContainer}>
                                <Text style={styles.loginText}>Đã có tài khoản? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={styles.loginLink}>Đăng nhập</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 24,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    contentWrapper: {
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? -30 : -40,
        left: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    logoText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
    },
    logoSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    formCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.gray800,
        marginBottom: 4,
    },
    subtitleText: {
        fontSize: 14,
        color: Colors.gray500,
        marginBottom: 24,
    },
    inputWrapper: {
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    inputError: {
        borderColor: Colors.error,
    },
    inputIcon: {
        marginRight: 12,
    },
    inputFieldContainer: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        color: Colors.gray400,
        marginBottom: 2,
    },
    inputLabelFilled: {
        color: '#667eea',
    },
    textInput: {
        fontSize: 16,
        color: Colors.gray800,
        paddingVertical: 4,
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 4,
        marginLeft: 4,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#667eea',
        lineHeight: 20,
    },
    registerButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    registerButtonDisabled: {
        opacity: 0.7,
    },
    registerButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    registerButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    termsText: {
        fontSize: 12,
        color: Colors.gray500,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
    },
    termsLink: {
        color: '#667eea',
        fontWeight: '500',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginText: {
        fontSize: 14,
        color: Colors.gray500,
    },
    loginLink: {
        fontSize: 14,
        color: '#667eea',
        fontWeight: '600',
    },
});

export default RegisterScreen;
