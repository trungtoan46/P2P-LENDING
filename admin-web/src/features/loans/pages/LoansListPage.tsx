import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Table,
    Card,
    Tag,
    Space,
    Button,
    Typography,
    Progress,
    Select,
    message,
    Modal,
    Descriptions,
    Input,
    Dropdown,
    Tooltip,
} from 'antd';
import {
    EyeOutlined,
    CheckOutlined,
    CloseOutlined,
    DollarOutlined,
    WalletOutlined,
    MoreOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getLoans, approveLoan, rejectLoan, disburseLoan } from '../api';
import { adminDeposit } from '../../finance/api';
import { formatCurrency, formatLoanId } from '../../../utils/format';
import { LoanStatus } from '../../../config/enums';
import type { Loan } from '../../../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface LoansListPageProps {
    initialStatus?: LoanStatus;
    title: string;
    showApprovalActions?: boolean;
}

const statusColors: Record<string, string> = {
    [LoanStatus.PENDING]: 'gold',
    [LoanStatus.APPROVED]: 'blue',
    [LoanStatus.ACTIVE]: 'green',
    [LoanStatus.ACTIVE]: 'green',
    [LoanStatus.WAITING_SIGNATURE]: 'orange',
    [LoanStatus.WAITING]: 'cyan',
    [LoanStatus.COMPLETED]: 'green',
    [LoanStatus.DEFAULTED]: 'red',
    [LoanStatus.FAIL]: 'red',
};

const statusLabels: Record<string, string> = {
    [LoanStatus.PENDING]: 'Chờ duyệt',
    [LoanStatus.APPROVED]: 'Đã duyệt',
    [LoanStatus.ACTIVE]: 'Đang vay',
    [LoanStatus.ACTIVE]: 'Đang vay',
    [LoanStatus.WAITING_SIGNATURE]: 'Chờ ký HĐ',
    [LoanStatus.WAITING]: 'Chờ giải ngân',
    [LoanStatus.COMPLETED]: 'Hoàn thành',
    [LoanStatus.DEFAULTED]: 'Nợ xấu',
    [LoanStatus.FAIL]: 'Thất bại',
};

