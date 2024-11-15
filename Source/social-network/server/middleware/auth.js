const jwt = require('jsonwebtoken');
const RedisClient = require('../utils/RedisClient');

module.exports = async (req, res, next) => {
    try {
        const token = req.header('Authorization');
        const sessionId = req.header('Session-ID');
        
        if (!token || !sessionId) {
            return res.status(401).json({ message: '无访问权限' });
        }

        const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;
        
        // 验证JWT
        const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);
        
        // 验证分布式会话
        const session = await RedisClient.getSession(decoded.userId, sessionId);
        if (!session) {
            return res.status(401).json({ message: '会话已过期' });
        }
        
        // 更新会话活跃时间
        await RedisClient.updateSession(decoded.userId, sessionId);
        
        req.user = decoded;
        req.userId = decoded.userId;
        req.sessionId = sessionId;
        
        next();
    } catch (error) {
        console.error('认证中间件错误:', error);
        res.status(401).json({ message: '无效的 token' });
    }
}; 