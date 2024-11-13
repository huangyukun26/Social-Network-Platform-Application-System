import React from 'react';
import { Image } from 'antd';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const PostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  margin-top: 20px;
`;

const PostItem = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 100%; // 保持1:1的宽高比
  cursor: pointer;
  overflow: hidden;
  background-color: #fafafa;
  border-radius: 3px;
  
  &:hover {
    .overlay {
      opacity: 1;
    }
  }
`;

const PostImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: white;
`;

const PostList = ({ posts }) => {
  const navigate = useNavigate();

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  return (
    <PostGrid>
      {posts.map((post) => (
        <PostItem key={post._id} onClick={() => handlePostClick(post._id)}>
          {post.image && (
            <>
              <PostImage 
                src={`http://localhost:5000${post.image}`} 
                alt={post.content}
              />
              <Overlay className="overlay">
                <div style={{ textAlign: 'center' }}>
                  <div>❤️ {post.likes?.length || 0}</div>
                  <div>💬 {post.comments?.length || 0}</div>
                </div>
              </Overlay>
            </>
          )}
        </PostItem>
      ))}
    </PostGrid>
  );
};

export default PostList;