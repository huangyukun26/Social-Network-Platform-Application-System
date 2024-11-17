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
    return this.withRetry(() => this.executeQuery(`
      MATCH (u1:User {userId: $userId1})
      MATCH (u2:User {userId: $userId2})
      MERGE (u1)-[r:FRIEND]->(u2)
      MERGE (u2)-[r2:FRIEND]->(u1)
      RETURN r, r2
    `, { userId1, userId2 }));
  }

  async removeFriendship(userId1, userId2) {
    return this.withRetry(() => this.executeQuery(`
      MATCH (u1:User {userId: $userId1})-[r:FRIEND]-(u2:User {userId: $userId2})
      DELETE r
    `, { userId1, userId2 }));
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
                username: user.username || '',
                interests: Array.isArray(user.interests) ? user.interests : [],
                activityScore: user.activityMetrics?.interactionFrequency || 0
            };

            await session.run(`
                MERGE (u:User {userId: $userId})
                SET u.username = $username,
                    u.interests = $interests,
                    u.activityScore = $activityScore,
                    u.lastUpdated = datetime()
                RETURN u
            `, sanitizedData);

            break; // 成功后跳出重试循环
        } catch (error) {
            console.error('同步用户到Neo4j失败 (剩余重试次数:', retries - 1, '):', error);
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

  // 获社交影响力分析
  async analyzeSocialInfluence(userId) {
    const session = this.driver.session();
    try {
      console.log('开始分析社交影响力，用户ID:', userId);
      const result = await session.run(`
        MATCH (u:User {userId: $userId})
        OPTIONAL MATCH (u)-[:FRIEND]->(direct:User)
        OPTIONAL MATCH (u)-[:FRIEND]->()-[:FRIEND]->(secondary:User)
        WHERE NOT (u)-[:FRIEND]->(secondary) AND u <> secondary
        OPTIONAL MATCH (u)-[:FRIEND]->()-[:FRIEND]->()-[:FRIEND]->(tertiary:User)
        WHERE NOT (u)-[:FRIEND]->(tertiary) 
        AND NOT (u)-[:FRIEND]->()-[:FRIEND]->(tertiary)
        AND u <> tertiary
        WITH u,
            collect(DISTINCT direct) as directFriends,
            count(DISTINCT direct) as directCount,
            count(DISTINCT secondary) as secondaryCount,
            count(DISTINCT tertiary) as tertiaryCount
        RETURN {
            distribution: [
                {level: 1, count: directCount},
                {level: 2, count: secondaryCount},
                {level: 3, count: tertiaryCount}
            ],
            totalReach: directCount + secondaryCount + tertiaryCount,
            influenceScore: (directCount * 0.5 + 
                           secondaryCount * 0.3 + 
                           tertiaryCount * 0.2) / 
                           CASE WHEN directCount > 0 THEN directCount 
                                ELSE 1 END
        } as influence
      `, { userId: String(userId) });

      const influence = result.records[0]?.get('influence');
      console.log('社交影响力分析结果:', influence);
      return influence;
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

  // 修改智能好友推荐方法
  async recommendFriends(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[:FRIEND]->(friend)-[:FRIEND]->(friendOfFriend)
        WHERE NOT (u)-[:FRIEND]-(friendOfFriend)
        AND u <> friendOfFriend
        AND NOT exists((u)-[:FRIEND_REQUEST]-(friendOfFriend))
        WITH DISTINCT friendOfFriend, 
                     count(DISTINCT friend) as commonFriends,
                     collect(DISTINCT friend.userId) as commonFriendIds
        ORDER BY commonFriends DESC
        LIMIT toInteger($limit)
        RETURN {
            userId: friendOfFriend.userId,
            username: friendOfFriend.username,
            avatar: friendOfFriend.avatar,
            commonFriendsCount: commonFriends,
            commonFriendIds: commonFriendIds
        } as recommendation
      `, { 
        userId: String(userId),
        limit: 10
      });

      return result.records.map(record => record.get('recommendation'));
    } finally {
      await session.close();
    }
  }

  // 2.2 社交路径分析
  async findSocialPath(userId1, userId2, options = { maxDepth: 4 }) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH path = shortestPath((u1:User {userId: $userId1})-[:FRIEND*..${options.maxDepth}]-(u2:User {userId: $userId2}))
        WITH path,
             [node in nodes(path) | {
               userId: node.userId,
               username: node.username,
               activityScore: node.activityScore
             }] as pathNodes,
             length(path) as pathLength
        RETURN {
          nodes: pathNodes,
          length: pathLength,
          strength: reduce(s = 0.0, r in relationships(path) | s + r.interactionCount) / pathLength
        } as pathInfo
      `, { userId1, userId2 });

      return result.records[0]?.get('pathInfo');
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

  // 1. 添加互动分析
  async analyzeInteractions(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[r:FRIEND]-(friend:User)
        WITH friend, 
             count(r) as interactions,
             collect(r.lastInteraction) as interactionDates
        RETURN {
          friendId: friend.userId,
          username: friend.username,
          interactionCount: interactions,
          lastInteraction: max(interactionDates),
          interactionFrequency: interactions / duration.between(min(interactionDates), max(interactionDates)).days
        } as interactionAnalysis
        ORDER BY interactions DESC
        LIMIT 10
      `, { userId });

      return result.records.map(record => record.get('interactionAnalysis'));
    } finally {
      await session.close();
    }
  }

  // 2. 添加社交圈重叠度分析
  async analyzeSocialCircleOverlap(userId1, userId2) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u1:User {userId: $userId1})-[:FRIEND]-(common:User)-[:FRIEND]-(u2:User {userId: $userId2})
        WITH count(common) as commonFriends
        MATCH (u1:User {userId: $userId1})-[:FRIEND]-(f1:User)
        WITH commonFriends, count(f1) as friends1
        MATCH (u2:User {userId: $userId2})-[:FRIEND]-(f2:User)
        WITH commonFriends, friends1, count(f2) as friends2
        RETURN {
          commonFriends: commonFriends,
          overlapRatio: toFloat(commonFriends) / toFloat(friends1 + friends2 - commonFriends),
          totalConnections: friends1 + friends2
        } as overlap
      `, { userId1, userId2 });

      return result.records[0].get('overlap');
    } finally {
      await session.close();
    }
  }

  // 3. 添加社交趋势分析
  async analyzeSocialTrends(userId, period = 30) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[r:FRIEND]-(friend:User)
        WHERE datetime(r.lastInteraction) > datetime() - duration({days: $period})
        WITH u, 
             count(friend) as newConnections,
             collect(friend) as recentFriends
        RETURN {
          newConnectionsCount: newConnections,
          activeConnectionsRatio: toFloat(newConnections) / toFloat(size((u)-[:FRIEND]-())),
          growthRate: toFloat(newConnections) / $period
        } as trends
      `, { userId, period });

      return result.records[0].get('trends');
    } finally {
      await session.close();
    }
  }

  // 查询二度好友关系
  async getFriendsOfFriends(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (user:User {userId: $userId})-[:FRIEND]->(friend:User)-[:FRIEND]->(fof:User)
        WHERE fof.userId <> $userId
        AND NOT (user)-[:FRIEND]->(fof)
        WITH fof, count(DISTINCT friend) as commonFriends
        RETURN {
          userId: fof.userId,
          username: fof.username,
          commonFriendsCount: commonFriends
        } as recommendation
        ORDER BY commonFriends DESC
        LIMIT 10
      `, { userId });

      return result.records.map(record => record.get('recommendation'));
    } finally {
      await session.close();
    }
  }

  // 计算社交路径
  async findShortestPath(userId1, userId2) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH path = shortestPath((u1:User {userId: $userId1})-[:FRIEND*]-(u2:User {userId: $userId2}))
        UNWIND nodes(path) as user
        RETURN collect({
          userId: user.userId,
          username: user.username
        }) as pathNodes
      `, { userId1, userId2 });

      return result.records[0]?.get('pathNodes') || [];
    } finally {
      await session.close();
    }
  }

  // 计算用户影响力分数
  async calculateInfluenceScore(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[:FRIEND]-(friend:User)
        WITH u, count(friend) as directFriends
        MATCH (u)-[:FRIEND]-()-[:FRIEND]-(fof:User)
        WHERE NOT (u)-[:FRIEND]-(fof) AND u <> fof
        WITH u, directFriends, count(DISTINCT fof) as indirectFriends
        RETURN {
          directFriends: directFriends,
          indirectFriends: indirectFriends,
          influenceScore: directFriends * 0.6 + indirectFriends * 0.4
        } as influence
      `, { userId });

      return result.records[0]?.get('influence');
    } finally {
      await session.close();
    }
  }

  // 1. 好友分组管理
  async createFriendGroup(userId, groupName) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})
        MERGE (g:FriendGroup {name: $groupName, ownerId: $userId})
        MERGE (u)-[r:OWNS]->(g)
        RETURN g
      `, { userId, groupName });
      return result.records[0]?.get('g').properties;
    } finally {
      await session.close();
    }
  }

  async addFriendToGroup(userId, friendId, groupName) {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (g:FriendGroup {name: $groupName, ownerId: $userId})
        MATCH (f:User {userId: $friendId})
        MERGE (g)-[r:CONTAINS]->(f)
        SET r.addedAt = datetime()
      `, { userId, friendId, groupName });
    } finally {
      await session.close();
    }
  }

  async getFriendGroups(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[:OWNS]->(g:FriendGroup)
        OPTIONAL MATCH (g)-[:CONTAINS]->(f:User)
        WITH g, collect(f) as members
        RETURN {
          name: g.name,
          memberCount: size(members),
          members: [m in members | {
            userId: m.userId,
            username: m.username
          }]
        } as groupInfo
      `, { userId });
      return result.records.map(record => record.get('groupInfo'));
    } finally {
      await session.close();
    }
  }

  // 1. 更新用户在线状态
  async updateUserOnlineStatus(userId, isOnline) {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (u:User {userId: $userId})
        SET u.isOnline = $isOnline,
            u.lastActiveAt = datetime()
        RETURN u
      `, { 
        userId,
        isOnline
      });
    } finally {
      await session.close();
    }
  }

  // 2. 记录好友互动历史
  async recordFriendInteraction(userId1, userId2, interactionType) {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (u1:User {userId: $userId1})-[r:FRIEND]-(u2:User {userId: $userId2})
        SET r.interactionCount = coalesce(r.interactionCount, 0) + 1,
            r.lastInteraction = datetime()
        CREATE (u1)-[i:INTERACTS {
          type: $interactionType,
          timestamp: datetime()
        }]->(u2)
        RETURN i
      `, {
        userId1,
        userId2,
        interactionType
      });
    } finally {
      await session.close();
    }
  }

  // 3. 获取好友互动历史
  async getFriendInteractionHistory(userId1, userId2, limit = 10) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u1:User {userId: $userId1})-[i:INTERACTS]->(u2:User {userId: $userId2})
        RETURN {
          type: i.type,
          timestamp: datetime(i.timestamp)
        } as interaction
        ORDER BY i.timestamp DESC
        LIMIT toInteger($limit)
      `, {
        userId1,
        userId2,
        limit: parseInt(limit)
      });

      return result.records.map(record => record.get('interaction'));
    } finally {
      await session.close();
    }
  }

  // 4. 获取好友活跃状态
  async getFriendsOnlineStatus(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[:FRIEND]-(friend:User)
        RETURN {
          userId: friend.userId,
          username: friend.username,
          isOnline: friend.isOnline,
          lastActiveAt: datetime(friend.lastActiveAt)
        } as friendStatus
        ORDER BY friend.lastActiveAt DESC
      `, { userId });

      return result.records.map(record => record.get('friendStatus'));
    } finally {
      await session.close();
    }
  }

  // 5. 获取最近互动的好友
  async getRecentlyInteractedFriends(userId, limit = 5) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})-[r:FRIEND]-(friend:User)
        WHERE exists(r.lastInteraction)
        RETURN {
          userId: friend.userId,
          username: friend.username,
          lastInteraction: datetime(r.lastInteraction),
          interactionCount: r.interactionCount
        } as friendInteraction
        ORDER BY r.lastInteraction DESC
        LIMIT $limit
      `, {
        userId,
        limit: parseInt(limit)
      });

      return result.records.map(record => record.get('friendInteraction'));
    } finally {
      await session.close();
    }
  }

  // 添加获取用户在线状态的方法
  async getUserOnlineStatus(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {userId: $userId})
        RETURN u.isOnline as isOnline
      `, { userId });
      
      return result.records[0]?.get('isOnline') || false;
    } finally {
      await session.close();
    }
  }

  // 优化 session 管理，添加通用的事务处理方法
  async executeQuery(cypher, params = {}) {
    const session = this.driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records;
    } finally {
      await session.close();
    }
  }

  // 优化错误处理和重试逻辑
  async withRetry(operation, maxRetries = 3) {
    let retries = maxRetries;
    while (retries > 0) {
      try {
        return await operation();
      } catch (error) {
        console.error(`操作失败 (剩余重试次数: ${retries - 1}):`, error);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // 添加事务支持
  async executeTransaction(operations) {
    const session = this.driver.session();
    const tx = session.beginTransaction();
    try {
      const results = await Promise.all(operations.map(op => tx.run(op.cypher, op.params)));
      await tx.commit();
      return results;
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      await session.close();
    }
  }
}

module.exports = Neo4jService;