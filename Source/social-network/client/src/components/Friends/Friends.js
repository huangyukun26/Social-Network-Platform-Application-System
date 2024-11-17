import React, { useState, useEffect } from 'react';
import { Tabs, message, Badge } from 'antd';
import styled from 'styled-components';
import { 
  SearchOutlined, 
  UsergroupAddOutlined, 
  TeamOutlined,
  UserAddOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import FriendRequest from './FriendRequest';
import FriendsList from './FriendsList';
import FriendSuggestions from './FriendSuggestions';
import UserSearch from './UserSearch';
import SocialAnalytics from './Analytics/SocialAnalytics';
import axios from 'axios';

const { TabPane } = Tabs;

const FriendsContainer = styled.div`
  max-width: 935px;
  margin: 0 auto;
  padding: 30px 20px;
`;

const StyledTabs = styled(Tabs)`
  .ant-tabs-nav {
    margin-bottom: 24px;
  }
  
  .ant-tabs-tab {
    padding: 12px 16px;
    
    .anticon {
      margin-right: 8px;
    }
  }
`;

const Friends = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFriendData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [requestsResponse, friendsResponse, suggestionsResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/friends/requests', { headers }),
        axios.get('http://localhost:5000/api/friends', { headers }),
        axios.get('http://localhost:5000/api/friends/suggestions', { headers })
      ]);

      setFriendRequests(requestsResponse.data);
      setFriends(friendsResponse.data);
      setSuggestions(suggestionsResponse.data);
    } catch (error) {
      message.error('获取好友数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUpdate = async (updatedFriends) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post('http://localhost:5000/api/friends/sync', {}, { headers });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const [friendsResponse, requestsResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/friends', { headers }),
        axios.get('http://localhost:5000/api/friends/requests', { headers })
      ]);

      setFriends(friendsResponse.data);
      setFriendRequests(requestsResponse.data);
      
      if (activeTab === '3') {
        const suggestionsResponse = await axios.get(
          'http://localhost:5000/api/friends/suggestions', 
          { headers }
        );
        setSuggestions(suggestionsResponse.data);
      }
    } catch (error) {
      console.error('更新好友数据失败:', error);
      message.error('更新好友数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendData();
    
    const interval = setInterval(() => {
      if (!loading) {
        fetchFriendData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading]);

  return (
    <FriendsContainer>
      <StyledTabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        loading={loading}
      >
        <TabPane 
          tab={
            <span>
              <SearchOutlined />
              搜索用户
            </span>
          } 
          key="0"
        >
          <UserSearch onUpdate={fetchFriendData} />
        </TabPane>
        <TabPane 
          tab={
            <span>
              <Badge count={friendRequests.length} offset={[10, 0]}>
                <UsergroupAddOutlined />
                好友请求
              </Badge>
            </span>
          } 
          key="1"
        >
          <FriendRequest 
            requests={friendRequests} 
            onUpdate={handleRequestUpdate}
          />
        </TabPane>
        <TabPane 
          tab={
            <span>
              <TeamOutlined />
              我的好友 ({friends.length})
            </span>
          } 
          key="2"
        >
          <FriendsList 
            friends={friends}
            onUpdate={fetchFriendData} 
          />
        </TabPane>
        <TabPane 
          tab={
            <span>
              <UserAddOutlined />
              推荐好友
            </span>
          } 
          key="3"
        >
          <FriendSuggestions 
            suggestions={suggestions}
            onUpdate={fetchFriendData}
          />
        </TabPane>
        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              社交分析
            </span>
          } 
          key="4"
        >
          <SocialAnalytics friends={friends} />
        </TabPane>
      </StyledTabs>
    </FriendsContainer>
  );
};

export default Friends; 