import React, { useState } from 'react';
import { Input, List, Avatar, Button, message, Spin } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import axios from 'axios';
import debounce from 'lodash/debounce';

const SearchContainer = styled.div`
    margin-bottom: 24px;
`;

const SearchInput = styled(Input)`
    margin-bottom: 16px;
    border-radius: 8px;
    
    .ant-input {
        background-color: #f5f5f5;
        &:hover, &:focus {
            background-color: #ffffff;
        }
    }
`;

const SearchResultList = styled(List)`
    background: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

    .ant-list-item {
        padding: 12px 16px;
        transition: all 0.3s ease;

        &:hover {
            background-color: #f8f9fa;
        }
    }
`;

const ActionButton = styled(Button)`
    &.add-friend {
        background-color: #43a047;
        border-color: #43a047;
        color: white;
        transition: all 0.3s ease;

        &:hover {
            background-color: #388e3c;
            border-color: #388e3c;
            color: white;
        }
    }

    &.already-friend {
        background-color: #f5f5f5;
        border: 1px solid #e8e8e8;
        color: #8c8c8c;
        cursor: default;

        &:hover {
            background-color: #f5f5f5;
            border: 1px solid #e8e8e8;
            color: #8c8c8c;
        }
    }
`;

const UserSearch = ({ onUpdate }) => {
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchType, setSearchType] = useState('basic');

    const searchUsers = debounce(async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const endpoint = searchType === 'advanced' 
                ? '/api/users/search/advanced'
                : '/api/users/search';
                
            const response = await axios.get(
                `http://localhost:5000${endpoint}?query=${query}`,
                { headers: { Authorization: `Bearer ${token}` }}
            );
            setSearchResults(response.data);
        } catch (error) {
            console.error('搜索失败:', error);
            message.error('搜索失败');
        } finally {
            setLoading(false);
        }
    }, 500);

    const handleSendRequest = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `http://localhost:5000/api/friends/request/${userId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` }}
            );
            message.success('好友请求已发送');
            if (onUpdate) onUpdate();
        } catch (error) {
            if (error.response?.status === 400) {
                message.warning(error.response.data.message || '已经发送过好友请求');
            } else {
                message.error('发送请求失败');
            }
        }
    };

    const renderActionButton = (user) => {
        if (user.isFriend) {
            return (
                <ActionButton className="already-friend" disabled>
                    已是好友
                </ActionButton>
            );
        }
        return (
            <ActionButton 
                className="add-friend"
                type="primary"
                onClick={() => handleSendRequest(user._id)}
            >
                添加好友
            </ActionButton>
        );
    };

    return (
        <SearchContainer>
            <SearchInput
                prefix={<SearchOutlined style={{ color: '#8e8e8e' }} />}
                placeholder="搜索用户..."
                onChange={(e) => searchUsers(e.target.value)}
                allowClear
            />
            
            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin />
                </div>
            ) : (
                <SearchResultList
                    dataSource={searchResults}
                    renderItem={user => (
                        <List.Item
                            actions={[renderActionButton(user)]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Avatar
                                        size={44}
                                        src={user.avatar ? `http://localhost:5000${user.avatar}` : null}
                                        icon={!user.avatar && <UserOutlined />}
                                    />
                                }
                                title={
                                    <span>
                                        {user.username}
                                        {user.isPrivate && 
                                            <span style={{ marginLeft: 8, color: '#8e8e8e', fontSize: 12 }}>
                                                (私密账户)
                                            </span>
                                        }
                                    </span>
                                }
                                description={
                                    <div>
                                        <div>{user.bio || '这个人很懒，什么都没写~'}</div>
                                        <div style={{ marginTop: 4, color: '#8e8e8e', fontSize: 12 }}>
                                            {user.statistics.friendsCount} 好友
                                        </div>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            )}
        </SearchContainer>
    );
};

export default UserSearch; 