const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const RedisClient = require('../utils/RedisClient');
const Neo4jService = require('../services/neo4jService');
const DataSyncService = require('../services/DataSyncService');

const neo4jService = new Neo4jService();
const dataSyncService = new DataSyncService();

const friendController = {
    // 获取好友请求列表
    getFriendRequests: async (req, res) => {
        try {
            // 尝试从缓存获取
            const cachedRequests = await RedisClient.getFriendRequests(req.userId);
            if (cachedRequests) {
                return res.json(cachedRequests);
            }

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

            // 设置缓存
            await RedisClient.setFriendRequests(req.userId, requestsWithStats);
            
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

                // 如果接受好友请求，同步到 Neo4j
                await neo4jService.addFriendship(req.userId, request.sender.toString());
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
            console.error('处理好友请求失败:', error);
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
            console.error('获好友推荐失败:', error);
            res.status(500).json({ 
                message: '获取好友推败',
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
            
            // MongoDB 操作
            await User.findByIdAndUpdate(req.userId, {
                $pull: { friends: friendId }
            });
            
            await User.findByIdAndUpdate(friendId, {
                $pull: { friends: req.userId }
            });

            // Neo4j 操作
            await neo4jService.removeFriendship(req.userId, friendId);

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
            
            // 检查缓存
            const cachedStatus = await RedisClient.getFriendshipStatus(req.userId, userId);
            if (cachedStatus) {
                return res.json({ status: cachedStatus });
            }

            // 检查是否是自己
            if (userId === req.userId) {
                await RedisClient.setFriendshipStatus(req.userId, userId, 'self');
                return res.json({ status: 'self' });
            }

            // 先检查是否已经是好友
            const currentUser = await User.findById(req.userId);
            const isFriend = currentUser.friends.some(
                friendId => friendId.toString() === userId
            );
            
            if (isFriend) {
                await RedisClient.setFriendshipStatus(req.userId, userId, 'friends');
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
                const status = {
                    status: 'pending',
                    direction: pendingRequest.sender.toString() === req.userId ? 'sent' : 'received'
                };
                await RedisClient.setFriendshipStatus(req.userId, userId, JSON.stringify(status));
                return res.json(status);
            }
            
            await RedisClient.setFriendshipStatus(req.userId, userId, 'none');
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
    },

    // 添加新方法
    getFriendRecommendationsWithGraph: async (req, res) => {
        try {
            // 获取基于图数据库的推荐
            const graphRecommendations = await neo4jService.getFriendRecommendations(req.userId);
            
            // 获取这些用户的详细信息
            const userDetails = await User.find({
                _id: { $in: graphRecommendations.map(r => r.userId) }
            })
            .select('username avatar bio privacy friends posts likesReceived');

            // 合并推荐信息
            const recommendations = userDetails.map(user => {
                const graphData = graphRecommendations.find(r => r.userId === user._id.toString());
                return {
                    ...user.toObject(),
                    commonFriends: graphData.commonFriends,
                    statistics: {
                        postsCount: user.posts?.length || 0,
                        friendsCount: user.friends?.length || 0,
                        likesCount: user.likesReceived || 0
                    }
                };
            });

            res.json(recommendations);
        } catch (error) {
            console.error('获取图数据库好友推荐失败:', error);
            res.status(500).json({ message: '获取推荐失败' });
        }
    },

    getSocialCircleAnalytics: async (req, res) => {
        try {
            const analytics = await neo4jService.getSocialCircleAnalytics(req.userId);
            res.json(analytics);
        } catch (error) {
            console.error('获取社交圈分析失败:', error);
            res.status(500).json({ message: '获取分析失败' });
        }
    },

    // 添加新的社交分析方法
    getCommonFriendsAnalysis: async (req, res) => {
        try {
            const { targetUserId } = req.params;
            const commonFriends = await neo4jService.getCommonFriendsDetails(
                req.userId,
                targetUserId
            );

            // 获取用户详细信息
            const userIds = commonFriends.map(f => f.userId);
            const users = await User.find({ _id: { $in: userIds } })
                .select('username avatar bio');

            // 合并信息
            const enrichedData = commonFriends.map(friend => ({
                ...friend,
                userDetails: users.find(u => u._id.toString() === friend.userId)
            }));

            res.json(enrichedData);
        } catch (error) {
            console.error('获取共同好友分析失败:', error);
            res.status(500).json({ message: '获取分析失败' });
        }
    },

    getSocialCirclesAnalysis: async (req, res) => {
        try {
            const circles = await neo4jService.getSocialCircles(req.userId);
            
            // 获取圈子成员详细信息
            const allMemberIds = circles.flatMap(c => c.members);
            const users = await User.find({ _id: { $in: allMemberIds } })
                .select('username avatar stats');

            // 合并信息
            const enrichedCircles = circles.map(circle => ({
                circle: circle.circle,
                size: circle.size,
                members: circle.members.map(memberId => {
                    const user = users.find(u => u._id.toString() === memberId);
                    return user ? {
                        _id: user._id,
                        username: user.username,
                        avatar: user.avatar,
                        stats: user.stats
                    } : null;
                }).filter(Boolean)
            }));

            res.json(enrichedCircles);
        } catch (error) {
            console.error('获取社交圈子分析失败:', error);
            res.status(500).json({ message: '获取分析失败' });
        }
    },

    getSocialInfluenceAnalysis: async (req, res) => {
        try {
            const influence = await neo4jService.getSocialInfluence(req.userId);
            res.json(influence);
        } catch (error) {
            console.error('获取社交影响力分析失败:', error);
            res.status(500).json({ message: '获取分析失败' });
        }
    },

    // 智能好友推荐
    getSmartRecommendations: async (req, res) => {
        try {
            const recommendations = await neo4jService.recommendFriends(req.userId);
            
            // 获取用户详细信息
            const userIds = recommendations.map(r => r.userId);
            const users = await User.find({ _id: { $in: userIds } })
                .select('username avatar bio privacy');

            const enrichedRecommendations = recommendations.map(rec => {
                const user = users.find(u => u._id.toString() === rec.userId);
                return {
                    ...rec,
                    user: {
                        _id: user._id,
                        username: user.username,
                        avatar: user.avatar,
                        bio: user.privacy.profileVisibility === 'public' ? user.bio : null
                    }
                };
            });

            res.json(enrichedRecommendations);
        } catch (error) {
            console.error('获取智能推荐失败:', error);
            res.status(500).json({ message: '获取推荐失败' });
        }
    },

    // 社交路径分析
    getConnectionPath: async (req, res) => {
        try {
            const { targetUserId } = req.params;
            const path = await neo4jService.findConnectionPath(req.userId, targetUserId);
            
            if (!path) {
                return res.json({ message: '未找到社交路径' });
            }

            // 获取路径上用户的信息
            const users = await User.find({ _id: { $in: path.path } })
                .select('username avatar');

            const enrichedPath = {
                ...path,
                users: path.path.map(id => users.find(u => u._id.toString() === id))
            };

            res.json(enrichedPath);
        } catch (error) {
            console.error('获取社交路径失败:', error);
            res.status(500).json({ message: '获取路径失败' });
        }
    },

    // 兴趣群组发现
    getSocialGroups: async (req, res) => {
        try {
            const groups = await neo4jService.findSocialGroups(req.userId);
            res.json(groups);
        } catch (error) {
            console.error('获取兴趣群组失败:', error);
            res.status(500).json({ message: '获取群组失败' });
        }
    },

    // 用户活跃度分析
    getUserActivity: async (req, res) => {
        try {
            const activity = await neo4jService.analyzeUserActivity(req.userId);
            res.json(activity);
        } catch (error) {
            console.error('获取活跃度分析失败:', error);
            res.status(500).json({ message: '获取分析失败' });
        }
    },

    // 关系强度分析
    getRelationshipStrength: async (req, res) => {
        try {
            const { targetUserId } = req.params;
            const strength = await neo4jService.calculateRelationshipStrength(
                req.userId,
                targetUserId
            );
            res.json(strength);
        } catch (error) {
            console.error('获���关系强度失败:', error);
            res.status(500).json({ message: '获取分析失败' });
        }
    },

    // 添加数据同步方法
    syncFriendsData: async (req, res) => {
        try {
            console.log('开始同步用户数据:', req.userId);
            
            // 获取用户完整数据
            const user = await User.findById(req.userId)
                .populate('friends')
                .populate('posts');
                
            if (!user) {
                return res.status(404).json({ message: '用户不存在' });
            }

            // 确保 Neo4j 中有该用户节点
            await neo4jService.syncUserToNeo4j(user);

            // 同步该用户的所有好友关系
            const friendPromises = user.friends.map(async friend => {
                // 确保好友节点存在
                await neo4jService.syncUserToNeo4j(friend);
                
                // 同步双向好友关系
                await neo4jService.syncFriendshipToNeo4j(
                    user._id.toString(),
                    friend._id.toString(),
                    {
                        status: 'regular',
                        interactionCount: 0,
                        lastInteraction: new Date()
                    }
                );
            });

            await Promise.all(friendPromises);

            // 清除相关缓存
            await RedisClient.clearUserCache(req.userId);
            
            console.log('数据同步完成');
            res.json({ message: '数据同步成功' });
        } catch (error) {
            console.error('数据同步失败:', error);
            res.status(500).json({ 
                message: '数据同步失败',
                error: error.message 
            });
        }
    },

    // 添加全量数据同步方法
    syncAllData: async (req, res) => {
        try {
            console.log('开始全量数据同步');
            
            // 清理Neo4j数据
            await neo4jService.clearAllData();
            
            // 同步所有用户数据
            const users = await User.find({})
                .populate('friends')
                .populate('posts');
                
            for (const user of users) {
                // 同步用户节点
                await neo4jService.syncUserToNeo4j(user);
                
                // 同步好友关系
                for (const friend of user.friends) {
                    await neo4jService.syncFriendshipToNeo4j(
                        user._id.toString(),
                        friend._id.toString(),
                        {
                            status: 'regular',
                            interactionCount: 0,
                            lastInteraction: new Date()
                        }
                    );
                }
            }
            
            // 清除所有缓存
            await RedisClient.clearAllCache();
            
            console.log('全量数据同步完成');
            res.json({ message: '全量数据同步成功' });
        } catch (error) {
            console.error('全量数据同步失败:', error);
            res.status(500).json({ message: '全量数据同步失败' });
        }
    }
};

module.exports = friendController; 