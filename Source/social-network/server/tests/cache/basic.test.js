const RedisClient = require('../../utils/RedisClient');
const User = require('../../models/User');
const FriendRequest = require('../../models/FriendRequest');

describe('缓存基础功能测试', () => {
    beforeEach(async () => {
        // 每个测试前清空数据
        await User.deleteMany({});
        await FriendRequest.deleteMany({});
        await RedisClient.client.flushall();
    });

    test('好友状态缓存测试', async () => {
        // 创建测试用户
        const user1 = await User.create({
            username: 'testUser1',
            email: 'test1@test.com',
            password: 'password123'
        });

        const user2 = await User.create({
            username: 'testUser2',
            email: 'test2@test.com',
            password: 'password123'
        });

        // 测试缓存写入
        await RedisClient.setFriendshipStatus(user1._id, user2._id, 'none');
        
        // 测试缓存读取
        const status = await RedisClient.getFriendshipStatus(user1._id, user2._id);
        expect(status).toBe('none');
    });

    test('好友列表缓存测试', async () => {
        const friendsList = [
            { id: '1', username: 'friend1' },
            { id: '2', username: 'friend2' }
        ];

        // 测试缓存写入和读取
        await RedisClient.setFriendsList('testUser', friendsList);
        const cached = await RedisClient.getFriendsList('testUser');
        
        expect(cached).toEqual(friendsList);
    });

    test('缓存过期测试', async () => {
        // 设置较短的过期时间（1秒）
        await RedisClient.setFriendsList('testUser', ['friend1'], 1);
        
        // 等待缓存过期
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const cached = await RedisClient.getFriendsList('testUser');
        expect(cached).toBeNull();
    });
}); 