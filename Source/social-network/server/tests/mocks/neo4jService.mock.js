class Neo4jServiceMock {
    constructor() {
        this.driver = {
            session: () => ({
                run: jest.fn().mockResolvedValue({ records: [] }),
                close: jest.fn().mockResolvedValue(true)
            })
        };
    }

    async initialize() {
        return true;
    }

    async syncUserToNeo4j(userId, userData) {
        return {
            success: true,
            userId
        };
    }

    async syncFriendshipToNeo4j(userId1, userId2, relationshipData) {
        return {
            success: true,
            userId1,
            userId2
        };
    }

    async testConnection() {
        return true;
    }

    async shutdown() {
        return true;
    }

    // 添加其他必要的方法
    async getSocialPath() {
        return null;
    }

    async analyzeSocialInfluence() {
        return {
            directConnections: 0,
            secondaryConnections: 0,
            tertiaryConnections: 0,
            influenceScore: 0
        };
    }

    async recommendFriends() {
        return [];
    }

    async findSocialGroups() {
        return [];
    }

    async analyzeUserActivity() {
        return {
            activityScore: 0
        };
    }

    async calculateRelationshipStrength() {
        return {
            commonFriends: 0,
            interactions: 0,
            strength: 0
        };
    }
}

// 创建单例实例
const neo4jServiceInstance = new Neo4jServiceMock();

// Mock 整个模块
jest.mock('../../services/neo4jService', () => ({
    __esModule: true,
    default: Neo4jServiceMock,
    Neo4jService: Neo4jServiceMock
}));

module.exports = {
    Neo4jServiceMock,
    neo4jServiceInstance
};