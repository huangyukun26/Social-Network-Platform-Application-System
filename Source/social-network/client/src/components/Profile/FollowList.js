import React, { useState, useEffect } from 'react';
import { List, Avatar, Button, message, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

const StyledList = styled(List)`
  .ant-list-item {
    padding: 16px;
    margin-bottom: 8px;
    background: white;
    border-radius: 8px;
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  }
`;

const FollowList = ({ users, type, onUpdate, currentUserId, isOwnProfile = false }) => {
    const [followStatus, setFollowStatus] = useState({});
    
    // 添加组件级别的调试日志
    useEffect(() => {
        console.log('FollowList mounted with props:', {
            type,
            isOwnProfile,
            currentUserId,
            usersCount: users?.length
        });
    }, [type, isOwnProfile, currentUserId, users]);

    // 获取关注状态
    const fetchFollowStatus = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5000/api/follow/status/${userId}`,
                { headers: { Authorization: `Bearer ${token}` }}
            );
            return response.data.isFollowing;
        } catch (error) {
            console.error('获取关注状态失败:', error);
            return false;
        }
    };

    // 初始化所有用户的关注状态
    useEffect(() => {
        const initFollowStatus = async () => {
            const statusMap = {};
            for (const user of users) {
                if (user._id !== currentUserId) {
                    // 对于"关注"列表，默认设置为已关注
                    if (type === 'following') {
                        statusMap[user._id] = true;
                    } else {
                        // 对于"粉丝"列表，需要检查是否互相关注
                        const isFollowing = await fetchFollowStatus(user._id);
                        statusMap[user._id] = isFollowing;
                    }
                }
            }
            setFollowStatus(statusMap);
        };
        
        initFollowStatus();
    }, [users, currentUserId, type]);

    const handleFollow = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `http://localhost:5000/api/follow/${userId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` }}
            );
            
            // 更新本地状态
            setFollowStatus(prev => ({
                ...prev,
                [userId]: !prev[userId]
            }));
            
            message.success(followStatus[userId] ? '已取消关注' : '已关注');
            
            // 立即调用父组件的更新函数
            if (onUpdate) {
                await onUpdate();  // 等待更新完成
            }
            
            // 如果是在"关注"列表中取消关注，从列表中移除该用户
            if (type === 'following' && followStatus[userId]) {
                // 通知父组件需要重新获取关注列表
                if (onUpdate) {
                    await onUpdate();
                }
            }
        } catch (error) {
            console.error('关注操作失败:', error);
            message.error('操作失败');
        }
    };

    const handleRemoveFollower = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `http://localhost:5000/api/follow/remove-follower/${userId}`,
                { headers: { Authorization: `Bearer ${token}` }}
            );
            
            message.success('已移除粉丝');
            
            // 立即更新列表
            if (onUpdate) {
                await onUpdate();
            }
        } catch (error) {
            console.error('移除粉丝失败:', error);
            message.error('操作失败');
        }
    };

    const renderFollowButton = (user) => {
        if (user._id === currentUserId) return null;

        console.log('Render Button Values:', {
            type,
            isOwnProfile,
            currentUserId,
            userId: user._id,
            isFollowersType: type === 'followers',
            finalCondition: type === 'followers' && isOwnProfile
        });

        if (type === 'followers' && isOwnProfile) {
            return (
                <Space size="small">
                    <Button
                        type="text"
                        danger
                        onClick={() => handleRemoveFollower(user._id)}
                    >
                        移除粉丝
                    </Button>
                    <Button
                        type={followStatus[user._id] ? 'default' : 'primary'}
                        onClick={() => handleFollow(user._id)}
                    >
                        {followStatus[user._id] ? '互相关注' : '关注'}
                    </Button>
                </Space>
            );
        } else if (type === 'following') {
            return (
                <Button
                    type="default"
                    onClick={() => handleFollow(user._id)}
                >
                    取消关注
                </Button>
            );
        } else {
            return (
                <Button
                    type={followStatus[user._id] ? 'default' : 'primary'}
                    onClick={() => handleFollow(user._id)}
                >
                    {followStatus[user._id] ? '互相关注' : '关注'}
                </Button>
            );
        }
    };

    return (
        <List
            dataSource={users}
            renderItem={user => (
                <List.Item
                    actions={[renderFollowButton(user)]}
                >
                    <List.Item.Meta
                        avatar={
                            <Link to={`/profile/${user._id}`}>
                                <Avatar 
                                    src={user.avatar ? `http://localhost:5000${user.avatar}` : null}
                                    icon={!user.avatar && <UserOutlined />}
                                />
                            </Link>
                        }
                        title={
                            <Link to={`/profile/${user._id}`}>
                                {user.username}
                            </Link>
                        }
                        description={user.bio || '这个人很懒，什么都没写~'}
                    />
                </List.Item>
            )}
        />
    );
};

export default FollowList; 