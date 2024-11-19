import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { Empty, Spin, List, Avatar, Badge } from 'antd';
import axios from 'axios';
import ChatWindow from './ChatWindow';
import MessageList from './MessageList';
import io from 'socket.io-client';

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
    const [unreadCounts, setUnreadCounts] = useState({});
    const messageListRef = useRef(null);
    const currentUserId = JSON.parse(sessionStorage.getItem('user'))?._id;
    const socket = useRef(null);

    // 添加获取未读消息数的函数
    const updateUnreadCounts = useCallback(async () => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get(
                'http://localhost:5000/api/messages/unread',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const unreadData = Array.isArray(response.data) ? response.data : [];
            const counts = {};
            
            unreadData.forEach(item => {
                if (item && item.senderId) {
                    counts[item.senderId] = item.count || 0;
                }
            });
            
            console.log('未读消息计数:', counts);
            setUnreadCounts(counts);
        } catch (error) {
            console.error('获取未读消息数失败:', error);
            setUnreadCounts({});
        }
    }, []);

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

    // 初始化时获取好友列表和未读消息数
    useEffect(() => {
        if (currentUserId) {
            fetchFriends();
            updateUnreadCounts();
        }
    }, [currentUserId, updateUnreadCounts]);

    // 修改 Socket 初始化和事件处理
    useEffect(() => {
        if (!currentUserId) return;

        const token = sessionStorage.getItem('token');
        socket.current = io('http://localhost:5000', {
            auth: { token },
            transports: ['websocket']
        });

        const handleNewMessage = async (data) => {
            console.log('MessagePanel: 收到新消息:', data);
            
            if (data.message) {
                const { sender, receiver } = data.message;
                
                // 确保消息是发给当前用户的
                if (receiver._id === currentUserId) {
                    // 如果是当前选中的聊天，立即标记为已读
                    if (selectedFriend && sender._id === selectedFriend._id) {
                        await markMessagesAsRead(sender._id);
                    }
                    
                    // 无论如何都要刷新列表
                    if (messageListRef.current) {
                        await messageListRef.current.fetchChats();
                    }
                }
            }
        };

        socket.current.on('new_message', handleNewMessage);
        socket.current.on('connect', () => {
            console.log('Socket 已连接');
            fetchFriends();
            updateUnreadCounts();
        });

        return () => {
            if (socket.current) {
                socket.current.off('new_message');
                socket.current.off('connect');
                socket.current.disconnect();
            }
        };
    }, [currentUserId, selectedFriend, updateUnreadCounts]);

    // 修改标记已读函数
    const markMessagesAsRead = async (chat) => {
        if (!chat || !currentUserId) {
            console.error('标记已读缺少参数:', { chat, currentUserId });
            return;
        }
        
        try {
            console.log('正在标记消息已读:', chat);
            const token = sessionStorage.getItem('token');
            
            // 检查 chat 对象的结构
            const chatId = chat._id;
            if (!chatId) {
                console.error('聊天对象缺少 _id:', chat);
                return;
            }

            // 发送标记已读请求
            await axios.put(
                `http://localhost:5000/api/messages/chat/${chatId}/read`,
                {},  // 空对象作为请求体
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`
                    } 
                }
            );
            
            console.log('标记已读成功');
            await updateUnreadCounts();
            if (messageListRef.current) {
                await messageListRef.current.fetchChats();
            }
        } catch (error) {
            console.error('标记消息已读失败:', {
                error: error.response?.data || error,
                chat
            });
        }
    };

    // 修改好友选择处理函数
    const handleFriendSelect = async (chat) => {
        if (!chat) return;
        
        // 记录选中的聊天详情
        console.log('选中的聊天完整信息:', {
            chat,
            chatDetails: {
                _id: chat._id,
                userId: chat.userId,
                username: chat.username,
                unreadCount: chat.unreadCount
            }
        });
        
        const friend = {
            _id: chat.userId,
            username: chat.username,
            avatar: chat.avatar
        };
        
        setSelectedFriend(friend);
        
        // 选择好友时立即标记已读
        if (chat.unreadCount > 0) {
            console.log('发现未读消息，准备标记已读:', {
                unreadCount: chat.unreadCount,
                friend
            });
            
            try {
                await markMessagesAsRead(chat);
            } catch (error) {
                console.error('选择好友时标记已读失败:', {
                    error,
                    chat,
                    friend
                });
            }
        }
    };

    return (
        <PanelContainer>
            <FriendListContainer>
                <Header>消息</Header>
                <ChatList>
                    <MessageList
                        ref={messageListRef}
                        selectedId={selectedFriend?._id}
                        onSelect={handleFriendSelect}
                        friends={friends}
                    />
                </ChatList>
            </FriendListContainer>
            
            {selectedFriend ? (
                <ChatWindow 
                    friend={selectedFriend}
                    onMessageSent={async () => {
                        if (messageListRef.current) {
                            await messageListRef.current.fetchChats();
                        }
                    }}
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