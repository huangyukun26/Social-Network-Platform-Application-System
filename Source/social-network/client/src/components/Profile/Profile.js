import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Avatar, Tabs, Empty, Dropdown, Menu, message, Modal, Spin, Space } from 'antd';
import { UserOutlined, TeamOutlined, HeartOutlined, CommentOutlined, PictureOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import EditProfile from './EditProfile';
import FollowList from './FollowList';
import { jwtDecode } from 'jwt-decode';

const { TabPane } = Tabs;

const ProfileContainer = styled.div`
  max-width: 935px;
  margin: 0 auto;
  padding: 30px 20px;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 80px;
  margin-bottom: 44px;
`;

const ProfileActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const AvatarSection = styled.div`
  flex: 0 0 auto;
  margin-right: 30px;
  display: flex;
  justify-content: center;
  width: 150px;
`;

const InfoSection = styled.div`
  flex: 1;
`;

const Username = styled.h2`
  font-size: 28px;
  font-weight: 300;
  margin-bottom: 20px;
`;

const Stats = styled.div`
  display: flex;
  gap: 40px;
  margin-bottom: 20px;
`;

const StatItem = styled.div`
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

const Bio = styled.div`
  font-size: 16px;
  margin-top: 20px;
`;

const PostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  margin-top: 20px;
`;

const PostItem = styled.div`
  position: relative;
  padding-bottom: 100%;
  cursor: pointer;
  background: #f5f5f5;
  
  &:hover .overlay {
    opacity: 1;
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
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
`;

const PostModalWrapper = styled.div`
  display: flex;
  height: 80vh;
  max-height: 750px;
  background: #fff;
`;

const PostImageSection = styled.div`
  flex: 2;
  background: ${props => props.textOnly ? '#f5f5f5' : '#000'};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PostDetailsSection = styled.div`
  flex: 1;
  width: 300px;
  border-left: 1px solid #dbdbdb;
  display: flex;
  flex-direction: column;
  background: #fff;
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #dbdbdb;
`;

const PostContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-top: 16px;
`;

const TextPostOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 20px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 14px;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
`;

const PostTextContent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  font-size: 18px;
  line-height: 1.6;
  color: #262626;
  background: #f5f5f5;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-y: auto;
`;

const EditProfileModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }
  
  .ant-modal-body {
    padding: 24px;
  }
`;

const PostModal = styled(Modal)`
  .ant-modal-content {
    overflow: hidden;
  }
