import React, { useState } from 'react';
import { Form, message, Card } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
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

const Register = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        try {
            setLoading(true);
            const res = await axios.post('http://localhost:5000/api/users/register', values);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            message.success('注册成功！');
            navigate('/');
        } catch (error) {
            message.error(error.response?.data?.message || '注册失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContainer>
            <Card title="创建账号" style={{
                width: '100%',
                maxWidth: '350px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
                <StyledForm onFinish={onFinish}>
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <StyledInput prefix={<UserOutlined />} placeholder="用户名" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: '请输入邮箱' },
                            { type: 'email', message: '请输入有效的邮箱地址' }
                        ]}
                    >
                        <StyledInput prefix={<MailOutlined />} placeholder="邮箱" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: '请输入密码' },
                            { min: 6, message: '密码至少6个字符' }
                        ]}
                    >
                        <StyledPassword prefix={<LockOutlined />} placeholder="密码" />
                    </Form.Item>
                    <Form.Item>
                        <StyledButton type="primary" htmlType="submit" block loading={loading}>
                            注册
                        </StyledButton>
                    </Form.Item>
                    
                    <Divider>
                        <span>或者</span>
                    </Divider>
                    
                    <AuthLink>
                        已有账号？<Link to="/login">立即登录</Link>
                    </AuthLink>
                </StyledForm>
            </Card>
        </AuthContainer>
    );
};

export default Register; 