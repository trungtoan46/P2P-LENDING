import React from 'react';
import { Layout, Menu } from 'antd';
import {
    DashboardOutlined,
    UserOutlined,
    BankOutlined,
    DollarOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../config/routes';

const { Sider } = Layout;

interface SidebarProps {
    collapsed: boolean;
}

const menuItems = [
    {
        key: ROUTES.DASHBOARD,
        icon: <DashboardOutlined />,
        label: 'Tổng quan',
    },
    {
        key: 'customers',
        icon: <UserOutlined />,
        label: 'Khách hàng',
        children: [
            { key: ROUTES.BORROWERS, label: 'Người vay' },
            { key: ROUTES.LENDERS, label: 'Nhà đầu tư' },
            { key: ROUTES.KYC_APPROVAL, label: 'Duyệt KYC' },
        ],
    },
    {
        key: 'loans',
        icon: <BankOutlined />,
        label: 'Khoản vay',
        children: [
            { key: ROUTES.LOAN_REQUESTS, label: 'Yêu cầu vay' },
            { key: ROUTES.ACTIVE_LOANS, label: 'Đang hoạt động' },
            { key: ROUTES.OVERDUE_LOANS, label: 'Quá hạn' },
        ],
    },
    {
        key: 'finance',
        icon: <DollarOutlined />,
        label: 'Kế toán',
        children: [
            { key: ROUTES.TRANSACTIONS, label: 'Giao dịch' },
            { key: ROUTES.REPAYMENTS, label: 'Trả nợ' },
            { key: ROUTES.FEE_COLLECTION, label: 'Thu phí' },
        ],
    },
    {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Cấu hình',
        children: [
            { key: ROUTES.PRODUCT_CONFIG, label: 'Sản phẩm' },
        ],
    },
];

export const SidebarContent: React.FC<{ collapsed?: boolean; onClick?: () => void }> = ({ collapsed, onClick }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleMenuClick = ({ key }: { key: string }) => {
        navigate(key);
        if (onClick) onClick();
    };

    return (
        <>
            <div
                style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: collapsed ? 16 : 20,
                    fontWeight: 'bold',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                {collapsed ? 'P2P' : 'P2P Admin'}
            </div>
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[location.pathname]}
                defaultOpenKeys={['customers', 'loans', 'finance']}
                items={menuItems}
                onClick={handleMenuClick}
                style={{ borderRight: 0 }}
            />
        </>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
    return (
        <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            theme="dark"
            width={250}
            style={{
                overflow: 'auto',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                zIndex: 100,
            }}
        >
            <SidebarContent collapsed={collapsed} />
        </Sider>
    );
};

export default Sidebar;
