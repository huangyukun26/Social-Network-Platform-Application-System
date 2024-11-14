const mongoose = require('mongoose');
require('dotenv').config();

async function migrateUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('数据库连接成功');

        // 获取 users 集合
        const User = mongoose.connection.collection('users');
        
        // 更新所有用户，添加 role 字段
        const result = await User.updateMany(
            { role: { $exists: false } },
            { $set: { role: 'user' } }
        );

        console.log('迁移完成:', {
            matched: result.matchedCount,
            modified: result.modifiedCount
        });

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('迁移失败:', error);
        process.exit(1);
    }
}

migrateUsers(); 