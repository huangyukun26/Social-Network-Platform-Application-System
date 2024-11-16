const request = require('supertest');
const app = require('../../server');
const Neo4jService = require('../../services/neo4jService');
const User = require('../../models/User');
const RedisClient = require('../../utils/RedisClient');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('Social Analytics', () => {
    let token;
    let sessionId;
    let testUser;
    let testFriend1;
    let testFriend2;
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

        // 创建测试好友1
        testFriend1 = await User.create({
            username: `testfriend1_${Date.now()}`,
            email: `testfriend1_${Date.now()}@example.com`,
            password: 'password123'
        });

        // 创建测试好友2
        testFriend2 = await User.create({
            username: `testfriend2_${Date.now()}`,
            email: `testfriend2_${Date.now()}@example.com`,
            password: 'password123'
        });

        // 生成认证token
        token = jwt.sign(
            { userId: testUser._id.toString() },
            process.env.JWT_SECRET
        );
        
        // 创建会话
        sessionId = `test_session_${Date.now()}`;
        await RedisClient.createSession(testUser._id.toString(), sessionId);

        // 在Neo4j中创建用户节点和关系
        await neo4jService.syncUserToNeo4j(testUser._id.toString(), testUser.username);
        await neo4jService.syncUserToNeo4j(testFriend1._id.toString(), testFriend1.username);
        await neo4jService.syncUserToNeo4j(testFriend2._id.toString(), testFriend2.username);

        // 使用正确的方法名 addFriendship 替代 createFriendship
        await neo4jService.addFriendship(testUser._id.toString(), testFriend1._id.toString());
        await neo4jService.addFriendship(testUser._id.toString(), testFriend2._id.toString());
        await neo4jService.addFriendship(testFriend1._id.toString(), testFriend2._id.toString());
    });

    afterAll(async () => {
        // 清理测试数据
        await User.deleteMany({});
        await RedisClient.deleteSession(testUser._id.toString(), sessionId);
        
        // 清理Neo4j数据
        const session = neo4jService.driver.session();
        try {
            await session.run('MATCH ()-[r]-() DELETE r');
            await session.run('MATCH (n) DELETE n');
        } finally {
            await session.close();
        }

        // 关闭连接
        await neo4jService.driver.close();
        await mongoose.disconnect();
    });

    describe('Common Friends Analysis', () => {
        test('GET /api/friends/analysis/common/:targetUserId', async () => {
            const response = await request(app)
                .get(`/api/friends/analysis/common/${testFriend1._id}`)
                .set('Authorization', `Bearer ${token}`)
                .set('Session-ID', sessionId);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBeTruthy();
            expect(response.body.length).toBeGreaterThan(0);
            
            const commonFriend = response.body[0];
            expect(commonFriend).toHaveProperty('userId');
            expect(commonFriend).toHaveProperty('connectionStrength');
            expect(commonFriend).toHaveProperty('userDetails');
            expect(commonFriend.userDetails).toHaveProperty('username');
        });
    });

    describe('Social Circles Analysis', () => {
        test('GET /api/friends/analysis/circles', async () => {
            const response = await request(app)
                .get('/api/friends/analysis/circles')
                .set('Authorization', `Bearer ${token}`)
                .set('Session-ID', sessionId);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBeTruthy();
            
            const circle = response.body[0];
            expect(circle).toHaveProperty('circle');
            expect(circle).toHaveProperty('members');
            expect(circle).toHaveProperty('size');
            expect(Array.isArray(circle.members)).toBeTruthy();
        });
    });

    describe('Social Influence Analysis', () => {
        test('GET /api/friends/analysis/influence', async () => {
            const response = await request(app)
                .get('/api/friends/analysis/influence')
                .set('Authorization', `Bearer ${token}`)
                .set('Session-ID', sessionId);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('totalReach');
            expect(response.body).toHaveProperty('distribution');
            expect(Array.isArray(response.body.distribution)).toBeTruthy();
        });

        test('should handle unauthorized access', async () => {
            const response = await request(app)
                .get('/api/friends/analysis/influence');

            expect(response.status).toBe(401);
        });

        test('should handle invalid token', async () => {
            const response = await request(app)
                .get('/api/friends/analysis/influence')
                .set('Authorization', 'Bearer invalid-token')
                .set('Session-ID', 'invalid-session');

            expect(response.status).toBe(401);
        });
    });
});