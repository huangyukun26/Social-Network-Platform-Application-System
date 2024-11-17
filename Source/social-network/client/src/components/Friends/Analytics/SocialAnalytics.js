import React, { useState, useEffect } from 'react';
import { Card, Spin, message, Empty, Alert, Button } from 'antd';
import styled from 'styled-components';
import axios from 'axios';
import SocialCircles from './SocialCircles';
import SocialInfluence from './SocialInfluence';
import RefreshButton from './RefreshButton';
import ExportButton from './ExportButton';
import ActivityAnalysis from './ActivityAnalysis';
import RelationshipStrength from './RelationshipStrength';

const AnalyticsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 50px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
`;

const ErrorContainer = styled.div`
  padding: 20px;
`;

const SocialAnalytics = ({ friends }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    circles: [],
    influence: null
  });
  const [activityData, setActivityData] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [relationshipData, setRelationshipData] = useState(null);

  const fetchAnalytics = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post('http://localhost:5000/api/friends/sync', {}, { headers });
      
      const [circlesRes, influenceRes, activityRes] = await Promise.all([
        axios.get('http://localhost:5000/api/friends/analysis/circles', { headers }),
        axios.get('http://localhost:5000/api/friends/analysis/influence', { headers }),
        axios.get('http://localhost:5000/api/friends/activity', { headers })
      ]);

      console.log('Circles data:', circlesRes.data);
      console.log('Influence data:', influenceRes.data);
      console.log('Activity data:', activityRes.data);

      setAnalyticsData({
        circles: circlesRes.data,
        influence: influenceRes.data,
        activity: activityRes.data
      });
      
    } catch (error) {
      console.error('获取社交分析数据失败:', error.response || error);
      setError(error.response?.data?.message || '获取社交分析数据失败');
      message.error('获取社交分析数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelationshipStrength = async (friendId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/friends/relationship-strength/${friendId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setRelationshipData(response.data);
    } catch (error) {
      message.error('获取关系强度数据失败');
    }
  };

  useEffect(() => {
    if (friends?.length >= 0) {
      fetchAnalytics();
    }
  }, [friends?.length]);

  if (loading) {
    return (
      <LoadingContainer>
        <Spin size="large" tip="加载社交分析数据..." />
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <Alert
          message="获取数据失败"
          description={error}
          type="error"
          showIcon
        />
      </ErrorContainer>
    );
  }

  if (!analyticsData.circles.length && !analyticsData.influence) {
    return (
      <Empty
        description="暂无社交分析数据"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <RefreshButton loading={loading} onClick={fetchAnalytics} />
        <ExportButton data={{ ...analyticsData, activity: activityData }} />
      </div>
      <AnalyticsContainer>
        <ActivityAnalysis data={activityData} />
        <SocialCircles 
          data={analyticsData.circles} 
          onMemberClick={(member) => {
            setSelectedFriend(member);
            fetchRelationshipStrength(member._id);
          }}
        />
        <SocialInfluence data={analyticsData.influence} />
        {selectedFriend && (
          <RelationshipStrength 
            data={relationshipData} 
            targetUser={selectedFriend} 
          />
        )}
      </AnalyticsContainer>
    </div>
  );
};

export default SocialAnalytics;