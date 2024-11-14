import React, { useState } from 'react';
import { Form, message, Card, Divider, Button } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    AuthContainer,
    StyledForm,
    StyledInput,
    StyledPassword,
    StyledButton,
    AuthLink,
    LogoContainer,
    AuthCard,
    AppStoreButtons,
    AppStoreButton,
    GetAppText,
    ButtonContent,
    ButtonOverlay
} from '../../styles/authStyles';
import logoImage from '../../assert/LOGO.png';  
import XIAZAIImage from '../../assert/xiazai.png';

// 新增 Logo 组件
const Logo = () => (
    <LogoContainer>
        <img 
            src={logoImage} 
            alt="Logo" 
            style={{ 
                height: '150px', 
                width: 'auto',  
                margin: '20px 0'
            }} 
        />
    </LogoContainer>
);

// 新增下载按钮组件
const DownloadButton = ({ image, storeName }) => (
    <AppStoreButton>
        <ButtonContent>
            <img 
                src={image}
                alt={storeName} 
                style={{ 
                    height: '35px',
                    width: 'auto',
                    objectFit: 'contain',
                    filter: 'brightness(1.1) contrast(1.1)',
                    transition: 'transform 0.2s ease'
                }} 
            />
            <ButtonOverlay />
        </ButtonContent>
    </AppStoreButton>
);

const Login = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        try {
            setLoading(true);
            console.log('开始登录请求，参数:', values);
            
            const res = await axios.post('http://localhost:5000/api/users/login', values);
            
            // 详细打印登录响应
            console.log('登录响应完整数据:', {
                status: res.status,
                data: res.data,
                user: res.data.user,
                token: res.data.token ? '存在' : '不存在',
                role: res.data.user?.role
            });
            
            if (!res.data.token || !res.data.user) {
                console.error('登录数据不完整:', res.data);
                throw new Error('登录返回数据不完整');
            }

            // 保存前打印用户信息
            console.log('即将保存到 localStorage 的用户信息:', {
                token: '存在',
                user: res.data.user,
                role: res.data.user.role
            });

            const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('tokenExpiry', expiryTime.toString());
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            // 验证保存是否成功
            const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('保存后的用户信息:', {
                savedUser,
                role: savedUser.role,
                isAdmin: savedUser.role === 'admin'
            });
            
            message.success('登录成功！');
            
            // 添加延时确保数据保存完成
            setTimeout(() => {
                if (res.data.user.role === 'admin') {
                    console.log('是管理员，准备跳转到 /admin');
                    navigate('/admin', { replace: true });
                } else {
                    console.log('是普通用户，准备跳转到 /');
                    navigate('/', { replace: true });
                }
            }, 100);

        } catch (error) {
            console.error('登录错误:', error);
            console.error('错误详情:', {
                response: error.response?.data,
                status: error.response?.status,
                message: error.message
            });
            message.error(error.response?.data?.message || '登录失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContainer>
            <div style={{ maxWidth: '350px', width: '100%' }}>
                <AuthCard>
                    <Logo />
                    <StyledForm onFinish={onFinish}>
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: '请输入邮箱' },
                                { type: 'email', message: '请输入有效的邮箱地址' }
                            ]}
                        >
                            <StyledInput 
                                prefix={<UserOutlined />} 
                                placeholder="邮箱" 
                            />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: '请输入密码' }]}
                        >
                            <StyledPassword 
                                prefix={<LockOutlined />} 
                                placeholder="密码"
                            />
                        </Form.Item>
                        <Form.Item>
                            <StyledButton type="primary" htmlType="submit" loading={loading} block>
                                登录
                            </StyledButton>
                        </Form.Item>
                        
                        <Divider>或</Divider>
                        
                        <AuthLink>
                            <Link to="/forgot-password">忘记密码?</Link>
                        </AuthLink>
                    </StyledForm>
                </AuthCard>

                <AuthCard style={{ marginTop: '10px' }}>
                    <AuthLink>
                        还没有账号？<Link to="/register">立即注册</Link>
                    </AuthLink>
                </AuthCard>

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <GetAppText>获取应用</GetAppText>
                    <AppStoreButtons>
                        <DownloadButton 
                            image={XIAZAIImage} 
                            storeName="App Store"
                        />
                        <DownloadButton 
                            image={XIAZAIImage} 
                            storeName="Google Play"
                        />
                    </AppStoreButtons>
                </div>
            </div>
        </AuthContainer>
    );
};

export default Login; 