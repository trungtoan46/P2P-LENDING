import React, { Component } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableWithoutFeedback
} from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { Colors, Spacing, BorderRadius } from '../../constants';
import { formatNumber } from '../../utils';

class PieChart extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedIndex: null
        };
    }

    handleSegmentPress = (index) => {
        const { selectedIndex } = this.state;

        // Toggle: nếu đang chọn thì bỏ chọn, nếu chưa thì chọn
        if (selectedIndex === index) {
            this.setState({ selectedIndex: null });
        } else {
            this.setState({ selectedIndex: index });
        }
    }

    // Tạo path SVG cho segment của pie chart
    createPiePath(startAngle, endAngle, radius, centerX, centerY) {
        const start = this.polarToCartesian(centerX, centerY, radius, endAngle);
        const end = this.polarToCartesian(centerX, centerY, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

        return [
            'M', centerX, centerY,
            'L', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            'Z'
        ].join(' ');
    }

    // Chuyển đổi tọa độ cực sang tọa độ Cartesian
    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    handleChartPress = (event) => {
        // Lấy tọa độ chạm
        const { locationX, locationY } = event.nativeEvent;
        const { data } = this.props;

        if (!data || data.length === 0) return;

        const size = 240;
        const centerX = size / 2;
        const centerY = size / 2;
        const innerRadius = 50;
        const outerRadius = 80;

        // Tính khoảng cách từ center
        const dx = locationX - centerX;
        const dy = locationY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Kiểm tra xem có trong vòng donut không
        if (distance < innerRadius || distance > outerRadius) {
            this.setState({ selectedIndex: null });
            return;
        }

        // Tính góc của điểm chạm
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        angle = (angle + 90 + 360) % 360; // Chuẩn hóa góc từ 0-360, bắt đầu từ 12 giờ

        // Tìm segment tương ứng
        let currentAngle = 0;
        for (let i = 0; i < data.length; i++) {
            if (data[i].percentage <= 0) continue;

            const segmentAngle = (data[i].percentage / 100) * 360;
            const endAngle = currentAngle + segmentAngle;

            if (angle >= currentAngle && angle < endAngle) {
                this.handleSegmentPress(i);
                return;
            }

            currentAngle = endAngle;
        }
    }

    renderPieChart() {
        const { data } = this.props;
        const { selectedIndex } = this.state;

        if (!data || data.length === 0) {
            return null;
        }

        const size = 240;
        const radius = 80;
        const centerX = size / 2;
        const centerY = size / 2;
        const innerRadius = 50;

        let currentAngle = 0;
        const segments = [];

        data.forEach((item, index) => {
            if (item.percentage <= 0) return;

            const angle = (item.percentage / 100) * 360;
            const endAngle = currentAngle + angle;
            const outerPath = this.createPiePath(currentAngle, endAngle, radius, centerX, centerY);

            const isSelected = selectedIndex === index;

            segments.push(
                <G key={`segment-${index}`}>
                    <Path
                        d={outerPath}
                        fill={item.color}
                        stroke={isSelected ? '#fff' : 'transparent'}
                        strokeWidth={isSelected ? 3 : 0}
                        opacity={selectedIndex !== null && !isSelected ? 0.5 : 1}
                    />
                </G>
            );

            currentAngle = endAngle;
        });

        return (
            <View style={styles.chartContainer}>
                <TouchableWithoutFeedback onPress={this.handleChartPress}>
                    <View>
                        <Svg width={size} height={size}>
                            {segments}
                            <Circle
                                cx={centerX}
                                cy={centerY}
                                r={innerRadius}
                                fill={Colors.white}
                            />
                        </Svg>
                    </View>
                </TouchableWithoutFeedback>

                {/* Hiển thị thông tin chi tiết ở center */}
                {this.renderCenterInfo()}
            </View>
        );
    }

    renderCenterInfo() {
        const { data } = this.props;
        const { selectedIndex } = this.state;

        if (selectedIndex === null || !data[selectedIndex]) {
            return (
                <View style={styles.centerInfo} pointerEvents="none">
                    <Text style={styles.centerHint}>Chạm vào</Text>
                    <Text style={styles.centerHint}>biểu đồ</Text>
                </View>
            );
        }

        const selectedItem = data[selectedIndex];

        return (
            <View style={styles.centerInfo} pointerEvents="none">
                <Text style={styles.centerLabel}>{selectedItem.label}</Text>
                <Text style={styles.centerPercentage}>{selectedItem.percentage}%</Text>
                {selectedItem.amount !== undefined && (
                    <Text style={styles.centerAmount}>
                        {formatNumber(selectedItem.amount)}đ
                    </Text>
                )}
            </View>
        );
    }

    renderLegend() {
        const { data } = this.props;
        const { selectedIndex } = this.state;

        if (!data || data.length === 0) {
            return null;
        }

        return (
            <View style={styles.legendContainer}>
                <Text style={styles.legendTitle}>Phân bổ thu nhập tháng này</Text>
                {data.map((item, index) => (
                    <View
                        key={index}
                        style={[
                            styles.legendItem,
                            selectedIndex === index && styles.legendItemSelected
                        ]}
                    >
                        <View style={styles.legendLeft}>
                            <View style={[styles.legendIndicator, { backgroundColor: item.color }]} />
                            <Text style={styles.legendLabel}>{item.label}</Text>
                        </View>
                        <View style={styles.legendRight}>
                            <Text style={styles.legendPercentage}>{item.percentage}%</Text>
                            {item.amount !== undefined && (
                                <Text style={styles.legendAmount}>
                                    {formatNumber(item.amount)}đ
                                </Text>
                            )}
                        </View>
                    </View>
                ))}
            </View>
        );
    }

    render() {
        const { data } = this.props;

        if (!data || data.length === 0) {
            return (
                <View style={styles.container}>
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataTitle}>📊 Chưa có dữ liệu thu nhập</Text>
                        <Text style={styles.noDataText}>Khi bạn đầu tư, biểu đồ sẽ hiển thị ở đây</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.container}>
                {this.renderPieChart()}
                {this.renderLegend()}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        margin: Spacing.md,
        padding: Spacing.md,
        paddingVertical: Spacing.lg,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
        height: 240,
    },
    centerInfo: {
        position: 'absolute',
        width: 100,
        height: 100,
        top: 70,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    centerHint: {
        fontSize: 12,
        color: Colors.gray500,
        textAlign: 'center',
    },
    centerLabel: {
        fontSize: 11,
        color: Colors.textPrimary,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 4,
    },
    centerPercentage: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.primary,
        textAlign: 'center',
        marginBottom: 2,
    },
    centerAmount: {
        fontSize: 10,
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    legendContainer: {
        width: '100%',
    },
    legendTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        borderRadius: 5,
    },
    legendItemSelected: {
        backgroundColor: '#f8f8f8',
    },
    legendLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    legendRight: {
        alignItems: 'flex-end',
        marginLeft: Spacing.md,
    },
    legendIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: Spacing.xs,
    },
    legendLabel: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
    },
    legendPercentage: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
    },
    legendAmount: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    noDataContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noDataTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    noDataText: {
        fontSize: 14,
        color: Colors.gray500,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default PieChart;
