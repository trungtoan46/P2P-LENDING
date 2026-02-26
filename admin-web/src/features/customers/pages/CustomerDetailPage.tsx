import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Spin, Typography, message, Tabs } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getUserById, getUserDetails } from '../api';
import { formatCurrency } from '../../../utils/format';
import type { User, UserDetails } from '../../../types';
import dayjs from 'dayjs';

const { Title } = Typography;

const CustomerDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [details, setDetails] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [userData, userDetails] = await Promise.all([
                getUserById(id!),
                getUserDetails(id!)
            ]);
            setUser(userData);
            setDetails(userDetails);
        } catch (error) {
            message.error('Lỗi khi tải thông tin khách hàng');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
    if (!user) return <div>Không tìm thấy khách hàng</div>;

    const baseInfo = (
        <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
            <Descriptions.Item label="Họ tên">{user.fullName || 'Chưa cập nhật'}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{user.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{user.email || 'Chưa cập nhật'}</Descriptions.Item>
            <Descriptions.Item label="Vai trò">
                <Tag color={user.roles?.includes('admin') ? 'red' : 'blue'}>
                    {user.roles?.join(', ').toUpperCase()}
                </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
                <Tag color={user.isActive ? 'green' : 'red'}>
                    {user.isActive ? 'HOẠT ĐỘNG' : 'KHÓA'}
                </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Đã xác thực KYC?">
                <Tag color={user.isKycVerified ? 'green' : 'orange'}>
                    {user.isKycVerified ? 'ĐÃ XÁC THỰC' : 'CHƯA XÁC THỰC'}
                </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tham gia">
                {dayjs(user.createdAt).format('DD/MM/YYYY')}
            </Descriptions.Item>
        </Descriptions>
    );

    const kycInfo = details ? (
        <Descriptions bordered column={1} title="Thông tin KYC" style={{ marginTop: 24 }}>
            <Descriptions.Item label="Số CCCD">{details.ssn || '-'}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">{details.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="Nghề nghiệp">{details.job || '-'}</Descriptions.Item>
            <Descriptions.Item label="Thu nhập">{details.income ? formatCurrency(details.income) : '-'}</Descriptions.Item>
        </Descriptions>
    ) : null;

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                    Quay lại
                </Button>
            </div>

            <Card>
                <div style={{ marginBottom: 24 }}>
                    <Title level={4}>Hồ sơ khách hàng</Title>
                </div>
                {baseInfo}
                {kycInfo}
            </Card>
        </div>
    );
};

export default CustomerDetailPage;
