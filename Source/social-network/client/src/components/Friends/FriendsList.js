import React, { useState, useEffect } from 'react';
import { List, Avatar, Button, message, Modal, Badge } from 'antd';
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

const FriendsList = ({ friends, loading, onFriendUpdate }) => {
    const [onlineStatus, setOnlineStatus] = useState({});
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [localFriends, setLocalFriends] = useState(friends);
    const navigate = useNavigate();

    useEffect(() => {
        setLocalFriends(friends);
    }, [friends]);

    const fetchOnlineStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get(
                '/api/friends/status/online',
                {
                    headers: { 
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            if (response.data) {
                const statusMap = {};
                response.data.forEach(status => {
                    statusMap[status.userId] = status.isOnline;
                });
                setOnlineStatus(statusMap);
            }
        } catch (error) {
            console.error('获取在线状态失败:', error);
        }
    };

    useEffect(() => {
        if (friends.length > 0) {  // 只在有好友数据时开始轮询
            fetchOnlineStatus();
            const intervalId = setInterval(fetchOnlineStatus, 30000);
            return () => clearInterval(intervalId);
        }
    }, [friends]); // 只在 friends 变化时重新设置轮询

    const handleRemoveFriend = async (friendId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/friends/${friendId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setLocalFriends(prev => prev.filter(friend => friend._id !== friendId));
            
            message.success('好友删除成功');
            
            if (onFriendUpdate) {
                onFriendUpdate();
            }
        } catch (error) {
            console.error('删除好友失败:', error);
            message.error('删除好友失败');
        }
    };

    const renderFriendInfo = (friend) => (
        <List.Item.Meta
            avatar={
                <StyledAvatar 
                    src={friend.avatar ? `http://localhost:5000${friend.avatar}` : null}
                    icon={!friend.avatar && <UserOutlined />}
                    onClick={() => showFriendProfile(friend)}
                />
            }
            title={
                <UserInfo>
                    <Link to={`/profile/${friend._id}`}>
                        {friend.username}
                        {onlineStatus[friend._id] && 
                            <span style={{ color: '#52c41a', marginLeft: 8, fontSize: '12px' }}>
                                在线
                            </span>
                        }
                    </Link>
                </UserInfo>
            }
            description={
                <div>
                    <div>{friend.bio || '这个人很懒，什么都没写~'}</div>
                    <div style={{ marginTop: 8 }}>
                        {(friend.statistics?.postsCount > 0 || 
                          friend.statistics?.commentsCount > 0) ? (
                            <>
                                <Badge 
                                    count={friend.statistics?.postsCount || 0} 
                                    showZero={false}
                                    style={{ backgroundColor: '#1890ff' }}
                                >
                                    <Button type="link" size="small">
                                        <HeartOutlined /> 动态
                                    </Button>
                                </Badge>
                                <Badge 
                                    count={friend.statistics?.commentsCount || 0} 
                                    showZero={false}
                                    style={{ backgroundColor: '#52c41a' }}
                                >
                                    <Button type="link" size="small">
                                        <CommentOutlined /> 评论
                                    </Button>
                                </Badge>
                            </>
                        ) : null}
                    </div>
                </div>
            }
        />
    );

    const showFriendProfile = (friend) => {
        setSelectedFriend(friend);
        setIsModalVisible(true);
    };

    return (
        <>
            <List
                dataSource={localFriends}
                loading={loading}
                renderItem={friend => (
                    <FriendItem
                        actions={[
                            <Button 
                                type="link" 
                                danger
                                onClick={() => {
                                    Modal.confirm({
                                        title: '确认删除好友',
                                        content: `确定要删除好友 ${friend.username} 吗？`,
                                        okText: '确认',
                                        cancelText: '取消',
                                        onOk: () => handleRemoveFriend(friend._id)
                                    });
                                }}
                            >
                                删除好友
                            </Button>
                        ]}
                    >
                        {renderFriendInfo(friend)}
                    </FriendItem>
                )}
                locale={{ emptyText: '暂无好友' }}
            />
            <Modal
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={800}
            >
                {selectedFriend && (
                    <ProfileModalContent>
                        <ProfileInfo>
                            <ProfileHeader>
                                <Avatar 
                                    size={64} 
                                    src={selectedFriend.avatar ? 
                                        `http://localhost:5000${selectedFriend.avatar}` : null}
                                    icon={!selectedFriend.avatar && <UserOutlined />}
                                />
                                <div>
                                    <h2>{selectedFriend.username}</h2>
                                    <Button onClick={() => {
                                        navigate(`/profile/${selectedFriend._id}`);
                                        setIsModalVisible(false);
                                    }}>
                                        查看完整资料
                                    </Button>
                                </div>
                            </ProfileHeader>
                            <ProfileStats>
                                {(selectedFriend.statistics?.postsCount > 0 || 
                                  selectedFriend.statistics?.friendsCount > 0 ||
                                  selectedFriend.statistics?.likesCount > 0) ? (
                                    <>
                                        <StatItem>
                                            <div className="number">
                                                {selectedFriend.statistics?.postsCount || '-'}
                                            </div>
                                            <div className="label">动态</div>
                                        </StatItem>
                                        <StatItem>
                                            <div className="number">
                                                {selectedFriend.statistics?.friendsCount || '-'}
                                            </div>
                                            <div className="label">好友</div>
                                        </StatItem>
                                        <StatItem>
                                            <div className="number">
                                                {selectedFriend.statistics?.likesCount || '-'}
                                            </div>
                                            <div className="label">获赞</div>
                                        </StatItem>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                        暂无统计数据
                                    </div>
                                )}
                            </ProfileStats>
                            <ProfileBio>
                                <h3>个人简介</h3>
                                <p>{selectedFriend.bio || '这个人很懒，什么都没写~'}</p>
                            </ProfileBio>
                        </ProfileInfo>
                    </ProfileModalContent>
                )}
            </Modal>
        </>
    );
};

export default FriendsList; 