/**
 * @description Modern Login Screen with gradient background and animations
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
import { useAuth } from '../../hooks';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
    const [phone, setPhone] = useState('0329008682');
    const [password, setPassword] = useState('123456');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const { login } = useAuth();

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

        if (!password) {
            newErrors.password = 'Vui lòng nhập mật khẩu';
        } else if (password.length < 6) {
            newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const result = await login(phone, password);
            if (!result.success) {
                Alert.alert('Lỗi', result.data?.message || 'Đăng nhập thất bại');
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
                        {/* Logo Section */}
                        <Animated.View
                            style={[
                                styles.logoContainer,
                                { transform: [{ scale: logoScale }] }
                            ]}
                        >
                            <View style={styles.logoCircle}>
                                <Ionicons name="wallet-outline" size={40} color="#667eea" />
                            </View>
                            <Text style={styles.logoText}>P2P Lending</Text>
                            <Text style={styles.logoSubtext}>Kết nối tài chính thông minh</Text>
                        </Animated.View>

                        {/* Form Card */}
                        <View style={styles.formCard}>
                            <Text style={styles.welcomeText}>Chào mừng trở lại!</Text>
                            <Text style={styles.subtitleText}>Đăng nhập để tiếp tục</Text>

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
                                                if (errors.phone) setErrors({ ...errors, phone: null });
                                            }}
                                            keyboardType="phone-pad"
                                            placeholder="0912 345 678"
                                            placeholderTextColor={Colors.gray400}
                                        />
                                    </View>
                                </View>
                                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputWrapper}>
                                <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={Colors.gray400} style={styles.inputIcon} />
                                    <View style={styles.inputFieldContainer}>
                                        <Text style={[styles.inputLabel, password && styles.inputLabelFilled]}>Mật khẩu</Text>
                                        <View style={styles.passwordRow}>
                                            <TextInput
                                                style={[styles.textInput, styles.passwordInput]}
                                                value={password}
                                                onChangeText={(text) => {
                                                    setPassword(text);
                                                    if (errors.password) setErrors({ ...errors, password: null });
                                                }}
                                                secureTextEntry={!showPassword}
                                                placeholder="••••••"
                                                placeholderTextColor={Colors.gray400}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowPassword(!showPassword)}
                                                style={styles.eyeButton}
                                            >
                                                <Ionicons
                                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                                    size={20}
                                                    color={Colors.gray400}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                            </View>

                            {/* Forgot Password */}
                            <TouchableOpacity style={styles.forgotPassword}>
                                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                            </TouchableOpacity>

                            {/* Login Button */}
                            <TouchableOpacity
                                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={loading ? ['#a0a0a0', '#808080'] : ['#667eea', '#764ba2']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.loginButtonGradient}
                                >
                                    {loading ? (
                                        <Text style={styles.loginButtonText}>Đang xử lý...</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.loginButtonText}>Đăng nhập</Text>
                                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Register Link */}
                            <View style={styles.registerContainer}>
                                <Text style={styles.registerText}>Chưa có tài khoản? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                    <Text style={styles.registerLink}>Đăng ký ngay</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
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
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
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
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
    },
    logoSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
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
        fontSize: 24,
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
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
    },
    eyeButton: {
        padding: 4,
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 4,
        marginLeft: 4,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: '#667eea',
        fontWeight: '500',
    },
    loginButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerText: {
        fontSize: 14,
        color: Colors.gray500,
    },
    registerLink: {
        fontSize: 14,
        color: '#667eea',
        fontWeight: '600',
    },
});

export default LoginScreen;
