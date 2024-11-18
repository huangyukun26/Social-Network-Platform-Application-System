const { Kafka, logLevel } = require('kafkajs');
const config = require('../config/kafka.config');
const MessageService = require('./MessageService');
const SocketManager = require('../utils/socketManager');
const RedisClient = require('../utils/RedisClient');

class KafkaService {
    constructor() {
        this.kafka = new Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
            retry: {
                initialRetryTime: 100,
                retries: 8
            },
            logLevel: logLevel.ERROR
        });

        this.producer = this.kafka.producer();
        this.admin = this.kafka.admin();
        this.consumers = new Map();
    }

    async initialize() {
        try {
            await this.admin.connect();
            console.log('Kafka admin connected');

            await this.createTopicsIfNotExists();

            await this.producer.connect();
            console.log('Kafka producer connected');
            
            await this.setupConsumers();
        } catch (error) {
            console.error('Kafka initialization error:', error);
        }
    }

    async createTopicsIfNotExists() {
        try {
            const existingTopics = await this.admin.listTopics();
            const topicsToCreate = [];

            for (const topic of Object.values(config.topics)) {
                if (!existingTopics.includes(topic)) {
                    topicsToCreate.push({
                        topic,
                        numPartitions: 1,
                        replicationFactor: 1
                    });
                }
            }

            if (topicsToCreate.length > 0) {
                await this.admin.createTopics({
                    topics: topicsToCreate,
                    waitForLeaders: true
                });
                console.log('Topics created:', topicsToCreate.map(t => t.topic));
            }
        } catch (error) {
            console.error('Error creating topics:', error);
            throw error;
        }
    }

    async setupConsumers() {
        try {
            // 设置消息消费者
            await this.createConsumer(
                config.topics.messages,
                config.consumerGroups.messages,
                async (message) => {
                    await MessageService.deliverMessage(message);
                    await SocketManager.sendToUser(message.receiver, 'new_message', message);
                }
            );

            console.log('Kafka consumers setup completed');
        } catch (error) {
            console.error('Error setting up consumers:', error);
            throw error;
        }
    }

    async createConsumer(topic, groupId, handler) {
        try {
            const consumer = this.kafka.consumer({ groupId });
            await consumer.connect();
            await consumer.subscribe({ topic, fromBeginning: false });

            await consumer.run({
                autoCommit: true,
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const value = JSON.parse(message.value.toString());
                        await handler(value);
                    } catch (error) {
                        console.error(`Error processing message from ${topic}:`, error);
                    }
                }
            });

            this.consumers.set(topic, consumer);
            console.log(`Consumer created for topic: ${topic}`);
        } catch (error) {
            console.error(`Error creating consumer for topic ${topic}:`, error);
            throw error;
        }
    }

    async sendMessage(message) {
        try {
            await this.producer.send({
                topic: config.topics.messages,
                messages: [{
                    key: message.receiver,
                    value: JSON.stringify(message)
                }]
            });
        } catch (error) {
            console.error('Error sending message to Kafka:', error);
            throw error;
        }
    }

    async shutdown() {
        try {
            await this.producer.disconnect();
            await this.admin.disconnect();
            for (const consumer of this.consumers.values()) {
                await consumer.disconnect();
            }
            console.log('Kafka service shut down successfully');
        } catch (error) {
            console.error('Error shutting down Kafka service:', error);
        }
    }

    // 添加消息主题处理
    async setupMessageConsumers() {
        await this.createConsumer(
            'messages',
            'message-group',
            async (message) => {
                try {
                    const messageData = JSON.parse(message.value);
                    // 处理消息投递
                    await MessageService.deliverMessage(messageData);
                    // 更新缓存
                    await RedisClient.cacheMessage(messageData.messageId, messageData);
                    // 发送实时通知
                    await SocketManager.sendToUser(messageData.receiver, 'new_message', messageData);
                } catch (error) {
                    console.error('消息处理失败:', error);
                }
            }
        );
    }

    // 添加通知主题处理
    async setupNotificationConsumers() {
        await this.createConsumer(
            'notifications',
            'notification-group',
            async (notification) => {
                try {
                    const notificationData = JSON.parse(notification.value);
                    // 发送实时通知
                    await SocketManager.sendToUser(
                        notificationData.userId,
                        'notification',
                        notificationData
                    );
                } catch (error) {
                    console.error('通知处理失败:', error);
                }
            }
        );
    }
}

const kafkaService = new KafkaService();
module.exports = kafkaService;