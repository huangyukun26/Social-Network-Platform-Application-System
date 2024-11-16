require('dotenv').config();
const DataSyncService = require('../../services/DataSyncService');
const mongoose = require('mongoose');

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB连接成功');

        const syncService = new DataSyncService();
        
        console.log('开始同步数据...');
        await syncService.syncAllUsers();
        await syncService.syncAllFriendships();
        
        console.log('数据同步完成');
    } catch (error) {
        console.error('同步失败:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    main();
}