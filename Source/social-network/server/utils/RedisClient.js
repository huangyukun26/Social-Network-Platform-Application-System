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

    // 合并会话管理方法
    async setSession(userId, sessionData, sessionId = null) {
        try {
            // 如果没有提供 sessionId，生成一个新的
            const actualSessionId = sessionId || 
                `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const key = `session:${userId}:${actualSessionId}`;
            
            // 合并会话数据
            const finalSessionData = {
                userId,
                sessionId: actualSessionId,
                createdAt: Date.now(),
                lastActive: Date.now(),
                ...sessionData
            };
            
            await this.client.hmset(key, finalSessionData);
            await this.client.expire(key, 24 * 60 * 60); // 24小时过期
            
            return actualSessionId;
        } catch (error) {
            console.error('设置会话失败:', error);
            throw error;
        }
    }

    // 统一缓存键管理
    #cacheKeys = {
        session: (userId, sessionId) => `session:${userId}:${sessionId}`,
        friendRequests: (userId) => `friend:requests:${userId}`,
        friendsList: (userId) => `friends:list:${userId}`,
        friendshipStatus: (userId, targetId) => `friendship:${userId}:${targetId}`,
        onlineStatus: (userId) => `user:online:${userId}`,
        friendsOnline: (userId) => `friends:online:${userId}`,
        interactions: (userId1, userId2) => `friend:interactions:${userId1}:${userId2}`,
        groups: (userId) => `friend:groups:${userId}`,
        suggestions: (userId) => `friend:suggestions:${userId}`
    };

    // 统一缓存操作方法
    async getCacheData(key, startTime = performance.now()) {
        const cached = await this.client.get(key);
        await this.trackCacheMetrics(key, startTime, !!cached);
        return cached ? JSON.parse(cached) : null;
    }

    async setCacheData(key, data, expiry = 300) {
        await this.client.set(key, JSON.stringify(data), 'EX', expiry);
    }

    // 优化缓存清理方法
    async clearCache(patterns) {
        try {
            const deletePromises = patterns.map(async pattern => {
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) {
                    console.log(`删除缓存键: ${keys.join(', ')}`);
                    await this.client.del(keys);
                }
            });
            
            await Promise.all(deletePromises);
        } catch (error) {
            console.error('清理缓存失败:', error);
        }
    }

    // 使用统一的方法重写现有功能
    async getFriendRequests(userId) {
        const key = this.#cacheKeys.friendRequests(userId);
        return this.getCacheData(key);
    }

    async setFriendRequests(userId, requests) {
        const key = this.#cacheKeys.friendRequests(userId);
        await this.setCacheData(key, requests);
    }

    // 优化指标收集
    async trackCacheMetrics(key, startTime, hit) {
        this.metrics.totalRequests++;
        hit ? this.metrics.hits++ : this.metrics.misses++;
        
        const latency = performance.now() - startTime;
        this.metrics.latency.push(latency);
        
        // 只保留最近1000条延迟记录
        if (this.metrics.latency.length > 1000) {
            this.metrics.latency.shift();
        }
    }

    // 好友状态缓存
    async getFriendshipStatus(userId, targetId) {
        const startTime = performance.now();
        const key = `friendship:${userId}:${targetId}`;
        const result = await this.client.get(key);
        
        // 加性能追踪
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
    async getFriendRecommendations(userId) {
        const startTime = performance.now();
        const key = `friend:recommendations:${userId}`;
        const cached = await this.client.get(key);
        
        await this.trackCacheMetrics(key, startTime, !!cached);
        return cached ? JSON.parse(cached) : null;
    }

    async setFriendRecommendations(userId, recommendations, expiry = 300) {
        const key = `friend:recommendations:${userId}`;
        await this.client.set(key, JSON.stringify(recommendations), 'EX', expiry);
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
            
            // 如存在其他会话，将其标记为已过期
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

    // 添加新的会话管理方法，与试用例匹配
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

    // 添加用户缓存清理方法
    async clearUserCache(userId) {
        try {
            console.log('开始清理用户缓存:', userId);
            
            // 获取所有与该用户相关的缓存键
            const patterns = [
                `friend:*:${userId}*`,
                `friends:list:${userId}*`,
                `friend:recommendations:${userId}*`,
                `friendship:${userId}:*`,
                `session:${userId}:*`
            ];
            
            // 并行删除所有匹配的键
            const deletePromises = patterns.map(async pattern => {
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) {
                    console.log(`删除缓存键: ${keys.join(', ')}`);
                    await this.client.del(keys);
                }
            });
            
            await Promise.all(deletePromises);
            console.log('用户缓存清理完成:', userId);
        } catch (error) {
            console.error('清理用户缓存失败:', error);
            // 不抛出错误，避免影响主流程
        }
    }

    // 添加清除所有缓存的方法
    async clearAllCache() {
        try {
            console.log('开始清理所有缓存');
            
            // 获取所有相关的缓存键
            const patterns = [
                'friend:*',
                'friends:list:*',
                'friend:recommendations:*',
                'friendship:*',
                'session:*'
            ];
            
            // 并行删除所有匹配的键
            const deletePromises = patterns.map(async pattern => {
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) {
                    console.log(`删除缓存键: ${keys.join(', ')}`);
                    await this.client.del(keys);
                }
            });
            
            await Promise.all(deletePromises);
            console.log('所有缓存清理完成');
        } catch (error) {
            console.error('清理所有缓存失败:', error);
            // 不抛出错误，避免影响主流程
        }
    }

    // 1. 好友在线状态缓存
    async setUserOnlineStatus(userId, isOnline) {
        const key = `user:online:${userId}`;
        await this.client.set(key, isOnline.toString(), 'EX', 300); // 5分钟过期
    }

    async getFriendsOnlineStatus(userId) {
        try {
            const key = `friends:online:${userId}`;
            const result = await this.client.get(key);
            return result ? JSON.parse(result) : null;
        } catch (error) {
            console.error('Redis获取在线状态失败:', error);
            return null;
        }
    }

    async setFriendsOnlineStatus(userId, statusData) {
        try {
            const key = `friends:online:${userId}`;
            await this.client.set(
                key,
                JSON.stringify(statusData),
                'EX',
                60  // 1分钟过期
            );
            return true;
        } catch (error) {
            console.error('Redis设置在线状态失败:', error);
            return false;
        }
    }

    // 2. 好友互动历史缓存
    async getFriendInteractionHistory(userId1, userId2) {
        const startTime = performance.now();
        const key = `friend:interactions:${userId1}:${userId2}`;
        const cached = await this.client.get(key);
        
        await this.trackCacheMetrics(key, startTime, !!cached);
        return cached ? JSON.parse(cached) : null;
    }

    async setFriendInteractionHistory(userId1, userId2, history, expiry = 300) {
        const key = `friend:interactions:${userId1}:${userId2}`;
        await this.client.set(key, JSON.stringify(history), 'EX', expiry);
    }

    // 3. 好友分组缓存
    async getFriendGroups(userId) {
        const startTime = performance.now();
        const key = `friend:groups:${userId}`;
        const cached = await this.client.get(key);
        
        await this.trackCacheMetrics(key, startTime, !!cached);
        return cached ? JSON.parse(cached) : null;
    }

    async setFriendGroups(userId, groups, expiry = 300) {
        const key = `friend:groups:${userId}`;
        await this.client.set(key, JSON.stringify(groups), 'EX', expiry);
    }

    // 4. 清除相关缓存的方法
    async clearFriendInteractionCache(userId1, userId2) {
        const keys = [
            `friend:interactions:${userId1}:${userId2}`,
            `friend:interactions:${userId2}:${userId1}`
        ];
        await this.client.del(keys);
    }

    // 5. 扩展现有的 clearUserCache 方法
    async clearUserCache(userId) {
        try {
            console.log('开始清理用户缓存:', userId);
            
            // 添加新的缓存模式
            const patterns = [
                ...this.patterns, // 保持现有的模式
                `user:online:${userId}*`,
                `friends:online:${userId}*`,
                `friend:interactions:${userId}:*`,
                `friend:groups:${userId}*`
            ];
            
            const deletePromises = patterns.map(async pattern => {
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) {
                    console.log(`删除缓存键: ${keys.join(', ')}`);
                    await this.client.del(keys);
                }
            });
            
            await Promise.all(deletePromises);
            console.log('用户缓存清理完成:', userId);
        } catch (error) {
            console.error('清理用户缓存失败:', error);
        }
    }

    // 修改方法名，保持一致性
    async getFriendSuggestions(userId) {
        const startTime = performance.now();
        const key = `friend:suggestions:${userId}`;
        const cached = await this.client.get(key);
        
        await this.trackCacheMetrics(key, startTime, !!cached);
        return cached ? JSON.parse(cached) : null;
    }

    async setFriendSuggestions(userId, suggestions, expiry = 300) {
        const key = `friend:suggestions:${userId}`;
        await this.client.set(key, JSON.stringify(suggestions), 'EX', expiry);
    }

    // 智能推荐相关方法
    async getSmartRecommendations(userId) {
        const startTime = performance.now();
        const key = `friend:smart-recommendations:${userId}`;
        const cached = await this.client.get(key);
        
        await this.trackCacheMetrics(key, startTime, !!cached);
        return cached ? JSON.parse(cached) : null;
    }

    async setSmartRecommendations(userId, recommendations, expiry = 300) {
        const key = `friend:smart-recommendations:${userId}`;
        await this.client.set(key, JSON.stringify(recommendations), 'EX', expiry);
    }

    // 清除推缓存
    async clearRecommendationsCache(userId) {
        const keys = [
            `friend:suggestions:${userId}`,
            `friend:smart-recommendations:${userId}`
        ];
        await this.client.del(keys);
    }

    // 添加 clearFriendsCache 方法
    async clearFriendsCache(userId) {
        try {
            console.log('清理好友缓存:', userId);
            const keys = [
                `friends:list:${userId}`,
                `friend:*:${userId}`,
                `friendship:${userId}:*`,
                `friend:recommendations:${userId}`,
                `friend:smart-recommendations:${userId}`,
                `friends:online:${userId}`
            ];

            // 并行删除所有相关缓存
            const deletePromises = keys.map(async pattern => {
                const matchedKeys = await this.client.keys(pattern);
                if (matchedKeys.length > 0) {
                    console.log(`删除缓存键: ${matchedKeys.join(', ')}`);
                    await this.client.del(matchedKeys);
                }
            });

            await Promise.all(deletePromises);
            console.log('好友缓存清理完成:', userId);
        } catch (error) {
            console.error('清理好友缓存失败:', error);
            // 不抛出错误，避免影响主流程
        }
    }

    // 社交圈子缓存
    async getSocialCircles(userId) {
        const startTime = performance.now();
        const key = `social:circles:${userId}`;
        const cached = await this.client.get(key);
        
        await this.trackCacheMetrics(key, startTime, !!cached);
        return cached ? JSON.parse(cached) : null;
    }

    async setSocialCircles(userId, circles, expiry = 3600) {
        const key = `social:circles:${userId}`;
        await this.client.set(key, JSON.stringify(circles), 'EX', expiry);
    }

    // 社交影响力缓存
    async getSocialInfluence(userId) {
        const startTime = performance.now();
        const key = `social:influence:${userId}`;
        const cached = await this.client.get(key);
        
        await this.trackCacheMetrics(key, startTime, !!cached);
        return cached ? JSON.parse(cached) : null;
    }

    async setSocialInfluence(userId, influence, expiry = 3600) {
        const key = `social:influence:${userId}`;
        await this.client.set(key, JSON.stringify(influence), 'EX', expiry);
    }

    // 消息相关的缓存方法
    async cacheMessage(messageId, message, expiry = 3600) {
        const key = `message:${messageId}`;
        await this.client.set(key, JSON.stringify(message), 'EX', expiry);
    }

    async getCachedMessage(messageId) {
        const key = `message:${messageId}`;
        const message = await this.client.get(key);
        return message ? JSON.parse(message) : null;
    }

    // 未读消息计数管理
    async incrUnreadMessages(userId, senderId) {
        const key = `unread_messages:${userId}`;
        await this.client.hincrby(key, senderId, 1);
    }

    async getUnreadMessagesCount(userId) {
        const key = `unread_messages:${userId}`;
        const counts = await this.client.hgetall(key);
        return Object.entries(counts).map(([senderId, count]) => ({
            senderId,
            count: parseInt(count)
        }));
    }

    async clearUnreadMessages(userId, senderId) {
        const key = `unread_messages:${userId}`;
        await this.client.hdel(key, senderId);
    }

    // 最近消息缓存
    async cacheRecentMessages(userId1, userId2, messages, expiry = 300) {
        const key = `recent_messages:${userId1}:${userId2}`;
        await this.client.set(key, JSON.stringify(messages), 'EX', expiry);
    }

    async getRecentMessages(userId1, userId2) {
        const key = `recent_messages:${userId1}:${userId2}`;
        const messages = await this.client.get(key);
        return messages ? JSON.parse(messages) : null;
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