import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    Animated,
    Platform,
    Dimensions,
    ActionSheetIOS,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing } from '../../constants';
import { EkycApi } from '../../api/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Các bước eKYC
const STEPS = {
    INTRO: 0,
    FRONT_ID: 1,
    BACK_ID: 2,
    FACE_DETECTION: 3,
    PROCESSING: 3.5,
    RESULT: 4,
};

// Số ảnh cần chụp cho face detection
const REQUIRED_PHOTOS = 3;
const COUNTDOWN_SECONDS = 3;
const CAPTURE_INTERVAL = 1500; // ms giữa các lần chụp

const EkycScreen = ({ navigation }) => {
    const [step, setStep] = useState(STEPS.INTRO);
    const [loading, setLoading] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const [showCamera, setShowCamera] = useState(false);

    // Dữ liệu thu thập
    const [frontIdUri, _setFrontIdUri] = useState(null);
    const [backIdUri, _setBackIdUri] = useState(null);
    const [portraitUris, setPortraitUris] = useState([]);
    const [ocrResult, _setOcrResult] = useState(null);
    const [ocrBackResult, _setOcrBackResult] = useState(null);
    const [ekycResult, setEkycResult] = useState(null);

    // Refs để tránh stale closure trong async callbacks
    const frontIdUriRef = useRef(null);
    const backIdUriRef = useRef(null);
    const ocrResultRef = useRef(null);
    const ocrBackResultRef = useRef(null);

    // Custom setters để cập nhật cả state và ref
    const setFrontIdUri = (val) => {
        console.log('[DEBUG] setFrontIdUri:', val);
        frontIdUriRef.current = val;
        _setFrontIdUri(val);
    };
    const setBackIdUri = (val) => {
        backIdUriRef.current = val;
        _setBackIdUri(val);
    };
    const setOcrResult = (val) => {
        console.log('[DEBUG] setOcrResult:', !!val);
        ocrResultRef.current = val;
        _setOcrResult(val);
    };
    const setOcrBackResult = (val) => {
        ocrBackResultRef.current = val;
        _setOcrBackResult(val);
    };

    // Face detection với countdown
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [captureProgress, setCaptureProgress] = useState(0);
    const [detectionStatus, setDetectionStatus] = useState('waiting'); // waiting, countdown, capturing, success
    const countdownRef = useRef(null);
    const captureRef = useRef(null);

    // Animation
    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Animate progress bar
        Animated.timing(progressAnim, {
            toValue: step / 4,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [step]);

    useEffect(() => {
        // Pulse animation cho capture button
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    // Cleanup intervals khi unmount
    useEffect(() => {
        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (captureRef.current) clearInterval(captureRef.current);
        };
    }, []);

    // Hàm bắt đầu quá trình nhận diện (user bấm button)
    const startFaceDetection = useCallback(() => {
        // Bắt đầu countdown
        setDetectionStatus('countdown');
        setCountdown(COUNTDOWN_SECONDS);

        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    startAutoCapture();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [startAutoCapture]);

    // Hàm auto-capture nhiều ảnh liên tiếp
    const startAutoCapture = useCallback(async () => {
        setDetectionStatus('capturing');
        const photos = [];

        for (let i = 0; i < REQUIRED_PHOTOS; i++) {
            setCaptureProgress(i + 1);
            const uri = await takePicture();
            if (uri) {
                photos.push(uri);
            }
            // Chờ giữa các lần chụp (trừ lần cuối)
            if (i < REQUIRED_PHOTOS - 1) {
                await new Promise(resolve => setTimeout(resolve, CAPTURE_INTERVAL));
            }
        }

        if (photos.length >= REQUIRED_PHOTOS) {
            setPortraitUris(photos);
            setDetectionStatus('success');
            // Chuyển sang xử lý kết quả (bỏ qua liveness)
            setTimeout(() => handleProcessEkyc(photos), 1000);
        } else {
            setDetectionStatus('waiting');
            Alert.alert('Lỗi', 'Không thể chụp đủ ảnh, vui lòng thử lại');
        }
    }, [handleProcessEkyc, takePicture]); // Thêm handleProcessEkyc và takePicture làm dependency

    // Chụp ảnh từ camera
    const takePicture = useCallback(async () => {
        if (!cameraRef.current) return null;
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 1, // Tăng lên max quality để AI detect tốt hơn
                base64: false,
                skipProcessing: false, // Đảm bảo ảnh được xử lý đúng orientation
            });
            console.log('Photo taken:', photo.uri, 'width:', photo.width, 'height:', photo.height);
            return photo.uri;
        } catch (error) {
            console.error('Take picture error:', error);
            return null;
        }
    }, []); // cameraRef stable so [] is fine

    // Chọn ảnh từ thư viện
    const pickImageFromLibrary = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]) {
                return result.assets[0].uri;
            }
            return null;
        } catch (error) {
            console.error('Pick image error:', error);
            return null;
        }
    };

    // Hiển thị lựa chọn chụp hoặc upload
    const showImageOptions = (onImageSelected) => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Hủy', 'Chụp ảnh', 'Chọn từ thư viện'],
                    cancelButtonIndex: 0,
                },
                async (buttonIndex) => {
                    if (buttonIndex === 1) {
                        const uri = await takePicture();
                        if (uri) onImageSelected(uri);
                    } else if (buttonIndex === 2) {
                        const uri = await pickImageFromLibrary();
                        if (uri) onImageSelected(uri);
                    }
                }
            );
        } else {
            Alert.alert(
                'Chọn ảnh CCCD',
                'Bạn muốn chụp ảnh mới hay chọn từ thư viện?',
                [
                    { text: 'Hủy', style: 'cancel' },
                    {
                        text: 'Chụp ảnh',
                        onPress: async () => {
                            const uri = await takePicture();
                            if (uri) onImageSelected(uri);
                        },
                    },
                    {
                        text: 'Chọn từ thư viện',
                        onPress: async () => {
                            const uri = await pickImageFromLibrary();
                            if (uri) onImageSelected(uri);
                        },
                    },
                ]
            );
        }
    };

    // Các hàm handleCaptureFrontId/BackId cũ đã được dọn dẹp, sử dụng processId bên trong renderIdUploadOptions

    // Xử lý face detection
    const handleFaceDetection = async () => {
        setLoading(true);
        setDetectionStatus('detecting');

        try {
            const uri = await takePicture();
            if (!uri) throw new Error('Không thể chụp ảnh');

            const direction = FACE_DIRECTIONS[currentDirection].key;
            const response = await EkycApi.detectFace(uri, direction);

            if (response.success && response.data?.detected) {
                // Lưu ảnh portrait
                setPortraitUris(prev => [...prev, uri]);
                setDetectionStatus('success');

                // Chuyển hướng tiếp theo hoặc hoàn thành
                if (currentDirection < FACE_DIRECTIONS.length - 1) {
                    setTimeout(() => {
                        setCurrentDirection(prev => prev + 1);
                        setDetectionStatus('waiting');
                    }, 1000);
                } else {
                    // Bỏ qua Liveness, chuyển sang xử lý kết quả luôn
                    setTimeout(() => handleProcessEkyc(portraitUris), 1000);
                }
            } else {
                setDetectionStatus('failed');
                setTimeout(() => setDetectionStatus('waiting'), 1500);
            }
        } catch (error) {
            setDetectionStatus('failed');
            setTimeout(() => setDetectionStatus('waiting'), 1500);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessEkyc = useCallback(async (photos) => {
        setStep(STEPS.PROCESSING);
        setLoading(true);

        try {
            const portraitsList = photos || portraitUris;
            const currentFrontIdUri = frontIdUri || frontIdUriRef.current;
            const currentOcrResult = ocrResult || ocrResultRef.current;
            const currentOcrBackResult = ocrBackResult || ocrBackResultRef.current;

            console.log('[DEBUG] Calling processEkyc with:', {
                portraitsCount: portraitsList.length,
                frontIdUri: currentFrontIdUri,
                hasOcrResult: !!currentOcrResult,
                hasOcrBackResult: !!currentOcrBackResult
            });

            if (!currentFrontIdUri) {
                setLoading(false);
                Alert.alert('Thiếu thông tin', 'Không tìm thấy ảnh CCCD mặt trước. Vui lòng chụp lại.');
                setStep(STEPS.FRONT_ID);
                return;
            }

            // Unwrap OCR result để lấy data thật trước khi gửi lên server
            // Client state ocrResult đang là { success: true, data: { idNumber... } }
            // Server cần { idNumber... }
            const cleanOcrFront = currentOcrResult?.data || currentOcrResult;
            const cleanOcrBack = currentOcrBackResult?.data || currentOcrBackResult;

            // Gọi API process hoàn chỉnh
            const response = await EkycApi.processEkyc(
                portraitsList,
                currentFrontIdUri,
                backIdUri || backIdUriRef.current,
                cleanOcrFront,
                cleanOcrBack
            );

            if (response.success) {
                setEkycResult(response.data);
                setStep(STEPS.RESULT);
            } else {
                Alert.alert('Xác thực thất bại', response.message || 'Hệ thống không thể xác minh danh tính');
                setStep(STEPS.FACE_DETECTION);
                setDetectionStatus('waiting');
            }
        } catch (error) {
            console.error('Full process error:', error);
            Alert.alert('Lỗi kết nối', 'Không thể gửi dữ liệu xác thực lên máy chủ');
            setStep(STEPS.FACE_DETECTION);
            setDetectionStatus('waiting');
        } finally {
            setLoading(false);
        }
    }, [portraitUris, frontIdUri, ocrResult, ocrBackResult]);

    // Xử lý liveness
    const handleLiveness = async () => {
        setLoading(true);
        setStep(STEPS.PROCESSING);

        try {
            // Chụp thêm 1 ảnh cuối
            const uri = await takePicture();
            if (uri) {
                setPortraitUris(prev => [...prev, uri]);
            }

            // Gọi API liveness
            const response = await EkycApi.verifyLiveness(
                [...portraitUris, uri].filter(Boolean),
                frontIdUri
            );

            if (response.success) {
                setEkycResult(response.data);
                setStep(STEPS.RESULT);
            } else {
                Alert.alert('Lỗi', 'Xác thực không thành công');
                setStep(STEPS.FACE_DETECTION);
            }
        } catch (error) {
            Alert.alert('Lỗi', error.message);
            setStep(STEPS.FACE_DETECTION);
        } finally {
            setLoading(false);
        }
    };

    // Render header
    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                    if (step === STEPS.INTRO) {
                        navigation.goBack();
                    } else if (step > STEPS.INTRO && step < STEPS.PROCESSING) {
                        setStep(prev => prev - 1);
                    }
                }}
            >
                <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Xác thực eKYC</Text>

            <View style={styles.headerRight} />
        </View>
    );

    // Render progress bar
    const renderProgress = () => (
        <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
                <Animated.View
                    style={[
                        styles.progressFill,
                        {
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        }
                    ]}
                />
            </View>
            <Text style={styles.progressText}>
                Bước {Math.min(Math.floor(step), 4)}/4
            </Text>
        </View>
    );

    // Render intro step
    const renderIntro = () => (
        <View style={styles.introContainer}>
            <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={styles.introIcon}
            >
                <MaterialCommunityIcons name="shield-check" size={60} color="#fff" />
            </LinearGradient>

            <Text style={styles.introTitle}>Xác thực danh tính</Text>
            <Text style={styles.introSubtitle}>
                Hoàn tất xác thực để sử dụng đầy đủ tính năng
            </Text>

            <View style={styles.stepsList}>
                {[
                    { icon: 'card-account-details', text: 'Chụp CCCD mặt trước' },
                    { icon: 'card-account-details-outline', text: 'Chụp CCCD mặt sau' },
                    { icon: 'face-recognition', text: 'Nhận diện khuôn mặt' },
                    { icon: 'check-decagram', text: 'Xem kết quả xác thực' },
                ].map((item, index) => (
                    <View key={index} style={styles.stepItem}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <MaterialCommunityIcons name={item.icon} size={24} color={Colors.primary} />
                        <Text style={styles.stepText}>{item.text}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={styles.startButton}
                onPress={async () => {
                    if (!permission?.granted) {
                        const result = await requestPermission();
                        if (!result.granted) {
                            Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền camera để tiếp tục');
                            return;
                        }
                    }
                    setStep(STEPS.FRONT_ID);
                }}
            >
                <LinearGradient
                    colors={[Colors.primary, '#1E40AF']}
                    style={styles.startButtonGradient}
                >
                    <Text style={styles.startButtonText}>Bắt đầu xác thực</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );

    // Render ID upload options (không hiển thị camera ngay)
    const renderIdUploadOptions = (title, subtitle, type = 'front') => {
        const isFront = type === 'front';
        const currentUri = isFront ? frontIdUri : backIdUri;

        const handleTakePicture = async () => {
            if (!permission?.granted) {
                const result = await requestPermission();
                if (!result.granted) {
                    Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền camera để tiếp tục');
                    return;
                }
            }
            setShowCamera(true);
        };

        const handlePickImage = async () => {
            const uri = await pickImageFromLibrary();
            if (uri) {
                await processId(uri, type);
            }
        };

        const processId = async (uri, idType) => {
            setLoading(true);
            try {
                if (idType === 'front') {
                    setFrontIdUri(uri);
                    const response = await EkycApi.ocrFrontId(uri);
                    if (response.success) {
                        setOcrResult(response.data);
                        setStep(STEPS.BACK_ID);
                    } else {
                        Alert.alert('Lỗi', response.data?.message || 'Không thể đọc CCCD');
                    }
                } else {
                    setBackIdUri(uri);
                    const response = await EkycApi.ocrBackId(uri);
                    if (response.success) {
                        setOcrBackResult(response.data);
                        setStep(STEPS.FACE_DETECTION);
                    } else {
                        Alert.alert('Lỗi', response.data?.message || 'Không thể đọc CCCD');
                    }
                }
            } catch (error) {
                Alert.alert('Lỗi', error.message);
            } finally {
                setLoading(false);
                setShowCamera(false);
            }
        };

        // Nếu đang hiển thị camera
        if (showCamera) {
            return (
                <View style={styles.cameraContainer}>
                    <View style={styles.cameraWrapper}>
                        <CameraView
                            ref={cameraRef}
                            style={styles.camera}
                            facing="back"
                        />
                        <View style={styles.cameraOverlay}>
                            <View style={styles.cardFrame}>
                                <View style={[styles.corner, styles.cornerTL]} />
                                <View style={[styles.corner, styles.cornerTR]} />
                                <View style={[styles.corner, styles.cornerBL]} />
                                <View style={[styles.corner, styles.cornerBR]} />
                            </View>
                        </View>
                    </View>

                    <View style={styles.cameraControls}>
                        <Text style={styles.cameraTitle}>{title}</Text>
                        <Text style={styles.cameraSubtitle}>{subtitle}</Text>

                        <View style={styles.cameraButtonsRow}>
                            <TouchableOpacity
                                style={styles.cancelCameraButton}
                                onPress={() => setShowCamera(false)}
                            >
                                <MaterialCommunityIcons name="close" size={24} color="#fff" />
                            </TouchableOpacity>

                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                <TouchableOpacity
                                    style={styles.captureButton}
                                    onPress={async () => {
                                        const uri = await takePicture();
                                        if (uri) {
                                            await processId(uri, type);
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="large" />
                                    ) : (
                                        <View style={styles.captureButtonInner} />
                                    )}
                                </TouchableOpacity>
                            </Animated.View>

                            <View style={{ width: 50 }} />
                        </View>
                    </View>
                </View>
            );
        }

        // Hiển thị options chọn ảnh
        return (
            <View style={styles.uploadContainer}>
                <View style={styles.uploadIconContainer}>
                    <MaterialCommunityIcons
                        name={isFront ? 'card-account-details' : 'card-account-details-outline'}
                        size={80}
                        color={Colors.primary}
                    />
                </View>

                <Text style={styles.uploadTitle}>{title}</Text>
                <Text style={styles.uploadSubtitle}>{subtitle}</Text>

                {/* Preview nếu đã có ảnh */}
                {currentUri && (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: currentUri }} style={styles.previewImage} />
                    </View>
                )}

                <View style={styles.uploadButtons}>
                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={handleTakePicture}
                        disabled={loading}
                    >
                        <MaterialCommunityIcons name="camera" size={28} color="#fff" />
                        <Text style={styles.uploadButtonText}>Chụp ảnh</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.uploadButton, styles.uploadButtonSecondary]}
                        onPress={handlePickImage}
                        disabled={loading}
                    >
                        <MaterialCommunityIcons name="image" size={28} color={Colors.primary} />
                        <Text style={[styles.uploadButtonText, styles.uploadButtonTextSecondary]}>
                            Chọn từ thư viện
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>Đang xử lý...</Text>
                    </View>
                )}
            </View>
        );
    };

    // Render face detection step với auto-capture
    const renderFaceDetection = () => {
        return (
            <View style={styles.cameraContainer}>
                <View style={styles.cameraWrapper}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing="front"
                    />

                    <View style={styles.cameraOverlay}>
                        <View style={[
                            styles.faceFrame,
                            detectionStatus === 'success' && styles.faceFrameSuccess,
                            detectionStatus === 'capturing' && styles.faceFrameCapturing,
                        ]}>
                            <View style={[
                                styles.faceOval,
                                detectionStatus === 'success' && styles.faceOvalSuccess,
                                detectionStatus === 'capturing' && styles.faceOvalCapturing,
                            ]} />
                        </View>

                        {/* Countdown overlay */}
                        {detectionStatus === 'countdown' && (
                            <View style={styles.countdownOverlay}>
                                <Text style={styles.countdownNumber}>{countdown}</Text>
                            </View>
                        )}

                        {/* Capturing indicator */}
                        {detectionStatus === 'capturing' && (
                            <View style={styles.capturingOverlay}>
                                <ActivityIndicator color="#fff" size="large" />
                                <Text style={styles.capturingText}>
                                    Đang chụp {captureProgress}/{REQUIRED_PHOTOS}
                                </Text>
                            </View>
                        )}

                        {/* Success indicator */}
                        {detectionStatus === 'success' && (
                            <View style={styles.successOverlay}>
                                <MaterialCommunityIcons name="check-circle" size={60} color="#10B981" />
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.cameraControls}>
                    {/* Progress dots */}
                    <View style={styles.directionProgress}>
                        {Array(REQUIRED_PHOTOS).fill(0).map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.directionDot,
                                    index < captureProgress && styles.directionDotComplete,
                                    index === captureProgress && detectionStatus === 'capturing' && styles.directionDotActive,
                                ]}
                            />
                        ))}
                    </View>

                    <Text style={styles.cameraTitle}>Nhận diện khuôn mặt</Text>
                    <Text style={styles.cameraSubtitle}>
                        {detectionStatus === 'waiting'
                            ? 'Đặt khuôn mặt vào khung và nhấn bắt đầu'
                            : detectionStatus === 'countdown'
                                ? 'Giữ khuôn mặt trong khung...'
                                : detectionStatus === 'capturing'
                                    ? 'Đang chụp, giữ nguyên vị trí...'
                                    : 'Hoàn tất!'}
                    </Text>

                    {/* Button bắt đầu - chỉ hiện khi status là waiting */}
                    {detectionStatus === 'waiting' && (
                        <TouchableOpacity
                            style={styles.startDetectionButton}
                            onPress={startFaceDetection}
                        >
                            <MaterialCommunityIcons name="face-recognition" size={24} color="#fff" />
                            <Text style={styles.startDetectionText}>Bắt đầu nhận diện</Text>
                        </TouchableOpacity>
                    )}

                    {/* Hint text */}
                    {detectionStatus === 'waiting' && (
                        <Text style={styles.hintText}>
                            Hệ thống sẽ tự động chụp sau khi bạn nhấn bắt đầu
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    // Render liveness step
    const renderLiveness = () => (
        <View style={styles.cameraContainer}>
            <View style={styles.cameraWrapper}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="front"
                />

                <View style={styles.cameraOverlay}>
                    <View style={styles.faceFrame}>
                        <View style={styles.faceOval} />
                    </View>
                </View>
            </View>

            <View style={styles.cameraControls}>
                <Text style={styles.cameraTitle}>Xác thực liveness</Text>
                <Text style={styles.cameraSubtitle}>
                    Giữ khuôn mặt trong khung và nhấn nút để hoàn tất
                </Text>

                <TouchableOpacity
                    style={styles.captureButton}
                    onPress={handleLiveness}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="large" />
                    ) : (
                        <MaterialCommunityIcons name="check-circle" size={32} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render processing step
    const renderProcessing = () => (
        <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.processingTitle}>Đang xử lý...</Text>
            <Text style={styles.processingSubtitle}>
                Vui lòng chờ trong giây lát
            </Text>
        </View>
    );

    // Render result step
    const renderResult = () => {
        console.log('[DEBUG] ekycResult in renderResult:', JSON.stringify(ekycResult, null, 2));

        const resultData = ekycResult?.data || ekycResult || {};

        const matchScoreRaw = resultData.face_matching;

        const isVerified = resultData.isVerified === true || ekycResult?.isVerified === true;
        const isScorePass = typeof matchScoreRaw === 'number' && matchScoreRaw >= 0.7;

        const isSuccess = isVerified || isScorePass;

        let faceMatch = '0';
        if (typeof matchScoreRaw === 'number') {
            faceMatch = (matchScoreRaw * 100).toFixed(0);
        } else if (matchScoreRaw === true) {
            faceMatch = '100';
        }

        const finalOcr = resultData.frontIdOcr || ocrResult;
        console.log('[DEBUG] finalOcr:', JSON.stringify(finalOcr, null, 2));

        const ocrDisplay = finalOcr?.data || finalOcr;

        return (
            <ScrollView style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                    <LinearGradient
                        colors={isSuccess ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
                        style={styles.resultIcon}
                    >
                        <MaterialCommunityIcons
                            name={isSuccess ? 'check-decagram' : 'close-circle'}
                            size={60}
                            color="#fff"
                        />
                    </LinearGradient>

                    <Text style={styles.resultTitle}>
                        {isSuccess ? 'Xác thực thành công!' : 'Xác thực thất bại'}
                    </Text>
                    <Text style={styles.resultSubtitle}>
                        {isSuccess
                            ? 'Thông tin của bạn đang chờ xét duyệt'
                            : 'Vui lòng thử lại'}
                    </Text>
                </View>

                {/* OCR Result */}
                {ocrDisplay && (
                    <View style={styles.resultCard}>
                        <Text style={styles.resultCardTitle}>Thông tin CCCD</Text>
                        {ocrDisplay.idNumber && (
                            <ResultRow label="Số CCCD" value={ocrDisplay.idNumber} />
                        )}
                        {ocrDisplay.fullName && (
                            <ResultRow label="Họ tên" value={ocrDisplay.fullName} />
                        )}
                        {ocrDisplay.dob && (
                            <ResultRow label="Ngày sinh" value={ocrDisplay.dob} />
                        )}
                        {ocrDisplay.gender && (
                            <ResultRow label="Giới tính" value={ocrDisplay.gender} />
                        )}
                        {ocrDisplay.address && (
                            <ResultRow label="Địa chỉ" value={ocrDisplay.address} />
                        )}
                    </View>
                )}

                {/* Matching score */}
                <View style={styles.resultCard}>
                    <Text style={styles.resultCardTitle}>Kết quả xác thực</Text>
                    <ResultRow
                        label="Liveness"
                        value={isSuccess ? 'Đạt' : 'Không đạt'}
                        valueColor={isSuccess ? '#10B981' : '#EF4444'}
                    />
                    <ResultRow
                        label="Độ khớp khuôn mặt"
                        value={`${faceMatch}%`}
                        valueColor={parseInt(faceMatch) > 70 ? '#10B981' : '#EF4444'}
                    />
                </View>

                <TouchableOpacity
                    style={styles.finishButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.finishButtonText}>Hoàn tất</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    };

    // Main render
    return (
        <LinearGradient
            colors={['#1E3A8A', '#3730A3', '#4F46E5']}
            style={styles.container}
        >
            {renderHeader()}
            {step > STEPS.INTRO && step < STEPS.RESULT && renderProgress()}

            {step === STEPS.INTRO && renderIntro()}
            {step === STEPS.FRONT_ID && renderIdUploadOptions(
                'Chụp CCCD mặt trước',
                'Chọn ảnh hoặc chụp mới để quét thông tin',
                'front'
            )}
            {step === STEPS.BACK_ID && renderIdUploadOptions(
                'Chụp CCCD mặt sau',
                'Chọn ảnh hoặc chụp mới để quét thông tin',
                'back'
            )}
            {step === STEPS.FACE_DETECTION && renderFaceDetection()}

            {/* Liveness step removed */}
            {step === STEPS.PROCESSING && renderProcessing()}
            {step === STEPS.RESULT && renderResult()}
        </LinearGradient>
    );
};

// Component ResultRow
const ResultRow = ({ label, value, valueColor }) => (
    <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>{label}</Text>
        <Text style={[styles.resultValue, valueColor && { color: valueColor }]}>
            {value}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    headerRight: {
        width: 40,
    },
    progressContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    progressTrack: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 2,
    },
    progressText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    // Intro styles
    introContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    introIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    introTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
    },
    introSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginBottom: 40,
    },
    stepsList: {
        width: '100%',
        marginBottom: 40,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepNumberText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepText: {
        color: '#fff',
        fontSize: 15,
        marginLeft: 12,
        flex: 1,
    },
    startButton: {
        width: '100%',
    },
    startButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    // Camera styles
    cameraContainer: {
        flex: 1,
    },
    cameraWrapper: {
        flex: 1,
        marginHorizontal: 20,
        marginTop: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardFrame: {
        width: SCREEN_WIDTH - 80,
        height: (SCREEN_WIDTH - 80) * 0.63,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: Colors.primary,
        borderWidth: 4,
    },
    cornerTL: {
        top: -2,
        left: -2,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderTopLeftRadius: 12,
    },
    cornerTR: {
        top: -2,
        right: -2,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        borderTopRightRadius: 12,
    },
    cornerBL: {
        bottom: -2,
        left: -2,
        borderRightWidth: 0,
        borderTopWidth: 0,
        borderBottomLeftRadius: 12,
    },
    cornerBR: {
        bottom: -2,
        right: -2,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderBottomRightRadius: 12,
    },
    faceFrame: {
        width: 250,
        height: 320,
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceFrameSuccess: {
        borderColor: '#10B981',
    },
    faceFrameFailed: {
        borderColor: '#EF4444',
    },
    faceOval: {
        width: 220,
        height: 280,
        borderRadius: 110,
        borderWidth: 3,
        borderColor: '#fff',
        borderStyle: 'dashed',
    },
    faceOvalSuccess: {
        borderColor: '#10B981',
        borderStyle: 'solid',
    },
    faceOvalFailed: {
        borderColor: '#EF4444',
    },
    directionIndicator: {
        position: 'absolute',
        bottom: 40,
        alignItems: 'center',
    },
    directionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
    },
    cameraControls: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        alignItems: 'center',
    },
    cameraTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    cameraSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 20,
        textAlign: 'center',
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    captureButtonInner: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#fff',
    },
    captureButtonSuccess: {
        backgroundColor: '#10B981',
    },
    directionProgress: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    directionDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    directionDotComplete: {
        backgroundColor: '#10B981',
    },
    directionDotActive: {
        backgroundColor: Colors.primary,
        width: 24,
    },
    // Countdown overlay
    countdownOverlay: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    countdownNumber: {
        fontSize: 120,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 10,
    },
    // Capturing overlay
    capturingOverlay: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    capturingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    // Success overlay
    successOverlay: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Face frame capturing state
    faceFrameCapturing: {
        borderColor: Colors.primary,
    },
    faceOvalCapturing: {
        borderColor: Colors.primary,
        borderStyle: 'solid',
    },
    // Hint text
    hintText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginTop: 10,
    },
    // Start detection button
    startDetectionButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 20,
    },
    startDetectionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // Processing
    processingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    processingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 20,
    },
    processingSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
    },
    // Result
    resultContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: 20,
    },
    resultHeader: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    resultIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    resultSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
    resultCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    resultCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    resultLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    resultValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    finishButton: {
        backgroundColor: Colors.primary,
        marginHorizontal: 20,
        marginVertical: 20,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    finishButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // Upload options styles
    uploadContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    uploadIconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    uploadTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    uploadSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginBottom: 30,
    },
    uploadButtons: {
        width: '100%',
        gap: 16,
    },
    uploadButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    uploadButtonSecondary: {
        backgroundColor: '#fff',
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    uploadButtonTextSecondary: {
        color: Colors.primary,
    },
    previewContainer: {
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
    },
    previewImage: {
        width: 200,
        height: 130,
        borderRadius: 12,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 12,
        fontSize: 14,
    },
    cameraButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
    },
    cancelCameraButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default EkycScreen;
