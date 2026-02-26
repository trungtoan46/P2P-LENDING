/**
 * Disbursement Method Selection Screen
 * Màn hình chọn phương thức nhận tiền giải ngân
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, BankPicker } from '../../components';
import { Colors, Spacing } from '../../constants';
import { LoansApi, TokenManager } from '../../api';

const DisbursementMethodScreen = ({ navigation, route }) => {
    // Get loan info params passed from LoanPreview
    const { capital, term, purpose, disbursementDate, monthlyIncome } = route.params || {};

    // Validate params existence
    useEffect(() => {
        if (!route.params || !capital) {
            Alert.alert(
                'Lỗi hệ thống',
                'Không tìm thấy thông tin khoản vay. Vui lòng thực hiện lại.',
                [{ text: 'OK', onPress: () => navigation.popToTop() }]
            );
        }
    }, [route.params, capital]);

    const [method, setMethod] = useState('wallet'); // 'wallet' | 'bank'
    const [walletAccountNumber, setWalletAccountNumber] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountHolderName, setBankAccountHolderName] = useState('');
    const [bankName, setBankName] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [userPhone, setUserPhone] = useState('');

    // Load saved payment info and user phone
    useEffect(() => {
        const loadSavedInfo = async () => {
            try {
                const savedMethod = await AsyncStorage.getItem('last_disbursement_method');
                const savedWallet = await AsyncStorage.getItem('saved_wallet_account');

                const savedBankAccount = await AsyncStorage.getItem('saved_bank_account');
                const savedBankHolderName = await AsyncStorage.getItem('saved_bank_holder_name');
                const savedBankName = await AsyncStorage.getItem('saved_bank_name');

                if (savedMethod) setMethod(savedMethod);

                // Ưu tiên số ví đã lưu
                if (savedWallet) {
                    setWalletAccountNumber(savedWallet);
                }

                // Lấy số điện thoại user để dùng khi cần
                const userInfo = await TokenManager.getUserInfo();
                if (userInfo?.phone) {
                    setUserPhone(userInfo.phone);
                    if (!savedWallet) {
                        setWalletAccountNumber(userInfo.phone);
                    }
                }

                if (savedBankAccount) setBankAccountNumber(savedBankAccount);
                if (savedBankHolderName) setBankAccountHolderName(savedBankHolderName);
                if (savedBankName) setBankName(savedBankName);
            } catch (error) {
                console.log('Error loading saved info:', error);
            }
        };
        loadSavedInfo();
    }, []);

    const handleSelectMethod = async (nextMethod) => {
        setMethod(nextMethod);
        if (nextMethod === 'wallet' && !walletAccountNumber) {
            if (userPhone) {
                setWalletAccountNumber(userPhone);
                return;
            }
            try {
                const userInfo = await TokenManager.getUserInfo();
                if (userInfo?.phone) {
                    setUserPhone(userInfo.phone);
                    setWalletAccountNumber(userInfo.phone);
                }
            } catch (error) {
                console.log('Error loading user phone:', error);
            }
        }
    };

    if (!capital) {
        return <View style={styles.container} />; // Render empty view while redirecting
    }

    const validateBank = () => {
        const newErrors = {};

        if (!bankName) {
            newErrors.bankName = 'Vui lòng nhập tên ngân hàng';
        } else if (bankName.length < 2) {
            newErrors.bankName = 'Tên ngân hàng không hợp lệ';
        }

        if (!bankAccountNumber) {
            newErrors.bankAccountNumber = 'Vui lòng nhập số tài khoản ngân hàng';
        } else if (bankAccountNumber.length < 9 || bankAccountNumber.length > 16) {
            newErrors.bankAccountNumber = 'Số tài khoản phải từ 9-16 số';
        }

        if (!bankAccountHolderName) {
            newErrors.bankAccountHolderName = 'Vui lòng nhập họ tên chủ thẻ';
        } else if (bankAccountHolderName.length < 3) {
            newErrors.bankAccountHolderName = 'Họ tên phải có ít nhất 3 ký tự';
        }

        return Object.keys(newErrors).length > 0 ? newErrors : null;
    };

    const handleContinue = async () => {
        setErrors({});

        if (method === 'bank') {
            const validationErrors = validateBank();
            if (validationErrors) {
                setErrors(validationErrors);
                return;
            }
        }

        // Save info locally
        try {
            await AsyncStorage.setItem('last_disbursement_method', method);
            if (method === 'wallet') {
                await AsyncStorage.setItem('saved_wallet_account', walletAccountNumber);
            } else {
                await AsyncStorage.setItem('saved_bank_name', bankName);
                await AsyncStorage.setItem('saved_bank_account', bankAccountNumber);
                await AsyncStorage.setItem('saved_bank_holder_name', bankAccountHolderName);
            }
        } catch (error) {
            console.log('Error saving info:', error);
        }

        setLoading(true);
        try {
            // Prepare loan data
            const loanData = {
                capital,
                term,
                purpose,
                disbursementDate,
                ...(monthlyIncome ? { monthlyIncome } : {}),
                method,
                ...(method === 'wallet' ? {
                    ...(walletAccountNumber ? { walletAccountNumber } : {})
                } : {
                    bankName,
                    bankAccountNumber,
                    bankAccountHolderName
                })
            };

            const result = await LoansApi.create(loanData);

            if (result.success) {
                const loanId = result.data?.data?._id || result.data?._id;
                if (Platform.OS === 'web') {
                    // Web: dùng confirm thay vì Alert
                    const viewDetail = window.confirm(
                        'Đã tạo đơn vay thành công! Đơn vay sẽ được xét duyệt trong 24 giờ.\n\nBấm OK để xem chi tiết, Cancel để về trang chủ.'
                    );
                    if (viewDetail) {
                        navigation.replace('LoanDetail', { loanId });
                    } else {
                        navigation.popToTop();
                    }
                } else {
                    Alert.alert(
                        'Thành công',
                        'Đã tạo đơn vay thành công! Đơn vay sẽ được xét duyệt trong 24 giờ.',
                        [
                            {
                                text: 'Xem chi tiết',
                                onPress: () => navigation.replace('LoanDetail', { loanId })
                            },
                            {
                                text: 'Về trang chủ',
                                onPress: () => navigation.popToTop()
                            }
                        ]
                    );
                }
            } else {
                const errorMsg = result.data?.message || 'Tạo thất bại';
                if (Platform.OS === 'web') {
                    window.alert('Lỗi: ' + errorMsg);
                } else {
                    Alert.alert('Lỗi', errorMsg);
                }
            }
        } catch (error) {
            if (Platform.OS === 'web') {
                window.alert('Lỗi: ' + error.message);
            } else {
                Alert.alert('Lỗi', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Phương thức nhận tiền</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <MaterialCommunityIcons name="information" size={20} color={Colors.info} />
                        <Text style={styles.infoText}>
                            Chọn cách bạn muốn nhận tiền khi khoản vay được giải ngân
                        </Text>
                    </View>

                    {/* Method Selection */}
                    <Text style={styles.sectionTitle}>CHỌN PHƯƠNG THỨC</Text>

                    {/* Wallet Option */}
                    <TouchableOpacity
                        style={[
                            styles.methodCard,
                            method === 'wallet' && styles.methodCardActive
                        ]}
                        onPress={() => handleSelectMethod('wallet')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.methodHeader}>
                            <View style={[
                                styles.iconContainer,
                                method === 'wallet' && styles.iconContainerActive
                            ]}>
                                <MaterialCommunityIcons
                                    name="wallet"
                                    size={28}
                                    color={method === 'wallet' ? Colors.primary : Colors.textSecondary}
                                />
                            </View>
                            <View style={styles.methodInfo}>
                                <Text style={[
                                    styles.methodTitle,
                                    method === 'wallet' && styles.methodTitleActive
                                ]}>
                                    Ví điện tử
                                </Text>
                                <Text style={styles.methodDesc}>
                                    Nhận tiền trực tiếp vào ví trong app
                                </Text>
                            </View>
                            {method === 'wallet' && (
                                <MaterialCommunityIcons
                                    name="check-circle"
                                    size={24}
                                    color={Colors.success}
                                />
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Bank Option */}
                    <TouchableOpacity
                        style={[
                            styles.methodCard,
                            method === 'bank' && styles.methodCardActive
                        ]}
                        onPress={() => handleSelectMethod('bank')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.methodHeader}>
                            <View style={[
                                styles.iconContainer,
                                method === 'bank' && styles.iconContainerActive
                            ]}>
                                <MaterialCommunityIcons
                                    name="bank"
                                    size={28}
                                    color={method === 'bank' ? Colors.primary : Colors.textSecondary}
                                />
                            </View>
                            <View style={styles.methodInfo}>
                                <Text style={[
                                    styles.methodTitle,
                                    method === 'bank' && styles.methodTitleActive
                                ]}>
                                    Tài khoản ngân hàng
                                </Text>
                                <Text style={styles.methodDesc}>
                                    Chuyển khoản đến tài khoản ngân hàng
                                </Text>
                            </View>
                            {method === 'bank' && (
                                <MaterialCommunityIcons
                                    name="check-circle"
                                    size={24}
                                    color={Colors.success}
                                />
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Input Forms */}
                    {method === 'wallet' ? (
                        // <View style={styles.formCard}>
                        //     <Text style={styles.inputLabel}>Ví điện tử trong app</Text>
                        //     <View style={styles.readonlyContainer}>
                        //         <MaterialCommunityIcons name="wallet" size={20} color={Colors.primary} />
                        //         <Text style={styles.readonlyText}>
                        //             {walletAccountNumber ? `Số ví: ${walletAccountNumber}` : 'Sẽ nhận tiền vào ví trong app'}
                        //         </Text>
                        //     </View>
                        //     <Text style={styles.helperText}>
                        //         Không cần nhập số điện thoại
                        //     </Text>
                        // </View>
                        <>
                            <Text style={styles.inputLabel}>Ví điện tử trong app</Text>
                            <View style={styles.readonlyContainer}>
                                <MaterialCommunityIcons name="wallet" size={20} color={Colors.primary} />
                                <Text style={styles.readonlyText}>
                                    {walletAccountNumber ? `Số ví: ${walletAccountNumber}` : 'Sẽ nhận tiền vào ví trong app'}
                                </Text>
                            </View>
                            <Text style={styles.helperText}>
                                Không cần nhập số điện thoại
                            </Text>
                        </>
                    ) : (
                        <View style={styles.formCard}>
                            {/* Tên ngân hàng */}
                            <Text style={styles.inputLabel}>Tên ngân hàng</Text>
                            <BankPicker
                                value={bankName}
                                onChange={(value) => {
                                    setBankName(value);
                                    setErrors({ ...errors, bankName: null });
                                }}
                                error={errors.bankName}
                            />
                            {errors.bankName && (
                                <Text style={styles.errorText}>{errors.bankName}</Text>
                            )}

                            {/* Số tài khoản */}
                            <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Số tài khoản ngân hàng</Text>
                            <View style={[styles.inputContainer, errors.bankAccountNumber && styles.inputError]}>
                                <MaterialCommunityIcons name="credit-card" size={20} color={Colors.primary} />
                                <TextInput
                                    style={styles.input}
                                    value={bankAccountNumber}
                                    onChangeText={(text) => {
                                        setBankAccountNumber(text.replace(/\D/g, ''));
                                        setErrors({ ...errors, bankAccountNumber: null });
                                    }}
                                    placeholder="Nhập số tài khoản"
                                    keyboardType="numeric"
                                    maxLength={16}
                                />
                            </View>
                            {errors.bankAccountNumber && (
                                <Text style={styles.errorText}>{errors.bankAccountNumber}</Text>
                            )}

                            <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>
                                Họ tên chủ tài khoản
                            </Text>
                            <View style={[styles.inputContainer, errors.bankAccountHolderName && styles.inputError]}>
                                <MaterialCommunityIcons name="account" size={20} color={Colors.primary} />
                                <TextInput
                                    style={styles.input}
                                    value={bankAccountHolderName}
                                    onChangeText={(text) => {
                                        setBankAccountHolderName(text.toUpperCase());
                                        setErrors({ ...errors, bankAccountHolderName: null });
                                    }}
                                    placeholder="NGUYEN VAN A"
                                    autoCapitalize="characters"
                                />
                            </View>
                            {errors.bankAccountHolderName && (
                                <Text style={styles.errorText}>{errors.bankAccountHolderName}</Text>
                            )}
                            <Text style={styles.helperText}>
                                Nhập chính xác họ tên trên thẻ ngân hàng
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Continue Button */}
            <View style={styles.footer}>
                <Button
                    title="TIẾP TỤC"
                    onPress={handleContinue}
                    loading={loading}
                    style={styles.continueButton}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    backButton: {
        padding: Spacing.xs
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff'
    },
    scrollView: {
        flex: 1
    },
    content: {
        padding: Spacing.md
    },
    // Info Banner
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: Colors.info + '15',
        padding: Spacing.md,
        borderRadius: 12,
        marginBottom: Spacing.lg,
        gap: 12
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: Colors.info,
        lineHeight: 20
    },
    // Section
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
        letterSpacing: 0.5
    },
    // Method Cards
    methodCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    methodCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '08',
        elevation: 3,
    },
    methodHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center'
    },
    iconContainerActive: {
        backgroundColor: Colors.primary + '15'
    },
    methodInfo: {
        flex: 1
    },
    methodTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4
    },
    methodTitleActive: {
        color: Colors.primary
    },
    methodDesc: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18
    },
    // Form Card
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: Spacing.md,
        marginTop: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.sm
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 10
    },
    readonlyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 10
    },
    inputError: {
        borderColor: Colors.error
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.md,
        fontSize: 15,
        color: Colors.text
    },
    readonlyText: {
        flex: 1,
        fontSize: 15,
        color: Colors.text
    },
    helperText: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 6,
        fontStyle: 'italic'
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 6
    },
    // Footer
    footer: {
        backgroundColor: '#fff',
        padding: Spacing.md,
        paddingBottom: Spacing.xl + 10,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb'
    },
    continueButton: {
        width: '100%'
    }
});

export default DisbursementMethodScreen;
