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
                await this.neo4jService.syncUserToNeo4j(
                    user._id.toString(),
                    user.username
                );
            }

            console.log('用户同步完成');
        } catch (error) {
            console.error('同步用户失败:', error);
            throw error;
        }
    }

    // 同步所有现有好友关系到Neo4j
    async syncAllFriendships() {
        try {
            const users = await User.find({}).populate('friends');
            console.log(`开始同步好友关系到 Neo4j`);

            for (const user of users) {
                for (const friend of user.friends) {
                    await this.neo4jService.addFriendship(
                        user._id.toString(),
                        friend._id.toString()
                    );
                }
            }

            console.log('好友关系同步完成');
        } catch (error) {
            console.error('同步好友关系失败:', error);
            throw error;
        }
    }

    // 验证数据一致性
    async validateDataConsistency() {
        try {
            const users = await User.find({}).populate('friends');
            let inconsistencies = [];

            for (const user of users) {
                const neo4jFriends = await this.neo4jService.getFriendships(user._id.toString());
                const mongoFriends = user.friends.map(f => f._id.toString());

                // 检查不一致
                const neo4jSet = new Set(neo4jFriends);
                const mongoSet = new Set(mongoFriends);

                const missingInNeo4j = mongoFriends.filter(f => !neo4jSet.has(f));
                const missingInMongo = neo4jFriends.filter(f => !mongoSet.has(f));

                if (missingInNeo4j.length > 0 || missingInMongo.length > 0) {
                    inconsistencies.push({
                        userId: user._id.toString(),
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
}

module.exports = DataSyncService;