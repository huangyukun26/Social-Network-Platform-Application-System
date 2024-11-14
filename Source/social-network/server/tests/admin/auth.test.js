const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

describe('管理员认证测试', () => {
    let adminToken;

    beforeAll(async () => {
        // 等待数据库连接就绪
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const adminEmail = process.env.ADMIN_EMAIL;
        console.log('数据库连接状态:', mongoose.connection.readyState);
        
        // 先尝试创建管理员账户（如果不存在）
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        const adminUser = await User.findOneAndUpdate(
            { email: adminEmail },
            {
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                privacy: {
                    profileVisibility: 'private',
                    showEmail: false
                }
            },
            { upsert: true, new: true }
        );

        console.log('管理员账户状态:', {
            exists: !!adminUser,
            id: adminUser?._id,
            role: adminUser?.role,
            email: adminUser?.email
        });

        expect(adminUser).toBeTruthy();
        expect(adminUser.role).toBe('admin');
    });

    test('管理员登录', async () => {
        const response = await request(app)
            .post('/api/users/login')  // 使用正确的登录路由
            .send({
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD
            });

        console.log('登录响应:', {
            status: response.status,
            body: response.body
        });

        expect(response.status).toBe(200);
        expect(response.body.token).toBeDefined();
        adminToken = response.body.token;
    });

    test('访问缓存监控指标', async () => {
        expect(adminToken).toBeDefined();
        
        const response = await request(app)
            .get('/api/admin/cache/metrics')
            .set('Authorization', `Bearer ${adminToken}`);

        console.log('监控指标响应:', {
            status: response.status,
            body: response.body
        });

        expect(response.status).toBe(200);
        expect(response.body.metrics).toBeDefined();
        expect(response.body.systemInfo).toBeDefined();
    });
}); 