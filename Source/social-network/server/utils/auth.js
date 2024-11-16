const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    const token = jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your_jwt_secret_key',
        { expiresIn: '24h' }
    );
    console.log('Generated token for userId:', userId);
    return token;
};

const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
        console.log('Token verified:', decoded);
        return decoded;
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return null;
    }
};

const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: '未提供认证令牌' });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ message: '无效的认证令牌' });
        }

        req.userId = decoded.userId;
        console.log('Auth middleware: userId set to', req.userId);
        next();
    } catch (error) {
        console.error('认证失败:', error);
        res.status(401).json({ message: '认证失败' });
    }
};

module.exports = {
    generateToken,
    verifyToken,
    auth
};