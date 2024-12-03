import React, { useState, useCallback, useEffect } from 'react';
import { Input, Spin, Empty, Avatar } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { theme } from '../../styles/theme';
import debounce from 'lodash/debounce';
import PostCard from '../Posts/PostCard';
import UserCard from '../Profile/UserCard';

const { Search } = Input;

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
`;

const SearchResults = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid ${theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
  display: ${props => props.visible ? 'block' : 'none'};
`;

const SuggestionsContainer = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid ${theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-top: 4px;
  z-index: 1000;
`;

const SuggestionSection = styled.div`
  padding: 8px 0;
  border-bottom: 1px solid ${theme.colors.border};
`;

const SectionTitle = styled.div`
  padding: 4px 16px;
  color: ${theme.colors.text.secondary};
  font-size: 12px;
`;

const SuggestionItem = styled.div`
  padding: 8px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background: ${theme.colors.background};
  }
  
  .user-info {
    margin-left: 12px;
    
    .username {
      font-weight: 500;
    }
    
    .posts-count {
      font-size: 12px;
      color: ${theme.colors.text.secondary};
    }
  }
  
  .post-preview {
    flex: 1;
    font-size: 14px;
  }
  
  .post-meta {
    font-size: 12px;
    color: ${theme.colors.text.secondary};
    margin-top: 4px;
  }
`;

const ViewAllButton = styled.div`
  padding: 12px;
  text-align: center;
  color: ${theme.colors.primary};
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background: ${theme.colors.background};
  }
`;

const SearchResultsContainer = styled.div`
  padding: 16px;
`;

const ResultSection = styled.div`
  margin-bottom: 24px;
`;

const SectionHeader = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${theme.colors.border};
`;

const RelatedSection = styled.div`
  background: ${theme.colors.background};
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
`;

const RelatedHeader = styled.div`
  font-size: 14px;
  color: ${theme.colors.text.secondary};
  margin-bottom: 12px;
`;

const SearchBar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [suggestions, setSuggestions] = useState({ users: [], posts: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');

  // 优化后的获取建议函数
  const fetchSuggestions = useCallback(
    debounce(async (value) => {
      if (!value.trim()) {
        setSuggestions({ users: [], posts: [] });
        return;
      }
      setLoading(true);
      try {
        const token = sessionStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:5000/api/search/suggestions?q=${encodeURIComponent(value)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        // 确保返回数据的完整性
        setSuggestions({
          users: response.data.users || [],
          posts: response.data.posts || [],
          // 可以添加更多类型的建议
          relatedTags: response.data.relatedTags || []
        });
      } catch (error) {
        console.error('获取搜索建议失败:', error);
        setSuggestions({ users: [], posts: [] });
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // 处理搜索框值变化
  const handleChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    fetchSuggestions(value);
  };

  // 处理搜索
  const handleSearch = (value) => {
    if (!value.trim()) {
      navigate('/', { replace: true });
      setShowSuggestions(false);
      return;
    }
    setShowSuggestions(false);
    navigate(`/?q=${encodeURIComponent(value.trim())}`, { replace: true });
  };

  // 处理清空
  const handleClear = () => {
    setSearchValue('');
    setSuggestions({ users: [], posts: [] });
    navigate('/', { replace: true });
    setShowSuggestions(false);
  };

  // 点击外部关闭建议框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 首先添加一个处理头像URL的函数
  const getFullAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    return avatarPath.startsWith('http') 
        ? avatarPath 
        : `http://localhost:5000${avatarPath}`;
  };

  return (
    <SearchContainer className="search-container">
      <Search
        placeholder="搜索用户或帖子..."
        value={searchValue}
        onChange={handleChange}
        onSearch={handleSearch}
        onFocus={() => setShowSuggestions(true)}
        onClear={handleClear}
        allowClear
        enterButton
        loading={loading}
      />
      
      {showSuggestions && (
        <SuggestionsContainer>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Spin size="small" />
            </div>
          ) : (
            <>
              {suggestions.users?.length > 0 && (
                <SuggestionSection>
                  <SectionTitle>用户</SectionTitle>
                  {suggestions.users.map(user => (
                    <SuggestionItem
                      key={user._id}
                      onClick={() => {
                        navigate(`/profile/${user._id}`);
                        setShowSuggestions(false);
                      }}
                    >
                      <Avatar 
                        src={getFullAvatarUrl(user.avatar)} 
                        size="small" 
                        icon={!user.avatar && <UserOutlined />}
                      />
                      <div className="user-info">
                        <div className="username">{user.username}</div>
                        <div className="posts-count">{user.postsCount} 篇帖子</div>
                      </div>
                    </SuggestionItem>
                  ))}
                </SuggestionSection>
              )}
              
              {suggestions.posts?.length > 0 && (
                <SuggestionSection>
                  <SectionTitle>相关帖子</SectionTitle>
                  {suggestions.posts.map(post => (
                    <SuggestionItem
                      key={post._id}
                      onClick={() => {
                        handleSearch(searchValue);
                      }}
                    >
                      <div className="post-preview">
                        {post.content.slice(0, 50)}...
                      </div>
                      <div className="post-meta">
                        来自 {post.author.username}
                      </div>
                    </SuggestionItem>
                  ))}
                </SuggestionSection>
              )}
              
              {(suggestions.users?.length > 0 || suggestions.posts?.length > 0) && (
                <ViewAllButton
                  onClick={() => handleSearch(searchValue)}
                >
                  查看全部搜索结果
                </ViewAllButton>
              )}

              {!suggestions.users?.length && !suggestions.posts?.length && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Empty description="未找到相关内容" />
                </div>
              )}
            </>
          )}
        </SuggestionsContainer>
      )}
    </SearchContainer>
  );
};

export default SearchBar;