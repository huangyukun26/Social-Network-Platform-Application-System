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
        
        // 每5分钟保存一次指标
        this.startMetricsCollection();
    }

    async startMetricsCollection() {
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
        const key = `friend:requests:${userId}`;
        const cached = await this.client.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    async setFriendRequests(userId, requests, expiry = 300) {
        const key = `friend:requests:${userId}`;
        await this.client.set(key, JSON.stringify(requests), 'EX', expiry);
    }

    // 好友状态缓存
    async getFriendshipStatus(userId, targetId) {
        const key = `friendship:${userId}:${targetId}`;
        return await this.client.get(key);
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
        const key = `friend:suggestions:${userId}`;
        const cached = await this.client.get(key);
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
        }
    }
}

module.exports = new RedisClient(); 