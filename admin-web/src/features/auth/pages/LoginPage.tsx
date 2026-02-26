import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/axios';

const { Title, Text } = Typography;

interface LoginForm {
    phone: string;
    password: string;
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onFinish = async (values: LoginForm) => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/login', {
                phone: values.phone,
                password: values.password,
            });

            const { token, user } = response.data.data || response.data;

            // Kiểm tra user có phải admin không
            if (user?.category !== 'admin') {
                setError('Tài khoản không có quyền admin');
                setLoading(false);
                return;
            }

            // Lưu token vào localStorage
            localStorage.setItem('adminToken', token);
            localStorage.setItem('adminUser', JSON.stringify(user));

            message.success('Đăng nhập thành công!');
            window.location.href = '/';
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Đăng nhập thất bại';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
        >
            <Card
                style={{
                    width: 400,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    borderRadius: 12,
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Title level={2} style={{ marginBottom: 8, color: '#1890ff' }}>
                        P2P Admin
                    </Title>
                    <Text type="secondary">Đăng nhập để quản lý hệ thống</Text>
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />
                )}

                <Form
                    name="login"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                    initialValues={{ phone: '', password: '' }}
                >
                    <Form.Item
                        name="phone"
                        rules={[
                            { required: true, message: 'Vui lòng nhập số điện thoại!' },
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Số điện thoại"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu!' },
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Mật khẩu"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            style={{ height: 48 }}
                        >
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default LoginPage;
