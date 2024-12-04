const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Notification = require('../models/Notification');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads/posts');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('只能上传图片文件'));
        }
        cb(null, true);
    },
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB
    }
}).array('images', 10);

// 获取当前用户的子
router.get('/user/me', auth, async (req, res) => {
    try {
        const posts = await Post.find({ 
            author: req.userId,
            isDeleted: false
        })
            .sort({ createdAt: -1 })
            .populate('author', 'username avatar')
            .populate('comments.user', 'username avatar');
            
        res.json(posts);
    } catch (error) {
        console.error('获取用户帖子错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取指定用户的帖子
router.get('/user/:userId', auth, async (req, res) => {
    try {
        // 先获取目标用户信息
        const targetUser = await User.findById(req.params.userId);
        if (!targetUser) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 检查隐私设置
        if (req.params.userId !== req.userId) { // 如果不是查看自己的帖子
            if (targetUser.privacy.profileVisibility === 'private') {
                return res.json([]); // 返回空数组
            }

            if (targetUser.privacy.profileVisibility === 'friends') {
                const isFriend = targetUser.friends.includes(req.userId);
                if (!isFriend) {
                    return res.json([]); // 返回空数组
                }
            }

            if (!targetUser.privacy.showPosts) {
                return res.json([]); // 返回空数组
            }
        }

        const posts = await Post.find({ 
            author: req.params.userId,
            isDeleted: false
        })
            .sort({ createdAt: -1 })
            .populate('author', 'username avatar')
            .populate('comments.user', 'username avatar');
            
        res.json(posts);
    } catch (error) {
        console.error('获取用户帖子错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取首页动态流
router.get('/feed', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        
        // 获取所有未删除的帖子
        let allPosts = await Post.find({ isDeleted: false })
            .populate('author', 'username avatar')
            .populate('comments.user', 'username avatar')
            .sort({ createdAt: -1 });

        // 将帖子分为关注用户的帖子和其他帖子
        const followingPosts = allPosts.filter(post => 
            currentUser.following.includes(post.author._id) || 
            post.author._id.toString() === req.userId
        );
        
        const otherPosts = allPosts.filter(post => 
            !currentUser.following.includes(post.author._id) && 
            post.author._id.toString() !== req.userId
        );

        // 合并帖子列表，关注的用户的帖子在前面
        const sortedPosts = [...followingPosts, ...otherPosts];

        res.json(sortedPosts);
    } catch (error) {
        console.error('获取动态流失败:', error);
        res.status(500).json({ message: '获取动态流失败' });
    }
});

// 添加分页支持
router.get('/feed/page/:page', auth, async (req, res) => {
    try {
        const page = parseInt(req.params.page) || 1;
        const limit = 10; // 每页显示的帖子数
        const currentUser = await User.findById(req.userId);
        
        // 获取未删除的帖子总数
        const total = await Post.countDocuments({ isDeleted: false });
        
        // 获取所有未删除的帖子并分页
        let allPosts = await Post.find({ isDeleted: false })
            .populate('author', 'username avatar')
            .populate('comments.user', 'username avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // 将帖子分为关注用户的帖子和其他帖子
        const followingPosts = allPosts.filter(post => 
            currentUser.following.includes(post.author._id) || 
            post.author._id.toString() === req.userId
        );
        
        const otherPosts = allPosts.filter(post => 
            !currentUser.following.includes(post.author._id) && 
            post.author._id.toString() !== req.userId
        );

        // 合并帖子列表
        const sortedPosts = [...followingPosts, ...otherPosts];

        res.json({
            posts: sortedPosts,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('获取动态流失败:', error);
        res.status(500).json({ message: '获取动态流失败' });
    }
});

// 创建帖子
router.post('/', auth, async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                console.error('文件上传错误:', err);
                return res.status(400).json({ message: err.message });
            }

            console.log('接收到的文件:', req.files);
            console.log('接收到的内容:', req.body);

            // 处理图片路径
            const imagePaths = req.files ? req.files.map(file => `/uploads/posts/${file.filename}`) : [];
            
            const post = new Post({
                author: req.userId,
                content: req.body.content || '',
                images: imagePaths // 确保是数组格式
            });

            await post.save();
            
            // 填充作者信息
            await post.populate('author', 'username avatar');
            
            console.log('创建的帖子:', post);
            res.status(201).json(post);
        });
    } catch (error) {
        console.error('创建帖子错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 点赞帖子
router.post('/:postId/like', auth, async (req, res) => {
    try {
        const postId = req.params.postId.replace(/\.\.\./g, '');
        console.log('点赞请求 - postId:', postId);
        console.log('点赞用户:', req.userId);

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ message: '无效的帖子ID' });
        }

        const post = await Post.findById(postId)
            .populate('author', 'username avatar')
            .populate('comments.user', 'username avatar');
        
        if (!post) {
            console.log('帖子不存在:', postId);
            return res.status(404).json({ message: '帖子不存在' });
        }

        // 检查是否已经点赞
        const likeIndex = post.likes.findIndex(
            id => id.toString() === req.userId.toString()
        );
        const isLiked = likeIndex > -1;

        if (isLiked) {
            // 取消点赞
            post.likes.splice(likeIndex, 1);
            console.log('取消点赞');
        } else {
            // 添加点赞
            post.likes.push(req.userId);
            console.log('添加点赞');

            // 只在新增点赞时创建通知
            if (post.author.toString() !== req.userId) {
                await new Notification({
                    type: 'like',
                    sender: req.userId,
                    recipient: post.author,
                    post: post._id,
                    content: ''  // 点赞通知不需要额外内容
                }).save();
            }
        }

        const updatedPost = await post.save();
        await updatedPost.populate('author', 'username avatar');
        await updatedPost.populate('comments.user', 'username avatar');
        
        console.log('更新后的帖子:', updatedPost);

        // 返回完整的帖子数据
        res.json(updatedPost);

    } catch (error) {
        console.error('点赞错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 添加评论
router.post('/:id/comment', auth, async (req, res) => {
    try {
        const postId = req.params.id.replace(/\.\.\./g, '');
        console.log('处理评论请求:', {
            originalId: req.params.id,
            cleanedId: postId,
            userId: req.userId,
            content: req.body.content
        });

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ message: '无效的帖子ID' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }

        const comment = {
            user: req.userId,
            content: req.body.content,
            createdAt: new Date()
        };

        post.comments.push(comment);
        await post.save();
        
        const updatedPost = await Post.findById(postId)
            .populate('comments.user', 'username avatar');
        
        const newComment = updatedPost.comments[updatedPost.comments.length - 1];
        res.status(201).json(newComment);

        // 添加评论通知
        if (post.author.toString() !== req.userId) {
            await new Notification({
                type: 'comment',
                sender: req.userId,
                recipient: post.author,
                post: post._id,
                content: req.body.content
            }).save();
        }
    } catch (error) {
        console.error('评论错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 添加保存帖子功能
router.post('/:postId/save', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }

        const savedIndex = post.savedBy.indexOf(req.userId);
        if (savedIndex > -1) {
            post.savedBy.splice(savedIndex, 1);
        } else {
            post.savedBy.push(req.userId);
        }

        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 软删除帖子
router.delete('/:postId', auth, async (req, res) => {
    try {
        const post = await Post.findOne({ 
            _id: req.params.postId,
            author: req.userId
        });

        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }

        if (post.isDeleted) {
            return res.status(400).json({ message: '帖子已经被删除' });
        }

        post.isDeleted = true;
        post.deletedAt = new Date();
        post.deleteReason = req.body.reason || '用户主动删除';
        
        await post.save();
        
        // 返回更新后的帖子数据
        res.json({ 
            message: '帖子已删除',
            post: post
        });
    } catch (error) {
        console.error('删除帖子失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 恢复已删除的帖子
router.post('/:postId/restore', auth, async (req, res) => {
    try {
        const post = await Post.findOne({ 
            _id: req.params.postId,
            author: req.userId,
            isDeleted: true
        });

        if (!post) {
            return res.status(404).json({ message: '帖子不存在或未被删除' });
        }

        post.isDeleted = false;
        post.deletedAt = null;
        post.deleteReason = '';
        await post.save();

        res.json({ message: '帖子已恢复' });
    } catch (error) {
        console.error('恢复帖子失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 修改获取帖子列表的路由
router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find({ isDeleted: false })
            .sort({ createdAt: -1 })
            .populate('author', 'username avatar')
            .populate('comments.user', 'username avatar');
            
        res.json(posts);
    } catch (error) {
        console.error('获取帖子列表失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 添加搜索路由
router.get('/search', auth, async (req, res) => {
    try {
        const { query, page = 1 } = req.query;
        const limit = 10;
        
        if (!query) {
            return res.json({
                posts: [],
                total: 0,
                hasMore: false
            });
        }

        const searchQuery = {
            $and: [
                { isDeleted: false },
                {
                    $or: [
                        { content: { $regex: query, $options: 'i' } },
                        { 'author.username': { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        };

        const total = await Post.countDocuments(searchQuery);
        
        const posts = await Post.find(searchQuery)
            .populate('author', 'username avatar')
            .populate('comments.user', 'username avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit + 1);

        const hasMore = posts.length > limit;
        
        res.json({
            posts: posts.slice(0, limit),
            total,
            hasMore
        });
    } catch (error) {
        console.error('搜索失败:', error);
        res.status(500).json({ message: '搜索失败' });
    }
});

module.exports = router;