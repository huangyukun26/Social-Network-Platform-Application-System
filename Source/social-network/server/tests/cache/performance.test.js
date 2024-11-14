const request = require('supertest');
const app = require('../../server');
const RedisClient = require('../../utils/RedisClient');

describe('缓存性能测试', () => {
    test('好友列表访问性能对比', async () => {
        expect(global.testUser).toBeDefined();
        
        // 记录未缓存时的响应时间
        const start1 = performance.now();
        const response1 = await request(app)
            .get('/api/friends')
            .set('Authorization', `Bearer ${global.testToken}`);
        const timeWithoutCache = performance.now() - start1;

        expect(response1.status).toBe(200);

        // 记录缓存后的响应时间
        const start2 = performance.now();
        const response2 = await request(app)
            .get('/api/friends')
            .set('Authorization', `Bearer ${global.testToken}`);
        const timeWithCache = performance.now() - start2;

        expect(response2.status).toBe(200);

        console.log({
            withoutCache: `${timeWithoutCache.toFixed(2)}ms`,
            withCache: `${timeWithCache.toFixed(2)}ms`,
            improvement: `${((timeWithoutCache - timeWithCache) / timeWithoutCache * 100).toFixed(2)}%`
        });

        expect(timeWithCache).toBeLessThan(timeWithoutCache);
    });

    test('并发请求性能测试', async () => {
        expect(global.testUser).toBeDefined();
        const concurrentRequests = 50;

        const requests = Array(concurrentRequests).fill().map(() => 
            request(app)
                .get('/api/friends')
                .set('Authorization', `Bearer ${global.testToken}`)
        );

        const start = performance.now();
        const results = await Promise.all(requests);
        const totalTime = performance.now() - start;

        console.log({
            totalRequests: concurrentRequests,
            totalTime: `${totalTime.toFixed(2)}ms`,
            averageTime: `${(totalTime / concurrentRequests).toFixed(2)}ms`
        });

        // 验证所有请求都成功
        results.forEach(response => {
            expect(response.status).toBe(200);
        });
    });
}); 