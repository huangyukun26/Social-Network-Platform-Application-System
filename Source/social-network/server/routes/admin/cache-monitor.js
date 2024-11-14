const express = require('express');
const router = express.Router();
const RedisClient = require('../../utils/RedisClient');
const auth = require('../../middleware/auth');

// 辅助函数：解析Redis信息
const parseRedisInfo = (info) => {
    const metrics = {};
    info.split('\r\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length === 2) {
            metrics[parts[0]] = parts[1].trim();
        }
    });
    return metrics;
};

// 获取内存使用情况
router.get('/memory-usage', auth, async (req, res) => {
    try {
        const info = await RedisClient.client.info('memory');
        const metrics = parseRedisInfo(info);
        
        res.json({
            used_memory: metrics.used_memory_human,
            used_memory_peak: metrics.used_memory_peak_human,
            mem_fragmentation_ratio: metrics.mem_fragmentation_ratio
        });
    } catch (error) {
        console.error('获取内存信息失败:', error);
        res.status(500).json({ error: '获取内存信息失败' });
    }
});

// 获取缓存命中率
router.get('/hit-rate', auth, async (req, res) => {
    try {
        const metrics = RedisClient.getMetrics();
        const hitRate = metrics.totalRequests === 0 ? 0 : 
            (metrics.hits / metrics.totalRequests * 100);

        res.json({
            hits: metrics.hits,
            misses: metrics.misses,
            hit_rate: hitRate.toFixed(2)
        });
    } catch (error) {
        console.error('获取命中率失败:', error);
        res.status(500).json({ error: '获取命中率失败' });
    }
});

// 获取缓存状态
router.get('/status', auth, async (req, res) => {
    try {
        const isConnected = await RedisClient.client.ping();
        res.json({
            status: isConnected === 'PONG' ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Redis状态检查失败:', error);
        res.status(500).json({ 
            status: 'error',
            message: '缓存服务器状态检查失败'
        });
    }
});

module.exports = router; 