import React from 'react';
import { Card, Progress, Descriptions } from 'antd';
import styled from 'styled-components';

const StrengthCard = styled(Card)`
  height: 100%;
  .ant-card-head-title {
    font-size: 18px;
    font-weight: bold;
  }
`;

const RelationshipStrength = ({ data, targetUser }) => {
  if (!data) return null;

  return (
    <StrengthCard title={`与 ${targetUser?.username || '好友'} 的关系强度`}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Progress
          type="dashboard"
          percent={Math.min(data.strength * 100, 100)}
          format={percent => `${percent.toFixed(1)}%`}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
      </div>
      <Descriptions column={1}>
        <Descriptions.Item label="共同好友">
          {data.commonFriends} 人
        </Descriptions.Item>
        <Descriptions.Item label="互动次数">
          {data.interactions} 次
        </Descriptions.Item>
        <Descriptions.Item label="最近互动">
          {data.lastInteraction ? new Date(data.lastInteraction).toLocaleDateString() : '暂无'}
        </Descriptions.Item>
      </Descriptions>
    </StrengthCard>
  );
};

export default RelationshipStrength;