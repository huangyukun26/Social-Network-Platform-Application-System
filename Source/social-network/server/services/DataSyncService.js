const Neo4jService = require('./neo4jService');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

class DataSyncService {
    constructor() {
        this.neo4jService = new Neo4jService();
    }

    // 同步所有现有用户到Neo4j
    async syncAllUsers() {
        try {
            const users = await User.find({});
            console.log(`开始同步 ${users.length} 个用户到 Neo4j`);

            for (const user of users) {
                try {
                    await this.neo4jService.syncUserToNeo4j(
                        user._id.toString(),
                        {
                            username: user.username,
                            interests: Array.isArray(user.interests) ? user.interests : [],
                            activityScore: user.activityMetrics?.interactionFrequency || 0
                        }
                    );
                    console.log(`用户 ${user.username} 同步成功`);
                } catch (error) {
                    console.error(`用户 ${user.username} 同步失败:`, error);
                }
            }

            console.log('所有用户同步完成');
        } catch (error) {
            console.error('同步用户失败:', error);
            throw error;
        }
    }

    // 同步所有现有好友关系到Neo4j
    async syncAllFriendships() {
        try {
            const users = await User.find({});
            console.log(`开始同步好友关系到 Neo4j`);

            for (const user of users) {
                if (user.friendships && user.friendships.length > 0) {
                    for (const friendship of user.friendships) {
                        try {
                            // 确保我们只传递ID而不是整个对象
                            const friendId = friendship.friend.toString();
                            
                            console.log(`同步好友关系: ${user.username} -> ${friendId}`);
                            
                            await this.neo4jService.syncFriendshipToNeo4j(
                                user._id.toString(),
                                friendId,
                                {
                                    status: friendship.status || 'regular',
                                    interactionCount: Number(friendship.interactionCount || 0),
                                    lastInteraction: friendship.lastInteraction || new Date()
                                }
                            );
                        } catch (error) {
                            console.error(`好友关系同步失败: ${user.username} -> ${friendship.friend}:`, error);
                        }
                    }
                }
            }

            console.log('所有好友关系同步完成');
        } catch (error) {
            console.error('同步好友关系失败:', error);
            throw error;
        }
    }

    // 验证数据一致性
    async validateDataConsistency() {
        try {
            const users = await User.find({}).populate('friendships.friend');
            let inconsistencies = [];

            for (const user of users) {
                // 获取Neo4j中的好友关系
                const neo4jFriendships = await this.neo4jService.getFriendships(user._id.toString());
                
                // 获取MongoDB中的好友关系（只取ID）
                const mongoFriendships = user.friendships?.map(f => ({
                    friendId: f.friend._id.toString(), // 只使用ID
                    status: f.status
                })) || [];

                // 检查不一致
                const neo4jFriendIds = new Set(neo4jFriendships.map(f => f.friendId));
                const mongoFriendIds = new Set(mongoFriendships.map(f => f.friendId));

                const missingInNeo4j = mongoFriendships.filter(f => !neo4jFriendIds.has(f.friendId));
                const missingInMongo = neo4jFriendships.filter(f => !mongoFriendIds.has(f.friendId));

                if (missingInNeo4j.length > 0 || missingInMongo.length > 0) {
                    inconsistencies.push({
                        userId: user._id.toString(),
                        username: user.username, // 添加用户名以便更容易识别
                        missingInNeo4j,
                        missingInMongo
                    });
                }
            }

            return inconsistencies;
        } catch (error) {
            console.error('验证数据一致性失败:', error);
            throw error;
        }
    }

    async syncAllData() {
        try {
            // 清理Neo4j数据
            await this.neo4jService.clearAllData();
            
            // 同步所有用户
            const users = await User.find({}).populate('friends');
            for (const user of users) {
                await this.neo4jService.syncUserToNeo4j(user);
            }
            
            // 同步所有好友关系
            for (const user of users) {
                if (user.friends && user.friends.length > 0) {
                    for (const friend of user.friends) {
                        await this.neo4jService.syncFriendshipToNeo4j(
                            user._id.toString(),
                            friend._id.toString(),
                            {
                                status: 'regular',
                                interactionCount: 0,
                                lastInteraction: new Date()
                            }
                        );
                    }
                }
            }
            
            console.log('数据同步完成');
        } catch (error) {
            console.error('数据同步失败:', error);
            throw error;
        }
    }
}

module.exports = DataSyncService;