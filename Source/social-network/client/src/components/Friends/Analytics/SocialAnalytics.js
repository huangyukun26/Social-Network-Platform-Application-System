import React, { useState, useEffect } from 'react';
import { Card, Spin, message, Empty, Alert, Button } from 'antd';
import styled from 'styled-components';
import axios from 'axios';
import SocialCircles from './SocialCircles';
import SocialInfluence from './SocialInfluence';
import RefreshButton from './RefreshButton';
import ExportButton from './ExportButton';

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

const SocialAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    circles: [],
    influence: null
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [circlesRes, influenceRes] = await Promise.all([
        axios.get('http://localhost:5000/api/friends/analysis/circles', { headers }),
        axios.get('http://localhost:5000/api/friends/analysis/influence', { headers })
      ]);

      setAnalyticsData({
        circles: circlesRes.data,
        influence: influenceRes.data
      });
    } catch (error) {
      setError(error.response?.data?.message || '获取社交分析数据失败');
      message.error('获取社交分析数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <LoadingContainer>
        <Spin tip="正在分析您的社交网络..." />
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
          action={
            <Button type="primary" onClick={fetchAnalytics}>
              重试
            </Button>
          }
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
        <ExportButton data={analyticsData} />
      </div>
      <AnalyticsContainer>
        <SocialCircles data={analyticsData.circles} />
        <SocialInfluence data={analyticsData.influence} />
      </AnalyticsContainer>
    </div>
  );
};

export default SocialAnalytics;