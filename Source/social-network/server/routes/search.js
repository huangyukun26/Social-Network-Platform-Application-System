const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// 获取搜索建议（用于实时搜索）
router.get('/suggestions', auth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ users: [], posts: [] });

        // 搜索用户并获取帖子数量
        const users = await User.aggregate([
            {
                $match: {
                    username: { $regex: q, $options: 'i' }
                }
            },
            {
                $lookup: {
                    from: 'posts',
                    let: { userId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$author', '$$userId'] },
                                        { $eq: ['$isDeleted', false] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'posts'
                }
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    avatar: 1,
                    postsCount: { $size: '$posts' }
                }
            },
            { $limit: 3 }
        ]);

        // 搜索帖子并计算相关性得分
        const posts = await Post.aggregate([
            {
                $match: {
                    isDeleted: false,
                    $or: [
                        { content: { $regex: q, $options: 'i' } },
                        { 'author.username': { $regex: q, $options: 'i' } }
                    ]
                }
            },
            {
                $addFields: {
                    relevanceScore: {
                        $add: [
                            { $multiply: [{ $size: '$likes' }, 0.3] },
                            { $multiply: [{ $size: '$comments' }, 0.4] },
                            { $cond: [
                                { $regexMatch: { input: '$content', regex: q, options: 'i' } },
                                1,
                                0
                            ]}
                        ]
                    }
                }
            },
            { $sort: { relevanceScore: -1 } },
            { $limit: 3 }
        ]);

        await Post.populate(posts, {
            path: 'author',
            select: 'username avatar'
        });

        res.json({ users, posts });
    } catch (error) {
        console.error('获取搜索建议失败:', error);
        res.status(500).json({ message: '获取搜索建议失败' });
    }
});

// 获取相关帖子的优化版本
const getRelatedPosts = async (q, exactMatches, currentUser) => {
    const relatedPosts = await Post.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'authorInfo'
            }
        },
        {
            $addFields: {
                author: { $arrayElemAt: ['$authorInfo', 0] },
                // 计算综合相关性得分
                relevanceScore: {
                    $add: [
                        // 1. 内容相关性
                        { 
                            $cond: [
                                { $regexMatch: { input: '$content', regex: q, options: 'i' } },
                                2,
                                0
                            ]
                        },
                        // 2. 社交相关性 - 如果是关注的用户的帖子加分
                        { 
                            $cond: [
                                { $in: ['$author._id', currentUser.following] },
                                1.5,
                                0
                            ]
                        },
                        // 3. 互动热度
                        { 
                            $multiply: [
                                { $add: [
                                    { $size: '$likes' },
                                    { $multiply: [{ $size: '$comments' }, 1.2] }
                                ]},
                                0.3
                            ]
                        },
                        // 4. 时间衰减因子 - 最近7天的帖子优先
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        1,
                                        { 
                                            $add: [
                                                1,
                                                { 
                                                    $divide: [
                                                        { 
                                                            $subtract: [
                                                                new Date(),
                                                                '$createdAt'
                                                            ]
                                                        },
                                                        1000 * 60 * 60 * 24 * 7 // 7天
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                0.5
                            ]
                        }
                    ]
                }
            }
        },
        {
            $match: {
                isDeleted: false,
                _id: { $nin: exactMatches.map(p => p._id) },
                $or: [
                    // 1. 内容相关
                    { content: { $regex: q.split(' ').join('|'), $options: 'i' } },
                    // 2. 作者相关
                    { 'author._id': { $in: exactMatches.map(p => p.author._id) } },
                    // 3. 标签相关（如果将来添加标签功能）
                    // 4. 互动用户相关
                    { 'likes': { $in: currentUser.following } },
                    { 'comments.user': { $in: currentUser.following } }
                ]
            }
        },
        { $sort: { relevanceScore: -1, createdAt: -1 } },
        { $limit: 10 }
    ]);

    // 在返回结果前填充评论用户信息
    await Post.populate(relatedPosts, [
        { path: 'comments.user', select: 'username avatar' }
    ]);

    return relatedPosts;
};

