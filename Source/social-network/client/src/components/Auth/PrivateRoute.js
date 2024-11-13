import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    
    // 检查token是否过期
    if (token && tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
        return children;
    }
    
    // 清除过期token
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('user');
    
    return <Navigate to="/login" />;
};

export default PrivateRoute; 