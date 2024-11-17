const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const DataSyncService = require('../../services/DataSyncService');
const Neo4jService = require('../../services/neo4jService');
const mongoose = require('mongoose');

const DB_CONFIG = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/social-network',
    NEO4J_URI: process.env.NEO4J_URI || 'bolt://localhost:7687',
    NEO4J_USER: process.env.NEO4J_USER || 'neo4j',
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || 'ROOT050313'
};

async function main() {
    try {
        console.log('正在连接到MongoDB:', DB_CONFIG.MONGODB_URI);
        await mongoose.connect(DB_CONFIG.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB连接成功');

        global.neo4jConfig = {
            uri: DB_CONFIG.NEO4J_URI,
            user: DB_CONFIG.NEO4J_USER,
            password: DB_CONFIG.NEO4J_PASSWORD
        };

        const neo4jService = new Neo4jService();
        const syncService = new DataSyncService();

        console.log('清空Neo4j数据...');
        await neo4jService.clearAllData();

        console.log('重新同步用户数据...');
        await syncService.syncAllUsers();

        console.log('重新同步好友关系...');
        await syncService.syncAllFriendships();

        console.log('验证数据一致性...');
        const inconsistencies = await syncService.validateDataConsistency();
        
        if (inconsistencies.length > 0) {
            console.log('仍然存在不一致:', JSON.stringify(inconsistencies, null, 2));
        } else {
            console.log('数据已完全同步');
        }

    } catch (error) {
        console.error('修复失败:', error);
        console.error('错误详情:', error.stack);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('MongoDB连接已关闭');
        }
        process.exit(0);
    }
}

process.on('unhandledRejection', (error) => {
    console.error('未处理的Promise拒绝:', error);
    process.exit(1);
});

if (require.main === module) {
    main().catch(error => {
        console.error('程序执行失败:', error);
        process.exit(1);
    });
}