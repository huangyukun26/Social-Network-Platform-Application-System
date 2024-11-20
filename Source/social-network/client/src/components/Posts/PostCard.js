import React from 'react';
import styled from 'styled-components';
import { Avatar } from 'antd';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../styles/theme';

const PostCardContainer = styled.div`
  padding: ${props => props.compact ? '12px' : '16px'};
  border-radius: 8px;
  background: white;
  margin-bottom: ${props => props.compact ? '8px' : '16px'};
  cursor: pointer;
  
  &:hover {
    background: ${theme.colors.background};
  }
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${props => props.compact ? '8px' : '12px'};
`;

const PostContent = styled.div`
  font-size: ${props => props.compact ? '14px' : '16px'};
  color: ${theme.colors.text.primary};
  margin-bottom: ${props => props.compact ? '8px' : '12px'};
`;

const PostMeta = styled.div`
  display: flex;
  align-items: center;
  font-size: 12px;
  color: ${theme.colors.text.secondary};
`;

const PostCard = ({ post, compact = false }) => {
  const navigate = useNavigate();

  return (
    <PostCardContainer 
      compact={compact}
      onClick={() => navigate(`/post/${post._id}`)}
    >
      <PostHeader compact={compact}>
        <Avatar src={post.author.avatar} size={compact ? "small" : "default"} />
        <div style={{ marginLeft: '8px' }}>
          <div style={{ fontWeight: 500 }}>{post.author.username}</div>
          <div style={{ fontSize: '12px', color: theme.colors.text.secondary }}>
            {new Date(post.createdAt).toLocaleDateString()}
          </div>
        </div>
      </PostHeader>
      <PostContent compact={compact}>
        {compact ? post.content.slice(0, 100) + '...' : post.content}
      </PostContent>
      <PostMeta>
        <span>{post.likes?.length || 0} 点赞</span>
        <span style={{ margin: '0 8px' }}>•</span>
        <span>{post.comments?.length || 0} 评论</span>
      </PostMeta>
    </PostCardContainer>
  );
};

export default PostCard;