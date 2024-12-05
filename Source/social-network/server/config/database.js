const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_PRIMARY_URI || 'mongodb://localhost:27017,localhost:27018,localhost:27019,localhost:27020/social-network?replicaSet=rs0';
        
        // 设置默认连接
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 30000, // 增加超时时间
            socketTimeoutMS: 45000,
            maxPoolSize: 50,
            writeConcern: {
                w: 'majority'
            }
        });

        console.log('MongoDB连接成功');

        // 检查副本集状态
        const admin = mongoose.connection.db.admin();
        try {
            const status = await admin.command({ replSetGetStatus: 1 });
            console.log('副本集状态:', status.ok === 1 ? '正常' : '异常');
            console.log('主节点:', status.members.find(m => m.stateStr === 'PRIMARY')?.name);
            console.log('从节点数量:', status.members.filter(m => m.stateStr === 'SECONDARY').length);
        } catch (error) {
            console.error('获取副本集状态失败:', error);
        }

        // 设置事件监听
        mongoose.connection.on('connected', () => {
            console.log('MongoDB已连接');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB连接错误:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB连接断开');
        });

        return mongoose.connection;
    } catch (error) {
        console.error('数据库连接失败:', error);
        process.exit(1);
    }
};

module.exports = connectDB; 