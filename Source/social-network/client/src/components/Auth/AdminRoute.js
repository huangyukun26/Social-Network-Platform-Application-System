import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
    const token = sessionStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tokenExpiry = sessionStorage.getItem('tokenExpiry');
    
    console.log('AdminRoute 检查:', {
        hasToken: !!token,
        user,
        tokenExpiry,
        isValid: new Date().getTime() < parseInt(tokenExpiry),
        isAdmin: user.role === 'admin'
    });
    
    if (token && 
        tokenExpiry && 
        new Date().getTime() < parseInt(tokenExpiry) && 
        user.role === 'admin') {
        console.log('AdminRoute: 验证通过，显示管理面板');
        return children;
    }
    
    console.log('AdminRoute: 验证失败，重定向到登录页');
    return <Navigate to="/login" />;
};

export default AdminRoute;