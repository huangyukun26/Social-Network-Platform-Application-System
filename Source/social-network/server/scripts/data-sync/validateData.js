require('dotenv').config();
const DataSyncService = require('../../services/DataSyncService');
const mongoose = require('mongoose');

async function validateNewFeatures(syncService) {
    const inconsistencies = [];
    
    // 验证在线状态
    const onlineStatusMatch = await syncService.validateOnlineStatus();
    if (!onlineStatusMatch) {
        inconsistencies.push('在线状态不一致');
    }

    // 验证好友分组
    const groupsMatch = await syncService.validateFriendGroups();
    if (!groupsMatch) {
        inconsistencies.push('好友分组不一致');
    }

    // 验证互动记录
    const interactionsMatch = await syncService.validateInteractions();
    if (!interactionsMatch) {
        inconsistencies.push('互动记录不一致');
    }

    return inconsistencies;
}

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB连接成功');

        const syncService = new DataSyncService();
        
        console.log('开始验证数据一致性...');
        const basicInconsistencies = await syncService.validateDataConsistency();
        const newFeatureInconsistencies = await validateNewFeatures(syncService);
        
        const allInconsistencies = [...basicInconsistencies, ...newFeatureInconsistencies];
        
        if (allInconsistencies.length > 0) {
            console.log('发现数据不一致:', JSON.stringify(allInconsistencies, null, 2));
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