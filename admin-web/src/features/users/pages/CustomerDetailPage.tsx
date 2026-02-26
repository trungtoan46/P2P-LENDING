import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Spin, Typography, message, Statistic, Row, Col, Space } from 'antd';
import { ArrowLeftOutlined, WalletOutlined } from '@ant-design/icons';
import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { getUserById, getUserDetails } from '../api';
import { getUserBalance, getTransactions } from '../../finance/api';
import { formatCurrency } from '../../../utils/format';
import { TransactionType, PaymentStatus } from '../../../config/enums';
import type { User, UserDetails, Transaction } from '../../../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
    [PaymentStatus.PENDING]: 'gold',
    [PaymentStatus.PROCESSING]: 'blue',
    [PaymentStatus.COMPLETED]: 'green',
    [PaymentStatus.FAILED]: 'red',
    [PaymentStatus.CANCELLED]: 'default',
};

const statusLabels: Record<string, string> = {
    [PaymentStatus.PENDING]: 'Chờ xử lý',
    [PaymentStatus.PROCESSING]: 'Đang xử lý',
    [PaymentStatus.COMPLETED]: 'Hoàn thành',
    [PaymentStatus.FAILED]: 'Thất bại',
    [PaymentStatus.CANCELLED]: 'Đã hủy',
};

const CustomerDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [details, setDetails] = useState<UserDetails | null>(null);
    const [wallet, setWallet] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [userData, userDetails, walletData] = await Promise.all([
                getUserById(id!),
                getUserDetails(id!),
                getUserBalance(id!)
            ]);
            setUser(userData);
            setDetails(userDetails);
            setWallet(walletData);
        } catch (error) {
            message.error('Lỗi khi tải thông tin khách hàng');
        } finally {
            setLoading(false);
        }
    };

    const transactionColumns: ProColumns<Transaction>[] = [
        {
            title: 'Mã GD',
            dataIndex: '_id',
            key: '_id',
            width: 100,
            render: (_: any, record) => <Text code>#{record._id.slice(-8).toUpperCase()}</Text>,
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            width: 120,
            valueType: 'select',
            valueEnum: {
                [TransactionType.DEPOSIT]: 'Nạp tiền',
                [TransactionType.WITHDRAW]: 'Rút tiền',
                [TransactionType.INVESTMENT]: 'Đầu tư',
                [TransactionType.REPAYMENT]: 'Trả nợ',
                [TransactionType.SETTLEMENT]: 'Nhận thanh toán',
                [TransactionType.FEE]: 'Phí hệ thống',
            },
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            width: 140,
            render: (_: any, record) => {
                const isOut = [TransactionType.WITHDRAW, TransactionType.INVESTMENT, TransactionType.REPAYMENT, TransactionType.FEE].includes(record.type as any);
                return (
                    <Text style={{ color: isOut ? '#f5222d' : '#52c41a', fontWeight: 'bold' }}>
                        {isOut ? '-' : '+'}{formatCurrency(record.amount)}
                    </Text>
                );
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 120,
            render: (_: any, record) => (
                <Tag color={statusColors[record.status] || 'default'}>
                    {statusLabels[record.status] || record.status}
                </Tag>
            ),
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            ellipsis: true,
        },
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            width: 160,
            valueType: 'dateTime',
        },
    ];

    if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
    if (!user) return <div>Không tìm thấy khách hàng</div>;

    const baseInfo = (
        <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
            <Descriptions.Item label="Họ tên">{(user as any).fullName || 'Chưa cập nhật'}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{user.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{(user as any).email || 'Chưa cập nhật'}</Descriptions.Item>
            <Descriptions.Item label="Vai trò">
                <Tag color={(user as any).roles?.includes('admin') ? 'red' : 'blue'}>
                    {(user as any).roles?.join(', ').toUpperCase()}
                </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
                <Tag color={user.isActive ? 'green' : 'red'}>
                    {user.isActive ? 'HOẠT ĐỘNG' : 'KHÓA'}
                </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Đã xác thực KYC?">
                <Tag color={(user as any).isKycVerified ? 'green' : 'orange'}>
                    {(user as any).isKycVerified ? 'ĐÃ XÁC THỰC' : 'CHƯA XÁC THỰC'}
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
        <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
            <div style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                    Quay lại
                </Button>
            </div>

            <Row gutter={[16, 16]}>
                <Col span={18}>
                    <Card title={<Title level={4} style={{ margin: 0 }}>Hồ sơ khách hàng</Title>}>
                        {baseInfo}
                        {kycInfo}
                    </Card>
                </Col>
                <Col span={6}>
                    <Card title={<Space><WalletOutlined /> Số dư ví</Space>}>
                        {wallet ? (
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <Statistic
                                    title="Khả dụng"
                                    value={wallet.availableBalance}
                                    suffix="₫"
                                    valueStyle={{ color: '#3f8600' }}
                                />
                                <Descriptions column={1} size="small">
                                    <Descriptions.Item label="Tổng dư">
                                        {formatCurrency(wallet.balance)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Đang đóng băng">
                                        {formatCurrency(wallet.frozenBalance)}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Space>
                        ) : (
                            <Text type="secondary">Chưa có thông tin ví</Text>
                        )}
                    </Card>
                </Col>
            </Row>

            <Card title="Lịch sử giao dịch">
                <ProTable<Transaction>
                    columns={transactionColumns}
                    params={{ userId: id }}
                    request={async (params) => {
                        const data = await getTransactions({
                            ...params,
                            userId: id,
                            page: params.current,
                        });
                        return {
                            data,
                            success: true,
                        };
                    }}
                    rowKey="_id"
                    search={false}
                    options={{
                        density: true,
                        fullScreen: false,
                        setting: true,
                        reload: true,
                    }}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total, range) => `${range[0]}-${range[1]} trên ${total} kết quả`,
                    }}
                    dateFormatter="string"
                />
            </Card>
        </Space>
    );
};

export default CustomerDetailPage;
