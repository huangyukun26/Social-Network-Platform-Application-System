const { MongoClient } = require('mongodb');

async function monitorDatabases() {
    const primaryClient = new MongoClient('mongodb://localhost:27017');
    const replicaClient = new MongoClient('mongodb://localhost:27018/?replicaSet=rs0');

    try {
        // 监控主库
        await primaryClient.connect();
        const primaryStatus = await primaryClient.db('admin').command({ serverStatus: 1 });
        
        console.log('\n主数据库状态:');
        console.log('=================');
        console.log(`连接数: ${primaryStatus.connections.current}`);
        console.log(`可用连接数: ${primaryStatus.connections.available}`);
        console.log(`内存使用: ${(primaryStatus.mem.resident / 1024).toFixed(2)} MB`);

        // 监控副本集
        await replicaClient.connect();
        const admin = replicaClient.db('admin').admin();
        const status = await admin.replSetGetStatus();
        
        console.log('\n副本集状态:');
        console.log('=================');
        status.members.forEach(member => {
            console.log(`节点: ${member.name}`);
            console.log(`状态: ${member.stateStr}`);
            console.log(`健康状态: ${member.health}`);
            console.log('-------------------');
        });

    } catch (error) {
        console.error('监控数据库时出错:', error);
    } finally {
        await primaryClient.close();
        await replicaClient.close();
    }
}

// 每30秒执行一次监控
setInterval(monitorDatabases, 30000);
monitorDatabases(); 