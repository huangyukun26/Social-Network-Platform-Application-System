import React, { useState, useEffect } from 'react';
import { Layout, Avatar, Button } from 'antd';

import styled from 'styled-components';
import { theme } from '../../styles/theme';
import Sidebar from './Sidebar'; // 新增侧边栏组件
import { UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { message } from 'antd';
import SearchBar from './SearchBar';

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

const SuggestedFollows = styled.div`
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
    flex: 1;
    margin-right: 12px;
    
    .avatar {
      margin-right: 12px;
      flex-shrink: 0;
    }
    
    .user-details {
      .username {
        color: ${theme.colors.text.primary};
        font-weight: 500;
      }
      
      .reason {
        font-size: 12px;
        color: ${theme.colors.text.secondary};
        margin-top: 2px;
      }
    }
  }
`;

const SearchContainer = styled.div`
  background: white;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  margin-bottom: 16px;
`;

const AppLayout = ({ children }) => {
    const [suggestedUsers, setSuggestedUsers] = useState([]);

    useEffect(() => {
        const fetchSuggestedUsers = async () => {
            try {
                const token = sessionStorage.getItem('token');
                const response = await axios.get('http://localhost:5000/api/users/suggestions', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuggestedUsers(response.data);
            } catch (error) {
                console.error('获取推荐用户失败:', error);
            }
        };
        fetchSuggestedUsers();
    }, []);

    const handleFollow = async (userId) => {
        try {
            const token = sessionStorage.getItem('token');
            await axios.post(`http://localhost:5000/api/follow/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('关注成功');
            // 从推荐列表中移除已关注的用户
            setSuggestedUsers(prev => prev.filter(user => user._id !== userId));
        } catch (error) {
            message.error('关注失败');
        }
    };

    // 生成推荐理由的函数
    const getRecommendReason = (user) => {
        if (user.commonFollowers > 0) {
            return `你关注的用户也关注了Ta`;
        } else if (user.score > 8) {
            return `活跃用户`;
        } else if (user.postsCount > 5) {
            return `经常分享有趣内容`;
        } else {
            return `你可能感兴趣的用户`;
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
                    <SearchContainer>
                        <SearchBar />
                    </SearchContainer>
                    <SuggestedFollows>
                        <h3>推荐关注</h3>
                        {suggestedUsers.map(user => (
                            <SuggestionItem key={user._id}>
                                <div className="user-info">
                                    <Avatar 
                                        className="avatar"
                                        size={40}
                                        src={user.avatar && `http://localhost:5000/uploads/avatars/${user.avatar.split('/').pop()}`}
                                        icon={<UserOutlined />}
                                    />
                                    <div className="user-details">
                                        <Link to={`/profile/${user._id}`} className="username">
                                            {user.username}
                                        </Link>
                                        <div className="reason">
                                            {getRecommendReason(user)}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => handleFollow(user._id)}
                                >
                                    关注
                                </Button>
                            </SuggestionItem>
                        ))}
                    </SuggestedFollows>
                </RightSidebar>
            </MainLayout>
        </StyledLayout>
    );
};

export default AppLayout; 