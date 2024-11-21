import React, { useState } from 'react';
import { Form, message, Card, Divider, Button, Modal } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../utils/axios';
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
    
    // 从 localStorage 初始化错误信息
    const [debugInfo, setDebugInfo] = useState(() => {
        const savedError = localStorage.getItem('loginError');
        return savedError ? JSON.parse(savedError) : {
            requestData: null,
            responseData: null,
            error: null
        };
    });

    // 添加错误模态框状态
    const [errorModal, setErrorModal] = useState(() => {
        const savedModal = localStorage.getItem('loginErrorModal');
        return savedModal ? JSON.parse(savedModal) : {
            visible: false,
            title: '',
            content: {}
        };
    });

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

    // 添加清除错误信息的函数
    const clearError = () => {
        localStorage.removeItem('loginError');
        localStorage.removeItem('loginErrorModal');
        setDebugInfo({ requestData: null, responseData: null, error: null });
        setErrorModal({ visible: false, title: '', content: {} });
    };

    return (
        <AuthContainer>
            <div style={{ maxWidth: '350px', width: '100%' }}>
                {/* 错误信息固定展示区 */}
                {debugInfo.error && (
                    <Card 
                        size="small" 
                        title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>登录错误信息</span>
                                <Button type="link" onClick={clearError}>清除</Button>
                            </div>
                        }
                        style={{ 
                            marginBottom: '20px',
                            backgroundColor: '#fff2f0',
                            borderColor: '#ffccc7'
                        }}
                    >
                        <pre style={{ 
                            fontSize: '12px',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word'
                        }}>
                            {JSON.stringify(debugInfo.error, null, 2)}
                        </pre>
                    </Card>
                )}

                {/* 错误模态框 */}
                <Modal
                    title="登录失败详情"
                    open={errorModal.visible}
                    onOk={clearError}
                    onCancel={clearError}
                    width={600}
                    maskClosable={false}
                    keyboard={false}
                    closable={false}
                    footer={[
                        <Button 
                            key="ok" 
                            type="primary" 
                            onClick={clearError}
                        >
                            我知道了
                        </Button>
                    ]}
                >
                    <pre style={{ 
                        fontSize: '14px',
                        backgroundColor: '#f5f5f5',
                        padding: '15px',
                        borderRadius: '4px',
                        maxHeight: '400px',
                        overflow: 'auto'
                    }}>
                        {JSON.stringify(errorModal.content, null, 2)}
                    </pre>
                </Modal>

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