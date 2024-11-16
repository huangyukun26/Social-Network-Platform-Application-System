import React, { useState, useEffect } from 'react';
import { Tabs, message } from 'antd';
import styled from 'styled-components';
import FriendRequest from './FriendRequest';
import FriendsList from './FriendsList';
import FriendSuggestions from './FriendSuggestions';
import UserSearch from './UserSearch';
import axios from 'axios';
import SocialAnalytics from './Analytics/SocialAnalytics';

const { TabPane } = Tabs;

const FriendsContainer = styled.div`
  max-width: 935px;
  margin: 0 auto;
  padding: 30px 20px;
`;

const Friends = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const fetchFriendData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [requestsResponse, friendsResponse, suggestionsResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/friends/requests', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/friends', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/friends/suggestions', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setFriendRequests(requestsResponse.data);
      setFriends(friendsResponse.data);
      setSuggestions(suggestionsResponse.data);
    } catch (error) {
      message.error('获取好友数据失败');
    }
  };

  const handleRequestUpdate = async (updatedFriends) => {
    if (updatedFriends) {
      setFriends(updatedFriends);
    }
    await fetchFriendData();
  };

  useEffect(() => {
    fetchFriendData();
  }, []);

  return (
    <FriendsContainer>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="搜索用户" key="0">
          <UserSearch onUpdate={fetchFriendData} />
        </TabPane>
        <TabPane tab="好友请求" key="1">
          <FriendRequest 
            requests={friendRequests} 
            onUpdate={handleRequestUpdate}
          />
        </TabPane>
        <TabPane tab="我的好友" key="2">
          <FriendsList 
            friends={friends}
            onUpdate={fetchFriendData} 
          />
        </TabPane>
        <TabPane tab="推荐好友" key="3">
          <FriendSuggestions 
            onUpdate={fetchFriendData}
          />
        </TabPane>
        <TabPane tab="社交分析" key="4">
          <SocialAnalytics />
        </TabPane>
      </Tabs>
    </FriendsContainer>
  );
};

export default Friends; 