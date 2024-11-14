const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateTestToken = (userId) => {
    return jwt.sign(
        { userId: userId },
        process.env.JWT_SECRET || 'your-test-secret',
        { expiresIn: '24h' }
    );
};

module.exports = { generateTestToken }; 