const LoansListPage: React.FC<LoansListPageProps> = ({
    initialStatus,
    title,
    showApprovalActions = false,
}) => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>(initialStatus || 'all');
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState<number>(0);

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (statusFilter) params.status = statusFilter;

            console.log('[LoansListPage] Fetching loans with params:', params);
            const data = await getLoans(params);
            setLoans(data);
        } catch (error) {
            message.error('Lỗi khi tải danh sách khoản vay');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const newStatus = initialStatus || 'all';
        setStatusFilter(newStatus);
    }, [initialStatus]);

    useEffect(() => {
        if (statusFilter) {
            fetchLoans();
        }
    }, [statusFilter]);

    const handleApprove = async (loan: Loan) => {
        setActionLoading(true);
        const success = await approveLoan(loan._id);
        setActionLoading(false);
        if (success) {
            message.success('Đã duyệt khoản vay');
            setDetailModalOpen(false);
            fetchLoans();
        } else {
            message.error('Lỗi khi duyệt khoản vay');
        }
    };

    const handleReject = async () => {
        if (!selectedLoan || !rejectReason.trim()) {
            message.warning('Vui lòng nhập lý do từ chối');
            return;
        }
        setActionLoading(true);
        const success = await rejectLoan(selectedLoan._id, rejectReason);
        setActionLoading(false);
        if (success) {
            message.success('Đã từ chối khoản vay');
            setRejectModalOpen(false);
            setDetailModalOpen(false);
            setRejectReason('');
            fetchLoans();
        } else {
            message.error('Lỗi khi từ chối khoản vay');
        }
    };

    const handleDisburse = async (loan: Loan) => {
        Modal.confirm({
            title: 'Xác nhận giải ngân',
            content: `Bạn có chắc muốn giải ngân ${formatCurrency(loan.capital)} cho khoản vay ${formatLoanId(loan._id)}?`,
            okText: 'Giải ngân',
            cancelText: 'Hủy',
            onOk: async () => {
                setActionLoading(true);
                const success = await disburseLoan(loan._id);
                setActionLoading(false);
                if (success) {
                    message.success('Đã giải ngân thành công');
                    setDetailModalOpen(false);
                    fetchLoans();
                } else {
                    message.error('Lỗi khi giải ngân');
                }
            }
        });
    };

    const handleDeposit = async () => {
        if (!selectedLoan || depositAmount < 10000) {
            message.warning('Số tiền tối thiểu là 10,000 VND');
            return;
        }
        setActionLoading(true);
        const borrowerId = typeof selectedLoan.borrowerId === 'object'
            ? (selectedLoan.borrowerId as any)._id
            : selectedLoan.borrowerId;
        const success = await adminDeposit(borrowerId, depositAmount, `Admin nạp tiền cho khoản vay ${formatLoanId(selectedLoan._id)}`);
        setActionLoading(false);
        if (success) {
            message.success('Đã nạp tiền thành công');
            setDepositModalOpen(false);
            setDepositAmount(0);
        } else {
            message.error('Lỗi khi nạp tiền');
        }
    };

    const columns: ColumnsType<Loan> = [
        {
            title: 'Mã vay',
            dataIndex: '_id',
            key: '_id',
            width: 140,
            render: (id: string) => (
                <Link to={`/loans/${id}`} style={{ fontWeight: 'bold' }}>
                    {formatLoanId(id)}
                </Link>
            ),
        },
        {
            title: 'Số tiền',
            dataIndex: 'capital',
            key: 'capital',
            width: 130,
            render: (capital: number) => formatCurrency(capital),
            sorter: (a, b) => a.capital - b.capital,
        },
        {
            title: 'Kỳ hạn',
            dataIndex: 'term',
            key: 'term',
            width: 100,
            render: (term: number) => `${term} tháng`,
        },
        {
            title: 'Lãi suất',
            dataIndex: 'interestRate',
            key: 'interestRate',
            width: 110,
            render: (rate: number) => `${(rate / 12).toFixed(2)}%/tháng`,
        },
        {
            title: 'Tiến độ đầu tư',
            key: 'progress',
            width: 180,
            render: (_, record) => {
                const percent = record.totalNotes > 0
                    ? Math.round((record.investedNotes / record.totalNotes) * 100)
                    : 0;
                return (
                    <Progress
                        percent={percent}
                        size="small"
                        status={percent >= 100 ? 'success' : 'active'}
                    />
                );
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: LoanStatus) => (
                <Tag color={statusColors[status] || 'default'}>
                    {statusLabels[status] || status}
                </Tag>
            ),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
            sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 260,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Xem nhanh">
                        <Button
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => {
                                setSelectedLoan(record);
                                setDetailModalOpen(true);
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Chi tiết">
                        <Link to={`/loans/${record._id}`}>
                            <Button type="link" icon={<FileTextOutlined />} />
                        </Link>
                    </Tooltip>
                    <Dropdown
                        trigger={['click']}
                        menu={{
                            items: [
                                ...(showApprovalActions && record.status === LoanStatus.PENDING
                                    ? [
                                        {
                                            key: 'approve',
                                            label: 'Duyệt',
                                            icon: <CheckOutlined />,
                                            onClick: () => handleApprove(record),
                                        },
                                        {
                                            key: 'reject',
                                            label: 'Từ chối',
                                            icon: <CloseOutlined />,
                                            danger: true,
                                            onClick: () => {
                                                setSelectedLoan(record);
                                                setRejectModalOpen(true);
                                            },
                                        },
                                    ]
                                    : []),
                                ...(record.status === LoanStatus.WAITING
                                    ? [{
                                        key: 'disburse',
                                        label: 'Giải ngân',
                                        icon: <DollarOutlined />,
                                        onClick: () => handleDisburse(record),
                                    }]
                                    : []),
                                {
                                    key: 'deposit',
                                    label: 'Nạp tiền',
                                    icon: <WalletOutlined />,
                                    onClick: () => {
                                        setSelectedLoan(record);
                                        setDepositModalOpen(true);
                                    },
                                },
                            ],
                        }}
                    >
                        <Button type="link" icon={<MoreOutlined />} />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Title level={4}>{title}</Title>
            <Card bordered={false}>
                <Space style={{ marginBottom: 16 }}>
                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 220 }}
                    >
                        <Option value="all">Tất cả trạng thái</Option>
                        <Option value={LoanStatus.PENDING}>Chờ duyệt</Option>
                        <Option value={`${LoanStatus.APPROVED},${LoanStatus.WAITING},${LoanStatus.ACTIVE}`}>Đang thực hiện (All)</Option>
                        <Option value={LoanStatus.APPROVED}>Đã duyệt (Gọi vốn)</Option>
                        <Option value={LoanStatus.WAITING_SIGNATURE}>Chờ người vay ký</Option>
                        <Option value={LoanStatus.WAITING}>Chờ giải ngân</Option>
                        <Option value={LoanStatus.ACTIVE}>Đang vay (Đã giải ngân)</Option>
                        <Option value={LoanStatus.COMPLETED}>Hoàn thành</Option>
                        <Option value={LoanStatus.DEFAULTED}>Nợ xấu</Option>
                    </Select>
                </Space>
                <Table
                    columns={columns}
                    dataSource={loans}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 1100 }}
                />
            </Card>

            {/* Modal chi tiết */}
            <Modal
                title={`Chi tiết khoản vay ${selectedLoan ? formatLoanId(selectedLoan._id) : ''}`}
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                width={700}
                footer={[
                    <Button key="close" onClick={() => setDetailModalOpen(false)}>
                        Đóng
                    </Button>,
                    ...(showApprovalActions && selectedLoan?.status === LoanStatus.PENDING
                        ? [
                            <Button
                                key="reject"
                                danger
                                onClick={() => {
                                    setDetailModalOpen(false);
                                    setRejectModalOpen(true);
                                }}
                            >
                                Từ chối
                            </Button>,
                            <Button
                                key="approve"
                                type="primary"
                                loading={actionLoading}
                                onClick={() => handleApprove(selectedLoan!)}
                                style={{ background: '#52c41a' }}
                            >
                                Duyệt
                            </Button>,
                        ]
                        : []),
                ]}
            >
                {selectedLoan && (
                    <Descriptions bordered column={2}>
                        <Descriptions.Item label="Số tiền vay">
                            {formatCurrency(selectedLoan.capital)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Kỳ hạn">
                            {selectedLoan.term} tháng
                        </Descriptions.Item>
                        <Descriptions.Item label="Lãi suất">
                            {selectedLoan.interestRate}%/năm
                        </Descriptions.Item>
                        <Descriptions.Item label="Trả hàng tháng">
                            {formatCurrency(selectedLoan.monthlyPayment)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tổng lãi">
                            {formatCurrency(selectedLoan.totalInterest)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tổng trả">
                            {formatCurrency(selectedLoan.totalRepayment)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Điểm tín dụng">
                            <Tag color={selectedLoan.creditScore >= 650 ? 'green' : selectedLoan.creditScore >= 580 ? 'orange' : 'red'}>
                                {selectedLoan.creditScore}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={statusColors[selectedLoan.status]}>
                                {statusLabels[selectedLoan.status]}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Mục đích vay" span={2}>
                            {selectedLoan.purpose}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày giải ngân">
                            {dayjs(selectedLoan.disbursementDate).format('DD/MM/YYYY')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày đáo hạn">
                            {dayjs(selectedLoan.maturityDate).format('DD/MM/YYYY')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tiến độ đầu tư" span={2}>
                            <Progress
                                percent={
                                    selectedLoan.totalNotes > 0
                                        ? Math.round((selectedLoan.investedNotes / selectedLoan.totalNotes) * 100)
                                        : 0
                                }
                                status={selectedLoan.investedNotes >= selectedLoan.totalNotes ? 'success' : 'active'}
                            />
                            <Text type="secondary">
                                {selectedLoan.investedNotes}/{selectedLoan.totalNotes} phần
                            </Text>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>

            {/* Modal từ chối */}
            <Modal
                title="Từ chối khoản vay"
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

            {/* Modal nạp tiền */}
            <Modal
                title={`Nạp tiền cho người vay - ${selectedLoan ? formatLoanId(selectedLoan._id) : ''}`}
                open={depositModalOpen}
                onCancel={() => {
                    setDepositModalOpen(false);
                    setDepositAmount(0);
                }}
                onOk={handleDeposit}
                okText="Nạp tiền"
                okButtonProps={{ loading: actionLoading }}
                cancelText="Hủy"
            >
                <div style={{ marginBottom: 16 }}>
                    <Text>Số điện thoại: </Text>
                    <Text strong>
                        {selectedLoan && typeof selectedLoan.borrowerId === 'object'
                            ? (selectedLoan.borrowerId as any).phone
                            : 'N/A'}
                    </Text>
                </div>
                <Input
                    type="number"
                    placeholder="Nhập số tiền (VND)"
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                    addonAfter="VND"
                    min={10000}
                />
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    Tối thiểu: 10,000 VND
                </Text>
            </Modal>
        </div>
    );
};

export default LoansListPage;