`;

const Profile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    
    // 1. 所有状态定义
    const [currentUserId, setCurrentUserId] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState('none');
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDataFetching, setIsDataFetching] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [isPostModalVisible, setIsPostModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');

    // 2. 基础判断逻辑
    const isOwnProfile = useMemo(() => {
        return !userId || currentUserId === profileData?._id;
    }, [userId, currentUserId, profileData]);

    // 3. 可见性控制逻辑
    const canViewFollowers = useMemo(() => {
        if (isOwnProfile) return true;
        if (profileData?.privacy?.profileVisibility === 'public') {
            return profileData?.privacy?.showFollowers !== false;
        }
        if (friendshipStatus === 'friends') {
            return profileData?.privacy?.showFollowers !== false;
        }
        return false;
    }, [isOwnProfile, profileData, friendshipStatus]);

    const canViewFollowing = useMemo(() => {
        if (isOwnProfile) return true;
        if (profileData?.privacy?.profileVisibility === 'public') {
            return profileData?.privacy?.showFollowing !== false;
        }
        if (friendshipStatus === 'friends') {
            return profileData?.privacy?.showFollowing !== false;
        }
        return false;
    }, [isOwnProfile, profileData, friendshipStatus]);

    // 4. 数据获取函数
    const fetchFollowData = useCallback(async () => {
        if (!userId) return;
        
        try {
            const token = sessionStorage.getItem('token');
            const sessionId = sessionStorage.getItem('sessionId');
            let newFollowers = [];
            let newFollowing = [];

            if (canViewFollowers) {
                const followersRes = await axios.get(
                    `http://localhost:5000/api/follow/followers/${userId}`,
                    { 
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionId
                        }
                    }
                );
                newFollowers = followersRes.data;
            }

            if (canViewFollowing) {
                const followingRes = await axios.get(
                    `http://localhost:5000/api/follow/following/${userId}`,
                    { 
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionId
                        }
                    }
                );
                newFollowing = followingRes.data;
            }

            setFollowers(newFollowers);
            setFollowing(newFollowing);

            setProfileData(prev => prev && ({
                ...prev,
                statistics: {
                    ...prev.statistics,
                    followersCount: canViewFollowers ? newFollowers.length : '-',
                    followingCount: canViewFollowing ? newFollowing.length : '-'
                }
            }));
        } catch (error) {
            console.error('获取关注数据失败:', error);
            setFollowers([]);
            setFollowing([]);
        }
    }, [userId, canViewFollowers, canViewFollowing]);

    const fetchProfileData = async () => {
        if (isDataFetching) return;
        
        try {
            setIsDataFetching(true);
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const sessionId = sessionStorage.getItem('sessionId');
            if (!token || !sessionId) {
                navigate('/login');
                return;
            }

            // 获取用户资料
            const profileResponse = await axios.get(
                `http://localhost:5000/api/users/${userId || 'me'}`,
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Session-ID': sessionId
                    }
                }
            );
            
            const userData = profileResponse.data;
            setProfileData(userData);

            // 检查是否已经是好友
            if (userId && userId !== currentUserId) {
                const currentUserResponse = await axios.get(
                    'http://localhost:5000/api/users/me',
                    { 
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionId
                        }
                    }
                );
                
                const isFriend = currentUserResponse.data.friends.includes(userId);
                if (isFriend) {
                    setFriendshipStatus('friends');
                } else {
                    // 如果不是好友，再检查是否有待处理的请求
                    try {
                        const statusResponse = await axios.get(
                            `http://localhost:5000/api/friends/status/${userId}`,
                            { 
                                headers: { 
                                    Authorization: `Bearer ${token}`,
                                    'Session-ID': sessionId
                                }
                            }
                        );
                        setFriendshipStatus(statusResponse.data.status);
                        if (statusResponse.data.direction === 'received') {
                            setFriendshipStatus('received');
                        }
                    } catch (error) {
                        console.log('获取好友状态失败:', error);
                        setFriendshipStatus('none');
                    }
                }
            }

            // 获取帖子（如果是公开用户或者自己的主页）
            if (!userId || userData.privacy?.profileVisibility === 'public' || 
                userData._id === currentUserId || friendshipStatus === 'friends') {
                try {
                    const postsResponse = await axios.get(
                        `http://localhost:5000/api/posts/user/${userId || userData._id}`,
                        { 
                            headers: { 
                                Authorization: `Bearer ${token}`,
                                'Session-ID': sessionId
                            }
                        }
                    );
                    setPosts(postsResponse.data);
                } catch (error) {
                    console.log('获取帖子失败:', error);
                    setPosts([]);
                }
            }

            // 获取关注和粉丝列表
            const fetchPromises = [];
            
            fetchPromises.push(
                axios.get(`http://localhost:5000/api/follow/${userId || userData._id}/followers`, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Session-ID': sessionId
                    }
                }).then(response => setFollowers(response.data))
                .catch(() => setFollowers([]))
            );

            fetchPromises.push(
                axios.get(`http://localhost:5000/api/follow/${userId || userData._id}/following`, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Session-ID': sessionId
                    }
                }).then(response => setFollowing(response.data))
                .catch(() => setFollowing([]))
            );

            // 并行执行所有请求
            await Promise.allSettled(fetchPromises);

            // 只有在查看他人主页时才获取关系状态
            if (userId && userId !== userData._id) {
                try {
                    const statusResponse = await axios.get(
                        `http://localhost:5000/api/friends/status/${userId}`,
                        { 
                            headers: { 
                                Authorization: `Bearer ${token}`,
                                'Session-ID': sessionId
                            }
                        }
                    );
                    setFriendshipStatus(statusResponse.data.status);
                    if (statusResponse.data.direction === 'received') {
                        setFriendshipStatus('received');
                    }
                } catch (error) {
                    console.log('获取好友状态失败:', error);
                    setFriendshipStatus('none');
                }

                try {
                    const followResponse = await axios.get(
                        `http://localhost:5000/api/follow/status/${userId}`,
                        { 
                            headers: { 
                                Authorization: `Bearer ${token}`,
                                'Session-ID': sessionId
                            }
                        }
                    );
                    setIsFollowing(followResponse.data.isFollowing);
                } catch (error) {
                    console.log('获取关注状态失败:', error);
                    setIsFollowing(false);
                }
            }

        } catch (error) {
            if (error.response && error.response.status === 403) {
                const limitedData = {
                    _id: userId,
                    username: '私密用户',
                    avatar: null,
                    bio: '该用户资料已设为私密',
                    privacy: { profileVisibility: 'private' },
                    statistics: {
                        postsCount: '-',
                        friendsCount: '-',
                        followersCount: '-',
                        followingCount: '-'
                    }
                };
                setProfileData(limitedData);
                setPosts([]);
                setFollowers([]);
                setFollowing([]);
            } else {
                console.error('获取个人资料失败:', error);
                message.error('获取个人资料失败');
            }
        } finally {
            setLoading(false);
            setIsDataFetching(false);
        }
    };

    // 5. 事件处理函数
    const handleFollow = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const sessionId = sessionStorage.getItem('sessionId');
            if (!token || !sessionId) {
                message.error('请先登录');
                navigate('/login');
                return;
            }

            await axios.post(
                `http://localhost:5000/api/follow/${userId}`,
                {},
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Session-ID': sessionId
                    }
                }
            );
            
            setIsFollowing(!isFollowing);
            message.success(isFollowing ? '已取消关注' : '已关注');
            fetchProfileData();
        } catch (error) {
            console.error('关注操作失败:', error);
            message.error('操作失败');
        }
    };

    const handleFriendAction = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const sessionId = sessionStorage.getItem('sessionId');
            if (!token || !sessionId) {
                message.error('请先登录');
                navigate('/login');
                return;
            }

            if (friendshipStatus === 'none') {
                await axios.post(
                    `http://localhost:5000/api/friends/request/${userId}`,
                    {},
                    { 
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionId
                        }
                    }
                );
                setFriendshipStatus('pending');
                message.success('已发送好友请求');
            } else if (friendshipStatus === 'friends') {
                await axios.delete(
                    `http://localhost:5000/api/friends/${userId}`,
                    { 
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionId
                        }
                    }
                );
                setFriendshipStatus('none');
                message.success('已删除好友');
            }
            fetchProfileData();
        } catch (error) {
            console.error('好友操作失败:', error);
            message.error('操作失败');
        }
    };

    const handlePostClick = (post) => {
        setSelectedPost(post);
        setIsPostModalVisible(true);
    };

    // 6. useEffect 钩子
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const sessionId = sessionStorage.getItem('sessionId');
        if (token && sessionId) {
            const decodedToken = jwtDecode(token);
            setCurrentUserId(decodedToken.userId);
        } else {
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        if (profileData) {
            fetchFollowData();
        }
    }, [fetchFollowData, profileData]);

    useEffect(() => {
        fetchProfileData();
    }, [userId]);

    const fetchFriendshipStatus = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                const token = sessionStorage.getItem('token');
                const sessionId = sessionStorage.getItem('sessionId');
                const response = await axios.get(
                    `http://localhost:5000/api/friends/status/${userId}`,
                    { 
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionId
                        }
                    }
                );
                return response.data;
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    };

    // 修改 useEffect 中的获取状态逻辑
    useEffect(() => {
        if (userId && userId !== currentUserId) {
            fetchFriendshipStatus()
                .then(data => {
                    setFriendshipStatus(data.status);
                    if (data.direction === 'received') {
                        setFriendshipStatus('received');
                    }
                })
                .catch(error => {
                    console.error('获取好友状态失败:', error);
                    setFriendshipStatus('none');
                });
        }
    }, [userId, currentUserId]);

    // 7. 渲染逻辑
    if (loading) {
        return (
            <ProfileContainer>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin size="large" tip="加载中..." />
                </div>
            </ProfileContainer>
        );
    }

    if (!profileData) {
        return (
            <ProfileContainer>
                <Empty
                    description="未找到用户信"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </ProfileContainer>
        );
    }

    // 添加好友按钮渲染函数
    const renderFriendButton = () => {
        if (!userId || userId === currentUserId) return null;
        
        switch (friendshipStatus) {
            case 'none':
                return (
                    <Button type="primary" onClick={handleFriendAction}>
                        添加好友
                    </Button>
                );
            case 'pending':
                return (
                    <Button disabled>
                        请求已发送
                    </Button>
                );
            case 'friends':
                return (
                    <Button onClick={handleFriendAction}>
                        删除好友
                    </Button>
                );
            case 'received':
                return (
                    <Button type="primary">
                        接受请求
                    </Button>
                );
            default:
                return null;
        }
    };

    return (
        <ProfileContainer>
            <ProfileHeader>
                <AvatarSection>
                    <Avatar 
                        size={150} 
                        icon={<UserOutlined />} 
                        src={profileData?.avatar ? `http://localhost:5000${profileData.avatar}` : null} 
                    />
                </AvatarSection>
                <InfoSection>
                    <Username>
                        {profileData?.username}
                        {profileData?.privacy?.profileVisibility === 'private' && 
                            <span style={{ fontSize: '14px', color: '#8e8e8e', marginLeft: '8px' }}>
                                (私密账户)
                            </span>
                        }
                    </Username>
                    
                    {isOwnProfile ? (
                        <Button onClick={() => setIsEditModalVisible(true)}>
                            编辑个人资料
                        </Button>
                    ) : (
                        <Space>
                            {userId !== currentUserId && (
                                <>
                                    {renderFriendButton()}
                                    <Button
                                        type={isFollowing ? 'default' : 'primary'}
                                        onClick={handleFollow}
                                    >
                                        {isFollowing ? '取消关注' : '关注'}
                                    </Button>
                                </>
                            )}
                        </Space>
                    )}

                    <Stats>
                        <StatItem onClick={() => setActiveTab('posts')}>
                            <strong>{posts?.length || 0}</strong> 帖子
                        </StatItem>
                        {canViewFollowers && (
                            <StatItem onClick={() => setActiveTab('followers')}>
                                <strong>{followers?.length || 0}</strong> 粉丝
                            </StatItem>
                        )}
                        {canViewFollowing && (
                            <StatItem onClick={() => setActiveTab('following')}>
                                <strong>{following?.length || 0}</strong> 关注
                            </StatItem>
                        )}
                    </Stats>

                    <Bio>{profileData?.bio || '暂无简介'}</Bio>
                </InfoSection>
            </ProfileHeader>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab={`帖子 ${posts?.length || 0}`} key="posts">
                    <PostGrid>
                        {posts.map(post => (
                            <PostItem key={post._id} onClick={() => handlePostClick(post)}>
                                {post.image ? (
                                    <>
                                        <PostImage 
                                            src={`http://localhost:5000${post.image}`} 
                                            alt={post.description} 
                                        />
                                        <Overlay className="overlay">
                                            <div style={{ color: 'white', display: 'flex', gap: '20px' }}>
                                                <span>
                                                    <HeartOutlined /> {post.likes?.length || 0}
                                                </span>
                                                <span>
                                                    <CommentOutlined /> {post.comments?.length || 0}
                                                </span>
                                            </div>
                                        </Overlay>
                                    </>
                                ) : (
                                    <>
                                        <TextPostOverlay>
                                            {post.description}
                                        </TextPostOverlay>
                                        <Overlay className="overlay">
                                            <div style={{ color: 'white', display: 'flex', gap: '20px' }}>
                                                <span>
                                                    <HeartOutlined /> {post.likes?.length || 0}
                                                </span>
                                                <span>
                                                    <CommentOutlined /> {post.comments?.length || 0}
                                                </span>
                                            </div>
                                        </Overlay>
                                    </>
                                )}
                            </PostItem>
                        ))}
                    </PostGrid>
                </TabPane>
                {canViewFollowers && (
                    <TabPane tab={`粉丝 ${followers?.length || 0}`} key="followers">
                        <FollowList 
                            users={followers}
                            type="followers"
                            onUpdate={async () => {
                                await fetchFollowData();
                                await fetchProfileData();
                            }}
                            currentUserId={currentUserId}
                            isOwnProfile={!userId || currentUserId === profileData?._id}
                        />
                    </TabPane>
                )}
                {canViewFollowing && (
                    <TabPane tab={`关注 ${following?.length || 0}`} key="following">
                        <FollowList 
                            users={following}
                            type="following"
                            onUpdate={async () => {
                                await fetchFollowData();
                                await fetchProfileData();
                            }}
                            currentUserId={currentUserId}
                        />
                    </TabPane>
                )}
            </Tabs>

            {/* 添加编辑个人资料模态框 */}
            {isEditModalVisible && (
                <EditProfileModal 
                    title="编辑个人资料"
                    visible={isEditModalVisible}
                    onCancel={() => setIsEditModalVisible(false)}
                    footer={null}
                    width={600}
                    destroyOnClose
                >
                    <EditProfile 
                        onClose={() => setIsEditModalVisible(false)}
                        onSuccess={() => {
                            setIsEditModalVisible(false);
                            fetchProfileData();
                        }}
                        initialData={profileData}
                    />
                </EditProfileModal>
            )}

            {/* 帖子详情模态框 */}
            <PostModal
                visible={isPostModalVisible}
                onCancel={() => setIsPostModalVisible(false)}
                width="65%"
                style={{ 
                    maxWidth: '1100px',
                    margin: '20px auto',
                    padding: 0
                }}
                footer={null}
                destroyOnClose
                bodyStyle={{ padding: 0 }}
                centered
            >
                {selectedPost && (
                    <PostModalWrapper>
                        <PostImageSection textOnly={!selectedPost.image}>
                            {selectedPost.image ? (
                                <img 
                                    src={`http://localhost:5000${selectedPost.image}`}
                                    alt={selectedPost.content}
                                />
                            ) : (
                                <PostTextContent>
                                    {selectedPost.content}
                                </PostTextContent>
                            )}
                        </PostImageSection>
                        <PostDetailsSection>
                            <PostHeader>
                                <Avatar 
                                    size={32} 
                                    src={profileData?.avatar ? `http://localhost:5000${profileData.avatar}` : null}
                                    icon={<UserOutlined />}
                                />
                                <span style={{ marginLeft: '10px' }}>{profileData?.username}</span>
                            </PostHeader>
                            <PostContent>
                                {selectedPost.content && (
                                    <div style={{ padding: '16px 0' }}>
                                        {selectedPost.content}
                                    </div>
                                )}
                                {/* 这里可以添加评论等其他内容 */}
                            </PostContent>
                        </PostDetailsSection>
                    </PostModalWrapper>
                )}
            </PostModal>
        </ProfileContainer>
    );
};

export default Profile; 