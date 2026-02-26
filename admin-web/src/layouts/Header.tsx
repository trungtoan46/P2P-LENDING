import React from 'react';
import { Layout, Button, Avatar, Dropdown, Space, theme } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    LogoutOutlined,
    BellOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header: AntHeader } = Layout;

interface HeaderProps {
    collapsed: boolean;
    onToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ collapsed, onToggle }) => {
    const { token } = theme.useToken();

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/login';
    };

    const dropdownItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Hồ sơ',
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Đăng xuất',
            onClick: handleLogout,
        },
    ];

    return (
        <AntHeader
            style={{
                padding: '0 24px',
                background: token.colorBgContainer,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 4px rgba(0,21,41,.08)',
                position: 'sticky',
                top: 0,
                zIndex: 1,
            }}
        >
            <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={onToggle}
                style={{ fontSize: 16, width: 64, height: 64 }}
            />

            <Space size={16}>
                <Button type="text" icon={<BellOutlined />} />
                <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
                    <Space style={{ cursor: 'pointer' }}>
                        <Avatar icon={<UserOutlined />} />
                        <span>Admin</span>
                    </Space>
                </Dropdown>
            </Space>
        </AntHeader>
    );
};

export default Header;
