import React, { useEffect, useState } from 'react';
import {
    Card,
    Radio,
    InputNumber,
    Button,
    message,
    Spin,
    Space,
    Typography,
    Alert,
    Form,
    Descriptions,
} from 'antd';
import {
    SettingOutlined,
    SafetyCertificateOutlined,
    BankOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import api from '../../../lib/axios';

const { Title, Text, Paragraph } = Typography;

interface ApprovalConfig {
    mode: 'manual' | 'auto_conditional' | 'auto_full';
    conditions: {
        minCreditScore: number;
        maxCapital: number;
        maxTerm: number;
    };
}

interface DisbursementConfig {
    mode: 'manual' | 'auto';
}

const defaultApproval: ApprovalConfig = {
    mode: 'manual',
    conditions: {
        minCreditScore: 600,
        maxCapital: 50000000,
        maxTerm: 12,
    },
};

const defaultDisbursement: DisbursementConfig = {
    mode: 'manual',
};

const LoanConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [approval, setApproval] = useState<ApprovalConfig>(defaultApproval);
    const [disbursement, setDisbursement] = useState<DisbursementConfig>(defaultDisbursement);

    // Tải cấu hình từ server
    const loadConfigs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/configs');
            const configs = res.data?.data || res.data || [];

            const approvalCfg = configs.find((c: any) => c.key === 'loan_approval_mode');
            if (approvalCfg?.value) {
                setApproval({
                    mode: approvalCfg.value.mode || 'manual',
                    conditions: {
                        minCreditScore: approvalCfg.value.conditions?.minCreditScore || 600,
                        maxCapital: approvalCfg.value.conditions?.maxCapital || 50000000,
                        maxTerm: approvalCfg.value.conditions?.maxTerm || 12,
                    },
                });
            }

            const disburseCfg = configs.find((c: any) => c.key === 'loan_disbursement_mode');
            if (disburseCfg?.value) {
                setDisbursement({
                    mode: disburseCfg.value.mode || 'manual',
                });
            }
        } catch (err) {
            message.error('Không thể tải cấu hình');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfigs();
    }, []);

    // Lưu cấu hình
    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all([
                api.put('/config/loan_approval_mode', { value: approval }),
                api.put('/config/loan_disbursement_mode', { value: disbursement }),
            ]);
            message.success('Đã lưu cấu hình thành công!');
        } catch (err) {
            message.error('Lưu cấu hình thất bại');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
                <Spin size="large" tip="Đang tải cấu hình..." />
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            <Title level={3}>
                <SettingOutlined style={{ marginRight: 8 }} />
                Cấu hình khoản vay
            </Title>
            <Paragraph type="secondary">
                Quản lý chế độ duyệt và giải ngân cho các khoản vay mới.
            </Paragraph>

            {/* === Chế độ duyệt khoản vay === */}
            <Card
                title={
                    <Space>
                        <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
                        <span>Chế độ duyệt khoản vay</span>
                    </Space>
                }
                style={{ marginBottom: 24 }}
            >
                <Radio.Group
                    value={approval.mode}
                    onChange={(e) => setApproval({ ...approval, mode: e.target.value })}
                    style={{ width: '100%' }}
                >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        {/* Thủ công */}
                        <Card
                            size="small"
                            style={{
                                borderColor: approval.mode === 'manual' ? '#1890ff' : '#f0f0f0',
                                backgroundColor: approval.mode === 'manual' ? '#e6f7ff' : '#fff',
                            }}
                        >
                            <Radio value="manual">
                                <Text strong>Thủ công</Text>
                            </Radio>
                            <Paragraph
                                type="secondary"
                                style={{ marginLeft: 24, marginBottom: 0, marginTop: 4 }}
                            >
                                Admin phải duyệt từng khoản vay một cách thủ công.
                                Phù hợp khi cần kiểm soát chặt chẽ.
                            </Paragraph>
                        </Card>

                        {/* Tự động có điều kiện */}
                        <Card
                            size="small"
                            style={{
                                borderColor: approval.mode === 'auto_conditional' ? '#faad14' : '#f0f0f0',
                                backgroundColor: approval.mode === 'auto_conditional' ? '#fffbe6' : '#fff',
                            }}
                        >
                            <Radio value="auto_conditional">
                                <Text strong>Tự động có điều kiện</Text>
                            </Radio>
                            <Paragraph
                                type="secondary"
                                style={{ marginLeft: 24, marginBottom: 0, marginTop: 4 }}
                            >
                                Khoản vay sẽ được tự động duyệt nếu thỏa mãn tất cả điều kiện bên dưới.
                                Các khoản vay không đạt điều kiện sẽ chờ admin duyệt.
                            </Paragraph>

                            {approval.mode === 'auto_conditional' && (
                                <div
                                    style={{
                                        marginTop: 16,
                                        marginLeft: 24,
                                        padding: 16,
                                        backgroundColor: '#fafafa',
                                        borderRadius: 8,
                                        border: '1px solid #f0f0f0',
                                    }}
                                >
                                    <Form layout="vertical" size="middle">
                                        <Form.Item label="Điểm tín dụng tối thiểu">
                                            <InputNumber
                                                value={approval.conditions.minCreditScore}
                                                onChange={(v) =>
                                                    setApproval({
                                                        ...approval,
                                                        conditions: { ...approval.conditions, minCreditScore: v || 0 },
                                                    })
                                                }
                                                min={300}
                                                max={900}
                                                step={10}
                                                style={{ width: 200 }}
                                                addonAfter="điểm"
                                            />
                                        </Form.Item>
                                        <Form.Item label="Số tiền vay tối đa">
                                            <InputNumber
                                                value={approval.conditions.maxCapital}
                                                onChange={(v) =>
                                                    setApproval({
                                                        ...approval,
                                                        conditions: { ...approval.conditions, maxCapital: v || 0 },
                                                    })
                                                }
                                                min={1000000}
                                                max={1000000000}
                                                step={1000000}
                                                style={{ width: 250 }}
                                                formatter={(value) =>
                                                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                }
                                                parser={(value) => value!.replace(/,/g, '') as any}
                                                addonAfter="VND"
                                            />
                                        </Form.Item>
                                        <Form.Item label="Kỳ hạn vay tối đa" style={{ marginBottom: 0 }}>
                                            <InputNumber
                                                value={approval.conditions.maxTerm}
                                                onChange={(v) =>
                                                    setApproval({
                                                        ...approval,
                                                        conditions: { ...approval.conditions, maxTerm: v || 0 },
                                                    })
                                                }
                                                min={1}
                                                max={60}
                                                style={{ width: 200 }}
                                                addonAfter="tháng"
                                            />
                                        </Form.Item>
                                    </Form>
                                </div>
                            )}
                        </Card>

                        {/* Tự động hoàn toàn */}
                        <Card
                            size="small"
                            style={{
                                borderColor: approval.mode === 'auto_full' ? '#52c41a' : '#f0f0f0',
                                backgroundColor: approval.mode === 'auto_full' ? '#f6ffed' : '#fff',
                            }}
                        >
                            <Radio value="auto_full">
                                <Text strong>Tự động hoàn toàn</Text>
                            </Radio>
                            <Paragraph
                                type="secondary"
                                style={{ marginLeft: 24, marginBottom: 0, marginTop: 4 }}
                            >
                                Tất cả khoản vay sẽ được tự động duyệt ngay khi tạo.
                            </Paragraph>
                            {approval.mode === 'auto_full' && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    icon={<ExclamationCircleOutlined />}
                                    message="Cảnh báo"
                                    description="Chế độ này không kiểm tra bất kỳ điều kiện nào. Mọi khoản vay sẽ được duyệt ngay lập tức."
                                    style={{ marginTop: 12, marginLeft: 24 }}
                                />
                            )}
                        </Card>
                    </Space>
                </Radio.Group>
            </Card>

            {/* === Chế độ giải ngân === */}
            <Card
                title={
                    <Space>
                        <BankOutlined style={{ color: '#52c41a' }} />
                        <span>Chế độ giải ngân</span>
                    </Space>
                }
                style={{ marginBottom: 24 }}
            >
                <Radio.Group
                    value={disbursement.mode}
                    onChange={(e) => setDisbursement({ mode: e.target.value })}
                    style={{ width: '100%' }}
                >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Card
                            size="small"
                            style={{
                                borderColor: disbursement.mode === 'manual' ? '#1890ff' : '#f0f0f0',
                                backgroundColor: disbursement.mode === 'manual' ? '#e6f7ff' : '#fff',
                            }}
                        >
                            <Radio value="manual">
                                <Text strong>Thủ công</Text>
                            </Radio>
                            <Paragraph
                                type="secondary"
                                style={{ marginLeft: 24, marginBottom: 0, marginTop: 4 }}
                            >
                                Admin xác nhận giải ngân thủ công sau khi người vay ký hợp đồng.
                            </Paragraph>
                        </Card>

                        <Card
                            size="small"
                            style={{
                                borderColor: disbursement.mode === 'auto' ? '#52c41a' : '#f0f0f0',
                                backgroundColor: disbursement.mode === 'auto' ? '#f6ffed' : '#fff',
                            }}
                        >
                            <Radio value="auto">
                                <Text strong>Tự động</Text>
                            </Radio>
                            <Paragraph
                                type="secondary"
                                style={{ marginLeft: 24, marginBottom: 0, marginTop: 4 }}
                            >
                                Hệ thống tự động giải ngân khi người vay ký hợp đồng thành công.
                            </Paragraph>
                            {disbursement.mode === 'auto' && (
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Lưu ý"
                                    description="Tiền sẽ được chuyển tự động vào ví hoặc tài khoản ngân hàng của người vay ngay sau khi ký."
                                    style={{ marginTop: 12, marginLeft: 24 }}
                                />
                            )}
                        </Card>
                    </Space>
                </Radio.Group>
            </Card>

            {/* === Tóm tắt cấu hình hiện tại === */}
            <Card
                title="Tóm tắt cấu hình"
                size="small"
                style={{ marginBottom: 24 }}
            >
                <Descriptions column={1} size="small">
                    <Descriptions.Item label="Chế độ duyệt">
                        {approval.mode === 'manual' && 'Thủ công'}
                        {approval.mode === 'auto_conditional' && 'Tự động có điều kiện'}
                        {approval.mode === 'auto_full' && 'Tự động hoàn toàn'}
                    </Descriptions.Item>
                    {approval.mode === 'auto_conditional' && (
                        <>
                            <Descriptions.Item label="Điểm tín dụng tối thiểu">
                                {approval.conditions.minCreditScore} điểm
                            </Descriptions.Item>
                            <Descriptions.Item label="Số tiền vay tối đa">
                                {approval.conditions.maxCapital.toLocaleString('vi-VN')} VND
                            </Descriptions.Item>
                            <Descriptions.Item label="Kỳ hạn tối đa">
                                {approval.conditions.maxTerm} tháng
                            </Descriptions.Item>
                        </>
                    )}
                    <Descriptions.Item label="Chế độ giải ngân">
                        {disbursement.mode === 'manual' ? 'Thủ công' : 'Tự động'}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {/* Nút lưu */}
            <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleSave}
                loading={saving}
                style={{ minWidth: 200 }}
            >
                Lưu cấu hình
            </Button>
        </div>
    );
};

export default LoanConfigPage;
