const mongoose = require('mongoose');
const Post = require('../../models/Post');

async function migratePostsData() {
    try {
        // 连接数据库
        await mongoose.connect('mongodb://localhost:27017/social-network', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('开始迁移帖子数据...');

        // 批量更新所有帖子，添加新字段的默认值
        const result = await Post.updateMany(
            { isDeleted: { $exists: false } }, // 查找所有没有 isDeleted 字段的帖子
            { 
                $set: { 
                    isDeleted: false,
                    deletedAt: null,
                    deleteReason: ''
                } 
            }
        );

        console.log(`迁移完成！更新了 ${result.modifiedCount} 条帖子数据`);
    } catch (error) {
        console.error('迁移失败:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migratePostsData();