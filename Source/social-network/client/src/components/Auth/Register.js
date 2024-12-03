import React, { useState } from 'react';
import { Form, message, Input, Button } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';

// 复用相同的样式组件
const PageContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: #fff;
`;

const LeftPanel = styled.div`
  flex: 1;
  background: #00a884;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, #00a884, #00cf9d);
    opacity: 0.8;
    animation: gradientMove 10s ease infinite;
  }

  @keyframes gradientMove {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;

const NetworkBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.1;
  background-image: radial-gradient(circle at 2px 2px, #fff 1px, transparent 0);
  background-size: 40px 40px;
  animation: moveBackground 60s linear infinite;

  @keyframes moveBackground {
    0% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(-50%);
    }
  }
`;

const BrandLogo = styled.div`
  font-size: 48px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 24px;
  z-index: 1;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
`;

const WelcomeText = styled.h1`
  font-size: 48px;
  color: #fff;
  z-index: 1;
  text-align: center;
  line-height: 1.4;
  margin-top: 24px;
  font-weight: 300;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
`;

const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #fff;
`;

const FormContainer = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Logo = styled.div`
  font-size: 40px;
  font-weight: bold;
  color: #00a884;
  margin-bottom: 48px;
`;

const StyledForm = styled(Form)`
  width: 100%;
`;

const FormTitle = styled.h2`
  font-size: 32px;
  margin-bottom: 32px;
  color: #1a1a1a;
`;

const InputWrapper = styled.div`
  margin-bottom: 24px;
  width: 100%;
  padding: 2px;
  
  .ant-input, .ant-input-password {
    height: 50px;
    border-radius: 25px;
    border: 2px solid #e6e6e6;
    padding: 0 24px;
    font-size: 16px;
    background: #f8f9fa;
    transition: all 0.3s ease;
    
    &:focus, &:hover {
      border-color: #00a884;
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.1);
      background: #fff;
    }
  }

  .ant-input-affix-wrapper {
    padding: 0 11px 0 24px;
    border-radius: 25px;
    border: 2px solid #e6e6e6;
    background: #f8f9fa;
    transition: all 0.3s ease;

    &:focus, &:hover, &-focused {
      border-color: #00a884;
      box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.1);
      background: #fff;
    }

    // 修复密码框的高度
    .ant-input {
      height: 46px;
      border: none;
      background: transparent;
      box-shadow: none;
      padding: 0;

      &:focus {
        box-shadow: none;
      }
    }

    .ant-input-prefix {
      margin-right: 12px;
      color: #00a884;
    }

    .ant-input-suffix {
      margin-left: 12px;
      color: #00a884;
    }
  }

  .ant-form-item {
    margin-bottom: 0;
  }
`;

const RegisterButton = styled(Button)`
  width: 100%;
  height: 50px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: bold;
  background: #00a884;
  border: none;
  margin-top: 12px;
  color: white;
  
  &:hover, &:focus {
    background: #008f6c;
    color: white;
  }
`;

const SignInText = styled.div`
  margin-top: 24px;
  text-align: center;
  font-size: 16px;
  width: 100%;
  max-width: 400px;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  
  a {
    color: #00a884;
    font-weight: bold;
    margin-left: 8px;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Register = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        try {
            setLoading(true);
            console.log('发送注册请求:', values);
            
            const res = await axios.post('http://localhost:5000/api/users/register', values);
            
            console.log('注册响应:', res.data);
            
            if (!res.data.token || !res.data.sessionId || !res.data.user) {
                throw new Error('注册返回数据不完整');
            }

            sessionStorage.setItem('token', res.data.token);
            sessionStorage.setItem('sessionId', res.data.sessionId);
            sessionStorage.setItem('user', JSON.stringify(res.data.user));
            sessionStorage.setItem('tokenExpiry', new Date().getTime() + (24 * 60 * 60 * 1000));

            message.success('注册成功！');
            await navigate('/');
            window.location.reload();

        } catch (error) {
            console.error('注册错误:', error);
            if (error.response?.data?.message) {
                message.error(error.response.data.message);
            } else if (error.message) {
                message.error(error.message);
            } else {
                message.error('注册失败，请稍后重试');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <LeftPanel>
                <NetworkBackground />
                <BrandLogo>GREEN NET</BrandLogo>
                <WelcomeText>Join the Future</WelcomeText>
            </LeftPanel>
            <RightPanel>
                <FormContainer>
                    <Logo>GREEN NET</Logo>
                    <FormTitle>创建新账号</FormTitle>
                    <StyledForm onFinish={onFinish} style={{ width: '100%' }}>
                        <InputWrapper>
                            <Form.Item
                                name="username"
                                rules={[{ required: true, message: '请输入用户名' }]}
                            >
                                <Input 
                                    prefix={<UserOutlined />} 
                                    placeholder="用户名" 
                                />
                            </Form.Item>
                        </InputWrapper>

                        <InputWrapper>
                            <Form.Item
                                name="email"
                                rules={[
                                    { required: true, message: '请输入邮箱' },
                                    { type: 'email', message: '请输入有效的邮箱地址' }
                                ]}
                            >
                                <Input 
                                    prefix={<MailOutlined />} 
                                    placeholder="邮箱" 
                                />
                            </Form.Item>
                        </InputWrapper>

                        <InputWrapper>
                            <Form.Item
                                name="password"
                                rules={[
                                    { required: true, message: '请输入密码' },
                                    { min: 6, message: '密码至少8个字符包含大小写及数字' }
                                ]}
                            >
                                <Input.Password 
                                    prefix={<LockOutlined />} 
                                    placeholder="密码" 
                                />
                            </Form.Item>
                        </InputWrapper>

                        <InputWrapper>
                            <Form.Item
                                name="confirmPassword"
                                dependencies={['password']}
                                rules={[
                                    { required: true, message: '请确认密码' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('password') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('两次输入的密码不一致'));
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password 
                                    prefix={<LockOutlined />} 
                                    placeholder="确认密码"
                                />
                            </Form.Item>
                        </InputWrapper>

                        <Form.Item>
                            <RegisterButton type="primary" htmlType="submit" loading={loading}>
                                注册
                            </RegisterButton>
                        </Form.Item>
                    </StyledForm>

                    <SignInText>
                        已有账号？
                        <Link to="/login">立即登录</Link>
                    </SignInText>
                </FormContainer>
            </RightPanel>
        </PageContainer>
    );
};

export default Register; 