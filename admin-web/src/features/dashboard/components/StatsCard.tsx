import React from 'react';
import { Card, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

interface StatsCardProps {
    title: string;
    value: number | string;
    prefix?: React.ReactNode;
    suffix?: string;
    trend?: number;
    loading?: boolean;
    color?: string;
    sparklineData?: number[];
}

const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    prefix,
    suffix,
    trend,
    loading = false,
    color,
    sparklineData,
}) => {
    const lineColor = color || '#3b82f6';
    const points = (sparklineData && sparklineData.length > 1)
        ? sparklineData
        : [2, 3, 3, 4, 3, 5, 4];
    const min = Math.min(...points);
    const max = Math.max(...points);
    const normalized = points.map((p) => max === min ? 0.5 : (p - min) / (max - min));
    const width = 120;
    const height = 28;
    const path = normalized.map((v, i) => {
        const x = (i / (normalized.length - 1)) * width;
        const y = height - v * height;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
        <Card bordered={false} loading={loading}>
            <Statistic
                title={title}
                value={value}
                prefix={prefix}
                suffix={suffix}
                valueStyle={{ color: lineColor }}
            />
            <div style={{ marginTop: 8 }}>
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                    <path d={path} fill="none" stroke={lineColor} strokeWidth="2" />
                </svg>
            </div>
            {trend !== undefined && (
                <div style={{ marginTop: 8 }}>
                    {trend >= 0 ? (
                        <span style={{ color: '#3f8600' }}>
                            <ArrowUpOutlined /> {trend}%
                        </span>
                    ) : (
                        <span style={{ color: '#cf1322' }}>
                            <ArrowDownOutlined /> {Math.abs(trend)}%
                        </span>
                    )}
                    <span style={{ marginLeft: 8, color: '#999' }}>so với tháng trước</span>
                </div>
            )}
        </Card>
    );
};

export default StatsCard;
