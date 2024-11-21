import React, { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, List, Avatar, message, Space, Empty, Spin, Row, Col, Statistic, Modal, Menu, Dropdown, Tabs } from 'antd';
import { 
    LikeOutlined, 
    LikeFilled, 
    CommentOutlined, 
    UserOutlined,
    SaveOutlined,
    SaveFilled,
    SendOutlined,
    EllipsisOutlined,
    UserAddOutlined,
    LeftOutlined,
    RightOutlined,
    ExclamationCircleOutlined,
    SearchOutlined as SearchIcon,
    UserOutlined as UserIcon,
    TeamOutlined as TeamIcon,
    CompassOutlined as RecommendIcon
} from '@ant-design/icons';
import axios from 'axios';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { CreatePost } from '../Posts';
import PerformanceMonitor from '../../utils/performanceMonitor';
import { Carousel } from 'antd';

const { TextArea } = Input;
const { TabPane } = Tabs;

// Instagram风格的容器
const Container = styled.div`
  width: 100%;
  margin: 0;
  padding: 0;
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
const PostCard = styled.div`
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
  margin-bottom: 0;
  padding: 12px 16px;
`;

const PostHeader = styled.div`
  padding: 14px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
  
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

// 图片容器
const PostImage = styled.div`
    position: relative;
    width: 100%;
    padding-top: 100%; // 保持1:1的宽高比
    background: #fff;
    overflow: hidden;
    
    img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        background: #fff;
    }
`;

const PostActions = styled.div`
  padding: 8px 16px;
  display: flex;
  gap: 16px;
  
  .ant-btn {
    color: #536471;
    
    &:hover {
      color: rgb(29, 155, 240);
      background-color: rgba(29, 155, 240, 0.1);
    }
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

// 帖子内容区域
const PostContent = styled.div`
    padding: 12px 16px;
    
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
        font-size: 12px;
        color: #8e8e8e;
    }
`;

// 评论区域
const CommentSection = styled.div`
    padding: 0 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.15);
    background: white;
`;

const CommentList = styled.div`
    padding: 8px 0;
    
    .comment {
        margin-bottom: 8px;
        font-size: 14px;
        
        .username {
            font-weight: 600;
            margin-right: 8px;
            cursor: pointer;
            
            &:hover {
                text-decoration: underline;
            }
        }
        
        .content {
            color: ${theme.colors.text.primary};
        }
        
        .time {
            margin-left: 8px;
            font-size: 12px;
            color: ${theme.colors.text.secondary};
        }
    }
