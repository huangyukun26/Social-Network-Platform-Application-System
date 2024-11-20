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
                users: [],
                posts: [],
                relatedPosts: []
            });
        }

        // 搜索用户
        if (type === 'all' || type === 'users') {
            results.users = await User.find({
                username: { $regex: q, $options: 'i' }
            })
            .select('username avatar postsCount')
            .skip((page - 1) * limit)
            .limit(limit);
        }

        // 搜索帖子
        if (type === 'all' || type === 'posts') {
            // 使用聚合管道计算相关性得分
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
                { $sort: { relevanceScore: -1, createdAt: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit }
            ]);

            await Post.populate(posts, [
                { path: 'author', select: 'username avatar' },
                { path: 'comments.user', select: 'username avatar' }
            ]);

            results.posts = posts;

            // 获取相关推荐帖子
            const relatedPosts = await Post.find({
                isDeleted: false,
                _id: { $nin: posts.map(p => p._id) },
                $or: [
                    { content: { $regex: q, $options: 'i' } },
                    { 'author._id': { $in: posts.map(p => p.author._id) } }
                ]
            })
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(5);

            results.relatedPosts = relatedPosts;
        }

        res.json(results);
    } catch (error) {
        console.error('搜索失败:', error);
        res.status(500).json({ message: '搜索失败' });
    }
});

module.exports = router;