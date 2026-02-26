import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    withDelay,
    withSpring,
    Easing,
    useAnimatedStyle,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const AnimatedCheckmark = ({
    size = 100,
    strokeWidth = 8,
    color = '#4CAF50', // Mặc định màu xanh lá
    duration = 800,
    show = true, // Kích hoạt hiệu ứng
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // Chiều dài gần đúng của dấu checkmark
    const checkmarkLength = size * 1.5;

    const circleProgress = useSharedValue(0);
    const checkProgress = useSharedValue(0);
    const scale = useSharedValue(0);

    useEffect(() => {
        if (show) {
            // 1. Phóng to & Hiện vòng tròn
            scale.value = withSpring(1, { damping: 12, stiffness: 100 });
            circleProgress.value = withTiming(1, {
                duration: duration / 2,
                easing: Easing.inOut(Easing.ease),
            });

            // 2. Vẽ dấu checkmark sau khi vòng tròn vè được một nửa
            checkProgress.value = withDelay(
                duration / 3,
                withTiming(1, {
                    duration: duration / 2,
                    easing: Easing.out(Easing.exp),
                })
            );
        } else {
            // Reset khi ẩn
            circleProgress.value = 0;
            checkProgress.value = 0;
            scale.value = 0;
        }
    }, [show, duration, circleProgress, checkProgress, scale]);

    const animatedCircleProps = useAnimatedProps(() => {
        const strokeDashoffset = circumference - circumference * circleProgress.value;
        return {
            strokeDashoffset,
        };
    });

    const animatedCheckProps = useAnimatedProps(() => {
        const strokeDashoffset = checkmarkLength - checkmarkLength * checkProgress.value;
        return {
            strokeDashoffset,
        };
    });

    const animatedContainerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    // Tọa độ dấu check (scale theo size)
    const d = `M${size * 0.25} ${size * 0.5} L${size * 0.45} ${size * 0.7} L${size * 0.75} ${size * 0.35}`;

    return (
        <Animated.View style={[styles.container, { width: size, height: size }, animatedContainerStyle]}>
            <Svg width={size} height={size}>
                {/* Vòng tròn bên ngoài */}
                <AnimatedCircle
                    stroke={color}
                    fill="none"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    animatedProps={animatedCircleProps}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
                {/* Dấu Checkmark */}
                <AnimatedPath
                    d={d}
                    stroke={color}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={checkmarkLength}
                    animatedProps={animatedCheckProps}
                />
            </Svg>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default AnimatedCheckmark;
