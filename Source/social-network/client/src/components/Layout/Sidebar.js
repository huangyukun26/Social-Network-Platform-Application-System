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
    MessageOutlined,
    CommentOutlined
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

const UserPopoverContent = styled.div`
  width: 300px;
  padding: 16px;

  .header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  .info {
    margin-left: 12px;
    flex: 1;
  }

  .username {
    font-weight: 600;
    font-size: 16px;
    color: #262626;
  }

  .bio {
    color: #8e8e8e;
    margin: 8px 0;
    font-size: 14px;
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

// 修改帖子预览的样式组件
const PostPreviewPopover = styled.div`
  width: 600px;  // 加宽以便更好地显示内容
  display: flex;
  background: white;
  border-radius: 8px;
  overflow: hidden;

  .image-section {
    flex: 1.5;
    background: ${props => props.hasImage ? '#000' : '#f5f5f5'};
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    position: relative;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .text-only {
      padding: 20px;
      color: #262626;
      font-size: 16px;
      text-align: center;
      width: 100%;
    }
  }

  .content-section {
    flex: 1;
    border-left: 1px solid #efefef;
    display: flex;
    flex-direction: column;

    .header {
      padding: 16px;
      border-bottom: 1px solid #efefef;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .post-content {
      padding: 16px;
      flex: 1;
      overflow-y: auto;
    }

    .post-stats {
      padding: 16px;
      border-top: 1px solid #efefef;
      display: flex;
      gap: 24px;
      color: #8e8e8e;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  }
`;

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [friendRequestCount, setFriendRequestCount] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [loadingUser, setLoadingUser] = useState(false);
    const [currentPopoverUser, setCurrentPopoverUser] = useState(null);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const sessionId = sessionStorage.getItem('sessionId');
        const storedUser = JSON.parse(sessionStorage.getItem('user'));
        
        if (token && sessionId && storedUser) {
            setUser(storedUser);
        }
    }, []);

    // 修改获取通知的函数
    const fetchNotifications = async () => {
        try {
            const token = sessionStorage.getItem('token');
            // 1. 获取好友请求
            const friendResponse = await axios.get('http://localhost:5000/api/friends/requests', {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Session-ID': sessionStorage.getItem('sessionId')
                }
            });

            // 2. 获取所有通知（关注、点赞、评论）
            const notificationsResponse = await axios.get('http://localhost:5000/api/notifications', {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Session-ID': sessionStorage.getItem('sessionId')
                }
            });

            // 处理好友请求通知
            const pendingRequests = friendResponse.data
                .filter(request => request.status === 'pending')
                .map(request => ({
                    _id: request._id,
                    type: 'friend_request',
                    sender: request.sender,
                    content: '向你发送了好友请求',
                    isRead: request.isRead,
                    createdAt: request.createdAt
                }));

            // 处理其他类型的通知
            const otherNotifications = notificationsResponse.data
                .map(notification => {
                    let content = '';
                    switch (notification.type) {
                        case 'follow':
                            content = '关注了你';
                            break;
                        case 'like':
                            content = '赞了你的帖子';
                            break;
                        case 'comment':
                            content = `评论了你的帖子: ${notification.content}`;
                            break;
                        default:
                            content = notification.content;
                    }
                    return {
                        ...notification,
                        content
                    };
                });

            // 合并所有通知并按时间排序
            const allNotifications = [...pendingRequests, ...otherNotifications]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setNotifications(allNotifications);
            // 更新未读计数
            setFriendRequestCount(allNotifications.filter(n => !n.isRead).length);
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

    // 修改通知点击处理函数
    const handleNotificationClick = async (notification) => {
        try {
            const token = sessionStorage.getItem('token');
            
            if (notification.type === 'friend_request') {
                // 处理好友请求通知
                await axios.put(
                    `http://localhost:5000/api/friends/requests/${notification._id}/read`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` }}
                );
            } else {
                // 处理其他类型通知
                await axios.put(
                    `http://localhost:5000/api/notifications/read/${notification._id}`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` }}
                );
            }

            // 更新本地通知状态
            setNotifications(prev =>
                prev.map(n => 
                    n._id === notification._id ? { ...n, isRead: true } : n
                )
            );
            
            // 更新未读计数
            setFriendRequestCount(prev => Math.max(0, prev - 1));

        } catch (error) {
            console.error('处理通知失败:', error);
            message.error('操作失败');
        }
    };

    // 修改标记全部已读的处理函数
    const handleMarkAllRead = async () => {
        try {
            const token = sessionStorage.getItem('token');
            
            // 并行处理两种通知的已读标记
            await Promise.all([
                // 标记所有好友请求为已读
                axios.put(
                    'http://localhost:5000/api/friends/requests/read-all',
                    {},
                    { headers: { Authorization: `Bearer ${token}` }}
                ),
                // 标记所有通知为已读
                axios.put(
                    'http://localhost:5000/api/notifications/read-all',
                    {},
                    { headers: { Authorization: `Bearer ${token}` }}
                )
            ]);
            
            // 更新地通知状态
            setNotifications(prev => 
                prev.map(n => ({ ...n, isRead: true }))
            );
            
            // 重置未读计数
            setFriendRequestCount(0);
            
            message.success('已标记所有通知为已读');
        } catch (error) {
            console.error('标记已读失败:', error);
            message.error('操作失败');
        }
    };

    // 修改用户信息悬浮卡片内容渲染函数
    const renderUserPopover = (userData) => {
        if (!userData) return <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>;

        return (
            <UserPopoverContent>
                <div className="header">
                    <Avatar
                        size={64}
                        src={userData.avatar ? `http://localhost:5000${userData.avatar}` : null}
                        icon={!userData.avatar && <UserOutlined />}
                    />
                    <div className="info">
                        <div className="username">
                            {userData.username}
                            {userData.privacy?.profileVisibility === 'private' && 
                                <span style={{ fontSize: '12px', color: '#8e8e8e', marginLeft: '4px' }}>
                                    (私密账户)
                                </span>
                            }
                        </div>
                        <div className="bio">{userData.bio || '这个人很懒，什么都没写~'}</div>
                    </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                    <Button
                        type="primary"
                        onClick={() => navigate(`/profile/${userData._id}`)}
                        block
                    >
                        查看主页
                    </Button>
                </div>
            </UserPopoverContent>
        );
    };

    // 修改 Popover 的使用方式，添加异步加载支持
    const [popoverContent, setPopoverContent] = useState({});

    // 添加获取用户数据的处理函数
    const handlePopoverOpen = async (userId) => {
        if (!popoverContent[userId]) {
            setLoadingUser(true);
            try {
                const userData = await fetchUserInfo(userId);
                setPopoverContent(prev => ({
                    ...prev,
                    [userId]: userData
                }));
                setCurrentPopoverUser(userData);
            } catch (error) {
                console.error('获取用户信息失败:', error);
            } finally {
                setLoadingUser(false);
            }
        } else {
            setCurrentPopoverUser(popoverContent[userId]);
        }
    };

    // 修改帖子预览渲染函数
    const renderPostPreview = (post) => {
        if (!post) return null;

        const hasImage = post.images?.[0] || post.image;

        return (
            <PostPreviewPopover hasImage={hasImage}>
                <div className="image-section">
                    {hasImage ? (
                        <img 
                            src={`http://localhost:5000${post.images?.[0] || post.image}`}
                            alt="Post content"
                        />
                    ) : (
                        <div className="text-only">
                            {post.content}
                        </div>
                    )}
                </div>
                <div className="content-section">
                    <div className="header">
                        <Avatar
                            size={32}
                            src={post.author?.avatar ? `http://localhost:5000${post.author.avatar}` : null}
                            icon={!post.author?.avatar && <UserOutlined />}
                        />
                        <strong>{post.author?.username}</strong>
                    </div>
                    {hasImage && (
                        <div className="post-content">
                            {post.content}
                        </div>
                    )}
                    <div className="post-stats">
                        <div className="stat-item">
                            <HeartOutlined /> {post.likes?.length || 0}
                        </div>
                        <div className="stat-item">
                            <CommentOutlined /> {post.comments?.length || 0}
                        </div>
                    </div>
                </div>
            </PostPreviewPopover>
        );
    };

    // 修改通知内容渲染，添加用户悬浮卡片
    const notificationContent = (
        <NotificationPopover>
            <div className="notification-header">
                <span>通知</span>
                {notifications.some(n => !n.isRead) && (
                    <Button type="link" size="small" onClick={handleMarkAllRead}>
                        全部标记已读
                    </Button>
                )}
            </div>
            {notifications.length === 0 ? (
                <Empty description="暂无通知" style={{ padding: '20px' }} />
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
                        <Popover
                            placement="right"
                            trigger="hover"
                            onVisibleChange={(visible) => {
                                if (visible) {
                                    handlePopoverOpen(notification.sender._id);
                                }
                            }}
                            content={loadingUser ? 
                                <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div> : 
                                renderUserPopover(currentPopoverUser || notification.sender)
                            }
                            destroyTooltipOnHide
                            mouseEnterDelay={0.5}
                            overlayStyle={{ padding: 0 }}
                        >
                            <Avatar
                                className="avatar"
                                src={notification.sender.avatar ? 
                                    `http://localhost:5000${notification.sender.avatar}` : null}
                                icon={!notification.sender.avatar && <UserOutlined />}
                            />
                        </Popover>
                        <div className="content">
                            <div>
                                <Popover
                                    placement="right"
                                    trigger="hover"
                                    onVisibleChange={(visible) => {
                                        if (visible) {
                                            handlePopoverOpen(notification.sender._id);
                                        }
                                    }}
                                    content={loadingUser ? 
                                        <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div> : 
                                        renderUserPopover(currentPopoverUser || notification.sender)
                                    }
                                    destroyTooltipOnHide
                                    mouseEnterDelay={0.5}
                                    overlayStyle={{ padding: 0 }}
                                >
                                    <strong style={{ cursor: 'pointer' }}>
                                        {notification.sender.username}
                                    </strong>
                                </Popover>
                                {' '}
                                {(notification.type === 'like' || notification.type === 'comment') && notification.post ? (
                                    <Popover
                                        placement="right"
                                        trigger="hover"
                                        content={renderPostPreview(notification.post)}
                                        destroyTooltipOnHide
                                        mouseEnterDelay={0.5}
                                        overlayStyle={{ padding: 0 }}
                                    >
                                        <span 
                                            style={{ 
                                                cursor: 'pointer',
                                                color: '#1890ff'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation(); // 阻止事件冒泡
                                                const authorId = notification.post?.author?._id || 
                                                        notification.post?.author || 
                                                        notification.sender?._id;  // 如果都没有，使用通知发送者的ID作为后备
                                                if (authorId) {
                                                    navigate(`/profile/${authorId}`, {
                                                        state: { selectedPost: notification.post }
                                                    });
                                                } else {
                                                    message.error('无法获取帖子作者信息');
                                                }
                                            }}
                                        >
                                            {notification.content}
                                        </span>
                                    </Popover>
                                ) : (
                                    <span>{notification.content}</span>
                                )}
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
    
    // 简化用户信息获取函数
    const fetchUserInfo = async (userId) => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5000/api/users/${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Session-ID': sessionStorage.getItem('sessionId')
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return null;
        }
    };

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
                                <Badge count={friendRequestCount}>
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