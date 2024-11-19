import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { Input, Button, Avatar, message as antMessage } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import axios from 'axios';
import io from 'socket.io-client';

const WindowContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
`;

const ChatHeader = styled.div`
    padding: 12px 16px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    align-items: center;
    
    .name {
        margin-left: 12px;
        font-weight: 500;
    }
`;

const MessagesContainer = styled.div`
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
`;

const InputContainer = styled.div`
    padding: 16px;
    border-top: 1px solid #e8e8e8;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const MessageGroup = styled.div`
    display: flex;
    margin: 16px 0;
    flex-direction: ${props => props.isMine ? 'row-reverse' : 'row'};
    align-items: flex-start;
    gap: 8px;
    width: 100%;
`;

const AvatarWrapper = styled.div`
    flex-shrink: 0;
`;

const MessageContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: ${props => props.isMine ? 'flex-end' : 'flex-start'};
    max-width: 70%;
`;

const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return '';
    
    if (avatarPath.startsWith('http')) {
        return avatarPath;
    }
    
    return `http://localhost:5000${avatarPath}`;
};

const ChatWindow = ({ friend, onMessageSent }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);
    const socket = useRef(null);
    
    const currentUserId = useMemo(() => {
        const userStr = sessionStorage.getItem('user');
        if (!userStr) return null;
        try {
            const user = JSON.parse(userStr);
            return user._id;
        } catch (error) {
            console.error('解析用户信息失败:', error);
            return null;
        }
    }, []);

    const currentUserAvatar = useMemo(() => {
        const userStr = sessionStorage.getItem('user');
        if (!userStr) return '';
        try {
            const user = JSON.parse(userStr);
            return getAvatarUrl(user.avatar);
        } catch (error) {
            console.error('解析用户头像失败:', error);
            return '';
        }
    }, []);

    const processMessage = useCallback((msg) => {
        if (!msg || !msg.content || !msg.sender) return null;
        
        const senderId = msg.sender._id || msg.sender;
        const isOwn = senderId === currentUserId;
        
        console.log('处理消息:', {
            content: msg.content,
            senderId,
            currentUserId,
            isOwn
        });

        return {
            ...msg,
            sender: senderId,
            isOwn
        };
    }, [currentUserId]);

    useEffect(() => {
        if (!socket.current) {
            const token = sessionStorage.getItem('token');
            socket.current = io('http://localhost:5000', {
                auth: { token },
                reconnection: true
            });

            socket.current.on('connect', () => {
                console.log('Socket 连接成功');
            });
        }

        const handleNewMessage = (data) => {
            console.log('收到新消息:', data);
            const { message } = data;
            
            if (message.sender._id === friend._id) {
                const processedMessage = processMessage(message);
                if (processedMessage) {
                    setMessages(prev => [...prev, processedMessage]);
                    scrollToBottom();
                }
            }
        };

        socket.current.on('new_message', handleNewMessage);

        return () => {
            socket.current.off('new_message', handleNewMessage);
        };
    }, [friend._id, currentUserId, processMessage]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!friend?._id || !currentUserId) {
                console.warn('缺少必要参数:', { friendId: friend?._id, currentUserId });
                return;
            }

            try {
                const token = sessionStorage.getItem('token');
                const response = await axios.get(
                    `http://localhost:5000/api/messages/history/${friend._id}`,
                    {
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionStorage.getItem('sessionId')
                        }
                    }
                );
                
                if (response.data.success) {
                    const formattedMessages = response.data.data
                        .filter(msg => msg && msg.content && msg.sender)
                        .map(msg => processMessage(msg))
                        .filter(Boolean);

                    setMessages(formattedMessages);
                    scrollToBottom();
                }
            } catch (error) {
                console.error('获取消息历史失败:', error);
                antMessage.error('获取消息历史失败');
            }
        };

        if (friend?._id && currentUserId) {
            fetchMessages();
        }
    }, [friend?._id, currentUserId, processMessage]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!message.trim() || !friend?._id || !currentUserId) {
            console.warn('发送消息缺少必要参数:', {
                hasMessage: !!message.trim(),
                friendId: friend?._id,
                currentUserId
            });
            return;
        }
        
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.post(
                'http://localhost:5000/api/messages/send', 
                {
                    receiverId: friend._id,
                    content: message.trim()
                },
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Session-ID': sessionStorage.getItem('sessionId')
                    }
                }
            );

            if (response.data.success) {
                const newMessage = processMessage({
                    ...response.data.data,
                    sender: currentUserId
                });
                
                if (newMessage) {
                    setMessage('');
                    setMessages(prev => [...prev, newMessage]);
                    scrollToBottom();
                }
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            antMessage.error('发送失败，请重试');
        }
    };

    const MessageBubbleStyled = styled.div`
        max-width: 70%;
        padding: 8px 12px;
        margin: 8px 0;
        border-radius: ${props => props.isMine ? '16px 2px 16px 16px' : '2px 16px 16px 16px'};
        background-color: ${props => props.isMine ? '#1890ff' : '#f0f0f0'};
        color: ${props => props.isMine ? 'white' : 'black'};
        
        .message-content {
            word-break: break-word;
        }
        
        .message-time {
            font-size: 12px;
            margin-top: 4px;
            opacity: 0.7;
            text-align: ${props => props.isMine ? 'right' : 'left'};
        }
    `;

    const renderMessages = () => {
        return messages.map((msg, index) => {
            if (!msg || !msg.content) return null;

            const isOwn = msg.isOwn;

            console.log('渲染消息:', {
                content: msg.content,
                isOwn,
                sender: msg.sender,
                currentUserId
            });

            return (
                <MessageGroup key={msg._id || index} isMine={isOwn}>
                    <AvatarWrapper>
                        <Avatar 
                            size={32} 
                            src={isOwn ? currentUserAvatar : getAvatarUrl(friend?.avatar)}
                            icon={!isOwn && !friend?.avatar ? "user" : null}
                        />
                    </AvatarWrapper>
                    <MessageContent isMine={isOwn}>
                        <div style={{ 
                            fontSize: '12px', 
                            color: '#666', 
                            marginBottom: '4px',
                            textAlign: isOwn ? 'right' : 'left',
                            width: '100%'
                        }}>
                            {isOwn ? '我' : friend?.username}
                        </div>
                        <MessageBubbleStyled isMine={isOwn}>
                            <div className="message-content">{msg.content}</div>
                            <div className="message-time">
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }) : ''}
                                {isOwn && (
                                    <span style={{ marginLeft: '4px' }}>
                                        {msg.status === 'read' ? '已读' : 
                                         msg.status === 'delivered' ? '已送达' : 
                                         '已发送'}
                                    </span>
                                )}
                            </div>
                        </MessageBubbleStyled>
                    </MessageContent>
                </MessageGroup>
            );
        }).filter(Boolean);
    };

    return (
        <WindowContainer>
            <ChatHeader>
                <Avatar 
                    src={getAvatarUrl(friend.avatar)} 
                    icon={!friend.avatar && "user"}
                />
                <span className="name">{friend.username}</span>
            </ChatHeader>
            
            <MessagesContainer>
                {messages.length > 0 ? (
                    renderMessages()
                ) : (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>
                        暂无消息记录
                    </div>
                )}
                <div ref={messagesEndRef} />
            </MessagesContainer>
            
            <InputContainer>
                <Input 
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onPressEnter={handleSend}
                    placeholder="输入消息..."
                />
                <Button 
                    type="primary" 
                    icon={<SendOutlined />}
                    onClick={handleSend}
                >
                    发送
                </Button>
            </InputContainer>
        </WindowContainer>
    );
};

export default ChatWindow;