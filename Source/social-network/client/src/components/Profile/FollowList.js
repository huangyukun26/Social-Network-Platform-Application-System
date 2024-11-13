import React from 'react';
import { List, Avatar, Button, message } from 'antd';
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

const FollowList = ({ users, type, onUpdate, currentUserId }) => {
    const handleFollow = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `http://localhost:5000/api/users/follow/${userId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` }}
            );
            message.success(type === 'following' ? '已取消关注' : '已关注');
            if (onUpdate) onUpdate();
        } catch (error) {
            message.error('操作失败');
            console.error('关注操作失败:', error);
        }
    };

    return (
        <StyledList
            dataSource={users}
            renderItem={user => (
                <List.Item
                    actions={[
                        currentUserId !== user._id && (
                            <Button
                                type={user.isFollowing ? 'default' : 'primary'}
                                onClick={() => handleFollow(user._id)}
                            >
                                {user.isFollowing ? '取消关注' : '关注'}
                            </Button>
                        )
                    ]}
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