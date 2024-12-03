import React, { useState } from 'react';
import { Form, message, Modal, Button, Input } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../utils/axios';
import styled from 'styled-components';

// 新的样式组件
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
  font-size: 64px;
  color: #fff;
  z-index: 1;
  text-align: center;
  line-height: 1.2;
  margin-bottom: 20px;
  font-weight: 600;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.8s ease forwards;

  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
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

const LoginButton = styled(Button)`
  width: 100%;
  height: 50px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: bold;
  background: #00a884;
  border: none;
  margin-top: 12px;
  
  &:hover, &:focus {
    background: #008f6c;
  }
`;

const SignUpText = styled.div`
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

// 添加 StyledForm 定义
const StyledForm = styled(Form)`
  width: 100%;
`;

// 添加打字机效果组件
const TypewriterText = styled.div`
  font-size: 24px;
  color: rgba(255, 255, 255, 0.9);
  z-index: 1;
  margin-top: 24px;
  font-weight: 300;
  text-align: center;
  min-height: 60px;
  
  .typing {
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
    border-right: 2px solid #fff;
    animation: typing 3.5s steps(40, end),
               blink-caret 0.75s step-end infinite;
    margin: 0 auto;
  }

  @keyframes typing {
    from { width: 0 }
    to { width: 100% }
  }

  @keyframes blink-caret {
    from, to { border-color: transparent }
    50% { border-color: #fff }
  }
`;

// 添加环形动画背景
const CircleBackground = styled.div`
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background: radial-gradient(circle at center, transparent 30%, rgba(255,255,255,0.1) 70%);
  transform: rotate(0deg);
  animation: rotate 60s linear infinite;
  z-index: 0;

  @keyframes rotate {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Login = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [debugInfo, setDebugInfo] = useState({
        requestData: null,
        responseData: null,
        error: null
    });
    const [errorModal, setErrorModal] = useState({
        visible: false,
        title: '',
        content: {}
    });

    // 保持原有的 onFinish 处理函数不变
    const onFinish = async (values) => {
        const deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            windowId: window.name || Math.random().toString(36).substr(2, 9)
        };

        try {
            setLoading(true);
            
            const requestData = {
                ...values,
                deviceInfo,
                debug: true
            };

            console.log('发送登录请求:', {
                url: '/users/login',
                data: {
                    ...requestData,
                    password: '******'
                }
            });

            const res = await axios.post('/users/login', requestData);

            console.log('登录响应:', {
                status: res.status,
                headers: res.headers,
                data: {
                    ...res.data,
                    token: res.data.token ? '******' : null
                }
            });

            if (!res.data.token || !res.data.sessionId || !res.data.user) {
                throw new Error('登录返回数据不完整');
            }

            sessionStorage.setItem('token', res.data.token);
            sessionStorage.setItem('sessionId', res.data.sessionId);
            sessionStorage.setItem('user', JSON.stringify(res.data.user));
            sessionStorage.setItem('tokenExpiry', new Date().getTime() + (24 * 60 * 60 * 1000));

            message.success('登录成功！');

            const role = res.data.user.role;
            if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }

        } catch (error) {
            const errorInfo = {
                status: error.response?.status,
                message: error.response?.data?.message,
                data: error.response?.data,
                timestamp: new Date().toLocaleString(),
                requestData: {
                    email: values.email,
                    deviceInfo
                },
                headers: error.response?.headers,
                debug: {
                    errorName: error.name,
                    errorMessage: error.message,
                    errorStack: error.stack,
                    requestUrl: '/users/login',
                    requestMethod: 'POST',
                    requestHeaders: error.config?.headers,
                    responseType: error.response?.headers?.['content-type']
                }
            };

            const modalContent = {
                请求数据: {
                    邮箱: values.email,
                    设备信息: deviceInfo
                },
                错误信息: {
                    状态码: error.response?.status,
                    错误描述: error.response?.data?.message,
                    详细数据: error.response?.data,
                    请求头: error.response?.headers,
                    错误类型: error.name,
                    错误堆栈: error.stack,
                    请求URL: '/users/login',
                    请求方法: 'POST',
                    响应类型: error.response?.headers?.['content-type']
                },
                时间戳: new Date().toLocaleString()
            };

            localStorage.setItem('loginError', JSON.stringify({ error: errorInfo }));
            localStorage.setItem('loginErrorModal', JSON.stringify({
                visible: true,
                title: '登录失败详情（调试模式）',
                content: modalContent
            }));

            setDebugInfo(prev => ({ ...prev, error: errorInfo }));
            setErrorModal({
                visible: true,
                title: '登录失败详情（调试模式）',
                content: modalContent
            });
            
            let errorMessage = '登录失败';
            switch (error.response?.status) {
                case 401:
                    errorMessage = '邮箱或密码错误，请检查后重试';
                    break;
                case 404:
                    errorMessage = '用户不存在，请先注册';
                    break;
                case 429:
                    errorMessage = '登录尝试次数过多，请稍后再试';
                    break;
                default:
                    errorMessage = `登录失败: ${error.response?.data?.message || '未知错误'}`;
            }

            message.error({
                content: (
                    <div>
                        <div>{errorMessage}</div>
                        <div style={{ fontSize: '12px', marginTop: '8px' }}>
                            错误代码: {error.response?.status}
                        </div>
                    </div>
                ),
                duration: 0,
                key: 'login-error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <LeftPanel>
                <NetworkBackground />
                <CircleBackground />
                <BrandLogo>GREEN NET</BrandLogo>
                <WelcomeText>Connect & Thrive</WelcomeText>
                <TypewriterText>
                    <div className="typing">
                        Where sustainability meets social networking
                    </div>
                </TypewriterText>
            </LeftPanel>
            <RightPanel>
                <FormContainer>
                    <Logo>GREEN NET</Logo>
                    <FormTitle>登录你的账号</FormTitle>
                    <StyledForm onFinish={onFinish} style={{ width: '100%' }}>
                        <InputWrapper>
                            <Form.Item
                                name="email"
                                rules={[
                                    { required: true, message: '请输入邮箱' },
                                    { type: 'email', message: '请输入有效的邮箱地址' }
                                ]}
                            >
                                <Input 
                                    prefix={<UserOutlined />} 
                                    placeholder="邮箱" 
                                />
                            </Form.Item>
                        </InputWrapper>

                        <InputWrapper>
                            <Form.Item
                                name="password"
                                rules={[{ required: true, message: '请输入密码' }]}
                            >
                                <Input.Password 
                                    prefix={<LockOutlined />} 
                                    placeholder="密码"
                                />
                            </Form.Item>
                        </InputWrapper>

                        <Form.Item>
                            <LoginButton type="primary" htmlType="submit" loading={loading}>
                                登录
                            </LoginButton>
                        </Form.Item>
                    </StyledForm>
                    
                    <SignUpText>
                        还没有账号？
                        <Link to="/register">立即注册</Link>
                    </SignUpText>
                </FormContainer>

                <Modal
                    title="登录失败详情"
                    open={errorModal.visible}
                    onOk={() => setErrorModal({ ...errorModal, visible: false })}
                    onCancel={() => setErrorModal({ ...errorModal, visible: false })}
                >
                    <pre>{JSON.stringify(errorModal.content, null, 2)}</pre>
                </Modal>
            </RightPanel>
        </PageContainer>
    );
};

export default Login; 