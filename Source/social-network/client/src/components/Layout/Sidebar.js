// 保留原有功能的侧边栏
import React, { useState, useEffect } from 'react';
import { Menu, Badge, Popover,Avatar, Modal} from 'antd';
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
  width: 300px;
  max-height: 400px;
  overflow-y: auto;

  .notification-header {
    padding: 12px 16px;
    font-weight: 600;
    border-bottom: 1px solid ${theme.colors.border};
  }

  .notification-item {
    padding: 8px 16px;
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: ${theme.colors.backgroundHover};
    }

    .avatar {
      margin-right: 12px;
    }

    .content {
      flex: 1;
      font-size: 14px;
      
      .username {
        font-weight: 600;
      }
      
      .time {
        font-size: 12px;
        color: ${theme.colors.text.secondary};
      }
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
            const response = await axios.get('http://localhost:5000/api/friends/requests', { // 修改为正确的endpoint
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Session-ID': sessionStorage.getItem('sessionId')
                }
            });
            setNotifications(response.data);
        } catch (error) {
            console.error('获取通知失败:', error);
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

    const notificationContent = (
        <NotificationPopover>
            <div className="notification-header">通知</div>
            {notifications.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                    暂无新通知
                </div>
            ) : (
                notifications.map(notification => (
                    <div 
                        key={notification._id} 
                        className="notification-item"
                        onClick={() => navigate('/friend-requests')}
                    >
                        <Avatar 
                            className="avatar"
                            src={notification.sender.avatar} 
                            icon={<UserOutlined />}
                        />
                        <div className="content">
                            <span className="username">{notification.sender.username}</span>
                            {' 向你发送了好友请求'}
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
                        <Menu.Item key="/notifications">
                            <Popover 
                                content={notificationContent}
                                trigger="click"
                                placement="right"
                                overlayStyle={{ padding: 0 }}
                            >
                                <Badge count={notifications.length}>
                                    {notifications.length > 0 ? <HeartFilled /> : <HeartOutlined />}
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