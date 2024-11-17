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
      
      // 添加社交圈子数据的获取
      const [activityRes, influenceRes, circlesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/friends/activity', { headers }),
        axios.get('http://localhost:5000/api/friends/influence-analysis', { headers }),
        axios.get('http://localhost:5000/api/friends/analysis/circles', { headers })
      ]);

      console.log('Activity data:', activityRes.data);
      console.log('Influence data:', influenceRes.data);
      console.log('Circles data:', circlesRes.data);

      // 更新活跃度数据，使用可选链和默认值
      setActivityData({
        friendsCount: friends?.length ?? 0,
        interactionsCount: activityRes.data?.interactionsCount ?? 0,
        activityScore: activityRes.data?.activityScore ?? 0
      });
      
      // 更新影响力数据
      setAnalyticsData(prev => ({
        ...prev,
        influence: influenceRes.data,
        circles: circlesRes.data || [] // 添加社交圈子数据
      }));
      
    } catch (error) {
      console.error('获取社交分析数据失败:', error);
      setError(error.response?.data?.message || '获取社交分析数据失败');
      message.error('获取社交分析数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 修改 useEffect，添加空数组作为默认值
  useEffect(() => {
    // 即使 friends 未定义也执行
    fetchAnalytics();
  }, [friends]); // friends 可能为 undefined

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

  // 修改判断条件，使用可选链
  if (!analyticsData?.influence && !activityData) {
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
        <SocialInfluence data={analyticsData.influence} />
        <SocialCircles 
          data={analyticsData.circles} 
          onMemberClick={(member) => setSelectedFriend(member)}
        />
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