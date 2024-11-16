const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    avatar: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: '',
        maxlength: 160
    },
    website: {
        type: String,
        default: ''
    },
    privacy: {
        profileVisibility: {
            type: String,
            enum: ['public', 'private', 'friends'],
            default: 'public'
        },
        showEmail: {
            type: Boolean,
            default: false
        },
        showFollowers: {
            type: Boolean,
            default: true
        },
        showFollowing: {
            type: Boolean,
            default: true
        },
        showPosts: {
            type: Boolean,
            default: true
        },
        allowTagging: {
            type: Boolean,
            default: true
        }
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }],
    likesReceived: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    }
});

// 添加虚拟字段来计算统计数据
userSchema.virtual('stats').get(function() {
    return {
        postsCount: this.posts ? this.posts.length : 0,
        friendsCount: this.friends ? this.friends.length : 0,
        followersCount: this.followers ? this.followers.length : 0,
        followingCount: this.following ? this.following.length : 0,
        likesCount: this.likesReceived || 0
    };
});

// 确保虚拟字段在 JSON 中可见
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

userSchema.post('save', async function(doc) {
    try {
        const Neo4jService = require('../services/neo4jService');
        const neo4jService = new Neo4jService();
        await neo4jService.syncUserToNeo4j(doc._id.toString(), doc.username);
    } catch (error) {
        console.error('Neo4j 同步失败:', error);
    }
});

// 添加密码加密中间件
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 添加密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

module.exports = mongoose.model('User', userSchema); 