// 获取完整搜索结果
router.get('/results', auth, async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        const currentUser = await User.findById(req.userId);
        const results = {};
        
        if (!q) {
            return res.json({
                exactMatches: [],
                relatedUsers: [],
                relatedPosts: [],
                authorPosts: []
            });
        }

        // 精确匹配的搜索结果
        const exactMatches = await Post.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorInfo'
                }
            },
            {
                $addFields: {
                    author: { $arrayElemAt: ['$authorInfo', 0] }
                }
            },
            {
                $match: {
                    isDeleted: false,
                    $or: [
                        { content: { $regex: q, $options: 'i' } },
                        { 'author.username': { $regex: q, $options: 'i' } }
                    ]
                }
            },
            {
                $addFields: {
                    relevanceScore: {
                        $add: [
                            { $multiply: [{ $size: '$likes' }, 0.3] },
                            { $multiply: [{ $size: '$comments' }, 0.4] },
                            { $cond: [
                                { $regexMatch: { input: '$content', regex: q, options: 'i' } },
                                2,
                                0
                            ]},
                            { $cond: [
                                { $regexMatch: { input: '$author.username', regex: q, options: 'i' } },
                                1.5,
                                0
                            ]}
                        ]
                    }
                }
            },
            { $sort: { relevanceScore: -1, createdAt: -1 } },
            { $limit: parseInt(limit) }
        ]);

        await Post.populate(exactMatches, [
            { path: 'author', select: 'username avatar' },
            { path: 'comments.user', select: 'username avatar' }
        ]);

        results.exactMatches = exactMatches;

        // 修改相关用户查询
        const relatedUsers = await User.aggregate([
            {
                $match: {
                    username: { $regex: q, $options: 'i' }
                }
            },
            {
                $lookup: {
                    from: 'posts',
                    let: { userId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$author', '$$userId'] },
                                        { $eq: ['$isDeleted', false] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'userPosts'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'friends',
                    foreignField: '_id',
                    as: 'friendsList'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'followers',
                    foreignField: '_id',
                    as: 'followersList'
                }
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    avatar: 1,
                    bio: 1,
                    postsCount: { $size: '$userPosts' },
                    friendsCount: { $size: '$friendsList' },
                    followersCount: { $size: '$followersList' },
                    isPrivate: { 
                        $cond: [
                            { $eq: ['$privacy.profileVisibility', 'private'] },
                            true,
                            false
                        ]
                    }
                }
            },
            { $limit: 5 }
        ]);

        // 确保返回的数据格式正确
        results.relatedUsers = relatedUsers.map(user => ({
            ...user,
            statistics: {
                postsCount: user.postsCount,
                friendsCount: user.friendsCount,
                followersCount: user.followersCount
            }
        }));

        // 获取相关帖子
        const relatedPosts = await getRelatedPosts(q, exactMatches, currentUser);
        results.relatedPosts = relatedPosts;

        // 获取作者的其他热门帖子
        if (exactMatches.length > 0) {
            const authorIds = [...new Set(exactMatches.map(post => 
                post.author._id ? post.author._id.toString() : null
            ).filter(Boolean))];

            if (authorIds.length > 0) {
                const authorPosts = await Post.aggregate([
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'authorInfo'
                        }
                    },
                    {
                        $addFields: {
                            author: { $arrayElemAt: ['$authorInfo', 0] }
                        }
                    },
                    {
                        $match: {
                            isDeleted: false,
                            'author._id': { $in: authorIds.map(id => new mongoose.Types.ObjectId(id)) },
                            _id: { $nin: exactMatches.map(p => p._id) }
                        }
                    },
                    {
                        $addFields: {
                            score: {
                                $add: [
                                    // 基础分数
                                    { $multiply: [{ $size: '$likes' }, 0.3] },
                                    { $multiply: [{ $size: '$comments' }, 0.4] },
                                    // 社交关系加成
                                    { 
                                        $cond: [
                                            { $in: ['$author._id', currentUser.following] },
                                            1,
                                            0
                                        ]
                                    },
                                    // 时间因子
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    1,
                                                    { 
                                                        $add: [
                                                            1,
                                                            { 
                                                                $subtract: [
                                                                    new Date(),
                                                                    '$createdAt'
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            },
                                            0.5
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    { $sort: { score: -1, createdAt: -1 } },
                    { $limit: 5 }
                ]);

                results.authorPosts = authorPosts;
            } else {
                results.authorPosts = [];
            }
        } else {
            results.authorPosts = [];
        }

        res.json(results);
    } catch (error) {
        console.error('搜索失败:', error);
        res.status(500).json({ message: '搜索失败' });
    }
});

module.exports = router;