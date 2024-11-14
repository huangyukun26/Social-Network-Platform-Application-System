import React, { useState, useEffect } from 'react';
import { List, Button, Modal, message } from 'antd';
import axios from 'axios';

const SessionManager = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/sessions');
            setSessions(response.data);
        } catch (error) {
            message.error('获取会话信息失败');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoutSession = async (sessionId) => {
        try {
            await axios.delete(`/api/sessions/${sessionId}`);
            message.success('已成功登出该设备');
            fetchSessions();
        } catch (error) {
            message.error('登出设备失败');
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    return (
        <List
            loading={loading}
            dataSource={sessions}
            renderItem={session => (
                <List.Item
                    actions={[
                        <Button 
                            danger 
                            onClick={() => handleLogoutSession(session.id)}
                        >
                            登出此设备
                        </Button>
                    ]}
                >
                    <List.Item.Meta
                        title={`设备: ${session.deviceInfo.userAgent}`}
                        description={`上次活跃: ${new Date(session.lastActive).toLocaleString()}`}
                    />
                </List.Item>
            )}
        />
    );
};

export default SessionManager; 