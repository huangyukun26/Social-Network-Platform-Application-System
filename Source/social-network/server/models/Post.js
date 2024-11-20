const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    images: [{
        type: String,
        required: false
    }],
    image: {
        type: String,
        required: false,
        deprecated: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    savedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    pushWeight: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

postSchema.methods.updatePushWeight = async function() {
    const author = await mongoose.model('User').findById(this.author);
    this.pushWeight = 1 + (author.followers.length * 0.1);
    await this.save();
};

postSchema.virtual('displayImages').get(function() {
    if (this.images && this.images.length > 0) {
        return this.images;
    }
    return this.image ? [this.image] : [];
});

module.exports = mongoose.model('Post', postSchema); 