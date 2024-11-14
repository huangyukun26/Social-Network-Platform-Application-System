const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const CacheMetrics = require('../../models/CacheMetrics');
const RedisClient = require('../../utils/RedisClient');
require('dotenv').config();

describe('缓存监控指标测试', () => {
    let adminToken;

    beforeAll(async () => {
        // 确保管理员账户存在
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        
        // 使用 User 模型创建管理员
        const User = require('../../models/User');
        const bcrypt = require('bcryptjs');
        
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await User.findOneAndUpdate(
            { email: adminEmail },
            {
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin'
            },
            { upsert: true, new: true }
        );

        // 尝试登录
        const loginResponse = await request(app)
            .post('/api/users/login')
            .send({
                email: adminEmail,
                password: adminPassword
            });

        console.log('登录响应:', loginResponse.body);
        adminToken = loginResponse.body.token;
        expect(adminToken).toBeDefined();
    });

    afterAll(async () => {
        await RedisClient.cleanup();
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        // 清空测试数据
        await CacheMetrics.deleteMany({});
    });

    test('应该能够保存缓存指标', async () => {
        const metrics = {
            hits: 100,
            misses: 20,
            totalRequests: 120,
            hitRate: 83.33,
            averageLatency: 5.5,
            memoryUsage: 1024,
            keysCount: 50
        };

        const savedMetrics = new CacheMetrics(metrics);
        await savedMetrics.save();

        const found = await CacheMetrics.findById(savedMetrics._id);
        expect(found).toBeTruthy();
        expect(found.hits).toBe(metrics.hits);
        expect(found.hitRate).toBe(metrics.hitRate);
    });

    test('应该能够获取实时指标', async () => {
        const response = await request(app)
            .get('/api/admin/cache/metrics')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.metrics).toBeDefined();
        expect(response.body.systemInfo).toBeDefined();
    });

    test('应该能够获取历史指标', async () => {
        // 创建一些测试数据
        const testData = [
            { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // 2小时前
            { timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) }, // 1小时前
            { timestamp: new Date() } // 现在
        ];

        for (const data of testData) {
            await new CacheMetrics({
                ...data,
                hits: 100,
                misses: 20,
                totalRequests: 120,
                hitRate: 83.33,
                averageLatency: 5.5,
                memoryUsage: 1024,
                keysCount: 50
            }).save();
        }

        // 测试不同时间段
        const periods = ['1h', '24h', '7d'];
        for (const period of periods) {
            const response = await request(app)
                .get(`/api/admin/cache/metrics/history?period=${period}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.metrics).toBeDefined();
            expect(Array.isArray(response.body.metrics)).toBe(true);
            expect(response.body.period).toBe(period);
        }
    });

    test('应该正确计算性能指标', async () => {
        // 模拟一些缓存操作
        for (let i = 0; i < 10; i++) {
            await RedisClient.getFriendsList('testUser');
        }

        const metrics = await RedisClient.getDetailedMetrics();
        
        expect(metrics).toBeDefined();
        expect(metrics.totalRequests).toBeGreaterThan(0);
        expect(typeof metrics.hitRate).toBe('number');
        expect(typeof metrics.averageLatency).toBe('number');
    });
}); 