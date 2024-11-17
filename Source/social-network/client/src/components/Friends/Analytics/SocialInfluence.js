import React from 'react';
import { Card, Progress, Statistic, Row, Col, Empty } from 'antd';
import styled from 'styled-components';

const InfluenceCard = styled(Card)`
  height: 100%;
  .ant-card-head-title {
    font-size: 18px;
    font-weight: bold;
  }
`;

const DistributionItem = styled.div`
  margin-bottom: 16px;
  
  .label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    
    .degree {
      color: #262626;
      font-weight: 500;
    }
    
    .count {
      color: #8c8c8c;
    }
  }
`;

const SocialInfluence = ({ data }) => {
  console.log('Social influence data:', data);
  
  if (!data || !data.distribution) {
    return (
      <InfluenceCard title="社交影响力">
        <Empty 
          description="暂无社交影响力数据" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </InfluenceCard>
    );
  }

  const distribution = Array.isArray(data.distribution) ? data.distribution : [];
  const maxCount = Math.max(...distribution.map(d => d.count || 0), 1);

  const getProgressColor = (level) => {
    switch(level) {
      case 1: return '#52c41a';
      case 2: return '#1890ff';
      case 3: return '#722ed1';
      default: return '#d9d9d9';
    }
  };

  const getDegreeLabel = (level) => {
    switch(level) {
      case 1: return '一度人脉';
      case 2: return '二度人脉';
      case 3: return '三度人脉';
      default: return `${level}度人脉`;
    }
  };

  return (
    <InfluenceCard title="社交影响力">
      <Row gutter={[16, 24]}>
        <Col span={24}>
          <Statistic 
            title="总影响范围" 
            value={data.totalReach || 0} 
            suffix="人"
            valueStyle={{ color: '#1890ff', fontSize: 32 }}
          />
        </Col>
        <Col span={24}>
          <h4 style={{ marginBottom: 16 }}>影响力分布</h4>
          {distribution.map((item) => (
            <DistributionItem key={item.level || item.distance}>
              <div className="label">
                <span className="degree">
                  {getDegreeLabel(item.level || item.distance)}
                </span>
                <span className="count">{item.count || 0}人</span>
              </div>
              <Progress 
                percent={((item.count || 0) / maxCount) * 100} 
                strokeColor={getProgressColor(item.level || item.distance)}
                showInfo={false}
              />
            </DistributionItem>
          ))}
        </Col>
      </Row>
    </InfluenceCard>
  );
};

export default SocialInfluence;