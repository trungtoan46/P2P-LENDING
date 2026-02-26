import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Badge, List, Spin, Button } from 'antd';
import {
    UserOutlined,
    BankOutlined,
    DollarOutlined,
    FileTextOutlined,
    TeamOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StatsCard, RecentLoansTable } from '../components';
import { getDashboardStats, getRecentLoans, getPendingKycCount } from '../api';
import { formatCurrency } from '../../../utils/format';
import type { DashboardStats, Loan } from '../../../types';
import { ROUTES } from '../../../config/routes';

const { Title } = Typography;

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, loansData, pendingKyc] = await Promise.all([
                    getDashboardStats(),
                    getRecentLoans(5),
                    getPendingKycCount(),
                ]);

                // Cập nhật số KYC chờ duyệt
                if (statsData) {
                    statsData.pendingKyc = pendingKyc;
                }

                setStats(statsData);
                setRecentLoans(loansData);
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 50 }}>
                <Spin size="large" />
            </div>
        );
    }

    const pendingTasks = [
        {
            title: 'KYC chờ duyệt',
            count: stats?.pendingKyc || 0,
            icon: <SafetyCertificateOutlined />,
            color: '#faad14',
            actionText: 'Xử lý ngay',
            onAction: () => navigate(ROUTES.KYC_APPROVAL),
        },
        {
            title: 'Khoản vay chờ duyệt',
            count: stats?.pendingLoans || 0,
            icon: <FileTextOutlined />,
            color: '#1890ff',
            actionText: 'Xử lý ngay',
            onAction: () => navigate(ROUTES.LOAN_REQUESTS),
        },
    ];

    return (
        <div>
            <Title level={4} style={{ marginBottom: 24 }}>Tổng quan</Title>

            {/* Thẻ thống kê */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                        title="Tổng người dùng"
                        value={stats?.totalUsers || 0}
                        prefix={<TeamOutlined />}
                        color="#3b82f6"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                        title="Người vay"
                        value={stats?.totalBorrowers || 0}
                        prefix={<UserOutlined />}
                        color="#22c55e"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                        title="Nhà đầu tư"
                        value={stats?.totalLenders || 0}
                        prefix={<UserOutlined />}
                        color="#3b82f6"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                        title="Tổng dư nợ"
                        value={formatCurrency(stats?.totalOutstanding || 0)}
                        prefix={<DollarOutlined />}
                        color="#eab308"
                    />
                </Col>
            </Row>

            {/* Hàng thứ hai */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                        title="Tổng khoản vay"
                        value={stats?.totalLoans || 0}
                        prefix={<BankOutlined />}
                        color="#3b82f6"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                        title="Khoản vay đang hoạt động"
                        value={stats?.totalActiveLoans || 0}
                        prefix={<BankOutlined />}
                        color="#22c55e"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                        title="Tổng đầu tư"
                        value={stats?.totalInvestments || 0}
                        prefix={<DollarOutlined />}
                        color="#eab308"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false}>
                        <Title level={5} style={{ marginBottom: 16 }}>Công việc chờ xử lý</Title>
                        <List
                            size="small"
                            dataSource={pendingTasks}
                            renderItem={(item) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="action"
                                            type="primary"
                                            size="small"
                                            onClick={item.onAction}
                                        >
                                            {item.actionText}
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={<span style={{ color: item.color, fontSize: 20, display: 'flex', alignItems: 'center' }}>{item.icon}</span>}
                                        title={
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span>{item.title}</span>
                                                <Badge count={item.count} style={{ backgroundColor: item.color }} />
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Khoản vay gần đây */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24}>
                    <RecentLoansTable loans={recentLoans} loading={loading} />
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;
