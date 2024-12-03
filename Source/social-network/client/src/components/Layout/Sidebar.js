// 保留原有功能的侧边栏
import React, { useState, useEffect } from 'react';
import { Menu, Badge, Popover,Avatar, Modal, Button, Empty} from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { theme } from '../../styles/theme';
import styled from 'styled-components';
import {
    HomeOutlined,
    BellOutlined,
    MailOutlined,
    UserOutlined,
    TeamOutlined,
    LogoutOutlined,
    HeartOutlined,
    HeartFilled,
    MessageOutlined
} from '@ant-design/icons';
import MessagePanel from '../Messages/MessagePanel';
import axios from 'axios';
import { message } from 'antd';
import CreatePost from '../Posts/CreatePost';

import { formatTime } from '../../utils/timeFormat'; // 添加 formatTime

// 添加 NotificationPopover 样式组件
const NotificationPopover = styled.div`
    width: 360px;
    max-height: 500px;
    overflow-y: auto;

    .notification-header {
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .notification-item {
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        display: flex;
        align-items: center;
        background: ${props => props.isRead ? 'white' : 'rgba(29, 155, 240, 0.1)'};

        &:hover {
            background: #f5f5f5;
        }

        .avatar {
            margin-right: 12px;
        }

        .content {
            flex: 1;
        }

        .time {
            color: #8e8e8e;
            font-size: 12px;
            margin-top: 4px;
        }
    }
`;

const SidebarContainer = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 275px;
  background: white;
  padding: 16px;
  border-right: 1px solid rgba(0, 0, 0, 0.15);
  z-index: 1000;
`;

const Logo = styled.div`
  padding: 16px;
  font-size: 24px;
  font-weight: 700;
  color: #000;
`;

const StyledMenu = styled(Menu)`
  border: none;
  background: transparent;
  
  .ant-menu-item {
    height: 50px;
    line-height: 50px;
    border-radius: 25px;
    margin: 4px 0;
    padding: 0 24px !important;
    
    &:hover {
      background-color: rgba(15, 20, 25, 0.1);
    }
    
    .anticon {
      font-size: 20px;
    }
    
    span {
      font-size: 16px;
      font-weight: 500;
    }
  }
`;

const PostButton = styled.button`
  width: 90%;
  height: 52px;
  margin: 16px auto;
  display: block;
  border-radius: 26px;
  border: none;
  background: rgb(29, 155, 240);
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background: rgb(26, 140, 216);
  }
