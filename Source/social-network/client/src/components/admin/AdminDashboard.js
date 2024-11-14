import React, { useState } from 'react';
import { Layout, Menu, Card, Statistic } from 'antd';
import { DashboardOutlined, LineChartOutlined, UserOutlined } from '@ant-design/icons';
import CacheMonitor from './CacheMonitor';
import styled from 'styled-components';

const { Content, Sider } = Layout;

const StyledLayout = styled(Layout)`
    min-height: 100vh;
`;

const StyledContent = styled(Content)`
    margin: 24px 16px;
    padding: 24px;
    background: #fff;
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
            <Sider width={200} theme="light">
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
            </Sider>
            <StyledContent>
                {renderContent()}
            </StyledContent>
        </StyledLayout>
    );
};

export default AdminDashboard;