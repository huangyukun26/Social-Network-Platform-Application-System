import React, { useState } from 'react';
import { List, Avatar, Button, message, Modal } from 'antd';
import { UserOutlined, HeartOutlined, CommentOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

const FriendItem = styled(List.Item)`
  padding: 16px;
  margin-bottom: 8px;
  background: white;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .ant-list-item-meta-title {
    margin-bottom: 4px;
    
    a {
      color: #262626;
      &:hover {
        color: #1890ff;
      }
    }
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StyledAvatar = styled(Avatar)`
  width: 44px;
  height: 44px;
  cursor: pointer;
`;

const ProfileModalContent = styled.div`
  display: flex;
  height: 600px;
  background: white;
`;

const ProfileInfo = styled.div`
  width: 340px;
  border-left: 1px solid #efefef;
  display: flex;
  flex-direction: column;
`;

const ProfileHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #efefef;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ProfileStats = styled.div`
  display: flex;
  padding: 20px;
  justify-content: space-around;
  border-bottom: 1px solid #efefef;
`;

const StatItem = styled.div`
  text-align: center;
  
  .number {
    font-weight: 600;
    font-size: 18px;
  }
  
  .label {
    color: #8e8e8e;
    font-size: 14px;
  }
`;

const ProfileBio = styled.div`
  padding: 20px;
  flex: 1;
  overflow-y: auto;
`;

const FriendsList = ({ friends, onUpdate }) => {
    const navigate = useNavigate();
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // 获取完整的头像URL
    const getFullAvatarUrl = (avatarPath) => {
        if (!avatarPath) return null;
        return avatarPath.startsWith('http') 
            ? avatarPath 
            : `http://localhost:5000${avatarPath}`;
    };

    const handleRemoveFriend = async (friendId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/friends/${friendId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('已删除好友');
            onUpdate();
        } catch (error) {
            message.error('删除好友失败');
        }
    };

    const handleFriendClick = (friend) => {
        setSelectedFriend(friend);
        setIsModalVisible(true);
    };

    const handleViewFullProfile = () => {
        navigate(`/profile/${selectedFriend._id}`);
        setIsModalVisible(false);
    };

    return (
        <>
            <List
                dataSource={friends}
                renderItem={friend => (
                    <FriendItem
                        actions={[
                            <Button danger onClick={() => handleRemoveFriend(friend._id)}>
                                删除好友
                            </Button>
                        ]}
                        onClick={() => handleFriendClick(friend)}
                        style={{ cursor: 'pointer' }}
                    >
                        <List.Item.Meta
                            avatar={
                                <StyledAvatar 
                                    src={getFullAvatarUrl(friend.avatar)} 
                                    icon={<UserOutlined />}
                                />
                            }
                            title={friend.username}
                            description={
                                <div>
                                    <div>{friend.bio || '这个人很懒，什么都没写~'}</div>
                                    {friend.location && <div>📍 {friend.location}</div>}
                                </div>
                            }
                        />
                    </FriendItem>
                )}
            />

            <Modal
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={900}
                style={{ top: 20 }}
                bodyStyle={{ padding: 0 }}
            >
                {selectedFriend && (
                    <ProfileModalContent>
                        <div style={{ flex: 1, background: '#fafafa', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <StyledAvatar 
                                src={getFullAvatarUrl(selectedFriend.avatar)} 
                                icon={<UserOutlined />}
                                size={200}
                            />
                        </div>
                        <ProfileInfo>
                            <ProfileHeader>
                                <Avatar 
                                    src={getFullAvatarUrl(selectedFriend.avatar)} 
                                    icon={<UserOutlined />}
                                    size={64}
                                />
                                <div>
                                    <h2 style={{ margin: 0 }}>{selectedFriend.username}</h2>
                                    <Button type="link" onClick={handleViewFullProfile}>
                                        查看完整主页
                                    </Button>
                                </div>
                            </ProfileHeader>
                            <ProfileStats>
                                <StatItem>
                                    <div className="number">
                                        {selectedFriend.statistics?.postsCount || 0}
                                    </div>
                                    <div className="label">帖子</div>
                                </StatItem>
                                <StatItem>
                                    <div className="number">
                                        {selectedFriend.statistics?.friendsCount || 0}
                                    </div>
                                    <div className="label">好友</div>
                                </StatItem>
                                <StatItem>
                                    <div className="number">
                                        {selectedFriend.statistics?.likesCount || 0}
                                    </div>
                                    <div className="label">获赞</div>
                                </StatItem>
                            </ProfileStats>
                            <ProfileBio>
                                <div style={{ marginBottom: 16 }}>
                                    <strong>个人简介</strong>
                                </div>
                                <div>{selectedFriend.bio || '这个人很懒，什么都没写~'}</div>
                                {selectedFriend.location && (
                                    <div style={{ marginTop: 16 }}>
                                        📍 {selectedFriend.location}
                                    </div>
                                )}
                            </ProfileBio>
                        </ProfileInfo>
                    </ProfileModalContent>
                )}
            </Modal>
        </>
    );
};

export default FriendsList; 