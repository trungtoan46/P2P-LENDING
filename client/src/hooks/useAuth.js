/**
 * @description Auth Hook - Quản lý trạng thái đăng nhập
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { AuthApi, UserApi, TokenManager } from '../api';
import { eventBus, EVENTS } from '../utils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        checkAuthStatus();

        // Đăng ký lắng nghe lỗi Auth từ httpClient
        const handleAuthError = (message) => {
            if (isLoggedIn) {
                Alert.alert(
                    'Thông báo',
                    message,
                    [{ text: 'OK', onPress: () => logout() }]
                );
            }
        };

        eventBus.on(EVENTS.AUTH_ERROR, handleAuthError);
        return () => eventBus.off(EVENTS.AUTH_ERROR, handleAuthError);
    }, [isLoggedIn]);

    const checkAuthStatus = async () => {
        try {
            const token = await TokenManager.getAccessToken();
            if (token) {
                const userInfo = await TokenManager.getUserInfo();
                // console.log('[Auth] Loaded user from storage:', JSON.stringify(userInfo, null, 2));

                if (normalizedUser) {
                    // console.log('[Auth] Final user category:', normalizedUser.category);
                    setUser(normalizedUser);
                    setIsLoggedIn(true);

                    // Sync back to storage in clean format if changed
                    if (JSON.stringify(normalizedUser) !== JSON.stringify(userInfo)) {
                        await TokenManager.setUserInfo(normalizedUser);
                    }
                } else {
                    // console.log('[Auth] Invalid user info format, clearing storage');
                    await TokenManager.clearTokens();
                }
            } else {
                // console.log('[Auth] No user info found, clearing tokens');
                await TokenManager.clearTokens();
            }
        } catch (error) {
            console.log('Auth check error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (phone, password) => {
        const result = await AuthApi.login(phone, password);
        // console.log('Login result:', JSON.stringify(result, null, 2));

        // Response structure: result.data.data.user, result.data.data.token
        const responseData = result.data?.data;
        const userData = responseData?.user;
        const token = responseData?.token;
        const refreshToken = responseData?.refreshToken;

        if (result.success && userData && token) {
            // Save tokens to storage
            await TokenManager.setAccessToken(token);
            if (refreshToken) {
                await TokenManager.setRefreshToken(refreshToken);
            }
            await TokenManager.setUserInfo(userData);

            setUser(userData);
            setIsLoggedIn(true);
        }
        return result;
    };

    const register = async (phone) => {
        return AuthApi.register(phone);
    };

    const verifyOtp = async (phone, code, password, category) => {
        const result = await AuthApi.verifyOtp(phone, code, password, category);
        // Response structure: result.data.data.user, result.data.data.token
        const responseData = result.data?.data;
        const userData = responseData?.user;
        const token = responseData?.token;
        const refreshToken = responseData?.refreshToken;

        if (result.success && userData && token) {
            // Save tokens to storage
            await TokenManager.setAccessToken(token);
            if (refreshToken) {
                await TokenManager.setRefreshToken(refreshToken);
            }
            await TokenManager.setUserInfo(userData);

            setUser(userData);
            setIsLoggedIn(true);
        }
        return result;
    };

    const logout = async () => {
        await AuthApi.logout();
        setUser(null);
        setIsLoggedIn(false);
    };

    const updateUser = (userData) => {
        setUser(userData);
        TokenManager.setUserInfo(userData);
    };

    /**
     * Làm mới thông tin user từ server
     * (Hữu ích sau khi eKYC hoặc edit profile)
     */
    const refreshProfile = async () => {
        try {
            // console.log('[Auth] Refreshing profile...');
            const response = await UserApi.getProfile();
            if (response.success && response.data) {
                // Response structure: response.data = { success, message, data: { user, details } }
                const responseData = response.data.data;
                const userData = responseData?.user;
                const details = responseData?.details;

                if (!userData) {
                    console.warn('[Auth] No user data in refresh response');
                    return null;
                }

                // Merge data: user fields + details
                // Giữ cấu trúc phẳng cho các field cũ của user
                // Thêm field .details cho info mở rộng
                const finalUser = {
                    ...userData,
                    details: details || null
                };


                setUser(finalUser);
                await TokenManager.setUserInfo(finalUser);
                return finalUser;
            }
        } catch (error) {
            console.warn('[Auth] Refresh profile failed:', error);
        }
        return null;
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isLoggedIn,
            login,
            register,
            verifyOtp,
            logout,
            updateUser,
            refreshProfile, // Export hàm mới
            checkAuthStatus,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export default AuthContext;
