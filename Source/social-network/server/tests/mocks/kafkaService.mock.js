const mockKafkaService = {
    producer: null,
    consumer: null,
    admin: null,

    initialize: jest.fn().mockResolvedValue(true),
    shutdown: jest.fn().mockResolvedValue(true),
    
    // 简化的 sendMessage 实现
    sendMessage: jest.fn().mockImplementation(async (message) => {
        return { success: true };
    })
};

// 确保在测试中使用 mock
jest.mock('../../services/kafkaService', () => mockKafkaService);

module.exports = mockKafkaService;