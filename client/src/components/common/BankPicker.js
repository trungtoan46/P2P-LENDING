/**
 * Bank Picker Component - Cho phép tìm kiếm và chọn ngân hàng
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    FlatList,
    Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { VIETNAM_BANKS } from '../../constants/banks';

const BankPicker = ({ value, onChange, error }) => {
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Tìm bank từ value
    const selectedBank = useMemo(() => {
        if (!value) return null;
        return VIETNAM_BANKS.find(
            b => b.shortName === value || b.code === value || b.fullName === value
        );
    }, [value]);

    // Filter banks theo search query
    const filteredBanks = useMemo(() => {
        if (!searchQuery.trim()) return VIETNAM_BANKS;

        const query = searchQuery.toLowerCase().trim();
        return VIETNAM_BANKS.filter(bank =>
            bank.shortName.toLowerCase().includes(query) ||
            bank.code.toLowerCase().includes(query) ||
            bank.fullName.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const handleSelect = (bank) => {
        onChange(bank.shortName);
        setShowModal(false);
        setSearchQuery('');
    };

    const handleOpenModal = () => {
        setSearchQuery('');
        setShowModal(true);
    };

    return (
        <View>
            {/* Trigger Button */}
            <TouchableOpacity
                style={[styles.selectButton, error && styles.selectButtonError]}
                onPress={handleOpenModal}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons name="bank" size={20} color={Colors.primary} />
                <View style={styles.selectContent}>
                    {selectedBank ? (
                        <>
                            <Text style={styles.bankName}>{selectedBank.shortName}</Text>
                            <Text style={styles.bankFullName} numberOfLines={1}>
                                {selectedBank.fullName}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.placeholder}>Chọn ngân hàng</Text>
                    )}
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>

            {/* Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn ngân hàng</Text>
                            <TouchableOpacity
                                onPress={() => setShowModal(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View style={styles.searchContainer}>
                            <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tìm kiếm ngân hàng..."
                                placeholderTextColor={Colors.gray400}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <MaterialCommunityIcons name="close-circle" size={18} color={Colors.gray400} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Results Count */}
                        <Text style={styles.resultCount}>
                            {filteredBanks.length} ngân hàng
                        </Text>

                        {/* Bank List */}
                        <FlatList
                            data={filteredBanks}
                            keyExtractor={(item, index) => `${item.code || 'bank'}-${index}`}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => {
                                const isSelected = selectedBank?.code === item.code;
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.bankItem,
                                            isSelected && styles.bankItemSelected
                                        ]}
                                        onPress={() => handleSelect(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.bankItemContent}>
                                            <Text style={[
                                                styles.bankItemName,
                                                isSelected && styles.bankItemNameSelected
                                            ]}>
                                                {item.shortName}
                                            </Text>
                                            <Text style={styles.bankItemFullName} numberOfLines={1}>
                                                {item.fullName}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={22}
                                                color={Colors.primary}
                                            />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <MaterialCommunityIcons name="bank-off" size={48} color={Colors.gray300} />
                                    <Text style={styles.emptyText}>Không tìm thấy ngân hàng</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 10,
    },
    selectButtonError: {
        borderColor: Colors.error,
    },
    selectContent: {
        flex: 1,
    },
    bankName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    bankFullName: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    placeholder: {
        fontSize: 15,
        color: Colors.gray400,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 12,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: Spacing.md,
        fontSize: 15,
        color: Colors.text,
    },
    resultCount: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    // Bank Item
    bankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    bankItemSelected: {
        backgroundColor: Colors.primary + '10',
    },
    bankItemContent: {
        flex: 1,
    },
    bankItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    bankItemNameSelected: {
        color: Colors.primary,
    },
    bankItemFullName: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    // Empty
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing['2xl'],
    },
    emptyText: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
    },
});

export default BankPicker;
