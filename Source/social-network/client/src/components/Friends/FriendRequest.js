import React, { useState } from 'react';
import { List, Avatar, Button, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import axios from 'axios';

const RequestContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const RequestItem = styled(List.Item)`
  padding: 16px;
  background: white;
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const FriendRequest = ({ requests, onUpdate }) => {
    const [pendingRequests, setPendingRequests] = useState(requests);
    
    React.useEffect(() => {
        setPendingRequests(requests);
    }, [requests]);

    const handleRequest = async (requestId, action) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `http://localhost:5000/api/friends/requests/${requestId}/${action}`,
                {},
                { headers: { Authorization: `Bearer ${token}` }}
            );
            
            setPendingRequests(prev => prev.filter(req => req._id !== requestId));
            
            message.success(action === 'accept' ? '已接受好友请求' : '已拒绝好友请求');
            
            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            message.error('操作失败');
            console.error('处理好友请求失败:', error);
        }
    };

    return (
        <RequestContainer>
            <List
                dataSource={pendingRequests}
                renderItem={request => {
                    console.log('Rendering request:', request); // 调试日志
                    return (
                        <RequestItem>
                            <List.Item.Meta
                                avatar={
                                    <Avatar 
                                        src={request.sender.avatar ? `http://localhost:5000${request.sender.avatar}` : null}
                                        icon={<UserOutlined />}
                                        size={44}
                                    />
                                }
                                title={request.sender.username}
                                description={
                                    <div>
                                        <div>{request.sender.bio || '这个人很懒，什么都没写~'}</div>
                                        <div style={{ marginTop: 8, color: '#8e8e8e', fontSize: 12 }}>
                                            {request.sender.statistics.postsCount} 帖子 · {request.sender.statistics.friendsCount} 好友
                                        </div>
                                    </div>
                                }
                            />
                            <div>
                                <Button 
                                    type="primary" 
                                    onClick={() => handleRequest(request._id, 'accept')}
                                    style={{ marginRight: 8, backgroundColor: '#43a047', borderColor: '#43a047' }}
                                >
                                    接受
                                </Button>
                                <Button 
                                    onClick={() => handleRequest(request._id, 'reject')}
                                >
                                    拒绝
                                </Button>
                            </div>
                        </RequestItem>
                    );
                }}
                locale={{ emptyText: '暂无好友请求' }}
            />
        </RequestContainer>
    );
};

export default FriendRequest;