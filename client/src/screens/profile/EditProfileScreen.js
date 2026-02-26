import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks';
import { Colors } from '../../constants';
import UserApi from '../../api/services/UserApi';

const EditProfileScreen = ({ navigation }) => {
    const { user, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        job: '',
        income: '',
        city: '',
        address: ''
    });

    useEffect(() => {
        if (user && user.details) {
            setFormData({
                email: user.email || user.details.email || '',
                job: user.details.job || '',
                income: user.details.income ? user.details.income.toString() : '',
                city: user.details.city || '',
                address: user.details.address || ''
            });
        }
    }, [user]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        if (!formData.email || !formData.job || !formData.income || !formData.city || !formData.address) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các thông tin');
            return;
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(formData.email)) {
            Alert.alert('Lỗi', 'Email không đúng định dạng');
            return;
        }

        setLoading(true);
        try {
            const dataToUpdate = {
                ...formData,
                income: Number(formData.income)
            };

            const response = await UserApi.updateProfile(dataToUpdate);
            if (response.success) {
                await refreshProfile();
                Alert.alert('Thành công', 'Cập nhật thông tin thành công', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Lỗi', response.message || 'Có lỗi xảy ra khi cập nhật');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ');
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (icon, placeholder, value, field, keyboardType = 'default') => (
        <View style={styles.inputContainer}>
            <MaterialCommunityIcons name={icon} size={24} color={Colors.gray400} style={styles.inputIcon} />
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                value={value}
                onChangeText={(text) => handleChange(field, text)}
                keyboardType={keyboardType}
                placeholderTextColor={Colors.gray400}
            />
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* Header */}
            <LinearGradient
                colors={[Colors.primary, Colors.primaryDark || '#1a56db']}
                style={styles.header}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cập nhật thông tin</Text>
                <View style={styles.headerRight} />
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.formContainer}>
                    <Text style={styles.sectionTitle}>Thông tin liên hệ & Công việc</Text>

                    {renderInput('email-outline', 'Địa chỉ Email', formData.email, 'email', 'email-address')}
                    {renderInput('briefcase-outline', 'Nghề nghiệp', formData.job, 'job')}
                    {renderInput('cash', 'Thu nhập hàng tháng (VND)', formData.income, 'income', 'numeric')}

                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Địa chỉ liên hệ</Text>
                    {renderInput('city', 'Tỉnh/Thành phố', formData.city, 'city')}
                    {renderInput('map-marker-outline', 'Địa chỉ cụ thể (Số nhà, đường...)', formData.address, 'address')}

                    <View style={styles.infoBox}>
                        <MaterialCommunityIcons name="information" size={20} color={Colors.primary} />
                        <Text style={styles.infoText}>
                            Các thông tin như Họ tên, Ngày sinh, Giới tính, CMND/CCCD không thể thay đổi vì đã được xác thực từ ảnh giấy tờ của bạn.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="content-save-outline" size={22} color="#fff" style={styles.saveIcon} />
                            <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 20,
        paddingHorizontal: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    headerRight: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    formContainer: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.gray600,
        marginBottom: 16,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.gray200,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
        height: '100%',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: Colors.primary + '10',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 13,
        color: Colors.gray600,
        lineHeight: 20,
    },
    footer: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: 12,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveIcon: {
        marginRight: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EditProfileScreen;
