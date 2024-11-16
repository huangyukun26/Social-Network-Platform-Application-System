module.exports = {
    testUsers: [
        {
            username: 'testuser1',
            email: 'test1@example.com',
            password: 'password123'
        },
        {
            username: 'testuser2',
            email: 'test2@example.com',
            password: 'password123'
        },
        {
            username: 'testuser3',
            email: 'test3@example.com',
            password: 'password123'
        }
    ],
    
    friendships: [
        [0, 1], // testuser1 与 testuser2 是好友
        [1, 2]  // testuser2 与 testuser3 是好友
    ]
};