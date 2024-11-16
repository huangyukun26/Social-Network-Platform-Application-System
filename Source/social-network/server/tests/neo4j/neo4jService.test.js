const Neo4jService = require('../../services/neo4jService');
const neo4jService = new Neo4jService();

describe('Neo4jService', () => {
    // 测试数据
    const testUser1 = { id: 'test-user-1', username: 'user1' };
    const testUser2 = { id: 'test-user-2', username: 'user2' };
    const testUser3 = { id: 'test-user-3', username: 'user3' };

    beforeAll(async () => {
        // 创建测试用户
        await neo4jService.syncUserToNeo4j(testUser1.id, testUser1.username);
        await neo4jService.syncUserToNeo4j(testUser2.id, testUser2.username);
        await neo4jService.syncUserToNeo4j(testUser3.id, testUser3.username);
    });

    afterAll(async () => {
        // 修改清理测试数据的方法
        const session = neo4jService.driver.session();
        try {
            // 先删除关系，再删除节点
            await session.run('MATCH ()-[r]-() DELETE r');
            await session.run('MATCH (n) DELETE n');
        } finally {
            await session.close();
            await neo4jService.driver.close();
        }
    });

    test('should create and verify friendship', async () => {
        await neo4jService.addFriendship(testUser1.id, testUser2.id);
        const friends = await neo4jService.getFriendships(testUser1.id);
        expect(friends).toContain(testUser2.id);
    });

    test('should get friend recommendations', async () => {
        // 创建测试关系网络
        await neo4jService.addFriendship(testUser1.id, testUser2.id);
        await neo4jService.addFriendship(testUser2.id, testUser3.id);
        
        const recommendations = await neo4jService.getFriendRecommendations(testUser1.id);
        expect(recommendations).toHaveLength(1);
        expect(recommendations[0].userId).toBe(testUser3.id);
    });

    test('should get social circle analytics', async () => {
        const analytics = await neo4jService.getSocialCircleAnalytics(testUser1.id);
        expect(analytics).toBeDefined();
        expect(Array.isArray(analytics)).toBeTruthy();
    });
});