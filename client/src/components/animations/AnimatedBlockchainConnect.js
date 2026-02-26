import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withRepeat,
    withTiming,
    withSequence,
    withDelay,
    Easing,
    useAnimatedStyle,
} from 'react-native-reanimated';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const AnimatedBlockchainConnect = ({
    width = 200,
    height = 100,
    nodeColor = '#5856D6', // Tím
    lineColor = '#E5E5EA',
    activeLineColor = '#007AFF', // Xanh dương
    nodeRadius = 15,
    strokeWidth = 4,
}) => {
    // Khoảng cách giữa 2 node
    const startX = nodeRadius + 10;
    const endX = width - nodeRadius - 10;
    const y = height / 2;

    // Animation values
    const progress = useSharedValue(0);
    const leftNodeScale = useSharedValue(1);
    const rightNodeScale = useSharedValue(1);

    useEffect(() => {
        // 1. Hiệu ứng đường thẳng chạy từ trái sang phải liên tục
        progress.value = withRepeat(
            withTiming(1, {
                duration: 1500,
                easing: Easing.inOut(Easing.ease),
            }),
            -1, // Lặp vô hạn
            false // Không chạy ngược lại
        );

        // 2. Hiệu ứng nhịp đập (pulse) cho các Node
        const pulseAnimation = () =>
            withSequence(
                withTiming(1.3, { duration: 300, easing: Easing.out(Easing.ease) }),
                withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) })
            );

        // Node trái đập trước
        leftNodeScale.value = withRepeat(
            withSequence(pulseAnimation(), withDelay(900, withTiming(1, { duration: 0 }))),
            -1,
            false
        );

        // Node phải đập sau (khi tia sáng tới nơi)
        rightNodeScale.value = withRepeat(
            withSequence(withDelay(1200, pulseAnimation()), withTiming(1, { duration: 0 })),
            -1,
            false
        );
    }, [progress, leftNodeScale, rightNodeScale]);

    // Độ dài đường nối
    const lineLength = endX - startX;

    const animatedLineProps = useAnimatedProps(() => {
        // Dash array: nét đứt dài bằng 30% đường, khoảng trống bằng 100% đường
        // Dash offset: dịch chuyển từ phải sang trái
        const dashLength = lineLength * 0.3;
        const gapLength = lineLength;
        const offset = lineLength - lineLength * progress.value * 1.5; // Xuyên suốt và trượt ra ngoài

        return {
            strokeDasharray: `${dashLength}, ${gapLength}`,
            strokeDashoffset: offset,
        };
    });

    const leftNodeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: leftNodeScale.value }],
    }));

    const rightNodeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: rightNodeScale.value }],
    }));

    return (
        <View style={[styles.container, { width, height }]}>
            <Svg width={width} height={height}>
                <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={activeLineColor} stopOpacity="0" />
                        <Stop offset="0.5" stopColor={activeLineColor} stopOpacity="1" />
                        <Stop offset="1" stopColor={activeLineColor} stopOpacity="0" />
                    </LinearGradient>
                </Defs>

                {/* Nền đường nối */}
                <Line
                    x1={startX}
                    y1={y}
                    x2={endX}
                    y2={y}
                    stroke={lineColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />

                {/* Đường nối đang chạy (Animated) */}
                <AnimatedLine
                    x1={startX}
                    y1={y}
                    x2={endX}
                    y2={y}
                    stroke="url(#grad)" // Dùng Gradient để làm hiệu ứng dải sáng (beam)
                    strokeWidth={strokeWidth + 2} // Làm sáng và to hơn viền mờ
                    strokeLinecap="round"
                    animatedProps={animatedLineProps}
                />
            </Svg>

            {/* Node trái - Đặt tuyệt đối chồng lên SVG */}
            <Animated.View
                style={[
                    styles.node,
                    {
                        left: startX - nodeRadius,
                        top: y - nodeRadius,
                        width: nodeRadius * 2,
                        height: nodeRadius * 2,
                        borderRadius: nodeRadius,
                        backgroundColor: nodeColor,
                    },
                    leftNodeStyle,
                ]}
            />

            {/* Node phải */}
            <Animated.View
                style={[
                    styles.node,
                    {
                        left: endX - nodeRadius,
                        top: y - nodeRadius,
                        width: nodeRadius * 2,
                        height: nodeRadius * 2,
                        borderRadius: nodeRadius,
                        backgroundColor: nodeColor,
                    },
                    rightNodeStyle,
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    node: {
        position: 'absolute',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 4, // Bóng cho Android
        shadowColor: '#000', // Bóng cho iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
});

export default AnimatedBlockchainConnect;
