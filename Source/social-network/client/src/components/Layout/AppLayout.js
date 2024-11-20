import React, { useState, useEffect } from 'react';
import { Layout, Avatar, Button } from 'antd';
import Navbar from './Navbar';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import Sidebar from './Sidebar'; // 新增侧边栏组件
import { UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { message } from 'antd';

const { Content } = Layout;

const StyledLayout = styled(Layout)`
  background-color: #fff;
  min-height: 100vh;
`;

const MainLayout = styled(Layout)`
  margin-left: 275px;
  background: #fff;
  padding: 0 32px;
  display: flex;
  justify-content: center;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto 0 275px;
  
  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const StyledContent = styled(Content)`
  min-height: calc(100vh - 64px);
  padding: 0;
  background-color: #fff;
  border-left: 1px solid rgba(0, 0, 0, 0.15);
  border-right: 1px solid rgba(0, 0, 0, 0.15);
  width: 800px;
  flex-shrink: 0;
`;

const RightSidebar = styled.div`
  width: 350px;
  position: fixed;
  right: 32px;
  top: 16px;
  height: fit-content;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  
  @media (max-width: 1300px) {
    display: none;
  }
`;

const FriendSuggestions = styled.div`
  background: white;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  margin-bottom: 16px;

  h3 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 16px;
  }
`;

const SuggestionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 0;
  
  .user-info {
    display: flex;
    align-items: center;
    
    .avatar {
      margin-right: 12px;
    }
    
    .username {
      color: #000;
      font-weight: 500;
    }
  }
`;

const AppLayout = ({ children }) => {
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const token = sessionStorage.getItem('token');
                const response = await axios.get('http://localhost:5000/api/users/suggestions', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuggestions(response.data);
            } catch (error) {
                console.error('获取推荐失败:', error);
            }
        };
        fetchSuggestions();
    }, []);

    const handleSendRequest = async (userId) => {
        try {
            const token = sessionStorage.getItem('token');
            await axios.post(`http://localhost:5000/api/friends/request/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('好友请求已发送');
        } catch (error) {
            message.error('发送请求失败');
        }
    };

    return (
        <StyledLayout>
            <Sidebar />
            <MainLayout>
                <StyledContent>
                    {children}
                </StyledContent>
                <RightSidebar>
                    <FriendSuggestions>
                        <h3>好友推荐</h3>
                        {suggestions.map(user => (
                            <SuggestionItem key={user._id}>
                                <div className="user-info">
                                    <Avatar 
                                        className="avatar"
                                        src={user.avatar}
                                        icon={<UserOutlined />}
                                    />
                                    <Link to={`/profile/${user._id}`} className="username">
                                        {user.username}
                                    </Link>
                                </div>
                                <Button
                                    type="primary"
                                    ghost
                                    size="small"
                                    onClick={() => handleSendRequest(user._id)}
                                >
                                    添加好友
                                </Button>
                            </SuggestionItem>
                        ))}
                    </FriendSuggestions>
                </RightSidebar>
            </MainLayout>
        </StyledLayout>
    );
};

export default AppLayout; 