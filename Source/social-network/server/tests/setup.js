const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const RedisClient = require('../utils/RedisClient');

// 修改 Neo4j mock
jest.mock('../services/neo4jService', () => {
    return {
        __esModule: true,
        default: {
            syncUserToNeo4j: jest.fn().mockResolvedValue(true),
            testConnection: jest.fn().mockResolvedValue(true),
            initialize: jest.fn().mockResolvedValue(true),
            shutdown: jest.fn().mockResolvedValue(true)
        }
    };
});

// 添加 User model 的 mock 中间件
jest.mock('../models/User', () => {
    const originalModule = jest.requireActual('../models/User');
    const schema = originalModule.schema;
    
    // 移除 Neo4j 相关的中间件
    schema.post('save', function() {});
    
    return originalModule;
});

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
    // 重置所有 mock
    jest.clearAllMocks();
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