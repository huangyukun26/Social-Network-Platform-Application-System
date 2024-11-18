const KafkaService = require('../../services/KafkaService');

describe('Kafka消息测试', () => {
    beforeAll(async () => {
        await KafkaService.initialize();
    });

    afterAll(async () => {
        await KafkaService.shutdown();
    });

    test('消息发送到Kafka', async () => {
        const message = {
            messageId: 'test-' + Date.now(),
            sender: global.testUser._id,
            content: 'kafka test message',
            timestamp: new Date()
        };

        await expect(KafkaService.sendMessage(message)).resolves.not.toThrow();
    });
});