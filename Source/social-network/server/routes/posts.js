const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

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
        fileSize: 5 * 1024 * 1024 // 5MB
    }
}).single('image');

// 获取当前用户的帖子
router.get('/user/me', auth, async (req, res) => {
    try {
        const posts = await Post.find({ author: req.userId })
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

        const posts = await Post.find({ author: req.params.userId })
            .sort({ createdAt: -1 })
            .populate('author', 'username avatar')
            .populate('comments.user', 'username avatar');
            
        res.json(posts);
    } catch (error) {
        console.error('获取用户帖子错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取所有帖子
router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error('获取帖子错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 创建帖子
router.post('/', auth, (req, res) => {
    console.log('收到创建帖子请求');
    
    upload(req, res, async (err) => {
        try {
            console.log('开始处理文件上传');
            
            if (err) {
                console.error('文件上传错误:', err);
                return res.status(400).json({ 
                    message: err.message || '文件上传失败',
                    error: err
                });
            }

            console.log('请求信息:', {
                body: req.body,
                file: req.file,
                userId: req.userId,
                headers: req.headers
            });

            // 验证必要字段
            if (!req.body.content && !req.file) {
                return res.status(400).json({ 
                    message: '内容和图片至少需要提供一个'
                });
            }

            const newPost = new Post({
                author: req.userId,
                content: req.body.content || '',
                image: req.file ? `/uploads/posts/${req.file.filename}` : null
            });

            console.log('准备保存的帖子数据:', newPost);

            const post = await newPost.save();
            console.log('帖子保存成功');

            await post.populate('author', 'username avatar');
            console.log('作者信息填充成功');

            res.status(201).json(post);
        } catch (error) {
            console.error('创建帖子过程中发生错误:', error);
            // 如果是文件相关错误，清理已上传的文件
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                    console.log('清理临时文件成功');
                } catch (unlinkError) {
                    console.error('清理临时文件失败:', unlinkError);
                }
            }
            
            res.status(500).json({ 
                message: '服务器错误',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });
});

// 点赞帖子
router.post('/:postId/like', auth, async (req, res) => {
    try {
        // 清理 postId，移除可能的 ...
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

        if (likeIndex > -1) {
            // 取消点赞
            post.likes.splice(likeIndex, 1);
            console.log('取消点赞');
        } else {
            // 添加点赞
            post.likes.push(req.userId);
            console.log('添加点赞');
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

module.exports = router;