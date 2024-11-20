const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

// 获取搜索建议（用于实时搜索）
router.get('/suggestions', auth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ users: [], posts: [] });

        // 搜索用户
        const users = await User.find({
            username: { $regex: q, $options: 'i' }
        })
        .select('username avatar postsCount')
        .limit(3);

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

// 获取完整搜索结果
router.get('/results', auth, async (req, res) => {
    try {
        const { q, type = 'all', page = 1 } = req.query;
        const limit = 10;
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
            { $limit: limit }
        ]);

        await Post.populate(exactMatches, [
            { path: 'author', select: 'username avatar' },
            { path: 'comments.user', select: 'username avatar' }
        ]);

        results.exactMatches = exactMatches;

        // 查找相关用户
        const relatedUsers = await User.find({
            username: { $regex: q, $options: 'i' }
        })
        .select('username avatar postsCount')
        .limit(5);

        results.relatedUsers = relatedUsers;

        // 获取作者的其他热门帖子
        if (exactMatches.length > 0) {
            const authorIds = [...new Set(exactMatches.map(post => post.author._id))];
            const authorPosts = await Post.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        'author._id': { $in: authorIds },
                        _id: { $nin: exactMatches.map(p => p._id) }
                    }
                },
                {
                    $addFields: {
                        popularity: {
                            $add: [
                                { $size: '$likes' },
                                { $multiply: [{ $size: '$comments' }, 1.5] }
                            ]
                        }
                    }
                },
                {
                    $sort: { 
                        popularity: -1,
                        createdAt: -1 
                    }
                },
                { $limit: 5 }
            ]);

            await Post.populate(authorPosts, {
                path: 'author',
                select: 'username avatar'
            });

            results.authorPosts = authorPosts;
        }

        // 获取相关帖子（基于内容相似度和标签）
        const relatedPosts = await Post.aggregate([
            {
                $match: {
                    isDeleted: false,
                    _id: { $nin: exactMatches.map(p => p._id) },
                    $or: [
                        { content: { $regex: q.split(' ').join('|'), $options: 'i' } },
                        { 'author._id': { $in: exactMatches.map(p => p.author._id) } }
                    ]
                }
            },
            {
                $addFields: {
                    similarityScore: {
                        $add: [
                            { $multiply: [{ $size: '$likes' }, 0.2] },
                            { $multiply: [{ $size: '$comments' }, 0.3] },
                            { $cond: [
                                { $regexMatch: { 
                                    input: '$content', 
                                    regex: q.split(' ').join('|'), 
                                    options: 'i' 
                                }},
                                1,
                                0
                            ]}
                        ]
                    }
                }
            },
            { $sort: { similarityScore: -1, createdAt: -1 } },
            { $limit: 5 }
        ]);

        await Post.populate(relatedPosts, {
            path: 'author',
            select: 'username avatar'
        });

        results.relatedPosts = relatedPosts;

        res.json(results);
    } catch (error) {
        console.error('搜索失败:', error);
        res.status(500).json({ message: '搜索失败' });
    }
});

module.exports = router;