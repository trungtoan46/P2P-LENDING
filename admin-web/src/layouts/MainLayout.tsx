import React, { useState } from 'react';
import { Layout, Grid, Drawer, theme } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar, { SidebarContent } from './Sidebar';
import Header from './Header';

const { Content } = Layout;

const MainLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();

    // Use md as breakpoint for desktop sidebar
    const isDesktop = screens.md;

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {isDesktop ? (
                <Sidebar collapsed={collapsed} />
            ) : (
                <Drawer
                    placement="left"
                    onClose={() => setCollapsed(true)}
                    open={!collapsed}
                    styles={{ body: { padding: 0, backgroundColor: '#001529' } }}
                    width={250}
                    closable={false}
                >
                    <SidebarContent onClick={() => setCollapsed(true)} />
                </Drawer>
            )}

            <Layout style={{
                marginLeft: isDesktop ? (collapsed ? 80 : 250) : 0,
                transition: 'margin-left 0.2s'
            }}>
                <Header
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(!collapsed)}
                />
                <Content
                    style={{
                        margin: 24,
                        padding: 24,
                        minHeight: 280,
                        overflow: 'auto',
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
