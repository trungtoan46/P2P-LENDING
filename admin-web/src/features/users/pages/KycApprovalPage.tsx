import React, { useEffect, useState } from 'react';
import {
    Table,
    Card,
    Button,
    Space,
    Typography,
    Modal,
    Image,
    Descriptions,
    message,
    Input,
    Tag,
} from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getPendingKycUsers, approveKyc, rejectKyc } from '../api';
import { formatCurrency } from '../../../utils/format';
import type { UserDetails } from '../../../types';
import dayjs from 'dayjs';
import { FILE_BASE_URL } from '../../../config';

const { Title, Text } = Typography;
const { TextArea } = Input;

const getImageUrl = (path: string | null) => {
    if (!path) return '';
    if (path.startsWith('data:image')) return path; // Hỗ trợ Base64 từ DB
    if (path.startsWith('http')) return path;

    // Xử lý đường dẫn tệp tin cũ
    const normalizedPath = path.replace(/\\/g, '/');
    return `${FILE_BASE_URL}/${normalizedPath}`;
};

const KycApprovalPage: React.FC = () => {
    const [users, setUsers] = useState<UserDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchPendingKyc = async () => {
        setLoading(true);
        try {
            const data = await getPendingKycUsers();
            setUsers(data);
        } catch (error) {
            message.error('Lỗi khi tải danh sách KYC');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingKyc();
    }, []);

    const handleApprove = async (user: UserDetails) => {
        setActionLoading(true);
        const success = await approveKyc(user.userId);
        setActionLoading(false);
        if (success) {
            message.success('Đã duyệt KYC thành công');
            setDetailModalOpen(false);
            fetchPendingKyc();
        } else {
            message.error('Lỗi khi duyệt KYC');
        }
    };

    const handleReject = async () => {
        if (!selectedUser || !rejectReason.trim()) {
            message.warning('Vui lòng nhập lý do từ chối');
            return;
        }
        setActionLoading(true);
        const success = await rejectKyc(selectedUser.userId, rejectReason);
        setActionLoading(false);
        if (success) {
            message.success('Đã từ chối KYC');
            setRejectModalOpen(false);
            setDetailModalOpen(false);
            setRejectReason('');
            fetchPendingKyc();
        } else {
            message.error('Lỗi khi từ chối KYC');
        }
    };

    const openDetailModal = (user: UserDetails) => {
        setSelectedUser(user);
        setDetailModalOpen(true);
    };

    const openRejectModal = (user: UserDetails) => {
        setSelectedUser(user);
        setRejectModalOpen(true);
    };

    const columns: ColumnsType<UserDetails> = [
        {
            title: 'Họ tên',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => <Text strong>{name}</Text>,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'CMND/CCCD',
            dataIndex: 'ssn',
            key: 'ssn',
        },
        {
            title: 'Nghề nghiệp',
            dataIndex: 'job',
            key: 'job',
        },
        {
            title: 'Thu nhập',
            dataIndex: 'income',
            key: 'income',
            render: (income: number) => formatCurrency(income),
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={() => openDetailModal(record)}
                    >
                        Xem
                    </Button>
                    <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => handleApprove(record)}
                        style={{ background: '#52c41a' }}
                    >
                        Duyệt
                    </Button>
                    <Button
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => openRejectModal(record)}
                    >
                        Từ chối
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Title level={4}>Duyệt KYC</Title>
            <Card bordered={false}>
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'Không có yêu cầu KYC nào chờ duyệt' }}
                />
            </Card>

            {/* Modal chi tiết */}
            <Modal
                title="Chi tiết KYC"
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                width={800}
                footer={[
                    <Button key="cancel" onClick={() => setDetailModalOpen(false)}>
                        Đóng
                    </Button>,
                    <Button
                        key="reject"
                        danger
                        onClick={() => {
                            setDetailModalOpen(false);
                            openRejectModal(selectedUser!);
                        }}
                    >
                        Từ chối
                    </Button>,
                    <Button
                        key="approve"
                        type="primary"
                        loading={actionLoading}
                        onClick={() => handleApprove(selectedUser!)}
                        style={{ background: '#52c41a' }}
                    >
                        Duyệt
                    </Button>,
                ]}
            >
                {selectedUser && (
                    <>
                        <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
                            <Descriptions.Item label="Họ tên">{selectedUser.name}</Descriptions.Item>
                            <Descriptions.Item label="Giới tính">
                                {selectedUser.sex === 'male' ? 'Nam' : 'Nữ'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày sinh">
                                {dayjs(selectedUser.birth).format('DD/MM/YYYY')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
                            <Descriptions.Item label="CMND/CCCD">{selectedUser.ssn}</Descriptions.Item>
                            <Descriptions.Item label="Điểm tín dụng">
                                <Tag color={selectedUser.score >= 650 ? 'green' : selectedUser.score >= 580 ? 'orange' : 'red'}>
                                    {selectedUser.score}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Địa chỉ" span={2}>
                                {selectedUser.address}, {selectedUser.city}
                            </Descriptions.Item>
                            <Descriptions.Item label="Nghề nghiệp">{selectedUser.job}</Descriptions.Item>
                            <Descriptions.Item label="Thu nhập">
                                {formatCurrency(selectedUser.income)}/tháng
                            </Descriptions.Item>
                        </Descriptions>

                        <Title level={5}>Hình ảnh xác thực</Title>
                        <Space size={16} wrap>
                            {selectedUser.imageURLs.frontID && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Mặt trước CMND</Text>
                                    <div style={{ marginTop: 8 }}>
                                        <Image
                                            src={getImageUrl(selectedUser.imageURLs.frontID)}
                                            width={64}
                                            height={64}
                                            style={{ border: '1px solid #d9d9d9', borderRadius: 8, objectFit: 'cover' }}
                                            preview={{
                                                mask: <EyeOutlined style={{ fontSize: 14 }} />
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            {selectedUser.imageURLs.backID && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Mặt sau CMND</Text>
                                    <div style={{ marginTop: 8 }}>
                                        <Image
                                            src={getImageUrl(selectedUser.imageURLs.backID)}
                                            width={64}
                                            height={64}
                                            style={{ border: '1px solid #d9d9d9', borderRadius: 8, objectFit: 'cover' }}
                                            preview={{
                                                mask: <EyeOutlined style={{ fontSize: 14 }} />
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            {selectedUser.imageURLs.selfie && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Ảnh selfie</Text>
                                    <div style={{ marginTop: 8 }}>
                                        <Image
                                            src={getImageUrl(selectedUser.imageURLs.selfie)}
                                            width={64}
                                            height={64}
                                            style={{ border: '1px solid #d9d9d9', borderRadius: 8, objectFit: 'cover' }}
                                            preview={{
                                                mask: <EyeOutlined style={{ fontSize: 14 }} />
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </Space>
                    </>
                )}
            </Modal>

            {/* Modal từ chối */}
            <Modal
                title="Từ chối KYC"
                open={rejectModalOpen}
                onCancel={() => {
                    setRejectModalOpen(false);
                    setRejectReason('');
                }}
                onOk={handleReject}
                okText="Xác nhận từ chối"
                okButtonProps={{ danger: true, loading: actionLoading }}
                cancelText="Hủy"
            >
                <TextArea
                    placeholder="Nhập lý do từ chối..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                />
            </Modal>
        </div>
    );
};

export default KycApprovalPage;
