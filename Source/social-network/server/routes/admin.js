const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const RedisClient = require('../utils/RedisClient');
const CacheMetrics = require('../models/CacheMetrics');

// 检查管理员权限的中间件
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        if (user.role !== 'admin') {
            return res.status(403).json({ 
                message: '需要管理员权限',
                currentRole: user.role
            });
        }
        
        next();
    } catch (error) {
        console.error('验证管理员权限失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};

// 获取缓存监控指标
router.get('/cache/metrics', auth, isAdmin, async (req, res) => {
    try {
        const metrics = await RedisClient.getDetailedMetrics();
        
        res.json({
            metrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('获取缓存监控指标失败:', error);
        res.status(500).json({ message: '获取监控指标失败' });
    }
});

// 重置监控指标
router.post('/cache/metrics/reset', auth, isAdmin, async (req, res) => {
    try {
        RedisClient.resetMetrics();
        res.json({ 
            message: '监控指标已重置',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('重置监控指标失败:', error);
        res.status(500).json({ message: '重置监控指标失败' });
    }
});

// 获取历史缓存指标
router.get('/cache/metrics/history', auth, isAdmin, async (req, res) => {
    try {
        const { period = '24h' } = req.query;
        const now = new Date();
        let startTime;

        switch (period) {
            case '1h':
                startTime = new Date(now - 60 * 60 * 1000);
                break;
            case '24h':
                startTime = new Date(now - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            default:
                startTime = new Date(now - 24 * 60 * 60 * 1000);
        }

        const metrics = await CacheMetrics.find({
            timestamp: { $gte: startTime }
        }).sort({ timestamp: 1 });

        res.json({
            period,
            metrics,
            count: metrics.length
        });
    } catch (error) {
        console.error('获取历史缓存指标失败:', error);
        res.status(500).json({ message: '获取历史指标失败' });
    }
});

// 添加缓存状态检查路由
router.get('/cache/status', auth, isAdmin, async (req, res) => {
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