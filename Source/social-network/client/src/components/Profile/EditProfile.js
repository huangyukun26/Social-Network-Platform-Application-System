import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Upload, Switch, Select, message } from 'antd';
import { UploadOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;
const { Option } = Select;

const EditProfileContainer = styled.div`
    max-width: 600px;
    margin: 0 auto;
    padding: ${theme.spacing.lg};
`;

const EditProfileForm = styled(Form)`
    background: white;
    padding: ${theme.spacing.lg};
    border-radius: ${theme.borderRadius.lg};
    box-shadow: ${theme.shadows.card};
`;

const EditProfile = ({ onSuccess }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [form] = Form.useForm();
    const [isPrivate, setIsPrivate] = useState(false);

    // 获取用户资料
    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const token = sessionStorage.getItem('token');
                const sessionId = sessionStorage.getItem('sessionId');
                
                if (!token || !sessionId) {
                    navigate('/login');
                    return;
                }

                const response = await axios.get(
                    'http://localhost:5000/api/users/me', 
                    {
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionId
                        }
                    }
                );

                const userData = response.data;
                setProfileData(userData);
                setIsPrivate(userData.privacy?.profileVisibility === 'private');
                
                // 设置表单初始值
                form.setFieldsValue({
                    username: userData.username,
                    bio: userData.bio,
                    website: userData.website,
                    privacy: {
                        profileVisibility: userData.privacy?.profileVisibility,
                        showEmail: userData.privacy?.showEmail,
                        showFollowers: userData.privacy?.showFollowers,
                        showFollowing: userData.privacy?.showFollowing,
                        showPosts: userData.privacy?.showPosts,
                        allowTagging: userData.privacy?.allowTagging
                    }
                });

                // 如果有头像，设置头像预览
                if (userData.avatar) {
                    setImageUrl(`http://localhost:5000${userData.avatar}`);
                }
            } catch (error) {
                console.error('获取用户资料失败:', error);
                message.error('获取用户资料失败');
            }
        };

        fetchProfileData();
    }, [form, navigate]);

    const handleChange = async (info) => {
        console.log('Upload onChange:', info);
        
        const file = info.file;
        if (file.status === 'uploading') {
            setLoading(true);
            return;
        }

        if (file.originFileObj) {
            try {
                // 只创建预览和更新表单值
                const previewUrl = URL.createObjectURL(file.originFileObj);
                setImageUrl(previewUrl);
                
                // 更新表单字段
                form.setFieldsValue({
                    avatar: {
                        file: file,
                        fileList: [file]
                    }
                });
            } catch (error) {
                console.error('处理图片预览失败:', error);
                message.error('图片处理失败');
            } finally {
                setLoading(false);
            }
        }
    };

    const beforeUpload = (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('只能上传图片文件！');
            return Upload.LIST_IGNORE;
        }

        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('图片必须小于5MB！');
            return Upload.LIST_IGNORE;
        }

        return false; // 阻止自动上传
    };

    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            message.loading('正在更新个人资料...', 0);
            
            const token = sessionStorage.getItem('token');
            const sessionId = sessionStorage.getItem('sessionId');
            
            if (!token || !sessionId) {
                message.error('登录已过期，请重新登录');
                navigate('/login');
                return;
            }

            const formData = new FormData();
            
            // 添加基本信息
            formData.append('username', values.username);
            formData.append('bio', values.bio || '');
            formData.append('website', values.website || '');

            // 处理头像
            const avatarField = form.getFieldValue('avatar');
            if (avatarField?.fileList?.[0]?.originFileObj) {
                formData.append('avatar', avatarField.fileList[0].originFileObj);
            }

            // 处理隐私设置
            const privacySettings = {
                profileVisibility: values.privacy?.profileVisibility || 'public',
                showEmail: values.privacy?.showEmail || false,
                showFollowers: values.privacy?.showFollowers || false,
                showFollowing: values.privacy?.showFollowing || false,
                showPosts: values.privacy?.showPosts || false,
                allowTagging: values.privacy?.allowTagging || false
            };
            
            formData.append('privacySettings', JSON.stringify(privacySettings));

            const response = await axios.put(
                'http://localhost:5000/api/users/profile',
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Session-ID': sessionId,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.data) {
                message.success('个人资料更新成功');
                if (onSuccess) {
                    onSuccess(response.data);
                }
            }
        } catch (error) {
            console.error('更新个人资料失败:', error);
            message.error('更新失败，请重试');
        } finally {
            setLoading(false);
            message.destroy();
        }
    };

    const handleVisibilityChange = (value) => {
        setIsPrivate(value === 'private');
        if (value === 'private') {
            // 如果设置为私密，重置其他隐私选项
            form.setFieldsValue({
                privacy: {
                    profileVisibility: 'private',
                    showEmail: false,
                    showFollowers: false,
                    showFollowing: false,
                    showPosts: false,
                    allowTagging: false
                }
            });
        }
    };

    if (!profileData) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
    }

    return (
        <EditProfileContainer>
            <EditProfileForm
                form={form}
                onFinish={handleSubmit}
                layout="vertical"
                initialValues={{
                    privacy: {
                        profileVisibility: 'public',
                        showEmail: false,
                        showFollowers: true,
                        showFollowing: true,
                        showPosts: true,
                        allowTagging: true
                    }
                }}
            >
                <Form.Item
                    label="头像"
                    name="avatar"
                >
                    <Upload
                        name="avatar"
                        listType="picture-card"
                        className="avatar-uploader"
                        showUploadList={false}
                        beforeUpload={beforeUpload}
                        onChange={handleChange}
                        customRequest={() => {}}
                        accept="image/*"
                        disabled={loading}
                    >
                        {imageUrl ? (
                            <div style={{ position: 'relative' }}>
                                <img 
                                    src={imageUrl} 
                                    alt="avatar" 
                                    style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover',
                                        borderRadius: '4px'
                                    }} 
                                />
                                {loading && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        background: 'rgba(0,0,0,0.5)',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}>
                                        <LoadingOutlined style={{ color: '#fff' }} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                {loading ? <LoadingOutlined /> : <PlusOutlined />}
                                <div style={{ marginTop: 8 }}>上传头像</div>
                            </div>
                        )}
                    </Upload>
                </Form.Item>

                <Form.Item label="用户名" name="username">
                    <Input />
                </Form.Item>

                <Form.Item label="个人简介" name="bio">
                    <TextArea rows={4} />
                </Form.Item>

                <Form.Item label="个人网站" name="website">
                    <Input />
                </Form.Item>

                <Form.Item label="隐私设置">
                    <Form.Item 
                        label="资料可见性" 
                        name={['privacy', 'profileVisibility']}
                    >
                        <Select onChange={handleVisibilityChange}>
                            <Option value="public">公开</Option>
                            <Option value="friends">仅好友可见</Option>
                            <Option value="private">私密</Option>
                        </Select>
                    </Form.Item>
                    
                    {!isPrivate && (
                        <>
                            <Form.Item 
                                label="显示邮箱" 
                                name={['privacy', 'showEmail']} 
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            
                            <Form.Item 
                                label="显示粉丝" 
                                name={['privacy', 'showFollowers']} 
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            
                            <Form.Item 
                                label="显示关注" 
                                name={['privacy', 'showFollowing']} 
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            
                            <Form.Item 
                                label="显示帖子" 
                                name={['privacy', 'showPosts']} 
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            
                            <Form.Item 
                                label="允许被标记" 
                                name={['privacy', 'allowTagging']} 
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </>
                    )}
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                        保存修改
                    </Button>
                </Form.Item>
            </EditProfileForm>
        </EditProfileContainer>
    );
};

const StyledUpload = styled(Upload)`
    .ant-upload {
        width: 128px;
        height: 128px;
        border-radius: 4px;
        overflow: hidden;
    }
    
    img {
        object-fit: cover;
    }
`;

export default EditProfile; 