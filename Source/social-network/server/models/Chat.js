const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: new Map()
    },
    type: {
        type: String,
        enum: ['private', 'group'],
        default: 'private'
    },
    status: {
        type: String,
        enum: ['active', 'archived', 'blocked'],
        default: 'active'
    }
}, {
    timestamps: true
});

// 添加索引优化查询
chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessage: 1 });
chatSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);