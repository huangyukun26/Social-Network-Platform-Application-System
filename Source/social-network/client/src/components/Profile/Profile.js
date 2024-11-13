import React, { useState, useEffect } from 'react';
import { Button, Avatar, Tabs, Empty, Dropdown, Menu, message, Modal, Spin } from 'antd';
import { UserOutlined, TeamOutlined, HeartOutlined, CommentOutlined, PictureOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import EditProfile from './EditProfile';

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
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
`;

const PostModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }
  
  .ant-modal-body {
    padding: 0;
  }
`;

const PostModalContent = styled.div`
  display: flex;
  height: 600px;
  background: white;
`;

const PostImageSection = styled.div`
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
`;

const PostDetailsSection = styled.div`
  width: 340px;
  background: white;
  border-left: 1px solid #efefef;
  display: flex;
  flex-direction: column;
`;

const PlaceholderWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #999;
  background: #fafafa;
  
  .anticon {
    font-size: 32px;
    margin-bottom: 8px;
  }
`;

const PostHeader = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid #dbdbdb;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UserName = styled.span`
  font-weight: 600;
`;

const PostContent = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
`;

const PostActions = styled.div`
  padding: 16px;
  border-top: 1px solid #dbdbdb;
  display: flex;
  gap: 16px;
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
    
    // 判断是否是当前用户的个人页面
    const isOwnProfile = !userId;

    useEffect(() => {
        fetchProfileData();
    }, [userId]);

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
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // 获取好友状态
            let friendStatus = 'none';
            if (userId) {
                try {
                    const statusResponse = await axios.get(
                        `http://localhost:5000/api/friends/status/${userId}`,
                        { headers: { Authorization: `Bearer ${token}` }}
                    );
                    friendStatus = statusResponse.data.status;
                } catch (error) {
                    // 如果获取好友状态失败，默认为非好友
                    console.log('获取好友状态失败:', error);
                    friendStatus = 'none';
                }
            }

            try {
                const profileResponse = await axios.get(
                    `http://localhost:5000/api/users/${userId || 'me'}`,
                    { headers: { Authorization: `Bearer ${token}` }}
                );
                
                const userData = profileResponse.data;
                setProfileData(userData);

                // 如果是公开用户或者是好友，获取帖子
                if (!userId || friendStatus === 'friends' || userData.privacy?.profileVisibility === 'public') {
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
                } else {
                    setPosts([]);
                }

            } catch (error) {
                // 处理 403 错误，显示有限信息
                if (error.response && error.response.status === 403) {
                    const limitedData = error.response.data.limitedInfo || {
                        _id: userId,
                        username: '私密用户',
                        avatar: null,
                        bio: '该用户资料已设为私密',
                        privacy: {
                            profileVisibility: 'private'
                        },
                        statistics: {
                            postsCount: '-',
                            friendsCount: '-'
                        }
                    };
                    setProfileData(limitedData);
                    setPosts([]);
                } else {
                    console.error('获取个人资料失败:', error);
                    message.error('获取个人资料失败');
                }
            }

        } catch (error) {
            console.error('获取数据失败:', error);
            message.error('获取数据失败');
        } finally {
            setLoading(false);
        }
    };

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
                    description="未找到用户信息"
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
                    <Username>{profileData?.username}</Username>
                    <Stats>
                        {(isOwnProfile || profileData?.privacy?.showPosts) && (
                            <StatItem>
                                <span>{posts.length}</span> 帖子
                            </StatItem>
                        )}
                        
                        {(isOwnProfile || profileData?.privacy?.showFollowers) && (
                            <StatItem>
                                <span>{profileData?.friends?.length || 0}</span> 好友
                            </StatItem>
                        )}
                        
                        {(isOwnProfile || profileData?.privacy?.showEmail) && (
                            <StatItem>
                                <span>{profileData?.email}</span>
                            </StatItem>
                        )}
                    </Stats>
                    <Bio>{profileData?.bio || '这个人很懒，什么都没写~'}</Bio>
                    {isOwnProfile ? (
                        <Button 
                            type="default"
                            onClick={() => setIsEditModalVisible(true)}
                            style={{ marginTop: '20px' }}
                        >
                            编辑个人资料
                        </Button>
                    ) : (
                        renderFriendButton()
                    )}
                </InfoSection>
            </ProfileHeader>

            {/* 帖子展示部分 */}
            {(isOwnProfile || profileData?.privacy?.showPosts) && (
                <PostGrid>
                    {posts.map((post) => (
                        <PostItem key={post._id} onClick={() => handlePostClick(post)}>
                            {post.image ? (
                                <>
                                    <PostImage 
                                        src={`http://localhost:5000${post.image}`} 
                                        alt={post.content}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
                                            e.target.parentElement.querySelector('.placeholder').style.display = 'flex';
                                        }}
                                    />
                                    <PlaceholderWrapper className="placeholder" style={{ display: 'none' }}>
                                        <PictureOutlined />
                                        <span>图片加载失败</span>
                                    </PlaceholderWrapper>
                                    <Overlay className="overlay">
                                        <div style={{ textAlign: 'center', color: 'white' }}>
                                            <div>❤️ {post.likes?.length || 0}</div>
                                            <div>💬 {post.comments?.length || 0}</div>
                                        </div>
                                    </Overlay>
                                </>
                            ) : (
                                <PlaceholderWrapper>
                                    <PictureOutlined />
                                    <span>{post.content || '无图片内容'}</span>
                                </PlaceholderWrapper>
                            )}
                        </PostItem>
                    ))}
                </PostGrid>
            )}

            {/* Instagram 风格的帖子预览弹窗 */}
            <Modal
                visible={isPostModalVisible}
                onCancel={() => setIsPostModalVisible(false)}
                footer={null}
                width={1200}
                style={{ top: 20 }}
                bodyStyle={{ padding: 0 }}
            >
                {selectedPost && (
                    <PostModalContent>
                        <PostImageSection>
                            {selectedPost.image ? (
                                <img 
                                    src={`http://localhost:5000${selectedPost.image}`} 
                                    alt={selectedPost.content}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <PlaceholderWrapper>
                                    <PictureOutlined />
                                    <span>无图片内容</span>
                                </PlaceholderWrapper>
                            )}
                        </PostImageSection>
                        <PostDetailsSection>
                            <PostHeader>
                                <Avatar 
                                    src={profileData?.avatar ? `http://localhost:5000${profileData.avatar}` : null}
                                    icon={<UserOutlined />}
                                />
                                <UserName>{profileData?.username}</UserName>
                            </PostHeader>
                            <PostContent>
                                <p>{selectedPost.content}</p>
                            </PostContent>
                            <PostActions>
                                <Button icon={<HeartOutlined />}>
                                    {selectedPost.likes?.length || 0}
                                </Button>
                                <Button icon={<CommentOutlined />}>
                                    {selectedPost.comments?.length || 0}
                                </Button>
                            </PostActions>
                        </PostDetailsSection>
                    </PostModalContent>
                )}
            </Modal>

            {/* 编辑个人资料弹窗只在个人页面显示 */}
            {isOwnProfile && (
                <Modal
                    visible={isEditModalVisible}
                    onCancel={() => setIsEditModalVisible(false)}
                    footer={null}
                    width={600}
                    title="编辑个人资料"
                >
                    <EditProfile 
                        onSuccess={() => {
                            setIsEditModalVisible(false);
                            fetchProfileData();
                        }}
                    />
                </Modal>
            )}
        </ProfileContainer>
    );
};

export default Profile; 