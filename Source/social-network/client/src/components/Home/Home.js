import React, { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, List, Avatar, message, Space, Empty, Spin } from 'antd';
import { 
    LikeOutlined, 
    LikeFilled, 
    CommentOutlined, 
    UserOutlined,
    SaveOutlined,
    SaveFilled,
    SendOutlined,
    EllipsisOutlined,
    UserAddOutlined
} from '@ant-design/icons';
import axios from 'axios';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import { useNavigate, Link } from 'react-router-dom';
import { CreatePost } from '../Posts';

const { TextArea } = Input;

// Instagram风格的容器
const Container = styled.div`
  max-width: 470px;
  margin: 0 auto;
  padding: ${theme.spacing.lg} 0;
  
  @media (max-width: 768px) {
    padding: 0;
  }
`;

// Stories区域
const StoriesContainer = styled.div`
  background: white;
  border: 1px solid ${theme.colors.border};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  overflow-x: auto;
  white-space: nowrap;
  display: flex;
  gap: 16px;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const StoryItem = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  
  .story-avatar {
    width: 56px;
    height: 56px;
    border: 2px solid #e1306c;
    border-radius: 50%;
    padding: 2px;
    margin-bottom: 8px;
  }
  
  .story-username {
    font-size: 12px;
    color: ${theme.colors.text.primary};
    max-width: 64px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

// 发帖区域
const CreatePostArea = styled.div`
  background: white;
  border: 1px solid ${theme.colors.border};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  
  .ant-input {
    border: none;
    resize: none;
    &:focus {
      box-shadow: none;
    }
  }
  
  .ant-btn {
    float: right;
    margin-top: 8px;
  }
`;

// 帖子卡片
const PostCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: none;
  border: 1px solid ${theme.colors.border};
  
  .ant-card-body {
    padding: 0;
  }
`;

const PostHeader = styled.div`
  padding: 14px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid ${theme.colors.border};
  
  .username {
    margin-left: 12px;
    font-weight: 600;
    flex: 1;
    
    &:hover {
      text-decoration: underline;
      cursor: pointer;
    }
  }
  
  .more-options {
    cursor: pointer;
    padding: 8px;
  }
`;

const PostImage = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  
  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PostActions = styled.div`
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  
  .left-actions {
    display: flex;
    gap: 16px;
  }
`;

const ActionIcon = styled.span`
  cursor: pointer;
  font-size: 24px;
  color: ${props => props.active ? theme.colors.primary : theme.colors.text.primary};
  
  &:hover {
    opacity: 0.7;
  }
`;

const PostContent = styled.div`
    padding: ${theme.spacing.md} ${theme.spacing.lg};
    
    // 当没有图片时，增加内容的显示样式
    &.no-image {
        font-size: 18px;
        padding: ${theme.spacing.xl};
        min-height: 100px;
        display: flex;
        align-items: center;
        background: ${theme.colors.background};
        border-radius: 8px;
        margin: ${theme.spacing.md} 0;
    }

    .likes {
        font-weight: 600;
        margin-bottom: 8px;
    }

    .caption {
        margin-bottom: 8px;
        
        .username {
            font-weight: 600;
            margin-right: 8px;
        }
    }

    .timestamp {
        color: ${theme.colors.textSecondary};
        font-size: 12px;
    }
`;

const CommentSection = styled.div`
  border-top: 1px solid ${theme.colors.border};
`;

const CommentInput = styled.div`
  display: flex;
  padding: 16px;
  gap: 12px;
  align-items: flex-start;
  
  .ant-input {
    border: none;
    resize: none;
    padding: 8px 0;
    
    &:focus {
      box-shadow: none;
    }
  }
  
  .ant-btn {
    padding: 0;
    height: auto;
    line-height: 1;
    
    &:hover {
      background: none;
      color: ${theme.colors.primary};
    }
  }
`;

const CommentList = styled.div`
  padding: 0 16px 16px;
  
  .comment {
    margin-bottom: 8px;
    
    .username {
      font-weight: 600;
      margin-right: 8px;
    }
  }
`;

const FriendSuggestions = styled.div`
    background: white;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

    h3 {
        margin-bottom: 16px;
        color: #262626;
    }
`;

const SuggestionItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    
    .user-info {
        display: flex;
        align-items: center;
        
        .avatar {
            margin-right: 12px;
        }
        
        .username {
            color: #262626;
            font-weight: 600;
        }
    }
