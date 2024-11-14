const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const RedisClient = require('../utils/RedisClient');

let mongoServer;

// 在所有测试开始前执行
beforeAll(async () => {
    // 断开现有连接
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    
    // 创建内存MongoDB实例
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // 连接到测试数据库
    await mongoose.connect(mongoUri);
    
    // 创建测试用户
    const testUser = await User.create({
        username: 'testUser',
        email: 'test@example.com',
        password: '$2a$12$Yr9MVtsdQaUK/KH1QbrI.usBew46qAx9AbKgYyZTAJu6NqJ5muIm',
        avatar: '',
        bio: '',
        website: '',
        followers: [],
        following: [],
        privacy: {},
        friends: [],
        likesReceived: 0,
        posts: []
    });

    // 设置全局变量
    global.testUser = testUser;
    global.testToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
    );
});

// 每个测试前执行
beforeEach(async () => {
    await RedisClient.client.flushall();
});

// 所有测试结束后执行
afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
    await RedisClient.client.quit();
}); 