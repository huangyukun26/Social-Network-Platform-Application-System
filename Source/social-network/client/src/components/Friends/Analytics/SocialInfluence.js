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
  if (!data || (!data.totalReach && (!data.distribution || !data.distribution.length))) {
    return (
      <InfluenceCard title="社交影响力">
        <Empty 
          description="暂无社交影响力数据" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </InfluenceCard>
    );
  }

  const getProgressColor = (distance) => {
    switch(distance) {
      case 1: return '#52c41a';
      case 2: return '#1890ff';
      case 3: return '#722ed1';
      default: return '#d9d9d9';
    }
  };

  const getDegreeLabel = (distance) => {
    switch(distance) {
      case 1: return '一度人脉';
      case 2: return '二度人脉';
      case 3: return '三度人脉';
      default: return `${distance}度人脉`;
    }
  };

  const maxCount = Math.max(...data.distribution.map(d => d.count));

  return (
    <InfluenceCard title="社交影响力">
      <Row gutter={[16, 24]}>
        <Col span={24}>
          <Statistic 
            title="总影响范围" 
            value={data.totalReach} 
            suffix="人"
            valueStyle={{ color: '#1890ff', fontSize: 32 }}
          />
        </Col>
        <Col span={24}>
          <h4 style={{ marginBottom: 16 }}>影响力分布</h4>
          {data.distribution.map((item, index) => (
            <DistributionItem key={index}>
              <div className="label">
                <span className="degree">{getDegreeLabel(item.distance)}</span>
                <span className="count">{item.count}人</span>
              </div>
              <Progress 
                percent={(item.count / maxCount) * 100} 
                strokeColor={getProgressColor(item.distance)}
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