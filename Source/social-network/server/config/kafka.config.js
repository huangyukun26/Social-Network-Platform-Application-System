module.exports = {
    clientId: process.env.KAFKA_CLIENT_ID || 'social-network-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    topics: {
        messages: 'chat-messages',
        notifications: 'user-notifications',
        events: 'user-events',
        delivery: 'message-delivery'
    },
    consumerGroups: {
        messages: 'chat-message-group',
        notifications: 'notification-group',
        events: 'event-group',
        delivery: 'delivery-group'
    }
};