const neo4j = require('neo4j-driver');

class Neo4jService {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'ROOT050313'
      ),
      { 
        disableLosslessIntegers: true,
        maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3小时
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2000 // 2秒
      }
    );
    
    // 测试连接
    this.testConnection();
  }

  async testConnection() {
    const session = this.driver.session();
    try {
      await session.run('RETURN 1');
      console.log('Neo4j连接成功');
    } catch (error) {
      console.error('Neo4j连接失败:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async addFriendship(userId1, userId2) {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (u1:User {userId: $userId1})
        MATCH (u2:User {userId: $userId2})
        MERGE (u1)-[r:FRIEND]->(u2)
        MERGE (u2)-[r2:FRIEND]->(u1)
        RETURN r, r2
      `, { userId1, userId2 });
    } finally {
      await session.close();
    }
  }

  async removeFriendship(userId1, userId2) {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (u1:User {userId: $userId1})-[r:FRIEND]-(u2:User {userId: $userId2})
        DELETE r
      `, { userId1, userId2 });
    } finally {
      await session.close();
    }
  }

  async getFriendRecommendations(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (user:User {userId: $userId})-[:FRIEND]->(friend:User)
        MATCH (friend)-[:FRIEND]->(friendOfFriend:User)
        WHERE NOT (user)-[:FRIEND]->(friendOfFriend)
        AND user <> friendOfFriend
        WITH friendOfFriend, count(friend) as commonFriends
        RETURN friendOfFriend.userId as userId, commonFriends
        ORDER BY commonFriends DESC
        LIMIT 10
      `, { userId });
      
      return result.records.map(record => ({
        userId: record.get('userId'),
        commonFriends: parseInt(record.get('commonFriends').toString())
      }));
    } finally {
      await session.close();
    }
  }

  async getSocialCircleAnalytics(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH path = shortestPath((user:User {userId: $userId})-[:FRIEND*..3]->(other:User))
        WHERE user <> other
        WITH other, length(path) as distance,
             size((other)-[:FRIEND]-()) as connections
        RETURN other.userId as userId, distance, connections
        ORDER BY distance, connections DESC
        LIMIT 5
      `, { userId });
      
      return result.records.map(record => ({
        userId: record.get('userId'),
        distance: parseInt(record.get('distance').toString()),
        connections: parseInt(record.get('connections').toString())
      }));
    } finally {
      await session.close();
    }
  }

  async getSocialPath(userId1, userId2) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH path = shortestPath((u1:User {userId: $userId1})-[:FRIEND*]-(u2:User {userId: $userId2}))
        WITH path, relationships(path) as rels
        RETURN [node in nodes(path) | node.userId] as userPath,
               length(path) as distance
      `, { userId1, userId2 });
      
      if (result.records.length === 0) {
        return null;
      }
      
      return {
        path: result.records[0].get('userPath'),
        distance: result.records[0].get('distance').toNumber()
      };
    } finally {
      await session.close();
    }
  }

  async getCommonFriends(userId1, userId2) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u1:User {userId: $userId1})-[:FRIEND]-(common:User)-[:FRIEND]-(u2:User {userId: $userId2})
        WHERE u1 <> u2
        RETURN common.userId as commonFriendId
      `, { userId1, userId2 });
      
      return result.records.map(record => record.get('commonFriendId'));
    } finally {
      await session.close();
    }
  }

  async syncUserToNeo4j(user) {
    const session = this.driver.session();
    let retries = 3;
    
    while (retries > 0) {
      try {
        // 确保数据是原始类型
        const sanitizedData = {
          userId: user._id.toString(),
          username: String(user.username || ''),
          interests: Array.isArray(user.interests) ? user.interests : [],
          activityScore: Number(user.posts?.length || 0)
        };

        console.log('同步用户数据到Neo4j:', sanitizedData);

        const result = await session.run(`
          MERGE (u:User {userId: $userId})
          ON CREATE SET u.username = $username,
                       u.interests = $interests,
                       u.activityScore = $activityScore,
                       u.createdAt = datetime()
          ON MATCH SET  u.username = $username,
                       u.interests = $interests,
                       u.activityScore = $activityScore,
                       u.updatedAt = datetime()
          RETURN u
        `, sanitizedData);

        return result.records[0].get('u').properties;
      } catch (error) {
        console.error(`同步用户到Neo4j失败 (剩余重试次数: ${retries - 1}):`, error);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
      } finally {
        await session.close();
      }
    }
  }

  async syncFriendshipToNeo4j(userId1, userId2, relationshipData = {}) {
    const session = this.driver.session();
    let retries = 3;
    
    while (retries > 0) {
      try {
        const sanitizedData = {
          userId1: String(userId1),
          userId2: String(userId2),
          status: String(relationshipData.status || 'regular'),
          interactionCount: Number(relationshipData.interactionCount || 0),
          lastInteraction: new Date().toISOString()
        };

        console.log('同步好友关系到Neo4j:', sanitizedData);

        // 创建双向关系
        const result = await session.run(`
          MATCH (u1:User {userId: $userId1})
          MATCH (u2:User {userId: $userId2})
          MERGE (u1)-[r1:FRIEND]->(u2)
          MERGE (u2)-[r2:FRIEND]->(u1)
          SET r1.status = $status,
              r1.interactionCount = $interactionCount,
              r1.lastInteraction = datetime($lastInteraction),
              r2.status = $status,
              r2.interactionCount = $interactionCount,
              r2.lastInteraction = datetime($lastInteraction)
          RETURN r1
        `, sanitizedData);

        return result.records[0].get('r1').properties;
      } catch (error) {
        console.error(`同步好友关系到Neo4j失败 (剩余重试次数: ${retries - 1}):`, error);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } finally {
        await session.close();
      }
    }
  }

  async getInfluentialFriends(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (user:User {userId: $userId})-[:FRIEND]-(friend:User)
        WITH friend, size((friend)-[:FRIEND]-()) as friendCount
        RETURN friend.userId as userId, friendCount
        ORDER BY friendCount DESC
        LIMIT 5
      `, { userId });
      
      return result.records.map(record => ({
        userId: record.get('userId'),
        connectionCount: record.get('friendCount').toNumber()
      }));
    } finally {
      await session.close();
    }
  }

  async getFriendshipStrength(userId1, userId2) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u1:User {userId: $userId1})-[:FRIEND]-(common:User)-[:FRIEND]-(u2:User {userId: $userId2})
        WITH count(common) as commonFriends,
             size((u1)-[:FRIEND]-()) as u1Friends,
             size((u2)-[:FRIEND]-()) as u2Friends
        RETURN commonFriends,
               u1Friends,
               u2Friends,
               toFloat(commonFriends) / sqrt(u1Friends * u2Friends) as strength
      `, { userId1, userId2 });
      
      if (result.records.length === 0) return null;
      
      const record = result.records[0];
      return {
        commonFriendsCount: record.get('commonFriends').toNumber(),
        strength: record.get('strength').toNumber()
      };
    } finally {
      await session.close();
    }
  }

  async getSocialGroups(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (user:User {userId: $userId})-[:FRIEND]-(friend:User)
        WITH friend
        MATCH (friend)-[:FRIEND]-(friendOfFriend:User)
        WHERE friendOfFriend <> user
        WITH DISTINCT friendOfFriend
        MATCH (friendOfFriend)-[:FRIEND]-(otherFriend:User)
        WHERE otherFriend <> user
        WITH friendOfFriend, collect(DISTINCT otherFriend) as group
        WHERE size(group) >= 3
        RETURN friendOfFriend.userId as centerUserId,
               [other in group | other.userId] as groupMembers,
               size(group) as groupSize
        ORDER BY groupSize DESC
        LIMIT 5
      `, { userId });
      
      return result.records.map(record => ({
        centerUserId: record.get('centerUserId'),
        members: record.get('groupMembers'),
        size: record.get('groupSize').toNumber()
      }));
    } finally {
      await session.close();
    }
  }

  async getFriendships(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[r:FRIEND]-(friend:User)
        RETURN friend.userId as friendId, r.status as status
      `, { userId });

      return result.records.map(record => ({
        friendId: record.get('friendId'),
        status: record.get('status')
      }));
    } catch (error) {
      console.error('获取好友关系失败:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getAllFriendships() {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u1:User)-[r:FRIEND]->(u2:User)
        RETURN u1.userId as user1, u2.userId as user2
      `);
      
      return result.records.map(record => ({
        user1: record.get('user1'),
        user2: record.get('user2')
      }));
    } finally {
      await session.close();
    }
  }

  // 获取共同好友详细信息
  async getCommonFriendsDetails(userId1, userId2) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u1:User {userId: $userId1})-[:FRIEND]-(common:User)-[:FRIEND]-(u2:User {userId: $userId2})
        WITH common, 
             size((common)-[:FRIEND]-()) as totalConnections,
             count(*) as sharedConnections
        RETURN 
            common.userId as userId,
            common.username as username,
            toFloat(sharedConnections) / toFloat(totalConnections) as connectionStrength
      `, { userId1, userId2 });
      
      return result.records.map(record => ({
        userId: record.get('userId'),
        username: record.get('username'),
        connectionStrength: record.get('connectionStrength')
      }));
    } finally {
      await session.close();
    }
  }

  // 获取社交圈子分析
  async getSocialCircles(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})
        OPTIONAL MATCH path = (u)-[:FRIEND*1..2]-(connected:User)
        WHERE u <> connected
        WITH DISTINCT connected,
             length(path) as distance
        WITH 
            CASE 
                WHEN distance = 1 THEN 'close'
                ELSE 'distant'
            END as circle,
            collect(DISTINCT connected.userId) as memberIds
        WHERE size(memberIds) > 0
        WITH circle, memberIds, size(memberIds) as groupSize
        RETURN circle, memberIds, groupSize
        ORDER BY 
            CASE circle
                WHEN 'close' THEN 0
                ELSE 1
            END
      `, { userId });
      
      return result.records.map(record => ({
        circle: record.get('circle'),
        members: record.get('memberIds'),
        size: parseInt(record.get('groupSize'))
      }));
    } finally {
      await session.close();
    }
  }

  // 获取社交影响力分析
  async getSocialInfluence(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})
        OPTIONAL MATCH path = (u)-[:FRIEND*1..3]-(connected:User)
        WHERE u <> connected
        WITH DISTINCT connected,
             CASE 
                WHEN connected IS NULL THEN 0
                ELSE length(path)
             END as distance
        WITH distance, count(connected) as connCount
        WHERE distance > 0
        WITH collect({
            distance: distance,
            count: connCount
        }) as distribution,
        sum(connCount) as totalReach
        RETURN {
            totalReach: CASE WHEN totalReach IS NULL THEN 0 ELSE totalReach END,
            distribution: CASE WHEN distribution IS NULL THEN [] ELSE distribution END
        } as result
      `, { userId });

      const record = result.records[0];
      if (!record) {
        return {
          totalReach: 0,
          distribution: []
        };
      }

      const resultData = record.get('result');
      return {
        totalReach: parseInt(resultData.totalReach),
        distribution: resultData.distribution.map(d => ({
          distance: parseInt(d.distance),
          count: parseInt(d.count)
        }))
      };
    } finally {
      await session.close();
    }
  }

  // 添加别名方法
  async createFriendship(userId1, userId2) {
    return this.addFriendship(userId1, userId2);
  }

  // 添加到 Neo4jService 类中
  async clearAllData() {
    const session = this.driver.session();
    try {
      console.log('开始清理Neo4j数据');
      await session.run('MATCH (n) DETACH DELETE n');
      console.log('Neo4j数据清理完成');
    } catch (error) {
      console.error('清理Neo4j数据失败:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // 2.1 智能好友推荐
  async recommendFriends(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[:FRIEND]->(friend)-[:FRIEND]->(friendOfFriend)
        WHERE NOT (u)-[:FRIEND]->(friendOfFriend)
        AND u <> friendOfFriend
        WITH friendOfFriend, count(friend) as commonFriends
        RETURN friendOfFriend.userId as recommendedUserId,
               commonFriends as commonFriendsCount
        ORDER BY commonFriends DESC
        LIMIT 10
      `, { userId });

      return result.records.map(record => ({
        userId: record.get('recommendedUserId'),
        commonFriends: parseInt(record.get('commonFriendsCount'))
      }));
    } finally {
      await session.close();
    }
  }

  // 2.2 社交路径分析
  async findConnectionPath(userId1, userId2) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH path = shortestPath(
          (u1:User {userId: $userId1})-[:FRIEND*]-(u2:User {userId: $userId2})
        )
        WITH [node in nodes(path) | node.userId] as userPath,
             length(path) as distance
        RETURN userPath, distance
      `, { userId1, userId2 });
      
      const record = result.records[0];
      return record ? {
        path: record.get('userPath'),
        distance: record.get('distance')
      } : null;
    } finally {
      await session.close();
    }
  }

  // 2.3 兴趣群组发现
  async findSocialGroups(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[:FRIEND*1..2]-(connected:User)
        WITH collect(distinct connected) as users
        CALL apoc.algo.louvain(users, 'FRIEND', {})
        YIELD communities
        RETURN communities
      `, { userId });
      
      return result.records.map(record => 
        record.get('communities').map(community => ({
          members: community.members,
          density: community.density
        }))
      );
    } finally {
      await session.close();
    }
  }

  // 2.4 用户活跃度分析
  async analyzeUserActivity(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[r:FRIEND]-(friend)
        WITH u, count(friend) as friendCount,
             size((u)-[:INTERACTS]->()) as interactions
        RETURN {
          friendCount: friendCount,
          interactionCount: interactions,
          activityScore: friendCount * 0.3 + interactions * 0.7
        } as activity
      `, { userId });
      
      return result.records[0].get('activity');
    } finally {
      await session.close();
    }
  }

  // 2.5 关系强度计算
  async calculateRelationshipStrength(userId1, userId2) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u1:User {userId: $userId1})-[r:FRIEND]-(u2:User {userId: $userId2})
        WITH u1, u2,
             size((u1)-[:FRIEND]-()-[:FRIEND]-(u2)) as commonFriends,
             size((u1)-[:INTERACTS]-(u2)) as interactions
        RETURN {
          commonFriends: commonFriends,
          interactions: interactions,
          strength: commonFriends * 0.4 + interactions * 0.6
        } as relationship
      `, { userId1, userId2 });
      
      return result.records[0].get('relationship');
    } finally {
      await session.close();
    }
  }

  async getSocialCirclesAnalysis(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[r:FRIEND]-(friend:User)
        WITH friend, count(r) as connections
        RETURN friend.userId as userId,
               friend.username as username,
               connections
        ORDER BY connections DESC
        LIMIT 10
      `, { userId });

      return result.records.map(record => ({
        userId: record.get('userId'),
        username: record.get('username'),
        connections: parseInt(record.get('connections'))
      }));
    } finally {
      await session.close();
    }
  }

  async getSocialInfluenceAnalysis(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[r:FRIEND]-(friend:User)
        WITH count(friend) as directFriends
        RETURN {
          friendCount: directFriends,
          influenceScore: directFriends * 10
        } as influence
      `, { userId });

      return result.records[0].get('influence');
    } finally {
      await session.close();
    }
  }
}

module.exports = Neo4jService;