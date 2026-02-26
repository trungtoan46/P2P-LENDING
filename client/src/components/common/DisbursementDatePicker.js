/**
 * @description Disbursement Date Picker - Component chọn ngày giải ngân
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Typography } from '../../constants';

const DisbursementDatePicker = ({ value, onChange }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState(value);

    // Xử lý khi nhấn ra ngoài modal
    const handleDismiss = () => {
        handleCancel();
    };

    const handleDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            if (selectedDate && onChange) {
                onChange(selectedDate);
            }
        } else {
            if (selectedDate) {
                setTempDate(selectedDate);
            }
        }
    };

    const handleConfirm = () => {
        setShowPicker(false);
        if (onChange) {
            onChange(tempDate);
        }
    };

    const handleCancel = () => {
        setShowPicker(false);
        setTempDate(value);
    };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>NGÀY GIẢI NGÂN DỰ KIẾN</Text>
            <View style={styles.card}>
                <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => {
                        setTempDate(value);
                        setShowPicker(true);
                    }}
                >
                    <View style={styles.selectButtonContent}>
                        <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
                        <Text style={styles.selectButtonText}>
                            {value.toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            })}
                        </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.noteText}>
                    <MaterialCommunityIcons name="information" size={14} color={Colors.primary} />
                    {' '}Nếu sau 10 ngày chờ đầu tư mà chưa đủ vốn, khoản vay sẽ bị hủy
                </Text>
            </View>

            {/* DateTimePicker cho Android */}
            {showPicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={value}
                    mode="date"
                    display="calendar"
                    onChange={handleDateChange}
                    minimumDate={tomorrow}
                    locale="vi-VN"
                />
            )}

            {/* Modal DateTimePicker cho iOS */}
            {Platform.OS === 'ios' && (
                <Modal
                    visible={showPicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={handleDismiss}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={handleDismiss}
                    >
                        <View style={styles.modalContentWrapper}>
                            <TouchableOpacity
                                activeOpacity={1}
                                style={styles.modalContent}
                                onPress={(e) => e.stopPropagation()}
                            >
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Text style={styles.cancelButton}>Hủy</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>Chọn ngày</Text>
                                    <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Text style={styles.doneButton}>Xong</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempDate}
                                    mode="date"
                                    display="inline"
                                    onChange={handleDateChange}
                                    minimumDate={tomorrow}
                                    locale="vi-VN"
                                    textColor={Colors.text}
                                    style={styles.datePicker}
                                    themeVariant="light"
                                />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.sm,
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Spacing.md,
        padding: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    selectButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    selectButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    selectButtonText: {
        marginLeft: Spacing.md,
        fontSize: Typography.fontSize.md,
        color: Colors.text,
        flex: 1,
    },
    noteText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: Spacing.lg,
    },
    modalContentWrapper: {
        width: '100%',
        maxWidth: 400,
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.background,
    },
    modalTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.text,
    },
    cancelButton: {
        fontSize: Typography.fontSize.md,
        color: Colors.textSecondary,
        padding: Spacing.xs,
    },
    doneButton: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.primary,
        padding: Spacing.xs,
    },
    datePicker: {
        height: 300,
        backgroundColor: Colors.surface,
    }
});

export default DisbursementDatePicker;
