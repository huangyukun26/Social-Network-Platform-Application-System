import React from 'react';
import { Card, List, Avatar, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const CircleCard = styled(Card)`
  height: 100%;
  .ant-card-head-title {
    font-size: 18px;
    font-weight: bold;
  }
`;

const CircleSection = styled.div`
  margin-bottom: 24px;
  
  .circle-header {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    
    h3 {
      margin: 0;
      margin-right: 12px;
    }
  }
`;

const MemberList = styled(List)`
  .ant-list-item {
    padding: 12px;
    border-radius: 8px;
    
    &:hover {
      background: #f5f5f5;
    }
  }
`;

const SocialCircles = ({ data }) => {
  const getCircleLabel = (type) => {
    switch(type) {
      case 'close':
        return { text: '亲密圈子', color: '#52c41a' };
      case 'distant':
        return { text: '普通圈子', color: '#1890ff' };
      default:
        return { text: '其他圈子', color: '#d9d9d9' };
    }
  };

  return (
    <CircleCard title="社交圈子分析">
      {data.map((circle, index) => {
        const label = getCircleLabel(circle.circle);
        return (
          <CircleSection key={index}>
            <div className="circle-header">
              <h3>{label.text}</h3>
              <Tag color={label.color}>{circle.size}人</Tag>
            </div>
            <MemberList
              dataSource={circle.members}
              renderItem={member => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={member.avatar ? `http://localhost:5000${member.avatar}` : null}
                        icon={!member.avatar && <UserOutlined />}
                        size="large"
                      />
                    }
                    title={member.username}
                    description={
                      <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
                        {member.stats?.friendsCount || 0} 好友 · {member.stats?.postsCount || 0} 帖子
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </CircleSection>
        );
      })}
    </CircleCard>
  );
};

export default SocialCircles;