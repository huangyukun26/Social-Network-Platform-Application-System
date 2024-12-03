import React, { useState, useEffect } from 'react';
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
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        setPendingRequests(requests);
    }, [requests]);

    const handleRequest = async (requestId, action) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.post(
                `http://localhost:5000/api/friends/requests/${requestId}/${action}`,
                {},
                { headers: { Authorization: `Bearer ${token}` }}
            );
            
            setPendingRequests(prev => prev.filter(req => req._id !== requestId));
            
            message.success(response.data.message);
            
            if (onUpdate) {
                await onUpdate();
            }
        } catch (error) {
            console.error('处理好友请求失败:', error);
            message.error(error.response?.data?.message || '操作失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <RequestContainer>
            <List
                loading={loading}
                dataSource={pendingRequests}
                renderItem={request => {
                    if (!request || !request.sender) {
                        return null;
                    }

                    return (
                        <List.Item
                            key={request._id}
                            actions={[
                                <Button
                                    type="primary"
                                    onClick={() => handleRequest(request._id, 'accept')}
                                >
                                    接受
                                </Button>,
                                <Button
                                    onClick={() => handleRequest(request._id, 'reject')}
                                >
                                    拒绝
                                </Button>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Avatar
                                        src={request.sender.avatar ? 
                                            `http://localhost:5000${request.sender.avatar}` : null}
                                        icon={!request.sender.avatar && <UserOutlined />}
                                    />
                                }
                                title={request.sender.username || '未知用户'}
                                description={
                                    <div>
                                        <div>{request.sender.bio || '这个人很懒，什么都没写~'}</div>
                                        <div style={{ marginTop: 4, color: '#8e8e8e', fontSize: 12 }}>
                                            {request.sender.statistics?.friendsCount || 0} 好友
                                        </div>
                                    </div>
                                }
                            />
                        </List.Item>
                    );
                }}
            />
        </RequestContainer>
    );
};

export default FriendRequest;