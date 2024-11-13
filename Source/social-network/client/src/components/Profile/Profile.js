import React, { useState, useEffect } from 'react';
import { Button, Avatar, Tabs, Empty, Dropdown, Menu, message, Modal, Spin, Space } from 'antd';
import { UserOutlined, TeamOutlined, HeartOutlined, CommentOutlined, PictureOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import EditProfile from './EditProfile';
import FollowList from './FollowList';

const { TabPane } = Tabs;

const ProfileContainer = styled.div`
  max-width: 935px;
  margin: 0 auto;
  padding: 30px 20px;
`;

const ProfileHeader = styled.div`
  display: flex;
  margin-bottom: 44px;
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
    const navigate = useNavigate();
    const { userId } = useParams();
    const [activeTab, setActiveTab] = useState('posts');
    const [posts, setPosts] = useState([]);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [isPostModalVisible, setIsPostModalVisible] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState(null);
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isDataFetching, setIsDataFetching] = useState(false);

    // 判断是否是当前用户的个人页面
    const isOwnProfile = !userId;
    // 从好友状态判断是否是好友
    const isFriend = friendshipStatus === 'friends';

    // 在组件加载时获取当前用户ID
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('http://localhost:5000/api/users/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCurrentUserId(response.data._id);
            } catch (error) {
                console.error('获取当前用户信息失败:', error);
            }
        };
        fetchCurrentUser();
    }, []);

    // 在获取个人资料时检查关注状态
    useEffect(() => {
        const checkFollowStatus = async () => {
            if (!userId || !currentUserId) return;
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(
                    `http://localhost:5000/api/follow/status/${userId}`,
                    { headers: { Authorization: `Bearer ${token}` }}
                );
                setIsFollowing(response.data.isFollowing);
            } catch (error) {
                console.error('获取关注状态失败:', error);
            }
        };
        checkFollowStatus();
    }, [userId, currentUserId]);

    // 好友菜单只在个人页面显示
    const friendsMenu = isOwnProfile ? (
        <Menu>
            <Menu.Item key="requests" onClick={() => navigate('/friend-requests')}>
                <TeamOutlined /> 好友请求
            </Menu.Item>
            <Menu.Item key="list" onClick={() => navigate('/friends')}>
                <UserOutlined /> 好友列表
            </Menu.Item>
        </Menu>
    ) : null;

    const fetchFriendshipStatus = async () => {
        if (!userId) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5000/api/friends/status/${userId}`,
                { headers: { Authorization: `Bearer ${token}` }}
            );
            setFriendshipStatus(response.data.status);
        } catch (error) {
            console.error('获取好友状态失败:', error);
        }
    };

    const fetchProfileData = async () => {
        if (isDataFetching) return;
        
        try {
            setIsDataFetching(true);
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // 获取用户资料
            const profileResponse = await axios.get(
                `http://localhost:5000/api/users/${userId || 'me'}`,
                { headers: { Authorization: `Bearer ${token}` }}
            );
            
            const userData = profileResponse.data;
            setProfileData(userData);

            // 获取帖子（如果是公开用户或者是自己的主页）
            if (!userId || userData.privacy?.profileVisibility === 'public' || 
                userData._id === currentUserId || friendshipStatus === 'friends') {
                try {
                    const postsResponse = await axios.get(
                        `http://localhost:5000/api/posts/user/${userId || userData._id}`,
                        { headers: { Authorization: `Bearer ${token}` }}
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
                    headers: { Authorization: `Bearer ${token}` }
                }).then(response => setFollowers(response.data))
                .catch(() => setFollowers([]))
            );

            fetchPromises.push(
                axios.get(`http://localhost:5000/api/follow/${userId || userData._id}/following`, {
                    headers: { Authorization: `Bearer ${token}` }
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
                        { headers: { Authorization: `Bearer ${token}` }}
                    );
                    setFriendshipStatus(statusResponse.data.status);
                } catch (error) {
                    console.log('获取好友状态失败:', error);
                    setFriendshipStatus('none');
                }

                try {
                    const followResponse = await axios.get(
                        `http://localhost:5000/api/follow/status/${userId}`,
                        { headers: { Authorization: `Bearer ${token}` }}
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

    useEffect(() => {
        fetchProfileData();
    }, [userId]); // 只在 userId 变化时重新加载

    const handleFriendAction = async () => {
        try {
            const token = localStorage.getItem('token');
            if (friendshipStatus === 'none') {
                await axios.post(
                    `http://localhost:5000/api/friends/request/${userId}`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` }}
                );
                setFriendshipStatus('pending');
                message.success('已发送好友请求');
            } else if (friendshipStatus === 'friends') {
                await axios.delete(
                    `http://localhost:5000/api/friends/${userId}`,
                    { headers: { Authorization: `Bearer ${token}` }}
                );
                setFriendshipStatus('none');
                message.success('已删除好友');
            }
        } catch (error) {
            console.error('好友操作失败:', error);
            message.error('操作失败');
        }
    };

    const renderFriendButton = () => {
        if (!userId) return null;
        
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
                        已是好友
                    </Button>
                );
            default:
                return null;
        }
    };

    const handlePostClick = (post) => {
        setSelectedPost(post);
        setIsPostModalVisible(true);
    };

    const handleFollow = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `http://localhost:5000/api/follow/${userId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` }}
            );
            setIsFollowing(!isFollowing);
            fetchProfileData(); // 刷新数据
        } catch (error) {
            message.error('操作失败');
            console.error('关注操作失败:', error);
        }
    };

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
                            <Button 
                                type={isFollowing ? 'default' : 'primary'}
                                onClick={handleFollow}
                            >
                                {isFollowing ? '取消关注' : '关注'}
                            </Button>
                            {renderFriendButton()}
                        </Space>
                    )}

                    <Stats>
                        <StatItem>
                            <strong>{posts?.length || 0}</strong> 帖子
                        </StatItem>
                        <StatItem>
                            <strong>{profileData?.friends?.length || 0}</strong> 好友
                        </StatItem>
                        <StatItem>
                            <strong>{followers?.length || 0}</strong> 粉丝
                        </StatItem>
                        <StatItem>
                            <strong>{following?.length || 0}</strong> 关注
                        </StatItem>
                    </Stats>

                    <Bio>{profileData?.bio || '暂无简介'}</Bio>
                </InfoSection>
            </ProfileHeader>

            <Tabs defaultActiveKey="posts">
                <TabPane tab="帖子" key="posts">
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
                <TabPane tab="粉丝" key="followers">
                    <FollowList 
                        users={followers}
                        type="followers"
                        onUpdate={fetchProfileData}
                        currentUserId={currentUserId}
                    />
                </TabPane>
                <TabPane tab="关注" key="following">
                    <FollowList 
                        users={following}
                        type="following"
                        onUpdate={fetchProfileData}
                        currentUserId={currentUserId}
                    />
                </TabPane>
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