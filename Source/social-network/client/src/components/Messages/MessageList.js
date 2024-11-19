import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { List, Avatar, Badge } from 'antd';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import axios from 'axios';
import io from 'socket.io-client';
import PropTypes from 'prop-types';

const ListContainer = styled.div`
    height: 100%;
    background: white;
    overflow-y: auto;
    
    .chat-item {
        padding: 12px 16px;
        cursor: pointer;
        
        &:hover {
            background: ${theme.colors.backgroundHover};
        }
        
        &.active {
            background: ${theme.colors.backgroundActive};
        }
    }
    
    .last-message {
        color: ${theme.colors.text.secondary};
        font-size: 13px;
        margin-top: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
    }
`;

const MessageList = forwardRef(({ onSelect, selectedId, friends }, ref) => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(false);
    const currentUserId = JSON.parse(sessionStorage.getItem('user'))?._id;

    // 添加处理头像URL的辅助函数
    const getAvatarUrl = (avatarPath) => {
        if (!avatarPath) return ''; // 返回空字符串或默认头像路径
        
        // 如果已经是完整URL则直接返回
        if (avatarPath.startsWith('http')) {
            return avatarPath;
        }
        
        // 否则拼接服务器地址
        return `http://localhost:5000${avatarPath}`;
    };

    const fetchChats = useCallback(async () => {
        if (!currentUserId) return;
        
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const response = await axios.get(
                'http://localhost:5000/api/messages/recent',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const chatData = Array.isArray(response.data) ? response.data : [];
            console.log('获取到的聊天数据:', chatData);
            
            // 处理聊天数据
            const formattedChats = chatData
                .filter(chat => chat.sender && chat.receiver)
                .map(chat => {
                    const isReceiver = chat.receiver._id === currentUserId;
                    const otherUser = isReceiver ? chat.sender : chat.receiver;
                    
                    return {
                        _id: chat._id,
                        username: otherUser.username,
                        avatar: getAvatarUrl(otherUser.avatar), // 处理头像URL
                        lastMessage: chat.lastMessage || '',
                        unreadCount: isReceiver ? (chat.unreadCount || 0) : 0,
                        updatedAt: chat.updatedAt,
                        userId: otherUser._id
                    };
                })
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            // 处理没有聊天记录的好友
            const chatUserIds = formattedChats.map(chat => chat.userId);
            const friendsWithoutChats = friends
                .filter(friend => !chatUserIds.includes(friend._id))
                .map(friend => ({
                    _id: friend._id,
                    username: friend.username,
                    avatar: getAvatarUrl(friend.avatar), // 处理头像URL
                    lastMessage: '',
                    unreadCount: 0,
                    updatedAt: new Date(0),
                    userId: friend._id
                }));

            setChats([...formattedChats, ...friendsWithoutChats]);
        } catch (error) {
            console.error('获取聊天列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, [currentUserId, friends]);

    useImperativeHandle(ref, () => ({
        fetchChats
    }), [fetchChats]);

    // 初始加载和 Socket 事件监听
    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    return (
        <ListContainer>
            <List
                loading={loading}
                dataSource={chats}
                renderItem={(chat) => (
                    <div 
                        key={chat._id}
                        className={`chat-item ${chat._id === selectedId ? 'active' : ''}`}
                        onClick={() => onSelect(chat)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Badge count={chat.unreadCount} size="small" offset={[-5, 5]}>
                                <Avatar 
                                    src={chat.avatar} 
                                    // 默认头像
                                    icon={!chat.avatar && ""}
                                />
                            </Badge>
                            <div style={{ marginLeft: 12, flex: 1 }}>
                                <div style={{ 
                                    fontWeight: chat.unreadCount > 0 ? 600 : 400,
                                    color: chat.unreadCount > 0 ? '#1890ff' : 'inherit'
                                }}>
                                    {chat.username}
                                </div>
                                <div className="last-message">
                                    {chat.lastMessage}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            />
        </ListContainer>
    );
});

MessageList.propTypes = {
    onSelect: PropTypes.func.isRequired,
    selectedId: PropTypes.string,
    friends: PropTypes.array.isRequired,
    ref: PropTypes.any
};

MessageList.displayName = 'MessageList';

export default MessageList;