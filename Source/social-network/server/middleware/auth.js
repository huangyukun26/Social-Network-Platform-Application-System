const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    try {
        const token = req.header('Authorization');
        console.log('收到的token:', token);
        
        if (!token) {
            return res.status(401).json({ message: '无访问权限' });
        }

        const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;
        console.log('处理后的token:', tokenString);
        
        const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);
        console.log('解码后的token:', decoded);
        
        req.user = decoded;
        req.userId = decoded.userId;
        
        next();
    } catch (error) {
        console.error('认证中间件错误:', error);
        res.status(401).json({ message: '无效的 token' });
    }
}; 