`;

const CommentInput = styled.div`
    display: flex;
    align-items: flex-start;
    padding: 8px 0;
    border-top: 1px solid ${theme.colors.border};
    
    .ant-input {
        border: none;
        padding: 4px 0;
        
        &:focus {
            box-shadow: none;
        }
    }
    
    .ant-btn {
        padding: 4px 8px;
        height: auto;
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

const PerformanceCard = styled(Card)`
    margin-bottom: 24px;
    background: #f8f9fa;
    border-radius: 8px;
    
    .ant-statistic-title {
        color: #666;
        font-size: 14px;
    }
    
    .ant-statistic-content {
        color: #1890ff;
    }
`;

// 修改轮播图样式组件
const CarouselWrapper = styled.div`
    position: relative;
    background: #fff;
    border-radius: 4px;
    overflow: hidden;
    
    .ant-carousel {
        .slick-slide {
            > div {
                display: flex;
                align-items: center;
                justify-content: center;
                background: #fff;
            }
        }

        .slick-dots {
            bottom: 12px;
            li {
                margin: 0 4px;
                
                button {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.9) !important;
                    border: 2px solid rgba(0, 149, 246, 0.8);
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                    transition: all 0.3s ease;
                    
                    &:hover {
                        border-color: rgb(0, 149, 246);
                        transform: scale(1.1);
                    }
                }
                
                &.slick-active button {
                    background: rgb(0, 149, 246) !important;
                    border-color: rgb(0, 149, 246);
                    transform: scale(1.2);
                }
            }
        }

        // 优化左右箭头
        .slick-prev,
        .slick-next {
            z-index: 2;
            width: 32px;
            height: 32px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(0, 149, 246, 0.3);
            border-radius: 50%;
            display: flex !important;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            
            &:hover {
                background: #fff;
                border-color: rgb(0, 149, 246);
                box-shadow: 0 2px 12px rgba(0, 149, 246, 0.2);
            }
            
            &::before {
                color: rgb(0, 149, 246);
                font-size: 16px;
                line-height: 1;
            }
        }

        .slick-prev {
            left: 16px;
        }

        .slick-next {
            right: 16px;
        }

        &:hover {
            .slick-prev,
            .slick-next {
                opacity: 1;
            }
        }
    }
`;

const PostsList = styled.div`
  width: 100%;
`;

// 添加自定义样式组件
const StyledTabs = styled(Tabs)`
  .ant-tabs-nav {
    margin-bottom: 20px;
    padding: 0 16px;
    background: white;
    border-radius: 8px;
    border: 1px solid ${theme.colors.border};
  }

  .ant-tabs-tab {
    padding: 12px 16px;
    margin: 0 16px 0 0;
    font-size: 15px;
    
    &:hover {
      color: ${theme.colors.primary};
    }
  }

  .ant-tabs-tab-active {
    font-weight: 600;
  }

  .ant-tabs-ink-bar {
    background: ${theme.colors.primary};
  }
`;

const Home = () => {
    const [posts, setPosts] = useState([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [commentContent, setCommentContent] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [postSubmitting, setPostSubmitting] = useState(false);
    const navigate = useNavigate();
    const [suggestions, setSuggestions] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cacheMetrics, setCacheMetrics] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [user, setUser] = useState(null);
    const [searchState, setSearchState] = useState({
        loading: false,
        error: null,
        results: {
            exactMatches: [],
            relatedPosts: [],
            authorPosts: [],
            relatedUsers: []
        }
    });
    const [relatedResults, setRelatedResults] = useState({
        relatedUsers: [],
        authorPosts: [],
        relatedPosts: []
    });
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('q');
    const [activeTab, setActiveTab] = useState(searchQuery ? 'search' : 'feed');
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const sessionId = sessionStorage.getItem('sessionId');
        const storedUser = JSON.parse(sessionStorage.getItem('user'));
        const tokenExpiry = sessionStorage.getItem('tokenExpiry');
        
        if (tokenExpiry && new Date().getTime() > parseInt(tokenExpiry)) {
            sessionStorage.clear();
            navigate('/login');
            return;
        }
        
        if (!token || !sessionId || !storedUser) {
            navigate('/login');
            return;
        }
        
        setUser(storedUser);
        fetchPosts(1);
        fetchSuggestions();
    }, [navigate]);

    // 检查用户是否为管理员
    useEffect(() => {
        const user = JSON.parse(sessionStorage.getItem('user'));
        setIsAdmin(user?.role === 'admin');
    }, []);

    // 获取缓存性能数据
    const fetchCacheMetrics = useCallback(async () => {
        if (!isAdmin) return;
        
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/admin/cache/metrics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCacheMetrics(response.data.metrics);
        } catch (error) {
            console.error('获取缓存指标失败:', error);
        }
    }, [isAdmin]);

    // 定期更新缓存指标
    useEffect(() => {
        if (isAdmin) {
            fetchCacheMetrics();
            const interval = setInterval(fetchCacheMetrics, 30000); // 每30秒更新一次
            return () => clearInterval(interval);
        }
    }, [fetchCacheMetrics, isAdmin]);

    const fetchPosts = useCallback(async (pageNum = 1) => {
        const requestKey = `posts-page-${pageNum}`;
        PerformanceMonitor.startRequest(requestKey);
        
        try {
            if (pageNum === 1) {
                setInitialLoading(true);
            } else {
                setLoadingMore(true);
            }

            const token = sessionStorage.getItem('token');
            const sessionId = sessionStorage.getItem('sessionId');
            const response = await axios.get(
                `http://localhost:5000/api/posts/feed/page/${pageNum}`,
                { headers: { Authorization: `Bearer ${token}`, 'Session-ID': sessionId }}
            );
            
            if (pageNum === 1) {
                setPosts(response.data.posts);
            } else {
                setPosts(prev => [...prev, ...response.data.posts]);
            }
            
            setHasMore(pageNum < response.data.totalPages);
            setPage(pageNum);
            
            const metrics = PerformanceMonitor.endRequest(requestKey, response.headers['x-cache-hit'] === 'true');
            if (metrics && isAdmin) {
                console.log('请求性能指标:', metrics);
            }
        } catch (error) {
            console.error('获取帖子失败:', error);
            if (error.response?.status === 401) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('sessionId');
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('tokenExpiry');
                setUser(null);
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
    }, [navigate, isAdmin]);

    const fetchSuggestions = useCallback(async () => {
        try {
            const token = sessionStorage.getItem('token');
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
            console.error('获取推荐:', error.response || error);
            setSuggestions([]); 
        }
    }, []);

    const handlePost = async () => {
        if (!content.trim()) {
            return message.warning('请输入内容');
        }

        try {
            setPostSubmitting(true);
            const token = sessionStorage.getItem('token');
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
            const token = sessionStorage.getItem('token');
            const user = JSON.parse(sessionStorage.getItem('user'));
            
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
            // 发生错误时新获取帖子列表
            fetchPosts();
        }
    };

    const handleComment = async (postId) => {
        if (!commentContent[postId]?.trim()) {
            return message.warning('请输入评论内容');
        }

        try {
            setSubmitting(true);
            const token = sessionStorage.getItem('token');
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

    const handlePostCreated = useCallback((newPost) => {
        try {
            // 确保新帖子包含所有必要的信息
            const currentUser = JSON.parse(sessionStorage.getItem('user'));
            const enrichedPost = {
                ...newPost,
                author: {
                    _id: currentUser._id,
                    username: currentUser.username,
                    avatar: currentUser.avatar
                },
                likes: [],
                comments: [],
                savedBy: [],
                createdAt: new Date().toISOString()
            };
            
            // 更新帖子列表
            setPosts(prevPosts => [enrichedPost, ...prevPosts]);
            
            // 刷新第一页的帖子
            fetchPosts(1);
            
        } catch (error) {
            console.error('理新帖子失败:', error);
            message.error('更新帖子列表失败');
        }
    }, [fetchPosts]);

    const handleSave = async (postId) => {
        try {
            const token = sessionStorage.getItem('token');
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
            const token = sessionStorage.getItem('token');
            await axios.post(`http://localhost:5000/api/friends/request/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('好友请求已发送');
            fetchSuggestions(); // 刷推荐列表
        } catch (error) {
            message.error('送请求失败');
        }
    };

    // 添加加载更多功能
    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchPosts(page + 1);
        }
    };


    const handleProfileClick = (userId) => {
        const token = sessionStorage.getItem('token');
        const sessionId = sessionStorage.getItem('sessionId');
        
        if (!token || !sessionId) {
            message.error('请先登录');
            navigate('/login');
            return;
        }
        
        navigate(`/profile/${userId}`);
    };

    // 在组件内添加删除确认函数
    const handleDeletePost = async (postId) => {
        Modal.confirm({
            title: '确认删除',
            icon: <ExclamationCircleOutlined />,
            content: '删除后的帖子可在30天内恢复，是否确认删除？',
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                try {
                    const token = sessionStorage.getItem('token');
                    const sessionId = sessionStorage.getItem('sessionId');
                    
                    await axios.delete(
                        `http://localhost:5000/api/posts/${postId}`, 
                        {
                            headers: { 
                                Authorization: `Bearer ${token}`,
                                'Session-ID': sessionId
                            },
                            data: { reason: '用户主动删除' } // 添加删除原因
                        }
                    );
                    
                    message.success('帖子已删除');
                    // 更新本地状态
                    setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
                    
                    // 可选：刷新帖子列表
                    fetchPosts(1);
                } catch (error) {
                    console.error('删除帖子失败:', error);
                    message.error('删除失败，请重试');
                }
            }
        });
    };

    // 在帖子操作菜单中添加删除选项
    const postActions = (post) => (
        <Menu>
            {post.author._id === user?._id && (
                <Menu.Item 
                    key="delete" 
                    onClick={() => handleDeletePost(post._id)}
                    danger
                >
                    删除帖子
                </Menu.Item>
            )}
        </Menu>
    );

    // 优化搜索函数
    const fetchSearchResults = async (query) => {
        if (!query) return;
        setSearchState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const token = sessionStorage.getItem('token');
            
            // 同时获取帖子搜索结果和相关推荐
            const [postsResponse, relatedResponse] = await Promise.all([
                // 保持原有的帖子搜索接口
                axios.get(
                    `http://localhost:5000/api/posts/search?query=${encodeURIComponent(query)}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                ),
                // 修改为正确的相关搜索接口路径
                axios.get(
                    `http://localhost:5000/api/search/results?q=${encodeURIComponent(query)}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                )
            ]);

            setSearchState({
                loading: false,
                error: null,
                results: {
                    ...relatedResponse.data,
                    searchPosts: postsResponse.data.posts
                }
            });
            
            setActiveTab('search');
        } catch (error) {
            console.error('搜索失败:', error);
            setSearchState(prev => ({
                ...prev,
                loading: false,
                error: '搜索失败，请重试'
            }));
        }
    };
    
    useEffect(() => {
        fetchPosts();
    }, []);
    
    useEffect(() => {
        if (searchQuery) {
            setActiveTab('search');
            fetchSearchResults(searchQuery);
        } else {
            setActiveTab('feed');
            // 清空搜索结果
            setSearchState({
                loading: false,
                error: null,
                results: {
                    exactMatches: [],
                    relatedPosts: [],
                    authorPosts: [],
                    relatedUsers: []
                }
            });
        }
    }, [searchQuery]);

    // 获取推荐用户
    const fetchSuggestedUsers = async () => {
        try {
            const { data } = await axios.get('/api/users/suggestions');
            setSuggestedUsers(data);
        } catch (error) {
            console.error('获取推荐用户失败:', error);
        }
    };

    return (
        <Container>
            <StyledTabs 
                activeKey={activeTab}
                onChange={(key) => {
                    setActiveTab(key);
                    if (key === 'feed') {
                        navigate('/', { replace: true });
                    }
                }}
            >
                <TabPane 
                    tab={
                        <span style={{ padding: '0 8px' }}>
                            全部动态
                        </span>
                    } 
                    key="feed"
                >
                    <PostsList>
                        <List
                            dataSource={posts}
                            loadMore={hasMore && (
                                <div style={{ textAlign: 'center', margin: '12px 0' }}>
                                    <Button onClick={loadMore} loading={loadingMore}>
                                        加载更多
                                    </Button>
                                </div>
                            )}
                            locale={{
                                emptyText: <Empty description="暂无动态" />
                            }}
                            renderItem={post => {
                                if (!post?._id || !post?.author?._id) {
                                    console.warn('Invalid post data:', post);
                                    return null;
                                }

                                const author = post.author || {};
                                const likes = post.likes || [];
                                const comments = post.comments || [];
                                const savedBy = post.savedBy || [];

                                return (
                                    <PostCard key={post._id}>
                                        <PostHeader>
                                            <Avatar 
                                                src={author.avatar ? getFullAvatarUrl(author.avatar) : null} 
                                                icon={<UserOutlined />} 
                                            />
                                            <Link 
                                                to={`/profile/${author._id}`} 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleProfileClick(author._id);
                                                }}
                                                className="username"
                                            >
                                                {author.username}
                                            </Link>
                                            {post.author._id === user?._id && (
                                                <Dropdown overlay={postActions(post)} trigger={['click']}>
                                                    <Button type="text" icon={<EllipsisOutlined />} />
                                                </Dropdown>
                                            )}
                                        </PostHeader>
                                        
                                        {post.images && post.images.length > 0 ? (
                                            <CarouselWrapper>
                                                <Carousel
                                                    dots={post.images.length > 1}
                                                    infinite={true}
                                                    speed={300}
                                                    arrows={post.images.length > 1}
                                                    draggable={true}
                                                    touchThreshold={10}
                                                    prevArrow={<LeftOutlined />}
                                                    nextArrow={<RightOutlined />}
                                                >
                                                    {post.images.map((image, index) => (
                                                        <div key={index}>
                                                            <PostImage>
                                                                <img
                                                                    src={getFullImageUrl(image)}
                                                                    alt={`Post image ${index + 1}`}
                                                                    loading="lazy"
                                                                />
                                                            </PostImage>
                                                        </div>
                                                    ))}
                                                </Carousel>
                                            </CarouselWrapper>
                                        ) : post.image ? (
                                            <PostImage>
                                                <img
                                                    src={getFullImageUrl(post.image)}
                                                    alt="Post content"
                                                    loading="lazy"
                                                />
                                            </PostImage>
                                        ) : null}

                                        <PostActions>
                                            <Space>
                                                <Button 
                                                    type="text" 
                                                    icon={likes.includes(user?._id) ? <LikeFilled /> : <LikeOutlined />}
                                                    onClick={() => handleLike(post._id)}
                                                />
                                                <Button 
                                                    type="text" 
                                                    icon={<CommentOutlined />} 
                                                />
                                                <Button 
                                                    type="text" 
                                                    icon={savedBy.includes(user?._id) ? <SaveFilled /> : <SaveOutlined />}
                                                    onClick={() => handleSave(post._id)}
                                                />
                                            </Space>
                                        </PostActions>
                                        
                                        <PostContent>
                                            <div className="likes">
                                                {likes.length} 次赞
                                            </div>
                                            <div className="caption">
                                                <span className="username">{author.username}</span>
                                                {post.content}
                                            </div>
                                            <div className="timestamp">
                                                {formatTime(post.createdAt)}
                                            </div>
                                        </PostContent>
                                        
                                        <CommentSection>
                                            <CommentList>
                                                {comments.map((comment, index) => (
                                                    <div key={`${post._id}-comment-${index}`} className="comment">
                                                        <span 
                                                            className="username"
                                                            onClick={() => navigate(`/profile/${comment.user?._id}`)}
                                                        >
                                                            {comment.user?.username}
                                                        </span>
                                                        <span className="content">{comment.content}</span>
                                                        <span className="time">{formatTime(comment.createdAt)}</span>
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
                                );
                            }}
                        />
                    </PostsList>
                </TabPane>
                
                {searchQuery && (
                    <TabPane 
                        tab={`搜索结果: ${searchQuery}`}
                        key="search"
                    >
                        <SearchResultsWrapper>
                            {/* 精确匹配结果 */}
                            {searchState.results.exactMatches?.length > 0 && (
                                <ResultSection>
                                    <SectionHeader>
                                        <SearchIcon />
                                        精确匹配
                                        <ResultCount>({searchState.results.exactMatches.length})</ResultCount>
                                    </SectionHeader>
                                    <PostsList>
                                        <List
                                            dataSource={searchState.results.exactMatches}
                                            renderItem={post => {
                                                const { likes = [], comments = [], savedBy = [], author } = post;
                                                return (
                                                    <PostCard key={post._id}>
                                                        <PostHeader>
                                                            <Avatar src={getFullAvatarUrl(author?.avatar)} />
                                                            <span 
                                                                className="username" 
                                                                onClick={() => navigate(`/profile/${author?._id}`)}
                                                            >
                                                                {author?.username}
                                                            </span>
                                                            <span style={{ color: theme.colors.text.secondary, marginLeft: '8px' }}>
                                                                {formatTime(post.createdAt)}
                                                            </span>
                                                        </PostHeader>

                                                        {post.images && post.images.length > 0 ? (
                                                            <CarouselWrapper>
                                                                <Carousel
                                                                    dots={post.images.length > 1}
                                                                    infinite={true}
                                                                    speed={300}
                                                                    arrows={post.images.length > 1}
                                                                    draggable={true}
                                                                    touchThreshold={10}
                                                                    prevArrow={<LeftOutlined />}
                                                                    nextArrow={<RightOutlined />}
                                                                >
                                                                    {post.images.map((image, index) => (
                                                                        <div key={index}>
                                                                            <PostImage>
                                                                                <img
                                                                                    src={getFullImageUrl(image)}
                                                                                    alt={`Post image ${index + 1}`}
                                                                                    loading="lazy"
                                                                                />
                                                                            </PostImage>
                                                                        </div>
                                                                    ))}
                                                                </Carousel>
                                                            </CarouselWrapper>
                                                        ) : post.image ? (
                                                            <PostImage>
                                                                <img
                                                                    src={getFullImageUrl(post.image)}
                                                                    alt="Post content"
                                                                    loading="lazy"
                                                                />
                                                            </PostImage>
                                                        ) : null}

                                                        <PostActions>
                                                            <Space>
                                                                <Button 
                                                                    type="text"
                                                                    icon={likes.includes(user?._id) ? <LikeFilled /> : <LikeOutlined />}
                                                                    onClick={() => handleLike(post._id)}
                                                                >
                                                                    {likes.length}
                                                                </Button>
                                                                <Button 
                                                                    type="text"
                                                                    icon={<CommentOutlined />}
                                                                >
                                                                    {comments.length}
                                                                </Button>
                                                                <Button 
                                                                    type="text"
                                                                    icon={savedBy.includes(user?._id) ? <SaveFilled /> : <SaveOutlined />}
                                                                    onClick={() => handleSave(post._id)}
                                                                />
                                                            </Space>
                                                        </PostActions>

                                                        <PostContent>
                                                            <div className="likes">
                                                                {likes.length} 次赞
                                                            </div>
                                                            <div className="caption">
                                                                <span className="username">{author.username}</span>
                                                                {post.content}
                                                            </div>
                                                            <div className="timestamp">
                                                                {formatTime(post.createdAt)}
                                                            </div>
                                                        </PostContent>

                                                        <CommentSection>
                                                            <CommentList>
                                                                {post.comments?.map((comment, index) => (
                                                                    <div key={`${post._id}-comment-${index}`} className="comment">
                                                                        <span 
                                                                            className="username"
                                                                            onClick={() => navigate(`/profile/${comment.user?._id}`)}
                                                                            style={{ 
                                                                                fontWeight: 600,
                                                                                marginRight: '8px',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            {comment.user?.username}
                                                                        </span>
                                                                        <span className="content">{comment.content}</span>
                                                                        <span 
                                                                            className="time"
                                                                            style={{
                                                                                marginLeft: '8px',
                                                                                fontSize: '12px',
                                                                                color: theme.colors.text.secondary
                                                                            }}
                                                                        >
                                                                            {formatTime(comment.createdAt)}
                                                                        </span>
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
                                                );
                                            }}
                                        />
                                    </PostsList>
                                </ResultSection>
                            )}

                            {/* 相关推荐帖子 */}
                            {searchState.results.relatedPosts?.length > 0 && (
                                <ResultSection>
                                    <SectionHeader>
                                        <RecommendIcon />
                                        相关推荐
                                        <ResultCount>({searchState.results.relatedPosts.length})</ResultCount>
                                    </SectionHeader>
                                    <PostsList>
                                        <List
                                            dataSource={searchState.results.relatedPosts}
                                            renderItem={post => {
                                                const { likes = [], comments = [], savedBy = [], author } = post;
                                                return (
                                                    <PostCard key={post._id}>
                                                        <PostHeader>
                                                            <Avatar src={getFullAvatarUrl(author.avatar)} />
                                                            <span 
                                                                className="username" 
                                                                onClick={() => navigate(`/profile/${author._id}`)}
                                                            >
                                                                {author.username}
                                                            </span>
                                                            <span style={{ color: theme.colors.text.secondary, marginLeft: '8px' }}>
                                                                {formatTime(post.createdAt)}
                                                            </span>
                                                        </PostHeader>

                                                        {post.images && post.images.length > 0 ? (
                                                            <CarouselWrapper>
                                                                <Carousel
                                                                    dots={post.images.length > 1}
                                                                    infinite={true}
                                                                    speed={300}
                                                                    arrows={post.images.length > 1}
                                                                    draggable={true}
                                                                    touchThreshold={10}
                                                                    prevArrow={<LeftOutlined />}
                                                                    nextArrow={<RightOutlined />}
                                                                >
                                                                    {post.images.map((image, index) => (
                                                                        <div key={index}>
                                                                            <PostImage>
                                                                                <img
                                                                                    src={getFullImageUrl(image)}
                                                                                    alt={`Post image ${index + 1}`}
                                                                                    loading="lazy"
                                                                                />
                                                                            </PostImage>
                                                                        </div>
                                                                    ))}
                                                                </Carousel>
                                                            </CarouselWrapper>
                                                        ) : post.image ? (
                                                            <PostImage>
                                                                <img
                                                                    src={getFullImageUrl(post.image)}
                                                                    alt="Post content"
                                                                    loading="lazy"
                                                                />
                                                            </PostImage>
                                                        ) : null}

                                                        <PostActions>
                                                            <Space>
                                                                <Button 
                                                                    type="text"
                                                                    icon={likes.includes(user?._id) ? <LikeFilled /> : <LikeOutlined />}
                                                                    onClick={() => handleLike(post._id)}
                                                                >
                                                                    {likes.length}
                                                                </Button>
                                                                <Button 
                                                                    type="text"
                                                                    icon={<CommentOutlined />}
                                                                >
                                                                    {comments.length}
                                                                </Button>
                                                                <Button 
                                                                    type="text"
                                                                    icon={savedBy.includes(user?._id) ? <SaveFilled /> : <SaveOutlined />}
                                                                    onClick={() => handleSave(post._id)}
                                                                />
                                                            </Space>
                                                        </PostActions>

                                                        <PostContent>
                                                            <div className="likes">
                                                                {likes.length} 次赞
                                                            </div>
                                                            <div className="caption">
                                                                <span className="username">{author.username}</span>
                                                                {post.content}
                                                            </div>
                                                            <div className="timestamp">
                                                                {formatTime(post.createdAt)}
                                                            </div>
                                                        </PostContent>

                                                        <CommentSection>
                                                            <CommentList>
                                                                {comments.map((comment, index) => (
                                                                    <div key={`${post._id}-comment-${index}`} className="comment">
                                                                        <span 
                                                                            className="username"
                                                                            onClick={() => navigate(`/profile/${comment.user?._id}`)}
                                                                        >
                                                                            {comment.user?.username}
                                                                        </span>
                                                                        <span className="content">{comment.content}</span>
                                                                        <span className="time">{formatTime(comment.createdAt)}</span>
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
                                                );
                                            }}
                                        />
                                    </PostsList>
                                </ResultSection>
                            )}

                            {/* 作者的其他帖子 */}
                            {searchState.results.authorPosts?.length > 0 && (
                                <ResultSection>
                                    <SectionHeader>
                                        <UserIcon />
                                        作者的其他帖子
                                        <ResultCount>({searchState.results.authorPosts.length})</ResultCount>
                                    </SectionHeader>
                                    <PostsList>
                                        <List
                                            dataSource={searchState.results.authorPosts}
                                            renderItem={post => {
                                                const { likes = [], comments = [], savedBy = [], author } = post;
                                                return (
                                                    <PostCard key={post._id}>
                                                        <PostHeader>
                                                            <Avatar src={getFullAvatarUrl(author.avatar)} />
                                                            <span 
                                                                className="username" 
                                                                onClick={() => navigate(`/profile/${author._id}`)}
                                                            >
                                                                {author.username}
                                                            </span>
                                                            <span style={{ color: theme.colors.text.secondary, marginLeft: '8px' }}>
                                                                {formatTime(post.createdAt)}
                                                            </span>
                                                        </PostHeader>

                                                        {post.images && post.images.length > 0 ? (
                                                            <CarouselWrapper>
                                                                <Carousel
                                                                    dots={post.images.length > 1}
                                                                    infinite={true}
                                                                    speed={300}
                                                                    arrows={post.images.length > 1}
                                                                    draggable={true}
                                                                    touchThreshold={10}
                                                                    prevArrow={<LeftOutlined />}
                                                                    nextArrow={<RightOutlined />}
                                                                >
                                                                    {post.images.map((image, index) => (
                                                                        <div key={index}>
                                                                            <PostImage>
                                                                                <img
                                                                                    src={getFullImageUrl(image)}
                                                                                    alt={`Post image ${index + 1}`}
                                                                                    loading="lazy"
                                                                                />
                                                                            </PostImage>
                                                                        </div>
                                                                    ))}
                                                                </Carousel>
                                                            </CarouselWrapper>
                                                        ) : post.image ? (
                                                            <PostImage>
                                                                <img
                                                                    src={getFullImageUrl(post.image)}
                                                                    alt="Post content"
                                                                    loading="lazy"
                                                                />
                                                            </PostImage>
                                                        ) : null}

                                                        <PostActions>
                                                            <Space>
                                                                <Button 
                                                                    type="text"
                                                                    icon={likes.includes(user?._id) ? <LikeFilled /> : <LikeOutlined />}
                                                                    onClick={() => handleLike(post._id)}
                                                                >
                                                                    {likes.length}
                                                                </Button>
                                                                <Button 
                                                                    type="text"
                                                                    icon={<CommentOutlined />}
                                                                >
                                                                    {comments.length}
                                                                </Button>
                                                                <Button 
                                                                    type="text"
                                                                    icon={savedBy.includes(user?._id) ? <SaveFilled /> : <SaveOutlined />}
                                                                    onClick={() => handleSave(post._id)}
                                                                />
                                                            </Space>
                                                        </PostActions>

                                                        <PostContent>
                                                            <div className="likes">
                                                                {likes.length} 次赞
                                                            </div>
                                                            <div className="caption">
                                                                <span className="username">{author.username}</span>
                                                                {post.content}
                                                            </div>
                                                            <div className="timestamp">
                                                                {formatTime(post.createdAt)}
                                                            </div>
                                                        </PostContent>

                                                        <CommentSection>
                                                            <CommentList>
                                                                {comments.map((comment, index) => (
                                                                    <div key={`${post._id}-comment-${index}`} className="comment">
                                                                        <span 
                                                                            className="username"
                                                                            onClick={() => navigate(`/profile/${comment.user?._id}`)}
                                                                        >
                                                                            {comment.user?.username}
                                                                        </span>
                                                                        <span className="content">{comment.content}</span>
                                                                        <span className="time">{formatTime(comment.createdAt)}</span>
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
                                                );
                                            }}
                                        />
                                    </PostsList>
                                </ResultSection>
                            )}

                            {/* 相关用户 */}
                            {searchState.results.relatedUsers?.length > 0 && (
                                <ResultSection>
                                    <SectionHeader>
                                        <TeamIcon />
                                        相关用户
                                        <ResultCount>({searchState.results.relatedUsers.length})</ResultCount>
                                    </SectionHeader>
                                    <UserList>
                                        {searchState.results.relatedUsers.map(user => (
                                            <UserItem 
                                                key={user._id}
                                                onClick={() => navigate(`/profile/${user._id}`)}
                                            >
                                                <Avatar src={getFullAvatarUrl(user.avatar)} />
                                                <UserInfo>
                                                    <Username>{user.username}</Username>
                                                    <PostCount>{user.postsCount} 篇帖子</PostCount>
                                                </UserInfo>
                                            </UserItem>
                                        ))}
                                    </UserList>
                                </ResultSection>
                            )}

                            {/* 无结果显示 */}
                            {!searchState.results.exactMatches?.length && 
                             !searchState.results.relatedPosts?.length && 
                             !searchState.results.authorPosts?.length && 
                             !searchState.results.relatedUsers?.length && (
                                <Empty description="未找到相关内容" />
                            )}
                        </SearchResultsWrapper>
                    </TabPane>
                )}
            </StyledTabs>
        </Container>
    );
};

// 新增样式组件
const ResultSection = styled.div`
    background: white;
    border: 1px solid ${theme.colors.border};
    border-radius: 8px;
    margin-bottom: 24px;
    overflow: hidden;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    padding: 16px;
    background: ${theme.colors.background};
    border-bottom: 1px solid ${theme.colors.border};
    font-size: 16px;
    font-weight: 600;
    color: ${theme.colors.text.primary};

    .anticon {
        margin-right: 8px;
        font-size: 18px;
        color: ${theme.colors.primary};
    }
`;

const ResultCount = styled.span`
    margin-left: 8px;
    font-size: 14px;
    font-weight: normal;
    color: ${theme.colors.text.secondary};
`;

const SearchResultsWrapper = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const UserList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const UserItem = styled.div`
    display: flex;
    align-items: center;
    padding: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
    
    &:hover {
        background: ${theme.colors.background};
        border-radius: 8px;
    }
`;

const UserInfo = styled.div`
    margin-left: 12px;
    flex: 1;
`;

const Username = styled.div`
    font-weight: 500;
    color: ${theme.colors.text.primary};
    &:hover {
        text-decoration: underline;
    }
`;

const PostCount = styled.div`
    font-size: 12px;
    color: ${theme.colors.text.secondary};
    margin-top: 2px;
`;

const SuggestedUserCard = styled.div`
    display: flex;
    align-items: center;
    padding: 8px;
    cursor: pointer;
    
    &:hover {
        background: ${theme.colors.background};
    }
    
    .user-info {
        margin-left: 12px;
        flex: 1;
    }
    
    .username {
        font-weight: 600;
        color: ${theme.colors.text.primary};
    }
    
    .stats {
        font-size: 12px;
        color: ${theme.colors.text.secondary};
    }
`;

export default Home;