const Redis = require('ioredis');
const config = require('../config/redis.config');
const CacheMetrics = require('../models/CacheMetrics');
const { performance } = require('perf_hooks');

class RedisClient {
    constructor() {
        this.client = new Redis(config);
        this.metricsInterval = null;
        
        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });
        
        this.client.on('connect', () => {
            console.log('Redis Client Connected');
        });
        
        // 添加监控指标
        this.metrics = {
            hits: 0,
            misses: 0,
            totalRequests: 0,
            latency: [],
            lastReset: new Date().toISOString()
        };
        
        this.startMetricsCollection();
    }

    async startMetricsCollection() {
        // 在测试环境下不启动指标收集
        if (process.env.NODE_ENV === 'test') {
            return;
        }

        // 清除已存在的定时器
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }

        this.metricsInterval = setInterval(async () => {
            try {
                const metrics = await this.getDetailedMetrics();
                await this.saveMetrics(metrics);
            } catch (error) {
                console.error('保存缓存指标失败:', error);
            }
        }, 5 * 60 * 1000);
    }

    async getDetailedMetrics() {
        const info = await this.client.info();
        const memory = this.parseRedisInfo(info).used_memory;
        const dbSize = await this.client.dbsize();

        const hitRate = this.metrics.totalRequests === 0 ? 0 : 
            (this.metrics.hits / this.metrics.totalRequests * 100);
        
        const avgLatency = this.metrics.latency.length === 0 ? 0 :
            this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length;

        return {
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            totalRequests: this.metrics.totalRequests,
            hitRate: hitRate,
            averageLatency: avgLatency,
            memoryUsage: memory,
            keysCount: dbSize
        };
    }

    parseRedisInfo(info) {
        const result = {};
        info.split('\n').forEach(line => {
            const parts = line.split(':');
            if (parts.length === 2) {
                result[parts[0]] = parts[1].trim();
            }
        });
        return result;
    }

    async saveMetrics(metrics) {
        const cacheMetrics = new CacheMetrics(metrics);
        await cacheMetrics.save();
        console.log('缓存指标已保存:', metrics);
    }

    // 添加监控方法
    async trackCacheMetrics(key, startTime, hit) {
        this.metrics.totalRequests++;
        if (hit) {
            this.metrics.hits++;
        } else {
            this.metrics.misses++;
        }
        
        const latency = performance.now() - startTime;
        this.metrics.latency.push(latency);
        
        // 只保留最近1000条延迟记录
        if (this.metrics.latency.length > 1000) {
            this.metrics.latency.shift();
        }
    }

    // 获取监控指标
    getMetrics() {
        const hitRate = this.metrics.totalRequests === 0 ? 0 : 
            (this.metrics.hits / this.metrics.totalRequests * 100).toFixed(2);
        
        const avgLatency = this.metrics.latency.length === 0 ? 0 :
            (this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length).toFixed(2);

        return {
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            totalRequests: this.metrics.totalRequests,
            hitRate: `${hitRate}%`,
            averageLatency: `${avgLatency}ms`,
            lastReset: this.metrics.lastReset,
            currentTime: new Date().toISOString()
        };
    }

    // 重置监控指标
    resetMetrics() {
        this.metrics = {
            hits: 0,
            misses: 0,
            totalRequests: 0,
            latency: [],
            lastReset: new Date().toISOString()
        };
    }

    // 好友请求相关缓存
    async getFriendRequests(userId) {
        const startTime = performance.now();
        const key = `friend:requests:${userId}`;
        const cached = await this.client.get(key);
        
        // 添加性能追踪
        await this.trackCacheMetrics(key, startTime, !!cached);
        
        return cached ? JSON.parse(cached) : null;
    }

    async setFriendRequests(userId, requests, expiry = 300) {
        const key = `friend:requests:${userId}`;
        await this.client.set(key, JSON.stringify(requests), 'EX', expiry);
    }

    // 好友状态缓存
    async getFriendshipStatus(userId, targetId) {
        const startTime = performance.now();
        const key = `friendship:${userId}:${targetId}`;
        const result = await this.client.get(key);
        
        // 添加性能追踪
        await this.trackCacheMetrics(key, startTime, !!result);
        
        return result;
    }

    async setFriendshipStatus(userId, targetId, status, expiry = 300) {
        const key = `friendship:${userId}:${targetId}`;
        await this.client.set(key, status, 'EX', expiry);
    }

    // 好友列表缓存
    async getFriendsList(userId) {
        const startTime = performance.now();
        const key = `friends:list:${userId}`;
        const result = await this.client.get(key);
        
        // 记录缓存命中情况
        await this.trackCacheMetrics(key, startTime, !!result);
        
        return result;
    }

    async setFriendsList(userId, friends, expiry = 300) {
        const key = `friends:list:${userId}`;
        await this.client.set(key, JSON.stringify(friends), 'EX', expiry);
    }

    // 好友推荐缓存
    async getFriendSuggestions(userId) {
        const startTime = performance.now();
        const key = `friend:suggestions:${userId}`;
        const cached = await this.client.get(key);
        
        // 添加性能追踪
        await this.trackCacheMetrics(key, startTime, !!cached);
        
        return cached ? JSON.parse(cached) : null;
    }

    async setFriendSuggestions(userId, suggestions, expiry = 300) {
        const key = `friend:suggestions:${userId}`;
        await this.client.set(key, JSON.stringify(suggestions), 'EX', expiry);
    }

    // 缓存失效方法
    async invalidateFriendCache(userId) {
        const keys = await this.client.keys(`friend:*:${userId}`);
        if (keys.length > 0) {
            await this.client.del(keys);
        }
    }

    // 添加清理方法
    async cleanup() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
        
        // 重置指标
        this.resetMetrics();
        
        // 在测试环境下关闭 Redis 连接
        if (process.env.NODE_ENV === 'test') {
            await this.client.quit();
        }
    }

    // 添加分布式会话管理
    async setDistributedSession(userId, token) {
        const key = `user:session:${userId}`;
        const sessionData = {
            token,
            lastActive: Date.now(),
            createdAt: Date.now()
        };
        
        // 存储会话信息但不影响现有token验证
        await this.client.hset(key, {
            ...sessionData,
            userId // 保持与现有系统一致的userId字段
        });
        
        // 设置24小时过期
        await this.client.expire(key, 24 * 60 * 60);
    }

    async getDistributedSession(userId) {
        const key = `user:session:${userId}`;
        const session = await this.client.hgetall(key);
        return session;
    }

    async updateSessionActivity(userId) {
        const key = `user:session:${userId}`;
        await this.client.hset(key, 'lastActive', Date.now());
    }

    // 完善会话管理
    async setUserSession(userId, sessionData) {
        try {
            // 生成唯一的会话ID
            const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const key = `session:${userId}:${sessionId}`;
            
            // 获取用户现有的会话
            const existingSessions = await this.getUserActiveSessions(userId);
            
            // 如果存在其他会话，将其标记为已过期
            for (const session of existingSessions) {
                if (session.deviceInfo?.userAgent === sessionData.deviceInfo?.userAgent) {
                    await this.removeSession(userId, session.sessionId);
                }
            }
            
            // 设置新会话
            await this.client.hmset(key, {
                ...sessionData,
                lastActive: Date.now(),
                createdAt: Date.now()
            });
            
            // 设置24小时过期
            await this.client.expire(key, 24 * 60 * 60);
            
            return sessionId;
        } catch (error) {
            console.error('设置用户会话失败:', error);
            throw error;
        }
    }

    async getSession(userId, sessionId) {
        const key = `session:${userId}:${sessionId}`;
        const session = await this.client.hgetall(key);
        return session;
    }

    async updateSession(userId, sessionId) {
        const key = `session:${userId}:${sessionId}`;
        await this.client.hset(key, 'lastActive', Date.now());
        await this.client.expire(key, 24 * 60 * 60); // 续期
    }
    
    async removeSession(userId, sessionId) {
        const key = `session:${userId}:${sessionId}`;
        await this.client.del(key);
    }
    
    async getUserActiveSessions(userId) {
        const pattern = `session:${userId}:*`;
        const keys = await this.client.keys(pattern);
        const sessions = [];
        
        for (const key of keys) {
            const session = await this.client.hgetall(key);
            if (session) {
                sessions.push({
                    sessionId: key.split(':')[2],
                    ...session
                });
            }
        }
        
        return sessions;
    }

    async validateSession(userId, sessionId) {
        const key = `session:${userId}:${sessionId}`;
        const session = await this.client.hgetall(key);
        return session && Object.keys(session).length > 0 ? session : null;
    }

    // 更新会话活跃时间
    async updateSessionActivity(userId, sessionId) {
        const sessionKey = `session:${userId}`;
        const sessionData = await this.client.hget(sessionKey, sessionId);
        if (sessionData) {
            const session = JSON.parse(sessionData);
            session.lastActive = new Date().toISOString();
            await this.client.hset(sessionKey, sessionId, JSON.stringify(session));
        }
    }

    // 获取用户所有会话
    async getUserSessions(userId) {
        const sessionKey = `session:${userId}`;
        try {
            const sessions = await this.client.hgetall(sessionKey);
            return Object.entries(sessions || {}).map(([id, session]) => ({
                id,
                ...JSON.parse(session)
            }));
        } catch (error) {
            console.error('获取用户会话失败:', error);
            return [];
        }
    }

    // 删除指定会话
    async removeSession(userId, sessionId) {
        const sessionKey = `session:${userId}`;
        try {
            await this.client.hdel(sessionKey, sessionId);
        } catch (error) {
            console.error('删除会话失败:', error);
        }
    }

    // 添加新的会话管理方法，与测试用例匹配
    async createSession(userId, sessionId) {
        try {
            const key = `session:${userId}:${sessionId}`;
            await this.client.hmset(key, {
                userId,
                sessionId,
                createdAt: Date.now(),
                lastActive: Date.now()
            });
            await this.client.expire(key, 24 * 60 * 60); // 24小时过期
            return true;
        } catch (error) {
            console.error('创建会话失败:', error);
            return false;
        }
    }

    async deleteSession(userId, sessionId) {
        try {
            const key = `session:${userId}:${sessionId}`;
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error('删除会话失败:', error);
            return false;
        }
    }

    // 确保在进程退出时清理资源
    async gracefulShutdown() {
        await this.cleanup();
        // 不要关闭 Redis 连接，因为可能其他地方还在使用
    }

    // 添加测试辅助方法
    async clearTestData() {
        if (process.env.NODE_ENV === 'test') {
            const keys = await this.client.keys('test:*');
            if (keys.length > 0) {
                await this.client.del(keys);
            }
        }
    }
}

// 创建单例实例
const redisClient = new RedisClient();

// 确保在进程退出时进行清理
process.on('SIGTERM', async () => {
    await redisClient.gracefulShutdown();
});

process.on('SIGINT', async () => {
    await redisClient.gracefulShutdown();
});

module.exports = redisClient; 