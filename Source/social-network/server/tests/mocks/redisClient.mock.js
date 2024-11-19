const mockRedisClient = {
    client: {
        flushall: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        hset: jest.fn().mockResolvedValue(1),
        hget: jest.fn().mockResolvedValue(null),
        hdel: jest.fn().mockResolvedValue(1),
        hgetall: jest.fn().mockResolvedValue({}),
        expire: jest.fn().mockResolvedValue(1),
        del: jest.fn().mockResolvedValue(1),
        incr: jest.fn().mockResolvedValue(1),
        hincrby: jest.fn().mockResolvedValue(1),
        multi: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
        })
    },
    
    // 缓存相关方法
    cacheMessage: jest.fn().mockImplementation(async (messageId, message) => {
        return message;
    }),
    
    getCachedMessage: jest.fn().mockImplementation(async (messageId) => {
        return {
            content: 'cache test message',
            sender: 'testSender',
            receiver: 'testReceiver'
        };
    }),
    
    // 最近消息缓存
    cacheRecentMessages: jest.fn().mockImplementation(async (userId1, userId2, messages) => {
        return true;
    }),
    
    getRecentMessages: jest.fn().mockImplementation(async (userId1, userId2) => {
        return [];
    }),
    
    // 未读消息计数相关方法
    incrUnreadMessages: jest.fn().mockImplementation(async (userId, senderId) => {
        return 1;
    }),
    
    getUnreadMessagesCount: jest.fn().mockImplementation(async (userId) => {
        return [{
            senderId: 'testSender',
            count: 2
        }];
    }),
    
    clearUnreadMessages: jest.fn().mockImplementation(async (userId, senderId) => {
        return true;
    })
};

// 添加静态方法到 mock 对象本身
Object.assign(mockRedisClient, {
    hget: mockRedisClient.client.hget,
    hset: mockRedisClient.client.hset,
    // 确保所有方法都被复制到顶层
    ...mockRedisClient.client
});

module.exports = mockRedisClient;