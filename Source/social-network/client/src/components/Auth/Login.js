import React, { useState } from 'react';
import { Form, message, Card } from 'antd';
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
  Divider
} from '../../styles/authStyles';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        try {
            setLoading(true);
            const res = await axios.post('http://localhost:5000/api/users/login', values);
            
            console.log('登录响应:', res.data);
            
            if (!res.data.token || !res.data.user) {
                throw new Error('登录返回数据不完整');
            }

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            message.success('登录成功！');
            
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 100);

        } catch (error) {
            console.error('登录错误:', error);
            message.error(error.response?.data?.message || '登录失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContainer>
            <Card title="社交网络" style={{
                width: '100%',
                maxWidth: '350px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
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
                    
                    <Divider>
                        <span>或者</span>
                    </Divider>
                    
                    <AuthLink>
                        还没有账号？<Link to="/register">立即注册</Link>
                    </AuthLink>
                </StyledForm>
            </Card>
        </AuthContainer>
    );
};

export default Login; 