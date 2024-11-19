const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mockNeo4jService = require('./mocks/neo4jService.mock');
const mockKafkaService = require('./mocks/kafkaService.mock');
const mockRedisClient = require('./mocks/redisClient.mock');

let mongoServer;

// 设置全局超时
jest.setTimeout(30000);

// Mock 相关服务
jest.mock('../utils/RedisClient', () => mockRedisClient);
jest.mock('../services/kafkaService', () => mockKafkaService);
jest.mock('../models/User', () => {
    const originalModule = jest.requireActual('../models/User');
    const schema = originalModule.schema;
    schema.post('save', function() {});
    return originalModule;
});

// 在 mock 设置完成后再导入 RedisClient
const RedisClient = require('../utils/RedisClient');

// 使用 Jest 的全局钩子
beforeAll(async () => {
    try {
        // 断开现有连接
        await mongoose.disconnect();
        
        // 创建内存MongoDB实例
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // 连接到测试数据库
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000
        });
        
        // 创建测试用户
        const testUser = await User.create({
            username: 'testUser',
            email: 'test@example.com',
            password: 'password123'
        });

        global.testUser = testUser;
        global.testToken = jwt.sign(
            { userId: testUser._id },
            process.env.JWT_SECRET || 'test-secret-key',
            { expiresIn: '1h' }
        );
        
        // 设置 Neo4j mock
        User.prototype.neo4jService = mockNeo4jService;
        
        // 初始化 Kafka mock
        await mockKafkaService.initialize();
    } catch (error) {
        console.error('Setup failed:', error);
        throw error;
    }
});

beforeEach(async () => {
    try {
        await mongoose.connection.dropDatabase();
        await mockRedisClient.client.flushall();
        jest.clearAllMocks();
    } catch (error) {
        console.error('BeforeEach failed:', error);
        throw error;
    }
});

afterAll(async () => {
    try {
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
        
        // 清理 Redis mock
        mockRedisClient.client.flushall.mockClear();
        mockRedisClient.client.quit.mockClear();
        
        await mockKafkaService.shutdown();
        
        // 等待所有连接关闭
        await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
        console.error('Cleanup failed:', error);
        throw error;
    }
}); 