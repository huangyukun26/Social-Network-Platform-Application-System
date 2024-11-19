import React, { useState } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined, SmileOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import Emoji from 'emoji-picker-react';

const InputContainer = styled.div`
    padding: 16px;
    border-top: 1px solid ${theme.colors.border};
    background: white;
    
    .input-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
    }
`;

const StyledInput = styled(Input)`
    border-radius: 20px;
    padding: 8px 16px;
    
    &:focus {
        box-shadow: none;
    }
`;

const ChatInput = ({ onSend }) => {
    const [content, setContent] = useState('');

    const handleSend = () => {
        if (content.trim()) {
            onSend(content);
            setContent('');
        }
    };

    return (
        <InputContainer>
            <div className="input-wrapper">
                <StyledInput
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onPressEnter={handleSend}
                    placeholder="输入消息..."
                />
                <Button 
                    type="primary" 
                    icon={<SendOutlined />}
                    onClick={handleSend}
                    shape="circle"
                />
            </div>
        </InputContainer>
    );
};

export default ChatInput;