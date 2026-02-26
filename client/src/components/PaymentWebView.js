/**
 * PaymentWebView - Hiển thị trang thanh toán PayOS trong app
 */

import React, { useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants';

const PaymentWebView = ({ url, onClose, onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(true);
    const webViewRef = useRef(null);

    const handleNavigationStateChange = (navState) => {
        const { url: currentUrl } = navState;
        if (!currentUrl) return;

        if (currentUrl.includes('/success') || currentUrl.includes('status=PAID')) {
            onSuccess?.();
        }

        if (currentUrl.includes('/cancel') || currentUrl.includes('status=CANCELLED')) {
            onCancel?.();
        }
    };

    // Không render WebView nếu chưa có URL
    if (!url) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thanh toán PayOS</Text>
                <View style={{ width: 40 }} />
            </View>

            <WebView
                ref={webViewRef}
                source={{ uri: url }}
                onNavigationStateChange={handleNavigationStateChange}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
            />

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Đang tải trang thanh toán...</Text>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    webview: {
        flex: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        top: 56,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.textSecondary,
    },
});

export default PaymentWebView;
