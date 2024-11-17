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
    },
    interactions: [{
        type: {
            type: String,
            enum: ['like', 'comment', 'share', 'view'],
            required: true
        },
        targetUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    friendships: [{
        friend: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['close', 'regular', 'acquaintance'],
            default: 'regular'
        },
        interactionCount: {
            type: Number,
            default: 0
        },
        lastInteraction: {
            type: Date
        },
        commonInterests: [{
            type: String
        }],
        groupIds: [{
            type: String
        }]
    }],
    interests: [{
        type: String,
        trim: true
    }],
    activityMetrics: {
        lastActive: {
            type: Date,
            default: Date.now
        },
        loginCount: {
            type: Number,
            default: 0
        },
        postFrequency: {
            type: Number,
            default: 0
        },
        interactionFrequency: {
            type: Number,
            default: 0
        }
    },
    socialCircles: [{
        name: {
            type: String,
            required: true
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        type: {
            type: String,
            enum: ['close_friends', 'family', 'colleagues', 'custom'],
            default: 'custom'
        }
    }],
    onlineStatus: {
        isOnline: {
            type: Boolean,
            default: false
        },
        lastActiveAt: {
            type: Date,
            default: Date.now
        },
        deviceInfo: {
            type: Object,
            default: {}
        }
    },
    friendGroups: [{
        name: {
            type: String,
            required: true
        },
        description: String,
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
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

// 添加新的虚拟字段
userSchema.virtual('socialStats').get(function() {
    return {
        ...this.stats, // 保留原有统计
        interactionsCount: this.interactions ? this.interactions.length : 0,
        averageInteractionFrequency: this.activityMetrics.interactionFrequency,
        socialCirclesCount: this.socialCircles ? this.socialCircles.length : 0,
        closeFriendsCount: this.friendships ? 
            this.friendships.filter(f => f.status === 'close').length : 0
    };
});

// 确保虚拟字段在 JSON 中可见
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

userSchema.post('save', async function(doc) {
    try {
        const Neo4jService = require('../services/neo4jService');
        const neo4jService = new Neo4jService();
        
        // 同步用户基本信息
        await neo4jService.syncUserToNeo4j(doc._id.toString(), {
            username: doc.username,
            interests: doc.interests,
            activityScore: doc.activityMetrics.interactionFrequency
        });

        // 同步社交关系
        if (doc.friendships) {
            for (const friendship of doc.friendships) {
                await neo4jService.syncFriendshipToNeo4j(
                    doc._id.toString(),
                    friendship.friend.toString(),
                    {
                        status: friendship.status,
                        interactionCount: friendship.interactionCount,
                        lastInteraction: friendship.lastInteraction
                    }
                );
            }
        }
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