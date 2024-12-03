const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const redisClient = require('../utils/RedisClient');
const neo4jService = require('../services/neo4jService');
const DataSyncService = require('../services/DataSyncService');
const FriendGroup = require('../models/FriendGroup');

// 添加安全的 Neo4j 操作包装器
const safeNeo4jOp = async (operation, fallback = null) => {
    try {
        return await operation();
    } catch (error) {
        console.error('Neo4j 操作失败:', error);
        return fallback;
    }
};

const friendController = {
    // 提取公共的请求格式化方法
    _formatFriendRequest(request) {
        // 添加空值检查
        if (!request || !request.sender) {
            console.warn('无效的好友请求数据:', request);
            return null;
        }

        try {
            return {
                _id: request._id,
                sender: {
                    _id: request.sender._id,
                    username: request.sender.username || '未知用户',
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
        } catch (error) {
            console.error('格式化好友请求数据失败:', error);
            return null;
        }
    },

    // 提取公共的缓存清理方法
    async _clearFriendshipCaches(userIds) {
        try {
            const clearPromises = userIds.flatMap(userId => [
                redisClient.clearFriendsCache(userId),
                redisClient.invalidateFriendCache(userId)
            ]);
            await Promise.all(clearPromises);
        } catch (error) {
            console.error('缓存清理失败:', error);
            // 不抛出错误，避免影响主流程
        }
    },

    // 获取好友请求列表
    getFriendRequests: async (req, res) => {
        try {
            const requests = await FriendRequest.find({
                receiver: req.userId,
                status: 'pending'
            })
            .populate('sender', 'username avatar bio posts friends likesReceived')
            .sort({ createdAt: -1 });
            
            // 过滤掉无效的请求
            const requestsWithStats = requests
                .map(request => {
                    if (!request || !request.sender) {
                        console.warn('无效的好友请求数据:', request);
                        return null;
                    }
                    return {
                        _id: request._id,
                        sender: {
                            _id: request.sender._id,
                            username: request.sender.username || '未知用户',
                            avatar: request.sender.avatar,
                            bio: request.sender.bio,
                            statistics: {
                                postsCount: request.sender.posts?.length || 0,
                                friendsCount: request.sender.friends?.length || 0,
                                likesCount: request.sender.likesReceived || 0
                            }
                        },
                        status: request.status,
                        isRead: request.isRead,
                        createdAt: request.createdAt
                    };
                })
                .filter(request => request !== null);

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
            
            // 检查是否已经是好友
            const user = await User.findById(req.userId);
            if (user.friends.includes(userId)) {
                return res.status(400).json({ message: '已经是好友了' });
            }
            
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
            console.error('发送好友请求失败:', error);
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

            // 标记为已读
            request.isRead = true;
            request.status = action === 'accept' ? 'accepted' : 'rejected';
            await request.save();

            if (action === 'accept') {
                try {
                    await Promise.all([
                        User.findByIdAndUpdate(req.userId, {
                            $addToSet: { friends: request.sender._id }
                        }),
                        User.findByIdAndUpdate(request.sender._id, {
                            $addToSet: { friends: req.userId }
                        })
                    ]);

                    // 清理缓存
                    try {
                        await friendController._clearFriendshipCaches([
                            req.userId,
                            request.sender._id.toString()
                        ]);
                    } catch (cacheError) {
                        console.error('清理缓存失败:', cacheError);
                    }
                } catch (error) {
                    console.error('更新好友关系失败:', error);
                    throw error;
                }
            }

            // 获取更新后的待处理请求列表
            const updatedRequests = await FriendRequest.find({
                receiver: req.userId,
                status: 'pending'  // 只获取待处理的请求
            }).populate('sender', 'username avatar bio posts friends likesReceived');

            const formattedRequests = updatedRequests
                .map(req => friendController._formatFriendRequest(req))
                .filter(req => req !== null);

            // 清理相关缓存
            await redisClient.clearFriendRequests(req.userId);

            res.json({
                message: action === 'accept' ? '已接受好友请求' : '已拒绝好友请求',
                updatedRequests: formattedRequests
            });
        } catch (error) {
            console.error('处理好友请求失败:', error);
            res.status(500).json({ message: '处理好友请求失败' });
        }
    },

    // 优化获取好友推荐的方法
    getFriendSuggestions: async (req, res) => {
        try {
            const userId = req.userId;
            const cachedSuggestions = await redisClient.getFriendSuggestions(userId);
            
            if (cachedSuggestions) {
                return res.json(cachedSuggestions);
            }

            // 使用安全包装器获取推荐
            const recommendations = await safeNeo4jOp(
                () => neo4jService.recommendFriends(userId),
                []  // 如果失败返回空数组
            );

            if (!recommendations || recommendations.length === 0) {
                // 降级到基础推荐逻辑
                const basicSuggestions = await User.find({
                    _id: { $ne: userId },
                    'privacy.profileVisibility': { $ne: 'private' },
                    _id: { $nin: (await User.findById(userId)).friends }
                })
                .select('username avatar bio statistics')
                .limit(10)
                .lean();

                if (basicSuggestions.length > 0) {
                    await redisClient.setFriendSuggestions(userId, basicSuggestions);
                    return res.json(basicSuggestions);
                }
            }

            // 缓存并返回Neo4j推荐结果
            await redisClient.setFriendSuggestions(userId, recommendations);
            res.json(recommendations);
        } catch (error) {
            console.error('获取好友推荐失败:', error);
            res.status(500).json({ message: '获取推荐失败' });
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
            const userId = req.userId;

            const user = await User.findById(userId);
            if (!user || !user.friends.includes(friendId)) {
                return res.status(404).json({ message: '好友关系不存在' });
            }

            await Promise.all([
                User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),
                User.findByIdAndUpdate(friendId, { $pull: { friends: userId } }),
                neo4jService.removeFriendship(userId, friendId)
                    .catch(error => console.error('Neo4j删除好友关系失败:', error))
            ]);

            await friendController._clearFriendshipCaches([userId, friendId]);

            res.json({ message: '好友删除成功' });
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
            const cachedStatus = await redisClient.getFriendshipStatus(req.userId, userId);
            if (cachedStatus) {
                return res.json({ status: cachedStatus });
            }

            // 检查是否是自己
            if (userId === req.userId) {
                await redisClient.setFriendshipStatus(req.userId, userId, 'self');
                return res.json({ status: 'self' });
            }

            // 先检查是否已经是好友
            const currentUser = await User.findById(req.userId);
            const isFriend = currentUser.friends.some(
                friendId => friendId.toString() === userId
            );
            
            if (isFriend) {
                await redisClient.setFriendshipStatus(req.userId, userId, 'friends');
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
                await redisClient.setFriendshipStatus(req.userId, userId, JSON.stringify(status));
                return res.json(status);
            }
            
            await redisClient.setFriendshipStatus(req.userId, userId, 'none');
            res.json({ status: 'none' });
        } catch (error) {
            console.error('获取好友状态失败:', error);
            res.status(500).json({ message: '获取���友状态失败' });
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

            // 并信息
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
            console.error('获取社交子分失败:', error);
            res.status(500).json({ message: '获取分析失败' });
        }
    },

    getSocialInfluenceAnalysis: async (req, res) => {
        try {
            const userId = req.userId;
            console.log('开始获取社交影响力分析，用户ID:', userId);

            // 尝试从缓存获取
            const cachedData = await redisClient.getSocialInfluence(userId);
            if (cachedData) {
                console.log('返回缓存的社交影响力数据');
                return res.json(cachedData);
            }

            // 从 Neo4j 获取分析数据
            const influenceData = await neo4jService.analyzeSocialInfluence(userId);
            console.log('Neo4j返回的影响力数据:', influenceData);

            if (!influenceData) {
                // 返回默认数据结构
                const defaultData = {
                    totalReach: 0,
                    distribution: [
                        { level: 1, count: 0 },
                        { level: 2, count: 0 },
                        { level: 3, count: 0 }
                    ]
                };
                return res.json(defaultData);
            }

            // 缓存结果
            await redisClient.setSocialInfluence(userId, influenceData);
            
            console.log('返回新的社交影响力数据');
            res.json(influenceData);
        } catch (error) {
            console.error('获取社交影响力分析失败:', error);
            // 返回默认数据而不是错误
            res.json({
                totalReach: 0,
                distribution: [
                    { level: 1, count: 0 },
                    { level: 2, count: 0 },
                    { level: 3, count: 0 }
                ]
            });
        }
    },

    // 智能好友推荐
    getSmartRecommendations: async (req, res) => {
        try {
            const userId = req.userId;
            console.log('开始获取智能推荐，用户ID:', userId);

            // 使用正确的方法名 recommendFriends 而不是 getFriendRecommendations
            const recommendations = await neo4jService.recommendFriends(userId);
            
            if (!recommendations || recommendations.length === 0) {
                console.log('没有智能推荐结果');
                return res.json([]);
            }

            // 获取完整的用户信息
            const userIds = recommendations.map(rec => rec.userId);
            const users = await User.find(
                { _id: { $in: userIds } },
                'username avatar bio privacy statistics'
            ).lean();

            // 合并 Neo4j 推荐数据和用户信息
            const enrichedRecommendations = recommendations.map(rec => {
                const userInfo = users.find(u => u._id.toString() === rec.userId);
                return {
                    ...userInfo,
                    _id: rec.userId,
                    commonFriendsCount: rec.commonFriendsCount,
                    commonFriendIds: rec.commonFriendIds,
                    recommendReason: rec.commonFriendsCount > 0 
                        ? `有 ${rec.commonFriendsCount} 个共同好友`
                        : undefined
                };
            });

            console.log('智能推荐结果数量:', enrichedRecommendations.length);
            res.json(enrichedRecommendations);
        } catch (error) {
            console.error('获取智能推荐失败:', error);
            res.json([]); // 出错时返回空数组而不是500错误
        }
    },

    // 社交路径分析
    getConnectionPath: async (req, res) => {
        try {
            const { targetUserId } = req.params;
            const pathInfo = await neo4jService.findSocialPath(
                req.userId,
                targetUserId,
                { maxDepth: 4 }
            );

            if (!pathInfo) {
                return res.status(404).json({ message: '未找到社交路径' });
            }

            // 获取路径用户的详细信息
            const userIds = pathInfo.nodes.map(n => n.userId);
            const users = await User.find({ _id: { $in: userIds } })
                .select('username avatar');

            // 合并信息
            const enrichedPath = {
                ...pathInfo,
                nodes: pathInfo.nodes.map(node => ({
                    ...node,
                    userDetails: users.find(u => u._id.toString() === node.userId)
                }))
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
            res.status(500).json({ message: '获取群组败' });
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
            console.error('获关系强度失败:', error);
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
            await redisClient.clearUserCache(req.userId);
            
            console.log('数据同步完成');
            res.json({ message: '数据同步成功' });
        } catch (error) {
            console.error('数据同步失:', error);
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
            await redisClient.clearAllCache();
            
            console.log('量数据同步完成');
            res.json({ message: '全量数据同步成功' });
        } catch (error) {
            console.error('全量数据同步失败:', error);
            res.status(500).json({ message: '全量数据同步失败' });
        }
    },

    // 1. 互动分析接口
    getInteractionAnalysis: async (req, res) => {
        try {
            const analysis = await neo4jService.analyzeInteractions(req.userId);
            res.json(analysis);
        } catch (error) {
            console.error('获取互动分析失败:', error);
            res.status(500).json({ message: '获取分析失败' });
        }
    },

    // 2. 社交圈重叠度分析接口
    getSocialOverlap: async (req, res) => {
        try {
            const { targetUserId } = req.params;
            const overlap = await neo4jService.analyzeSocialCircleOverlap(
                req.userId,
                targetUserId
            );
            res.json(overlap);
        } catch (error) {
            console.error('获取社交圈重叠度失败:', error);
            res.status(500).json({ message: '获取分析失败' });
        }
    },

    // 3. 社交趋势分析接口
    getSocialTrends: async (req, res) => {
        try {
            const { period } = req.query;
            const trends = await neo4jService.analyzeSocialTrends(
                req.userId,
                parseInt(period) || 30
            );
            res.json(trends);
        } catch (error) {
            console.error('获取社交趋势失败:', error);
            res.status(500).json({ message: '获取分析失败' });
        }
    },

    // 获取二度好友关系
    getFriendsOfFriends: async (req, res) => {
        try {
            const recommendations = await neo4jService.getFriendsOfFriends(req.userId);
            
            // 获取用详细信息
            const userIds = recommendations.map(r => r.userId);
            const users = await User.find({ _id: { $in: userIds } })
                .select('username avatar bio');

            // 合并信息
            const enrichedRecommendations = recommendations.map(rec => ({
                ...rec,
                userDetails: users.find(u => u._id.toString() === rec.userId)
            }));

            res.json(enrichedRecommendations);
        } catch (error) {
            console.error('获取二度好友失败:', error);
            res.status(500).json({ message: '获取推荐失败' });
        }
    },

    // 获取社交路径
    getConnectionPath: async (req, res) => {
        try {
            const { targetUserId } = req.params;
            const path = await neo4jService.findShortestPath(req.userId, targetUserId);
            
            // 获取路径用户的详细信息
            const userIds = path.map(p => p.userId);
            const users = await User.find({ _id: { $in: userIds } })
                .select('username avatar');

            // 合并信息
            const enrichedPath = path.map(node => ({
                ...node,
                userDetails: users.find(u => u._id.toString() === node.userId)
            }));

            res.json(enrichedPath);
        } catch (error) {
            console.error('获取社交路径失败:', error);
            res.status(500).json({ message: '获取路径失败' });
        }
    },


    // 创建好友分组
    createFriendGroup: async (req, res) => {
        try {
            const { name, description } = req.body;
            const userId = req.userId;

            const newGroup = new FriendGroup({
                userId,
                name,
                description,
                members: []
            });

            await newGroup.save();
            res.json({ message: '分组创建成功', group: newGroup });
        } catch (error) {
            console.error('创建好友分组失败:', error);
            res.status(500).json({ message: '创建好友分组失败' });
        }
    },

    // 添加获取好友分组列表方法
    getFriendGroups: async (req, res) => {
        try {
            const groups = await FriendGroup.find({ userId: req.userId })
                .populate('members', 'username avatar');
            res.json(groups);
        } catch (error) {
            console.error('获取好友分组失败:', error);
            res.status(500).json({ message: '获取好友分组失败' });
        }
    },

    // 添加更新好友分组方法
    updateFriendGroup: async (req, res) => {
        try {
            const { groupId } = req.params;
            const { name, description } = req.body;

            const updatedGroup = await FriendGroup.findOneAndUpdate(
                { _id: groupId, userId: req.userId },
                { name, description },
                { new: true }
            );

            if (!updatedGroup) {
                return res.status(404).json({ message: '分组不存在' });
            }

            res.json(updatedGroup);
        } catch (error) {
            console.error('更新好友分组失败:', error);
            res.status(500).json({ message: '更新好友分组失败' });
        }
    },

    // 添加好友到分组方法
    addFriendToGroup: async (req, res) => {
        try {
            const { groupId } = req.params;
            const { friendId } = req.body;

            const group = await FriendGroup.findOneAndUpdate(
                { _id: groupId, userId: req.userId },
                { $addToSet: { members: friendId } },
                { new: true }
            );

            if (!group) {
                return res.status(404).json({ message: '分组不存在' });
            }

            res.json(group);
        } catch (error) {
            console.error('添加好友到分组失败:', error);
            res.status(500).json({ message: '添加好友到分组失败' });
        }
    },

    // 1. 更新用户在线状态
    updateOnlineStatus: async (req, res) => {
        try {
            const userId = req.userId;
            const { status } = req.body;

            // 更新用户的最后活跃时间
            await User.findByIdAndUpdate(userId, {
                lastActive: new Date(),
                onlineStatus: status
            });

            // 更新缓存
            await redisClient.setUserOnlineStatus(userId, {
                isOnline: true,
                lastActive: new Date()
            });

            // 清除相的好友在线状态缓存
            const user = await User.findById(userId);
            for (const friendId of user.friends) {
                await redisClient.invalidateFriendCache(friendId.toString());
            }

            res.json({ message: '在线状态更新成功' });
        } catch (error) {
            console.error('更新在线状态失败:', error);
            res.status(500).json({ message: '更新在线状态失败' });
        }
    },

    // 2. 记录好友互动
    recordInteraction: async (req, res) => {
        try {
            const { friendId, interactionType } = req.body;
            await neo4jService.recordFriendInteraction(req.userId, friendId, interactionType);
            
            // 清除相关缓存
            await redisClient.clearFriendInteractionCache(req.userId, friendId);
            
            res.json({ message: '互动记录已保存' });
        } catch (error) {
            console.error('记录互动失败:', error);
            res.status(500).json({ message: '记录互动失败' });
        }
    },

    // 3. 获取好友互动历史
    getInteractionHistory: async (req, res) => {
        try {
            const { friendId } = req.params;
            const { limit = 10 } = req.query;

            // 尝试从缓存获取
            const cachedHistory = await redisClient.getFriendInteractionHistory(req.userId, friendId);
            if (cachedHistory) {
                return res.json(cachedHistory);
            }

            const history = await neo4jService.getFriendInteractionHistory(
                req.userId,
                friendId,
                parseInt(limit)
            );

            // 设置缓存
            await redisClient.setFriendInteractionHistory(req.userId, friendId, history);

            res.json(history);
        } catch (error) {
            console.error('获取互动历史失败:', error);
            res.status(500).json({ message: '获取历史失败' });
        }
    },

    // 4. 获取好友在线状态
    getFriendsOnlineStatus: async (req, res) => {
        try {
            const userId = req.userId;
            
            // 先从Redis获取
            let onlineStatus = await redisClient.getFriendsOnlineStatus(userId);
            
            // 如果Redis没有据，从数据库获取
            if (!onlineStatus || onlineStatus.length === 0) {
                const user = await User.findById(userId)
                    .populate('friends', '_id username lastActive')
                    .lean();

                if (!user || !user.friends) {
                    return res.json([]);
                }

                const currentTime = new Date();
                onlineStatus = user.friends.map(friend => ({
                    userId: friend._id.toString(),
                    username: friend.username,
                    isOnline: friend.lastActive && 
                        (currentTime - new Date(friend.lastActive)) < 5 * 60 * 1000
                }));

                // 存入Redis
                await redisClient.setFriendsOnlineStatus(userId, onlineStatus);
            }

            res.json(onlineStatus);
        } catch (error) {
            console.error('获取好友在线状态失败:', error);
            res.json([]); // 返回空数组而不是500错误
        }
    },

    // 5. 获取最近互动的好友
    getRecentlyInteractedFriends: async (req, res) => {
        try {
            const { limit = 5 } = req.query;
            
            // 尝试从缓存获取
            const cachedFriends = await redisClient.getRecentlyInteractedFriends(req.userId);
            if (cachedFriends) {
                return res.json(cachedFriends);
            }

            const recentFriends = await neo4jService.getRecentlyInteractedFriends(
                req.userId,
                parseInt(limit)
            );

            // 获取用户详细信息
            const userIds = recentFriends.map(f => f.userId);
            const users = await User.find({ _id: { $in: userIds } })
                .select('username avatar bio');

            // 合并信息
            const enrichedFriends = recentFriends.map(friend => ({
                ...friend,
                userDetails: users.find(u => u._id.toString() === friend.userId)
            }));

            // 设置缓存
            await redisClient.setRecentlyInteractedFriends(req.userId, enrichedFriends);

            res.json(enrichedFriends);
        } catch (error) {
            console.error('获取最近互动好友失败:', error);
            res.status(500).json({ message: '获取好友列表失败' });
        }
    },

    // 添加删除好友分组方法
    deleteFriendGroup: async (req, res) => {
        try {
            const { groupId } = req.params;
            const userId = req.userId;

            await FriendGroup.findOneAndDelete({
                _id: groupId,
                userId: userId
            });

            res.json({ message: '分组删除成功' });
        } catch (error) {
            console.error('删除分组失败:', error);
            res.status(500).json({ message: '删除分组失败' });
        }
    },

    // 添加从分组中删除好友方法
    removeFriendFromGroup: async (req, res) => {
        try {
            const { groupId, friendId } = req.params;
            const userId = req.userId;

            await FriendGroup.findOneAndUpdate(
                { _id: groupId, userId: userId },
                { $pull: { members: friendId } }
            );

            res.json({ message: '已从分组中移除好友' });
        } catch (error) {
            console.error('从分组移除好友失败:', error);
            res.status(500).json({ message: '从分组移除好友失败' });
        }
    },

    // 添加更新在线状态的方法
    updateOnlineStatus: async (req, res) => {
        try {
            const userId = req.userId;
            
            // 更新用户的最后活跃时间
            await User.findByIdAndUpdate(userId, {
                lastActive: new Date()
            }, { new: true });

            // 清除相关缓存
            try {
                await redisClient.invalidateFriendCache(userId);
            } catch (cacheError) {
                console.error('缓存清除失败:', cacheError);
            }

            res.json({ success: true });
        } catch (error) {
            console.error('更新在线状态失败:', error);
            res.json({ success: false });  // 返回失败但不抛出500错误
        }
    },

    // 获取社交圈子分析
    getCirclesAnalysis: async (req, res) => {
        try {
            const userId = req.userId;
            
            // 尝试从缓存获取
            const cachedData = await redisClient.getSocialCircles(userId);
            if (cachedData) {
                return res.json(cachedData);
            }

            // 从 Neo4j 获取社交圈子数据
            const circles = await neo4jService.getSocialCircles(userId);
            
            // 缓存结果
            await redisClient.setSocialCircles(userId, circles);
            
            res.json(circles);
        } catch (error) {
            console.error('取社交圈子分析失败:', error);
            res.status(500).json({ message: '获取社交圈子分析失败' });
        }
    },

};

module.exports = friendController; 