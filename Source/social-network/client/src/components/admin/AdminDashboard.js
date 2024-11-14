import React, { useState } from 'react';
import { Layout, Menu, Card, Statistic } from 'antd';
import { DashboardOutlined, LineChartOutlined, UserOutlined } from '@ant-design/icons';
import CacheMonitor from './CacheMonitor';
import styled from 'styled-components';

const { Content, Sider } = Layout;

const StyledLayout = styled(Layout)`
    min-height: 100vh;
`;

const StyledSider = styled(Sider)`
    box-shadow: 2px 0 8px rgba(0,0,0,0.15);
    .ant-menu {
        border-right: none;
    }
`;

const StyledContent = styled(Content)`
    margin: 24px;
    padding: 24px;
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
`;

const PageHeader = styled.div`
    margin-bottom: 24px;
    h1 {
        margin: 0;
        font-size: 24px;
    }
`;

const AdminDashboard = () => {
    const [selectedMenu, setSelectedMenu] = useState('cache');

    const renderContent = () => {
        switch (selectedMenu) {
            case 'cache':
                return <CacheMonitor />;
            case 'users':
                return <div>用户管理</div>;
            default:
                return <div>概览</div>;
        }
    };

    return (
        <StyledLayout>
            <StyledSider width={200} theme="light">
                <Menu
                    mode="inline"
                    selectedKeys={[selectedMenu]}
                    onSelect={({key}) => setSelectedMenu(key)}
                    style={{ height: '100%' }}
                >
                    <Menu.Item key="overview" icon={<DashboardOutlined />}>
                        系统概览
                    </Menu.Item>
                    <Menu.Item key="cache" icon={<LineChartOutlined />}>
                        缓存监控
                    </Menu.Item>
                    <Menu.Item key="users" icon={<UserOutlined />}>
                        用户管理
                    </Menu.Item>
                </Menu>
            </StyledSider>
            <StyledContent>
                <PageHeader>
                    <h1>系统监控</h1>
                </PageHeader>
                {renderContent()}
            </StyledContent>
        </StyledLayout>
    );
};

export default AdminDashboard;