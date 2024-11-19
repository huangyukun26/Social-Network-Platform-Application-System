import React, { useState } from 'react';
import styled from 'styled-components';
import MessageList from '../components/Messages/MessageList';
import ChatWindow from '../components/Messages/ChatWindow';

const PageContainer = styled.div`
    display: flex;
    height: calc(100vh - 64px);
    margin-top: 64px;
`;

const Messages = () => {
    const [selectedChat, setSelectedChat] = useState(null);

    return (
        <PageContainer>
            <MessageList 
                onSelect={setSelectedChat}
                selectedId={selectedChat?._id}
            />
            {selectedChat ? (
                <ChatWindow 
                    chatId={selectedChat._id}
                    receiver={selectedChat}
                />
            ) : (
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                }}>
                    选择一个聊天
                </div>
            )}
        </PageContainer>
    );
};

export default Messages;