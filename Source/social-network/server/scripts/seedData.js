const mongoose = require('mongoose');
const User = require('../models/User');
const Neo4jService = require('../services/neo4jService');
require('dotenv').config({ path: '../.env' });

const neo4jService = new Neo4jService();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/social-network');
    console.log('MongoDB连接成功');
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    process.exit(1);
  }
}

async function seedTestData() {
  try {
    // 清空现有的Neo4j数据
    await neo4jService.clearAllData();
    console.log('已清除Neo4j中的旧数据');

    // 清空MongoDB中的测试用户
    await User.deleteMany({ username: /^testuser/ });
    console.log('已清除MongoDB中的旧测试数据');

    // 创建测试用户
    const testUsers = [];
    for(let i = 1; i <= 10; i++) {
      const user = await User.create({
        username: `testuser${i}`,
        email: `test${i}@example.com`,
        password: 'test123456',
        bio: `这是测试用户${i}的简介`,
        stats: {
          postsCount: Math.floor(Math.random() * 50),
          friendsCount: 0,
          likesCount: Math.floor(Math.random() * 100)
        }
      });
      
      // 同步到Neo4j
      await neo4jService.syncUserToNeo4j(user._id.toString(), user.username);
      testUsers.push(user);
      console.log(`创建测试用户: ${user.username}`);
    }

    // 创建复杂的好友关系网络
    const friendshipPatterns = [
      // 用户1与用户2、3、4建立好友关系
      [0, 1], [0, 2], [0, 3],
      // 用户2与用户3、5建立好友关系
      [1, 2], [1, 4],
      // 用户3与用户4、6建立好友关系
      [2, 3], [2, 5],
      // 用户4与用户7建立好友关系
      [3, 6],
      // 用户5与用户8、9建立好友关系
      [4, 7], [4, 8],
      // 其他交叉关系
      [5, 7], [6, 8], [7, 9], [8, 9]
    ];

    // 建立好友关系
    for(const [userIndex, friendIndex] of friendshipPatterns) {
      const user = testUsers[userIndex];
      const friend = testUsers[friendIndex];
      
      // 在Neo4j中创建好友关系
      await neo4jService.addFriendship(
        user._id.toString(),
        friend._id.toString()
      );
      
      // 更新MongoDB中的好友关系
      await User.updateOne(
        { _id: user._id },
        { 
          $addToSet: { friends: friend._id },
          $inc: { 'stats.friendsCount': 1 }
        }
      );
      await User.updateOne(
        { _id: friend._id },
        { 
          $addToSet: { friends: user._id },
          $inc: { 'stats.friendsCount': 1 }
        }
      );
      
      console.log(`创建好友关系: ${user.username} - ${friend.username}`);
    }

    console.log('\n测试账号信息:');
    testUsers.forEach(user => {
      console.log(`用户名: ${user.username}`);
      console.log(`邮箱: ${user.email}`);
      console.log(`密码: test123456`);
      console.log('-------------------');
    });

  } catch (error) {
    console.error('添加测试数据失败:', error);
  } finally {
    await mongoose.connection.close();
    await neo4jService.driver.close();
    process.exit(0);
  }
}

// 执行数据填充
connectDB().then(() => {
  seedTestData();
});