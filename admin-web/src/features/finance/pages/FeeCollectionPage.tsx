import React, { useRef, useState, useEffect } from 'react';
import { Typography, message, Card, Statistic, Row, Col, Button, Modal, InputNumber, Form } from 'antd';
import { ProTable, type ProColumns, type ActionType } from '@ant-design/pro-components';
import { Link } from 'react-router-dom';
import { EditOutlined } from '@ant-design/icons';
import { getTransactions, getSystemRevenue, getConfigs, updateConfig } from '../api';
import { formatCurrency } from '../../../utils/format';
import { TransactionType, PaymentStatus } from '../../../config/enums';
import type { Transaction } from '../../../types';

const { Text, Title } = Typography;

const FeeCollectionPage: React.FC = () => {
    const actionRef = useRef<ActionType>(null);
    const [totalRevenue, setTotalRevenue] = useState<number>(0);
    const [feePercent, setFeePercent] = useState<number>(0.01); // Default 1%
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchData = async () => {
        try {
            const [revenue, configs] = await Promise.all([
                getSystemRevenue(),
                getConfigs()
            ]);
            setTotalRevenue(revenue);

            const feeConfig = configs.find((c: any) => c.key === 'SERVICE_FEE');
            if (feeConfig) {
                setFeePercent(Number(feeConfig.value));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateFee = async (values: any) => {
        try {
            await updateConfig('SERVICE_FEE', values.feePercent / 100);
            message.success('Cập nhật mức phí thành công');
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            message.error('Lỗi cập nhật mức phí');
        }
    };

    const columns: ProColumns<Transaction>[] = [
        {
            title: 'Mã GD',
            dataIndex: '_id',
            key: '_id',
            width: 100,
            fixed: 'left',
            copyable: true,
            search: false,
            render: (_: any, record) => <Text code>#{record._id.slice(-8).toUpperCase()}</Text>,
        },
        {
            title: 'Người trả phí (Admin/Investor)',
            key: 'userId',
            width: 150,
            search: false,
            render: (_: any, record) => {
                const user = record.userId;
                if (!user) return '-';
                const id = (user as any)._id || user;
                const display = typeof user === 'object'
                    ? ((user as any).fullName || (user as any).phone || id.slice(-6))
                    : id.slice(-6);
                return <Link to={`/customers/${id}`}>{display}</Link>;
            },
        },
        {
            title: 'Khoản vay liên quan',
            key: 'loanId',
            width: 180,
            search: false,
            render: (_: any, record) => {
                const loan = record.loanId;
                if (!loan) return '-';
                const id = (loan as any)._id || loan;
                const purpose = typeof loan === 'object' ? ((loan as any).purpose || 'Khoản vay') : 'Khoản vay';
                return <Link to={`/loans/${id}`}>{purpose}</Link>;
            },
        },
        {
            title: 'Số tiền phí',
            dataIndex: 'amount',
            width: 140,
            search: false,
            sorter: (a, b) => a.amount - b.amount,
            render: (_: any, record) => (
                <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                    +{formatCurrency(record.amount)}
                </Text>
            ),
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            ellipsis: true,
            search: false,
        },
        {
            title: 'Thời gian thu',
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            width: 180,
            search: false,
            sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Title level={2} style={{ marginBottom: 24 }}>Quản lý thu phí</Title>

            <Card style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Statistic
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    Mức phí hiện tại
                                    <Button
                                        type="link"
                                        icon={<EditOutlined />}
                                        onClick={() => {
                                            form.setFieldsValue({ feePercent: feePercent * 100 });
                                            setIsModalOpen(true);
                                        }}
                                        size="small"
                                    />
                                </div>
                            }
                            value={feePercent * 100}
                            suffix="% / Lợi nhuận"
                        />
                    </Col>
                    <Col span={8}>
                        <Statistic
                            title="Tổng doanh thu"
                            value={totalRevenue}
                            formatter={(value) => formatCurrency(Number(value))}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Col>
                </Row>
            </Card>

            <ProTable<Transaction>
                columns={columns}
                actionRef={actionRef}
                cardBordered
                request={async (params) => {
                    try {
                        const apiParams: any = {
                            page: params.current,
                            limit: params.pageSize,
                            type: TransactionType.FEE, // Chỉ lấy giao dịch phí
                            status: PaymentStatus.COMPLETED,
                        };

                        const data = await getTransactions(apiParams);
                        return {
                            data: data,
                            success: true,
                        };
                    } catch (error) {
                        message.error('Lỗi tải dữ liệu');
                        return {
                            data: [],
                            success: false,
                        };
                    }
                }}
                rowKey="_id"
                search={false} // Tắt search thanh công cụ vì đây là trang report
                pagination={{
                    pageSize: 10,
                }}
                dateFormatter="string"
                headerTitle="Lịch sử thu phí"
                options={{
                    density: true,
                    fullScreen: true,
                    setting: true,
                    reload: true,
                }}
            />

            <Modal
                title="Cập nhật mức phí dịch vụ"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form
                    form={form}
                    onFinish={handleUpdateFee}
                    layout="vertical"
                >
                    <Form.Item
                        name="feePercent"
                        label="Mức phí (%)"
                        rules={[{ required: true, message: 'Vui lòng nhập mức phí' }]}
                    >
                        <InputNumber
                            min={0}
                            max={100}
                            step={0.1}
                            style={{ width: '100%' }}
                            formatter={value => `${value}%`}
                            parser={value => value!.replace('%', '')}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            Lưu thay đổi
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default FeeCollectionPage;
