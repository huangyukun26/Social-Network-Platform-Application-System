// 使用工厂函数创建 mock
const createNeo4jServiceMock = () => {
    return {
        driver: {
            session: () => ({
                run: jest.fn().mockResolvedValue({ records: [] }),
                close: jest.fn().mockResolvedValue(true)
            })
        },
        
        initialize: jest.fn().mockResolvedValue(true),
        
        syncUserToNeo4j: jest.fn().mockImplementation((userId, userData) => ({
            success: true,
            userId
        })),
        
        syncFriendshipToNeo4j: jest.fn().mockImplementation((userId1, userId2, relationshipData) => ({
            success: true,
            userId1,
            userId2
        })),
        
        testConnection: jest.fn().mockResolvedValue(true),
        shutdown: jest.fn().mockResolvedValue(true),
        getSocialPath: jest.fn().mockResolvedValue(null),
        
        analyzeSocialInfluence: jest.fn().mockResolvedValue({
            directConnections: 0,
            secondaryConnections: 0,
            tertiaryConnections: 0,
            influenceScore: 0
        }),
        
        recommendFriends: jest.fn().mockResolvedValue([]),
        findSocialGroups: jest.fn().mockResolvedValue([]),
        
        analyzeUserActivity: jest.fn().mockResolvedValue({
            activityScore: 0
        }),
        
        calculateRelationshipStrength: jest.fn().mockResolvedValue({
            commonFriends: 0,
            interactions: 0,
            strength: 0
        })
    };
};

// 创建一个实例
const mockNeo4jService = createNeo4jServiceMock();

// Mock 模块
jest.mock('../../services/neo4jService', () => ({
    __esModule: true,
    default: jest.fn(() => mockNeo4jService),
    Neo4jService: jest.fn(() => mockNeo4jService)
}));

module.exports = mockNeo4jService;