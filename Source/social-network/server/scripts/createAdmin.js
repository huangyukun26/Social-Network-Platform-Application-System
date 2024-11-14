const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createAdminUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('数据库连接成功');

        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const adminUser = await User.findOneAndUpdate(
            { email: adminEmail },
            {
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                privacy: {
                    profileVisibility: 'private',
                    showEmail: false
                }
            },
            { upsert: true, new: true }
        );

        console.log('管理员账户已创建/更新:', {
            id: adminUser._id,
            username: adminUser.username,
            email: adminUser.email,
            role: adminUser.role
        });

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('创建管理员账户失败:', error);
        process.exit(1);
    }
}

createAdminUser(); 