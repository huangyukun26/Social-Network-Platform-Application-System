import React, { useState, useEffect } from 'react';
import { List, Avatar, Badge } from 'antd';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import axios from 'axios';

const ListContainer = styled.div`
    width: 300px;
    border-right: 1px solid ${theme.colors.border};
    background: white;
    
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
    }
`;

const MessageList = ({ onSelect, selectedId }) => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchChats = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const response = await axios.get(
                'http://localhost:5000/api/messages/recent',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setChats(response.data);
        } catch (error) {
            console.error('获取聊天列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();
        const interval = setInterval(fetchChats, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <ListContainer>
            <List
                loading={loading}
                dataSource={chats}
                renderItem={chat => (
                    <div 
                        className={`chat-item ${chat._id === selectedId ? 'active' : ''}`}
                        onClick={() => onSelect(chat)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Badge dot={chat.unreadCount > 0}>
                                <Avatar src={chat.avatar} />
                            </Badge>
                            <div style={{ marginLeft: 12 }}>
                                <div>{chat.username}</div>
                                <div className="last-message">
                                    {chat.lastMessage || '暂无消息'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            />
        </ListContainer>
    );
};

export default MessageList;