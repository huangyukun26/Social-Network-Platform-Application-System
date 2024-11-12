const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testAuth() {
    try {
        // 直接测试登录
        console.log('\n测试登录...');
        const loginRes = await axios.post(`${API_URL}/users/login`, {
            email: 'test@example.com',
            password: '123456'
        });
        console.log('登录成功:', loginRes.data);
        return loginRes.data.token; // 返回token供后续测试使用
    } catch (error) {
        console.error('测试失败:', error.response?.data || error.message);
    }
}

async function testPosts(token) {
    try {
        if (!token) {
            console.log('未获取到token，跳过帖子测试');
            return;
        }
        
        // 测试发帖
        console.log('\n测试发帖...');
        const postRes = await axios.post(
            `${API_URL}/posts`,
            {
                content: '这是一条测试动态',
                images: ['image1.jpg']
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('发帖成功:', postRes.data);
        
        // 测试获取帖子列表
        console.log('\n获取帖子列表...');
        const postsRes = await axios.get(
            `${API_URL}/posts`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('帖子列表:', postsRes.data);
    } catch (error) {
        console.error('测试失败:', error.response?.data || error.message);
    }
}

// 运行所有测试
async function runTests() {
    const token = await testAuth();
    await testPosts(token);
}

runTests(); 