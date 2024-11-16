require('dotenv').config();
const DataSyncService = require('../../services/DataSyncService');
const mongoose = require('mongoose');

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB连接成功');

        const syncService = new DataSyncService();
        
        console.log('开始验证数据一致性...');
        const inconsistencies = await syncService.validateDataConsistency();
        
        if (inconsistencies.length > 0) {
            console.log('发现数据不一致:', JSON.stringify(inconsistencies, null, 2));
            process.exit(1);
        } else {
            console.log('数据一致性验证通过');
        }
    } catch (error) {
        console.error('验证失败:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    main();
}