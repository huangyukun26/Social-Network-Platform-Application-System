const mongoose = require('mongoose');
const path = require('path');

// 直接定义数据库连接信息
const DB_CONFIG = {
    MONGODB_URI: 'mongodb://localhost:27017/social-network',
    NEO4J_URI: 'bolt://localhost:7687',
    NEO4J_USER: 'neo4j',
    NEO4J_PASSWORD: 'ROOT050313'
};

async function migrateFriendSystem() {
    try {
        console.log('正在连接到:', DB_CONFIG.MONGODB_URI);
        
        await mongoose.connect(DB_CONFIG.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('数据库连接成功');

        const User = mongoose.connection.collection('users');
        
        // 1. 添加新字段的默认值
        const result = await User.updateMany(
            {
                $or: [
                    { onlineStatus: { $exists: false } },
                    { friendGroups: { $exists: false } },
                    { interactions: { $exists: false } },
                    { friendships: { $exists: false } }
                ]
            },
            {
                $set: {
                    onlineStatus: {
                        isOnline: false,
                        lastActiveAt: new Date(),
                        deviceInfo: {}
                    },
                    friendGroups: [],
                    interactions: [],
                    friendships: [],
                    activityMetrics: {
                        lastActive: new Date(),
                        loginCount: 0,
                        postFrequency: 0,
                        interactionFrequency: 0
                    }
                }
            }
        );

        console.log('新字段迁移完成:', {
            matched: result.matchedCount,
            modified: result.modifiedCount
        });

        // 2. 转换现有好友关系为新格式
        const users = await User.find({}).toArray();
        for (const user of users) {
            if (user.friends && user.friends.length > 0) {
                const friendships = user.friends.map(friendId => ({
                    friend: friendId,
                    status: 'regular',
                    interactionCount: 0,
                    lastInteraction: new Date(),
                    commonInterests: [],
                    groupIds: []
                }));

                await User.updateOne(
                    { _id: user._id },
                    { $set: { friendships: friendships } }
                );
            }
        }

        // 3. 更新Neo4j数据
        // 注入配置到全局，以便Neo4jService使用
        global.neo4jConfig = {
            uri: DB_CONFIG.NEO4J_URI,
            user: DB_CONFIG.NEO4J_USER,
            password: DB_CONFIG.NEO4J_PASSWORD
        };

        const DataSyncService = require('../../services/DataSyncService');
        const syncService = new DataSyncService();
        
        console.log('开始同步数据到Neo4j...');
        await syncService.syncAllUsers();
        await syncService.syncAllFriendships();
        
        console.log('数据同步完成');

        // 4. 验证数据一致性
        console.log('验证数据一致性...');
        const inconsistencies = await syncService.validateDataConsistency();
        
        if (inconsistencies.length > 0) {
            console.log('发现数据不一致:', JSON.stringify(inconsistencies, null, 2));
        } else {
            console.log('数据一致性验证通过');
        }

        await mongoose.disconnect();
        console.log('迁移完成');
        process.exit(0);
    } catch (error) {
        console.error('迁移失败:', error);
        console.error('错误详情:', error.stack);
        process.exit(1);
    }
}

// 添加错误处理
process.on('unhandledRejection', (error) => {
    console.error('未处理的Promise拒绝:', error);
    process.exit(1);
});

// 执行迁移
migrateFriendSystem();