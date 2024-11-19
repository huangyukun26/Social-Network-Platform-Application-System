const { describe, beforeAll, afterAll, test, expect } = require('@jest/globals');
const KafkaService = require('../../services/kafkaService');
const mockKafkaService = require('../mocks/kafkaService.mock');

jest.setTimeout(30000); // 增加超时时间

describe('Kafka消息测试', () => {
    beforeAll(async () => {
        await mockKafkaService.initialize();
    });

    afterAll(async () => {
        await mockKafkaService.shutdown();
    });

    test('消息发送到Kafka', async () => {
        const message = {
            content: 'test message',
            sender: 'user1',
            receiver: 'user2'
        };

        const result = await mockKafkaService.sendMessage(message);
        
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(mockKafkaService.sendMessage).toHaveBeenCalledWith(message);
    });
});