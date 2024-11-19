import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import { CheckOutlined } from '@ant-design/icons';

const Bubble = styled.div`
    max-width: 70%;
    margin: 8px 0;
    align-self: ${props => props.isMine ? 'flex-end' : 'flex-start'};
    
    .content {
        background: ${props => props.isMine ? theme.colors.primary : '#f0f2f5'};
        color: ${props => props.isMine ? 'white' : theme.colors.text.primary};
        padding: 8px 12px;
        border-radius: 16px;
        word-break: break-word;
    }
    
    .status {
        font-size: 12px;
        color: ${theme.colors.text.secondary};
        margin-top: 4px;
        text-align: right;
    }
`;

const MessageBubble = ({ message, isMine }) => {
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!message || !message.content) {
        return null;
    }

    return (
        <Bubble isMine={isMine}>
            <div className="content">{message.content}</div>
            <div className="status">
                {formatTime(message.createdAt)}
                {isMine && message.status && (
                    <span style={{ marginLeft: '4px' }}>
                        {message.status === 'read' ? (
                            <>已读 <CheckOutlined /></>
                        ) : message.status === 'delivered' ? (
                            '已送达'
                        ) : (
                            '已发送'
                        )}
                    </span>
                )}
            </div>
        </Bubble>
    );
};

export default MessageBubble;