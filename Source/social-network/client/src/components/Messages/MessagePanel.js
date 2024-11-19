import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Empty, Spin, List, Avatar, Badge } from 'antd';
import axios from 'axios';
import ChatWindow from './ChatWindow';

const PanelContainer = styled.div`
    width: 800px;
    height: 600px;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
`;

const FriendListContainer = styled.div`
    width: 280px;
    border-right: 1px solid #e8e8e8;
    display: flex;
    flex-direction: column;
`;

const Header = styled.div`
    padding: 12px 16px;
    font-weight: 600;
    border-bottom: 1px solid #e8e8e8;
`;

const ChatList = styled.div`
    flex: 1;
    overflow-y: auto;
    
    .chat-item {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        cursor: pointer;
        
        &:hover {
            background: #f5f5f5;
        }
        
        &.active {
            background: #e6f7ff;
        }
    }
`;

const MessagePanel = () => {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState(null);

    // 获取好友列表
    const fetchFriends = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/friends', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriends(response.data);
        } catch (error) {
            console.error('获取好友列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFriends();
    }, []);

    if (loading) {
        return (
            <PanelContainer>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <Spin />
                </div>
            </PanelContainer>
        );
    }

    return (
        <PanelContainer>
            <FriendListContainer>
                <Header>消息</Header>
                <ChatList>
                    {friends.length === 0 ? (
                        <Empty 
                            description="暂无好友" 
                            style={{ margin: '20px 0' }}
                        />
                    ) : (
                        <List
                            dataSource={friends}
                            renderItem={friend => (
                                <div 
                                    className={`chat-item ${selectedFriend?._id === friend._id ? 'active' : ''}`}
                                    onClick={() => setSelectedFriend(friend)}
                                >
                                    <Avatar src={friend.avatar} style={{ marginRight: 12 }} />
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{friend.username}</div>
                                        <div style={{ fontSize: '12px', color: '#999' }}>
                                            {friend.lastMessage || '暂无消息'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                    )}
                </ChatList>
            </FriendListContainer>
            
            {selectedFriend ? (
                <ChatWindow 
                    friend={selectedFriend}
                    onMessageSent={fetchFriends}
                />
            ) : (
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                }}>
                    <Empty description="选择一个好友开始聊天" />
                </div>
            )}
        </PanelContainer>
    );
};

export default MessagePanel;