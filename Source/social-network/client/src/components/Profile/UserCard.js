import React from 'react';
import styled from 'styled-components';
import { Avatar } from 'antd';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../styles/theme';

const UserCardContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  
  &:hover {
    background: ${theme.colors.background};
  }
`;

const UserInfo = styled.div`
  margin-left: 12px;
  flex: 1;
`;

const Username = styled.div`
  font-weight: 500;
  color: ${theme.colors.text.primary};
`;

const PostCount = styled.div`
  font-size: 12px;
  color: ${theme.colors.text.secondary};
  margin-top: 4px;
`;

const UserCard = ({ user }) => {
  const navigate = useNavigate();

  return (
    <UserCardContainer onClick={() => navigate(`/profile/${user._id}`)}>
      <Avatar src={user.avatar} size="large" />
      <UserInfo>
        <Username>{user.username}</Username>
        <PostCount>{user.postsCount} 篇帖子</PostCount>
      </UserInfo>
    </UserCardContainer>
  );
};

export default UserCard;