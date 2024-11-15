import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    const sessionId = localStorage.getItem('sessionId');
    
    // 检查token和会话是否有效
    if (token && tokenExpiry && sessionId && new Date().getTime() < parseInt(tokenExpiry)) {
        return children;
    }
    
    // 清除所有登录信息
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    
    return <Navigate to="/login" />;
};

export default PrivateRoute; 