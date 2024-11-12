const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

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
router.post('/', auth, async (req, res) => {
    try {
        const newPost = new Post({
            author: req.userId,
            content: req.body.content
        });
        
        const post = await newPost.save();
        await post.populate('author', 'username avatar');
        
        res.status(201).json(post);
    } catch (error) {
        console.error('创建帖子错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
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

module.exports = router;