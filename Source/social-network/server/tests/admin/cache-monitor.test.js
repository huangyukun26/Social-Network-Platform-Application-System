const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const RedisClient = require('../../utils/RedisClient');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

describe('缓存监控面板性能测试', () => {
  let adminToken;

  beforeAll(async () => {
    // 等待数据库连接就绪
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const adminEmail = process.env.ADMIN_EMAIL;
    console.log('数据库连接状态:', mongoose.connection.readyState);
    
    // 先创建管理员账户（如果不存在）
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

    // 登录获取token
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
      });

    console.log('管理员登录响应:', loginResponse.body);
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();
    adminToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await RedisClient.cleanup();
  });

  test('Redis连接状态检查', async () => {
    const response = await request(app)
      .get('/api/admin/cache/status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'connected');
  });

  test('内存使用情况监控', async () => {
    const response = await request(app)
      .get('/api/admin/cache/memory-usage')
      .set('Authorization', `Bearer ${adminToken}`);
    
    console.log('内存使用情况响应:', response.body);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('used_memory');
    expect(response.body).toHaveProperty('used_memory_peak');
    expect(response.body).toHaveProperty('mem_fragmentation_ratio');
  });

  test('缓存命中率统计', async () => {
    // 先进行一些缓存操作来产生数据
    await RedisClient.setFriendsList('testUser', ['friend1', 'friend2']);
    await RedisClient.getFriendsList('testUser');
    await RedisClient.getFriendsList('nonexistentUser');

    const response = await request(app)
      .get('/api/admin/cache/hit-rate')
      .set('Authorization', `Bearer ${adminToken}`);

    console.log('缓存命中率响应:', response.body);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('hits');
    expect(response.body).toHaveProperty('misses');
    expect(response.body).toHaveProperty('hit_rate');
  });
}); 