`;

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [showCreatePost, setShowCreatePost] = useState(false);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const sessionId = sessionStorage.getItem('sessionId');
        const storedUser = JSON.parse(sessionStorage.getItem('user'));
        
        if (token && sessionId && storedUser) {
            setUser(storedUser);
        }
    }, []);

    // 使用原来 Navbar.js 中的正确 API endpoint
    const fetchNotifications = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/friends/requests', {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Session-ID': sessionStorage.getItem('sessionId')
                }
            });

            // 只过滤待处理的请求，不过滤已读状态
            const pendingRequests = response.data.filter(request => 
                request.status === 'pending'  // 移除 && !request.isRead 条件
            );

            // 格式化好友请求为通知格式
            const formattedNotifications = pendingRequests.map(request => ({
                _id: request._id,
                type: 'friend_request',
                sender: request.sender,
                content: '向你发送了好友请求',
                isRead: request.isRead,
                createdAt: request.createdAt
            }));

            setNotifications(formattedNotifications);
            // 只计算未读消息的数量
            setUnreadCount(formattedNotifications.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('获取好友请求失败:', error);
        }
    };

    const fetchUnreadMessages = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/messages/unread', {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Session-ID': sessionStorage.getItem('sessionId')
                }
            });
            setUnreadMessages(response.data.length);
        } catch (error) {
            console.error('获取未读消息失败:', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            fetchUnreadMessages();
            const interval = setInterval(fetchNotifications, 30000);
            const unreadInterval = setInterval(fetchUnreadMessages, 30000);
            return () => {
                clearInterval(interval);
                clearInterval(unreadInterval);
            };
        }
    }, [user]);

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('tokenExpiry');
        setUser(null);
        navigate('/login');
    };

    const handleProfileClick = (e) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        const sessionId = sessionStorage.getItem('sessionId');
        const storedUser = JSON.parse(sessionStorage.getItem('user'));
        
        if (!token || !sessionId || !storedUser) {
            message.error('请先登录');
            navigate('/login');
            return;
        }
        
        navigate(`/profile/${storedUser._id}`);
    };

    // 修改处理通知点击的函数
    const handleNotificationClick = async (notification) => {
        try {
            const token = sessionStorage.getItem('token');
            // 标记该通知为已读
            await axios.put(
                `http://localhost:5000/api/friends/requests/${notification._id}/read`,
                {},
                { headers: { Authorization: `Bearer ${token}` }}
            );

            // 更新本地通知状态，但保留通知
            setNotifications(prev =>
                prev.map(n => 
                    n._id === notification._id ? { ...n, isRead: true } : n
                )
            );
            
            // 更新未读计数
            setUnreadCount(prev => Math.max(0, prev - 1));

        } catch (error) {
            console.error('处理通知失败:', error);
            message.error('操作失败');
        }
    };

    // 修改标记全部已读的处理函数
    const handleMarkAllRead = async () => {
        try {
            const token = sessionStorage.getItem('token');
            await axios.put(
                'http://localhost:5000/api/friends/requests/read-all',
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            // 更新本地通知状态，但保留所有通知
            setNotifications(prev => 
                prev.map(n => ({ ...n, isRead: true }))
            );
            
            // 重置未读计数
            setUnreadCount(0);
            
            message.success('已标记所有通知为已读');
        } catch (error) {
            console.error('标记已读失败:', error);
            message.error('操作失败');
        }
    };

    // 通知内容渲染
    const notificationContent = (
        <NotificationPopover>
            <div className="notification-header">
                <span>好友请求</span>
                {notifications.some(n => !n.isRead) && (
                    <Button type="link" size="small" onClick={handleMarkAllRead}>
                        全部标记已读
                    </Button>
                )}
            </div>
            {notifications.length === 0 ? (
                <Empty description="暂无好友请求" style={{ padding: '20px' }} />
            ) : (
                notifications.map(notification => (
                    <div
                        key={notification._id}
                        className="notification-item"
                        onClick={() => handleNotificationClick(notification)}
                        style={{
                            backgroundColor: notification.isRead ? 'white' : 'rgba(29, 155, 240, 0.1)'
                        }}
                    >
                        <Avatar
                            className="avatar"
                            src={notification.sender.avatar ? 
                                `http://localhost:5000${notification.sender.avatar}` : null}
                            icon={!notification.sender.avatar && <UserOutlined />}
                        />
                        <div className="content">
                            <div>
                                <strong>{notification.sender.username}</strong>
                                {' '}
                                向你发送了好友请求
                            </div>
                            <div className="time">
                                {formatTime(notification.createdAt)}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </NotificationPopover>
    );
    
    return (
        <SidebarContainer>
            <Logo>GREEN NET</Logo>
            <StyledMenu
                mode="inline"
                selectedKeys={[location.pathname]}
            >
                <Menu.Item key="/" icon={<HomeOutlined />}>
                    <Link to="/">首页</Link>
                </Menu.Item>
                <Menu.Item key="/friends" icon={<TeamOutlined />}>
                    <Link to="/friends">好友</Link>
                </Menu.Item>
                {user && (
                    <>
                        <Menu.Item key="/profile" icon={<UserOutlined />}>
                            <Link 
                                to={`/profile/${user._id}`}
                                onClick={handleProfileClick}
                            >
                                个人主页
                            </Link>
                        </Menu.Item>
                        <Menu.Item key="notifications">
                            <Popover
                                content={notificationContent}
                                trigger="click"
                                placement="right"
                                overlayStyle={{ padding: 0 }}
                            >
                                <Badge count={unreadCount}>
                                    <BellOutlined />
                                    <span style={{marginLeft: '8px'}}>通知</span>
                                </Badge>
                            </Popover>
                        </Menu.Item>
                        <Menu.Item key="messages">
                            <Popover
                                content={<MessagePanel />}
                                trigger="click"
                                placement="right"
                                overlayStyle={{ padding: 0 }}
                            >
                                <Badge count={unreadMessages}>
                                    <MessageOutlined />
                                    <span style={{marginLeft: '8px'}}>消息</span>
                                </Badge>
                            </Popover>
                        </Menu.Item>
                        <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
                            退出
                        </Menu.Item>
                    </>
                )}
            </StyledMenu>
            <PostButton onClick={() => setShowCreatePost(true)}>
                发帖
            </PostButton>

            {/* 添加发帖模态框 */}
            <Modal
                visible={showCreatePost}
                onCancel={() => setShowCreatePost(false)}
                footer={null}
                width={600}
            >
                <CreatePost 
                    onSuccess={() => {
                        setShowCreatePost(false);
                        // 刷新帖子列表
                        window.location.reload();
                    }}
                    onError={() => message.error('发布失败，请重试')}
                />
            </Modal>
        </SidebarContainer>
    );
};

export default Sidebar;