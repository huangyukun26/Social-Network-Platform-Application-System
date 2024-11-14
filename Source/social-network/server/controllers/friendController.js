const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

const friendController = {
    // 获取好友请求列表
    getFriendRequests: async (req, res) => {
        try {
            console.log('Fetching friend requests for user:', req.userId);
            
            const requests = await FriendRequest.find({
                receiver: req.userId,
                status: 'pending'
            }).populate({
                path: 'sender',
                select: 'username avatar bio posts friends likesReceived'
            });
            
            console.log('Found requests:', requests); // 调试日志
            
            const requestsWithStats = requests.map(request => {
                console.log('Processing request:', request); // 调试日志
                return {
                    _id: request._id,
                    sender: {
                        _id: request.sender._id,
                        username: request.sender.username,
                        avatar: request.sender.avatar,
                        bio: request.sender.bio,
                        statistics: {
                            postsCount: request.sender.posts?.length || 0,
                            friendsCount: request.sender.friends?.length || 0,
                            likesCount: request.sender.likesReceived || 0
                        }
                    },
                    status: request.status,
                    createdAt: request.createdAt
                };
            });
            
            console.log('Sending response:', requestsWithStats); // 调试日志
            res.json(requestsWithStats);
        } catch (error) {
            console.error('获取好友请求失败:', error);
            res.status(500).json({ message: '获取好友请求失败' });
        }
    },

    // 发送好友请求
    sendFriendRequest: async (req, res) => {
        try {
            const { userId } = req.params;
            
            // 检查是否已经发送过请求
            const existingRequest = await FriendRequest.findOne({
                sender: req.userId,
                receiver: userId,
                status: 'pending'
            });

            if (existingRequest) {
                return res.status(400).json({ message: '已经发送过好友请求' });
            }

            const newRequest = new FriendRequest({
                sender: req.userId,
                receiver: userId
            });

            await newRequest.save();
            res.json({ message: '好友请求已发送' });
        } catch (error) {
            res.status(500).json({ message: '发送好友请求失败' });
        }
    },

    // 处理好友请求
    handleFriendRequest: async (req, res) => {
        try {
            const { requestId, action } = req.params;
            const request = await FriendRequest.findById(requestId)
                .populate('sender', 'username avatar bio posts friends likesReceived');

            if (!request) {
                return res.status(404).json({ message: '请求不存在' });
            }

            if (request.receiver.toString() !== req.userId) {
                return res.status(403).json({ message: '无权处理该请求' });
            }

            request.status = action === 'accept' ? 'accepted' : 'rejected';
            await request.save();

            if (action === 'accept') {
                // 更新双方的好友列表
                await User.findByIdAndUpdate(req.userId, {
                    $addToSet: { friends: request.sender._id }
                });
                await User.findByIdAndUpdate(request.sender._id, {
                    $addToSet: { friends: req.userId }
                });
            }

            // 返回更新后的好友信息
            const updatedUser = await User.findById(req.userId)
                .populate({
                    path: 'friends',
                    select: 'username avatar bio posts friends likesReceived',
                    populate: {
                        path: 'posts',
                        select: 'likes comments'
                    }
                });

            res.json({
                message: action === 'accept' ? '已接受好友请求' : '已拒绝好友请求',
                updatedFriends: updatedUser.friends
            });
        } catch (error) {
            res.status(500).json({ message: '处理好友请求失败' });
        }
    },

    // 添加获取好友推荐的方法
    getFriendSuggestions: async (req, res) => {
        try {
            console.log('当前用户ID:', req.userId);
            
            // 首先检查用户是否存在
            const currentUser = await User.findById(req.userId);
            if (!currentUser) {
                return res.status(404).json({ message: '用户不存在' });
            }

            // 获取当前用户的好友ID列表和已发送请求的用户ID列表
            const friendIds = currentUser.friends || [];
            
            // 获取所有待处理的好友请求
            const pendingRequests = await FriendRequest.find({
                $or: [
                    { sender: req.userId },
                    { receiver: req.userId }
                ],
                status: 'pending'
            });
            
            // 获取已经有好友请求关系的用户ID
            const pendingUserIds = pendingRequests.map(request => 
                request.sender.toString() === req.userId.toString() 
                    ? request.receiver 
                    : request.sender
            );

            // 获取推荐用户，排除当前用户、已是好友的用户和已有请求的用户
            const suggestions = await User.find({
                _id: { 
                    $ne: req.userId,
                    $nin: [...friendIds, ...pendingUserIds]
                },
                'privacy.profileVisibility': { $ne: 'private' }
            })
            .populate('posts')
            .populate('friends')
            .select('username avatar bio posts friends likesReceived privacy')
            .limit(5);

            // 过滤掉私密信息
            const suggestionsWithStats = suggestions.map(user => {
                const userData = user.toObject();
                // 如果不是好友且设置为仅好友可见，则过滤信息
                if (userData.privacy.profileVisibility === 'friends' && 
                    !friendIds.includes(userData._id)) {
                    return {
                        _id: userData._id,
                        username: userData.username,
                        avatar: userData.avatar,
                        bio: '仅好友可见',
                        statistics: {
                            postsCount: '-',
                            friendsCount: '-',
                            likesCount: '-'
                        }
                    };
                }
                return {
                    ...userData,
                    statistics: {
                        postsCount: userData.privacy.showPosts ? (userData.posts?.length || 0) : '-',
                        friendsCount: userData.privacy.showFollowers ? (userData.friends?.length || 0) : '-',
                        likesCount: userData.likesReceived || 0
                    }
                };
            });

            console.log('找到的推荐用户数量:', suggestionsWithStats.length);
            res.json(suggestionsWithStats);
        } catch (error) {
            console.error('获取好友推荐失败:', error);
            res.status(500).json({ 
                message: '获取好友推���败',
                error: error.message 
            });
        }
    },

    // 添加获取好友列表的方法
    getFriends: async (req, res) => {
        try {
            const user = await User.findById(req.userId)
                .populate({
                    path: 'friends',
                    select: 'username avatar bio posts friends likesReceived',
                    populate: {
                        path: 'posts',
                        select: 'likes comments'
                    }
                });

            const friendsWithStats = user.friends.map(friend => ({
                ...friend.toObject(),
                statistics: {
                    postsCount: friend.posts ? friend.posts.length : 0,
                    friendsCount: friend.friends ? friend.friends.length : 0,
                    likesCount: friend.likesReceived || 0
                }
            }));

            res.json(friendsWithStats);
        } catch (error) {
            console.error('获取好友列表失败:', error);
            res.status(500).json({ message: '获取好友列表失败' });
        }
    },

    // 添加删除好友的方法
    removeFriend: async (req, res) => {
        try {
            const { friendId } = req.params;
            
            await User.findByIdAndUpdate(req.userId, {
                $pull: { friends: friendId }
            });
            
            await User.findByIdAndUpdate(friendId, {
                $pull: { friends: req.userId }
            });

            res.json({ message: '好友已删除' });
        } catch (error) {
            console.error('删除好友失败:', error);
            res.status(500).json({ message: '删除好友失败' });
        }
    },

    // 添加获取好友状态的方法
    getFriendshipStatus: async (req, res) => {
        try {
            const { userId } = req.params;
            
            // 检查是否是自己
            if (userId === req.userId) {
                return res.json({ status: 'self' });
            }

            // 先检查是否已经是好友
            const currentUser = await User.findById(req.userId);
            const isFriend = currentUser.friends.some(
                friendId => friendId.toString() === userId
            );
            
            if (isFriend) {
                return res.json({ status: 'friends' });
            }
            
            // 如果不是好友，检查是否有待处理的请求
            const pendingRequest = await FriendRequest.findOne({
                $or: [
                    { sender: req.userId, receiver: userId },
                    { sender: userId, receiver: req.userId }
                ],
                status: 'pending'
            });
            
            if (pendingRequest) {
                const direction = pendingRequest.sender.toString() === req.userId 
                    ? 'sent' 
                    : 'received';
                return res.json({ 
                    status: 'pending',
                    direction: direction
                });
            }
            
            res.json({ status: 'none' });
        } catch (error) {
            console.error('获取好友状态失败:', error);
            res.status(500).json({ message: '获取好友状态失败' });
        }
    },

    getUserStats: async (req, res) => {
        try {
            const { userId } = req.params;
            const user = await User.findById(userId)
                .populate('posts')
                .populate('friends')
                .select('posts friends likesReceived');

            const stats = {
                postsCount: user.posts ? user.posts.length : 0,
                friendsCount: user.friends ? user.friends.length : 0,
                likesCount: user.likesReceived || 0
            };

            res.json(stats);
        } catch (error) {
            console.error('获取用户统计信息失败:', error);
            res.status(500).json({ message: '获取用户统计信息失败' });
        }
    }
};

module.exports = friendController; 