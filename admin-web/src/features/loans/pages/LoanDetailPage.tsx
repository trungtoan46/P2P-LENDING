import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Spin, Typography, message, Row, Col, Space, Modal, Input } from 'antd';
import { ArrowLeftOutlined, UserOutlined, TeamOutlined, CheckOutlined, CloseOutlined, DollarOutlined } from '@ant-design/icons';
import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { getLoanById, approveLoan, rejectLoan, disburseLoan } from '../api';
import { formatCurrency } from '../../../utils/format';
import { LoanStatus } from '../../../config/enums';
import type { Loan } from '../../../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const statusColors: Record<string, string> = {
    [LoanStatus.PENDING]: 'gold',
    [LoanStatus.APPROVED]: 'blue',
    [LoanStatus.WAITING_SIGNATURE]: 'orange',
    [LoanStatus.WAITING]: 'cyan', // Changed from orange to cyan to match ListPage
    [LoanStatus.SUCCESS]: 'cyan',
    [LoanStatus.ACTIVE]: 'green',
    [LoanStatus.COMPLETED]: 'purple',
    [LoanStatus.DEFAULTED]: 'red',
    [LoanStatus.FAIL]: 'volcano',
};

const LoanDetailPage: React.FC = () => {
    // ... existing state and fetch ...
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loan, setLoan] = useState<Loan | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        if (!id) return;
        fetchLoan();
    }, [id]);

    const fetchLoan = async () => {
        setLoading(true);
        try {
            const data = await getLoanById(id!);
            setLoan(data);
        } catch (error) {
            message.error('Lỗi khi tải thông tin khoản vay');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!loan) return;
        setActionLoading(true);
        const success = await approveLoan(loan._id);
        setActionLoading(false);
        if (success) {
            message.success('Đã duyệt khoản vay');
            fetchLoan();
        } else {
            message.error('Lỗi khi duyệt khoản vay');
        }
    };

    const handleReject = async () => {
        if (!loan || !rejectReason.trim()) {
            message.warning('Vui lòng nhập lý do từ chối');
            return;
        }
        setActionLoading(true);
        const success = await rejectLoan(loan._id, rejectReason);
        setActionLoading(false);
        if (success) {
            message.success('Đã từ chối khoản vay');
            setRejectModalOpen(false);
            setRejectReason('');
            fetchLoan();
        } else {
            message.error('Lỗi khi từ chối khoản vay');
        }
    };

    const handleDisburse = async () => {
        if (!loan) return;
        Modal.confirm({
            title: 'Xác nhận giải ngân',
            content: `Bạn có chắc muốn giải ngân ${formatCurrency(loan.capital)} cho khoản vay ${loan._id}?`,
            okText: 'Giải ngân',
            cancelText: 'Hủy',
            onOk: async () => {
                setActionLoading(true);
                const success = await disburseLoan(loan._id);
                setActionLoading(false);
                if (success) {
                    message.success('Đã giải ngân thành công');
                    fetchLoan();
                } else {
                    message.error('Lỗi khi giải ngân');
                }
            }
        });
    };

    if (loading) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!loan) {
        return <div>Không tìm thấy khoản vay</div>;
    }

    const loanAny = loan as any;

    const investorColumns: ProColumns<any>[] = [
        {
            title: 'Nhà đầu tư',
            dataIndex: 'investorDetails',
            render: (_dom, record) => {
                const details = record.investorDetails;
                const invId = typeof record.investorId === 'object' ? (record.investorId as any)._id : record.investorId;
                return (
                    <Space direction="vertical" size={0}>
                        <Link to={`/customers/${invId}`} style={{ fontWeight: 'bold' }}>
                            {details?.name || (record.investorId as any)?.phone || 'N/A'}
                        </Link>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {(record.investorId as any)?.phone || 'N/A'}
                        </Text>
                    </Space>
                );
            },
        },
        {
            title: 'Số tiền đầu tư',
            dataIndex: 'amount',
            render: (dom) => <Text strong style={{ color: '#1890ff' }}>{formatCurrency(Number(dom))}</Text>,
            sorter: (a, b) => a.amount - b.amount,
        },
        {
            title: 'Số sản phẩm (Notes)',
            dataIndex: 'notes',
            align: 'center',
        },
        {
            title: 'Ngày đầu tư',
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        },
    ];

    return (
        <>
            <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
                <div style={{ marginBottom: 16 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                        Quay lại
                    </Button>
                </div>

                <Row gutter={[16, 16]}>
                    <Col span={16}>
                        <Card
                            title={
                                <Space>
                                    <Title level={4} style={{ margin: 0 }}>
                                        Chi tiết khoản vay #{loan._id?.slice(-8).toUpperCase()}
                                    </Title>
                                    <Tag color={statusColors[loan.status] || 'default'} style={{ fontSize: 14 }}>
                                        {loan.status.toUpperCase()}
                                    </Tag>
                                </Space>
                            }
                            extra={
                                loan.status === LoanStatus.PENDING ? (
                                    <Space>
                                        <Button
                                            danger
                                            icon={<CloseOutlined />}
                                            onClick={() => setRejectModalOpen(true)}
                                        >
                                            Từ chối
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<CheckOutlined />}
                                            loading={actionLoading}
                                            onClick={handleApprove}
                                            style={{ background: '#52c41a' }}
                                        >
                                            Duyệt
                                        </Button>
                                    </Space>
                                ) : loan.status === LoanStatus.WAITING ? (
                                    <Button
                                        type="primary"
                                        icon={<DollarOutlined />}
                                        loading={actionLoading}
                                        onClick={handleDisburse}
                                        style={{ background: '#1890ff' }}
                                    >
                                        Giải ngân
                                    </Button>
                                ) : null
                            }
                        >
                            <Descriptions bordered column={2} size="small">
                                <Descriptions.Item label="Mục đích vay" span={2}>{loan.purpose}</Descriptions.Item>
                                <Descriptions.Item label="Số tiền vay">
                                    <Text strong style={{ color: '#1890ff' }}>{formatCurrency(loan.capital)}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Kỳ hạn">{loan.term} tháng</Descriptions.Item>
                                <Descriptions.Item label="Lãi suất">{(loan.interestRate / 12).toFixed(2)}% / tháng</Descriptions.Item>
                                <Descriptions.Item label="Điểm tín dụng">
                                    <Tag color={loanAny.creditScore >= 600 ? 'green' : 'orange'}>
                                        {loanAny.creditScore}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Trả mỗi kỳ">{formatCurrency(loanAny.monthlyPayment || 0)}</Descriptions.Item>
                                <Descriptions.Item label="Tổng lãi">{formatCurrency(loanAny.totalInterest || 0)}</Descriptions.Item>
                                <Descriptions.Item label="Ngày giải ngân">
                                    {loanAny.disbursementDate ? dayjs(loanAny.disbursementDate).format('DD/MM/YYYY') : '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngày đáo hạn">
                                    {loanAny.maturityDate ? dayjs(loanAny.maturityDate).format('DD/MM/YYYY') : '-'}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </Col>

                    <Col span={8}>
                        <Card title={<Space><UserOutlined /> Thông tin người vay</Space>} size="small">
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Họ tên">
                                    {loanAny.borrowerId ? (
                                        <Link to={`/customers/${typeof loanAny.borrowerId === 'object' ? loanAny.borrowerId._id : loanAny.borrowerId}`} style={{ fontWeight: 'bold' }}>
                                            {loan.borrowerDetails?.name || (loan.borrowerId as any)?.phone || 'Người vay'}
                                        </Link>
                                    ) : (
                                        <Text type="danger">Dữ liệu người vay lỗi</Text>
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="SĐT">{(loan.borrowerId as any)?.phone || 'N/A'}</Descriptions.Item>
                                {loan.borrowerDetails ? (
                                    <>
                                        <Descriptions.Item label="Email">{loan.borrowerDetails.email}</Descriptions.Item>
                                        <Descriptions.Item label="Nghề nghiệp">{loan.borrowerDetails.job}</Descriptions.Item>
                                        <Descriptions.Item label="Thu nhập">{formatCurrency(loan.borrowerDetails.income)}</Descriptions.Item>
                                        <Descriptions.Item label="Địa chỉ" span={1}>
                                            <Text ellipsis={{ tooltip: loan.borrowerDetails.address }}>
                                                {loan.borrowerDetails.address}
                                            </Text>
                                        </Descriptions.Item>
                                    </>
                                ) : (
                                    <Descriptions.Item label="Ghi chú">
                                        <Text type="secondary" italic>Chưa có thông tin định danh (KYC)</Text>
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </Card>
                    </Col>
                </Row>

                <Card title={<Space><TeamOutlined /> Danh sách nhà đầu tư ({loanAny.investors?.length || 0})</Space>}>
                    <ProTable<any>
                        columns={investorColumns}
                        dataSource={loanAny.investors || []}
                        rowKey="_id"
                        search={false}
                        options={false}
                        pagination={{
                            pageSize: 5,
                            showTotal: (total, range) => `${range[0]}-${range[1]} trên ${total} nhà đầu tư`,
                        }}
                    />
                </Card>
            </Space>
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
        </>
    );
};

export default LoanDetailPage;
