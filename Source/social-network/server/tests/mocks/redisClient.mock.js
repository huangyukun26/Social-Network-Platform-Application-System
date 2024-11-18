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
        }),
        on: jest.fn(),
        connect: jest.fn()
    },
    
    // 缓存相关方法
    cacheMessage: jest.fn().mockImplementation(async (messageId, message) => {
        return true;
    }),
    
    getCachedMessage: jest.fn().mockImplementation(async (messageId) => {
        return null;
    }),
    
    // 未读消息计数相关方法
    incrUnreadMessages: jest.fn().mockImplementation(async (userId, senderId) => {
        return 1;
    }),
    
    getUnreadMessagesCount: jest.fn().mockImplementation(async (userId) => {
        return [];
    }),
    
    clearUnreadMessages: jest.fn().mockImplementation(async (userId, senderId) => {
        return true;
    }),
    
    // 最近消息缓存相关方法
    cacheRecentMessages: jest.fn().mockImplementation(async (userId1, userId2, messages) => {
        return true;
    }),
    
    getRecentMessages: jest.fn().mockImplementation(async (userId1, userId2) => {
        return [];
    }),
    
    // 在线状态相关方法
    setUserOnline: jest.fn().mockImplementation(async (userId, socketId) => {
        return true;
    }),
    
    setUserOffline: jest.fn().mockImplementation(async (userId) => {
        return true;
    }),
    
    getUserSocketId: jest.fn().mockImplementation(async (userId) => {
        return null;
    }),
    
    // 指标收集相关方法
    startMetricsCollection: jest.fn(),
    stopMetricsCollection: jest.fn(),
    recordMetric: jest.fn(),
    getMetrics: jest.fn().mockResolvedValue({
        hits: 0,
        misses: 0,
        totalRequests: 0,
        latency: []
    }),
    
    // 关闭连接
    gracefulShutdown: jest.fn().mockResolvedValue(true)
};

jest.mock('../../utils/RedisClient', () => mockRedisClient);

module.exports = mockRedisClient;