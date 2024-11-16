const request = require('supertest');
const app = require('../../server');
const Neo4jService = require('../../services/neo4jService');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const RedisClient = require('../../utils/RedisClient');
const mongoose = require('mongoose');

describe('Friend Routes with Neo4j', () => {
    let token;
    let sessionId;
    let testUser;
    let neo4jService;

    beforeAll(async () => {
        // 清理测试数据
        await User.deleteMany({});
        
        neo4jService = new Neo4jService();
        
        // 创建测试用户
        testUser = await User.create({
            username: `testuser_${Date.now()}`,
            email: `test${Date.now()}@example.com`,
            password: 'password123'
        });
        
        // 生成 token
        token = jwt.sign(
            { userId: testUser._id.toString() },
            process.env.JWT_SECRET
        );
        
        // 创建会话
        sessionId = `test_session_${Date.now()}`;
        await RedisClient.createSession(testUser._id.toString(), sessionId);
        
        // 同步到 Neo4j
        await neo4jService.syncUserToNeo4j(testUser._id.toString(), testUser.username);
        
    });

    afterAll(async () => {
        // 清理测试数据
        await User.deleteMany({});
        await RedisClient.deleteSession(testUser._id.toString(), sessionId);
        
        const session = neo4jService.driver.session();
        try {
            await session.run('MATCH ()-[r]-() DELETE r');
            await session.run('MATCH (n) DELETE n');
        } finally {
            await session.close();
            await neo4jService.driver.close();
        }
        
        await mongoose.disconnect();
        
    });

    describe('Friend Recommendations', () => {
        test('GET /api/friends/recommendations/graph', async () => {
            const response = await request(app)
                .get('/api/friends/recommendations/graph')
                .set('Authorization', `Bearer ${token}`)
                .set('Session-ID', sessionId);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBeTruthy();
        });
    });

    describe('Social Circle Analytics', () => {
        test('GET /api/friends/analytics/social-circle', async () => {
            const response = await request(app)
                .get('/api/friends/analytics/social-circle')
                .set('Authorization', `Bearer ${token}`)
                .set('Session-ID', sessionId);

            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        test('should handle unauthorized access', async () => {
            const response = await request(app)
                .get('/api/friends/recommendations/graph');

            expect(response.status).toBe(401);
        });

        test('should handle invalid token', async () => {
            const response = await request(app)
                .get('/api/friends/recommendations/graph')
                .set('Authorization', 'Bearer invalid-token')
                .set('Session-ID', 'invalid-session');

            expect(response.status).toBe(401);
        });
    });
});