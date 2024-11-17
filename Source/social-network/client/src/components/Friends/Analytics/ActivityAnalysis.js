import React from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import styled from 'styled-components';
import { UserOutlined, InteractionOutlined, LineChartOutlined } from '@ant-design/icons';

const ActivityCard = styled(Card)`
  height: 100%;
  .ant-card-head-title {
    font-size: 18px;
    font-weight: bold;
  }
`;

const ActivityAnalysis = ({ data }) => {
  if (!data) return null;

  return (
    <ActivityCard title="用户活跃度分析">
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Statistic
            title="好友数量"
            value={data.friendCount}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="互动次数"
            value={data.interactionCount}
            prefix={<InteractionOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="活跃度评分"
            value={data.activityScore.toFixed(2)}
            prefix={<LineChartOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
      </Row>
    </ActivityCard>
  );
};

export default ActivityAnalysis;