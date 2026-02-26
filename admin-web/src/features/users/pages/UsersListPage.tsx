import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, Input, Select, Typography, Card, message } from 'antd';
import { SearchOutlined, EyeOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { getUsers, toggleUserStatus } from '../api';
import { formatPhone, formatUserId } from '../../../utils/format';
import { UserCategory } from '../../../config/enums';
import type { User } from '../../../types';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface UsersListPageProps {
    category?: UserCategory;
    title: string;
}

const UsersListPage: React.FC<UsersListPageProps> = ({ category, title }) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (category) params.category = category;
            if (statusFilter !== 'all') params.isActive = statusFilter === 'active';
            const data = await getUsers(params);
            setUsers(data);
        } catch (error) {
            message.error('Lỗi khi tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [category, statusFilter]);

    const handleToggleStatus = async (user: User) => {
        const success = await toggleUserStatus(user._id, !user.isActive);
        if (success) {
            message.success(`Đã ${user.isActive ? 'vô hiệu hóa' : 'kích hoạt'} tài khoản`);
            fetchUsers();
        } else {
            message.error('Lỗi khi cập nhật trạng thái');
        }
    };

    const filteredUsers = users.filter((user) =>
        user.phone.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns: ColumnsType<User> = [
        {
            title: 'ID',
            dataIndex: '_id',
            key: '_id',
            render: (id: string) => <span style={{ fontWeight: 500 }}>{formatUserId(id)}</span>,
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phone',
            key: 'phone',
            render: (phone: string) => formatPhone(phone),
        },
        {
            title: 'Loại',
            dataIndex: 'category',
            key: 'category',
            render: (cat: string) => {
                const colors: Record<string, string> = {
                    borrower: 'blue',
                    lender: 'green',
                    admin: 'purple',
                    both: 'orange',
                };
                const labels: Record<string, string> = {
                    borrower: 'Người vay',
                    lender: 'Nhà đầu tư',
                    admin: 'Quản trị',
                    both: 'Cả hai',
                };
                return <Tag color={colors[cat]}>{labels[cat] || cat}</Tag>;
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive: boolean) => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? 'Hoạt động' : 'Bị khóa'}
                </Tag>
            ),
        },
        {
            title: 'Xác thực',
            dataIndex: 'isVerified',
            key: 'isVerified',
            render: (isVerified: boolean) => (
                <Tag color={isVerified ? 'cyan' : 'default'}>
                    {isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                </Tag>
            ),
        },
        {
            title: 'Đăng nhập cuối',
            dataIndex: 'lastLogin',
            key: 'lastLogin',
            render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/customers/${record._id}`)}
                    >
                        Xem
                    </Button>
                    <Button
                        type="link"
                        danger={record.isActive}
                        icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                        onClick={() => handleToggleStatus(record)}
                    >
                        {record.isActive ? 'Khóa' : 'Mở khóa'}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Title level={4}>{title}</Title>
            <Card bordered={false}>
                <Space style={{ marginBottom: 16 }}>
                    <Input
                        placeholder="Tìm kiếm theo SĐT..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 250 }}
                    />
                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 150 }}
                    >
                        <Option value="all">Tất cả</Option>
                        <Option value="active">Hoạt động</Option>
                        <Option value="inactive">Bị khóa</Option>
                    </Select>
                </Space>
                <Table
                    columns={columns}
                    dataSource={filteredUsers}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                />
            </Card>
        </div>
    );
};

export default UsersListPage;
