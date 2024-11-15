// 创建新文件 src/utils/axios.js
import axios from 'axios';

// 配置 axios 默认值
axios.defaults.baseURL = 'http://localhost:5000/api';

// 添加请求拦截器
axios.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        const sessionId = sessionStorage.getItem('sessionId');
        
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        if (sessionId) {
            config.headers['Session-ID'] = sessionId;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            sessionStorage.clear();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axios;