`;

// 添加新的样式组件
const SuggestionsContainer = styled.div`
  background: white;
  border: 1px solid ${theme.colors.border};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const Home = () => {
    const [posts, setPosts] = useState([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [commentContent, setCommentContent] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [postSubmitting, setPostSubmitting] = useState(false);
    const user = JSON.parse(localStorage.getItem('user'));
    const navigate = useNavigate();
    const [suggestions, setSuggestions] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchPosts = useCallback(async (pageNum = 1) => {
        try {
            if (pageNum === 1) {
                setInitialLoading(true);
            } else {
                setLoadingMore(true);
            }

            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5000/api/posts/feed/page/${pageNum}`,
                { headers: { Authorization: `Bearer ${token}` }}
            );
            
            if (pageNum === 1) {
                setPosts(response.data.posts);
            } else {
                setPosts(prev => [...prev, ...response.data.posts]);
            }
            
            setHasMore(pageNum < response.data.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.error('获取帖子失败:', error);
            if (error.response?.status === 401) {
                localStorage.clear();
                message.error('请重新登录');
                navigate('/login');
            } else {
                message.error('获取帖子失败');
            }
        } finally {
            if (pageNum === 1) {
                setInitialLoading(false);
            } else {
                setLoadingMore(false);
            }
        }
    }, [navigate]);

    const fetchSuggestions = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('未找到token');
                return;
            }

            const response = await axios.get('http://localhost:5000/api/friends/suggestions', {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setSuggestions(response.data);
        } catch (error) {
            console.error('获取推荐失败:', error.response || error);
            setSuggestions([]); 
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchPosts(1);
            await fetchSuggestions();
        };
        init();
    }, [fetchPosts, fetchSuggestions]);

    const handlePost = async () => {
        if (!content.trim()) {
            return message.warning('请输入内容');
        }

        try {
            setPostSubmitting(true);
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/posts', 
                { content },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setContent('');
            message.success('发布成功！');
            fetchPosts();
        } catch (error) {
            message.error('发布失败');
        } finally {
            setPostSubmitting(false);
        }
    };

    const handleLike = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (!token || !user) {
                message.error('请先登录');
                navigate('/login');
                return;
            }

            // 乐观更新
            setPosts(prevPosts => 
                prevPosts.map(post => {
                    if (post._id === postId) {
                        const isLiked = post.likes.includes(user._id);
                        return {
                            ...post,
                            likes: isLiked 
                                ? post.likes.filter(id => id !== user._id)
                                : [...post.likes, user._id]
                        };
                    }
                    return post;
                })
            );

            const response = await axios.post(
                `http://localhost:5000/api/posts/${postId}/like`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // 使用服务器返回的完整帖子数据更新状态
            setPosts(prevPosts =>
                prevPosts.map(post =>
                    post._id === postId ? response.data : post
                )
            );

        } catch (error) {
            console.error('点赞失败:', error);
            message.error('点赞失败，请重试');
            // 发生错误时重新获取帖子列表
            fetchPosts();
        }
    };

    const handleComment = async (postId) => {
        if (!commentContent[postId]?.trim()) {
            return message.warning('请输入评论内容');
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('token');
            const cleanedPostId = postId.replace(/\.\.\./g, '');
            
            const response = await axios.post(
                `http://localhost:5000/api/posts/${cleanedPostId}/comment`,
                { content: commentContent[postId] },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // 更新帖子列表
            setPosts(prevPosts =>
                prevPosts.map(post =>
                    post._id === postId
                        ? { ...post, comments: [...post.comments, response.data] }
                        : post
                )
            );

            // 清空评论输入框
            setCommentContent(prev => ({
                ...prev,
                [postId]: ''
            }));

            message.success('评论功');
        } catch (error) {
            console.error('评论失败:', error);
            message.error('评论失败，请重试');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePostCreated = (newPost) => {
        // 更新帖子列表
        setPosts(prevPosts => [newPost, ...prevPosts]);
    };

    const handleSave = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `http://localhost:5000/api/posts/${postId}/save`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            setPosts(prevPosts =>
                prevPosts.map(post =>
                    post._id === postId ? response.data : post
                )
            );
        } catch (error) {
            message.error('保存失败，请重试');
        }
    };

    const getFullAvatarUrl = (avatarPath) => {
        if (!avatarPath) return null;
        return avatarPath.startsWith('http') 
            ? avatarPath 
            : `http://localhost:5000${avatarPath}`;
    };

    const getFullImageUrl = (imagePath) => {
        if (!imagePath) return null;
        return imagePath.startsWith('http') 
            ? imagePath 
            : `http://localhost:5000${imagePath}`;
    };

    const formatTime = (date) => {
        const now = new Date();
        const postDate = new Date(date);
        const diff = now - postDate;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}天前`;
        if (hours > 0) return `${hours}小时前`;
        if (minutes > 0) return `${minutes}分钟前`;
        return '刚刚';
    };

    const handleSendRequest = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://localhost:5000/api/friends/request/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('好友请求已发送');
            fetchSuggestions(); // 刷新推荐列表
        } catch (error) {
            message.error('发送请求失败');
        }
    };

    // 添加加载更多功能
    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchPosts(page + 1);
        }
    };

    if (initialLoading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh' 
            }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Container>
            <StoriesContainer>
                {/* Stories示例 */}
                {[1,2,3,4,5].map(i => (
                    <StoryItem key={i}>
                        <Avatar 
                            className="story-avatar"
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                        />
                        <span className="story-username">user_{i}</span>
                    </StoryItem>
                ))}
            </StoriesContainer>

            <FriendSuggestions>
                <h3>好友推荐</h3>
                {suggestions.map(user => (
                    <SuggestionItem key={user._id}>
                        <div className="user-info">
                            <Avatar 
                                className="avatar"
                                src={getFullAvatarUrl(user.avatar)}
                                icon={<UserOutlined />}
                            />
                            <Link to={`/profile/${user._id}`} className="username">
                                {user.username}
                            </Link>
                        </div>
                        <Button
                            type="link"
                            icon={<UserAddOutlined />}
                            onClick={() => handleSendRequest(user._id)}
                        >
                            添加好友
                        </Button>
                    </SuggestionItem>
                ))}
            </FriendSuggestions>

            <CreatePost onPostCreated={handlePostCreated} />

            <List
                dataSource={posts}
                loadMore={
                    hasMore && (
                        <div style={{ textAlign: 'center', margin: '12px 0' }}>
                            <Button 
                                onClick={loadMore} 
                                loading={loadingMore}
                            >
                                加载更多
                            </Button>
                        </div>
                    )
                }
                locale={{
                    emptyText: <Empty description="暂无动态" />
                }}
                renderItem={post => (
                    <PostCard>
                        <PostHeader>
                            <Avatar 
                                src={getFullAvatarUrl(post.author.avatar)} 
                                icon={<UserOutlined />} 
                            />
                            <Link to={`/profile/${post.author._id}`} className="username">
                                {post.author.username}
                            </Link>
                            <EllipsisOutlined className="more-options" />
                        </PostHeader>
                        
                        {post.image ? (
                            // 有图片时显示图片
                            <PostImage onDoubleClick={() => !post.likes.includes(user._id) && handleLike(post._id)}>
                                <img src={getFullImageUrl(post.image)} alt="post" />
                            </PostImage>
                        ) : (
                            // 没有图片时只显示内容
                            <PostContent className="no-image">
                                {post.content}
                            </PostContent>
                        )}

                        <PostActions>
                            <Space>
                                <Button 
                                    type="text" 
                                    icon={post.likes.includes(user._id) ? <LikeFilled /> : <LikeOutlined />}
                                    onClick={() => handleLike(post._id)}
                                />
                                <Button 
                                    type="text" 
                                    icon={<CommentOutlined />} 
                                />
                                <Button 
                                    type="text" 
                                    icon={post.savedBy?.includes(user._id) ? <SaveFilled /> : <SaveOutlined />}
                                    onClick={() => handleSave(post._id)}
                                />
                            </Space>
                        </PostActions>
                        
                        <PostContent>
                            <div className="likes">
                                {post.likes.length} 次赞
                            </div>
                            <div className="caption">
                                <span className="username">{post.author.username}</span>
                                {post.content}
                            </div>
                            <div className="timestamp">
                                {formatTime(post.createdAt)}
                            </div>
                        </PostContent>
                        
                        <CommentSection>
                            <CommentList>
                                {post.comments.map((comment, index) => (
                                    <div key={index} className="comment">
                                        <span className="username">{comment.user.username}</span>
                                        {comment.content}
                                    </div>
                                ))}
                            </CommentList>
                            
                            <CommentInput>
                                <TextArea
                                    value={commentContent[post._id] || ''}
                                    onChange={e => setCommentContent({
                                        ...commentContent,
                                        [post._id]: e.target.value
                                    })}
                                    placeholder="添加评论..."
                                    autoSize
                                />
                                <Button 
                                    type="link"
                                    onClick={() => handleComment(post._id)}
                                    loading={submitting}
                                >
                                    发布
                                </Button>
                            </CommentInput>
                        </CommentSection>
                    </PostCard>
                )}
            />
        </Container>
    );
};

export default Home;