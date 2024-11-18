const mockKafkaService = {
    initialize: jest.fn().mockResolvedValue(true),
    shutdown: jest.fn().mockResolvedValue(true),
    sendMessage: jest.fn().mockImplementation(async (message) => {
        return {
            success: true,
            messageId: 'mock-' + Date.now(),
            message
        };
    }),
    sendNotification: jest.fn().mockResolvedValue(true),
    createConsumer: jest.fn().mockResolvedValue(true),
    setupConsumers: jest.fn().mockResolvedValue(true),
    producer: {
        connect: jest.fn().mockResolvedValue(true),
        send: jest.fn().mockResolvedValue({
            success: true,
            timestamp: Date.now()
        }),
        disconnect: jest.fn().mockResolvedValue(true)
    },
    admin: {
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn().mockResolvedValue(true),
        createTopics: jest.fn().mockResolvedValue(true)
    },
    consumers: new Map(),
    isInitialized: true
};

jest.mock('../../services/KafkaService', () => mockKafkaService);

module.exports = mockKafkaService;