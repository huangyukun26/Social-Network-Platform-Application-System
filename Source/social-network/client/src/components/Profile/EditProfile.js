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

    // 获取用户资料
    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const response = await axios.get('http://localhost:5000/api/users/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const userData = response.data;
                setProfileData(userData);
                
                // 设置头像URL
                if (userData.avatar) {
                    setImageUrl(`http://localhost:5000${userData.avatar}`);
                }

                // 设置表单初始值
                form.setFieldsValue({
                    username: userData.username,
                    bio: userData.bio,
                    website: userData.website,
                    profileVisibility: userData.privacy?.profileVisibility || 'public',
                    showEmail: userData.privacy?.showEmail || false
                });
            } catch (error) {
                console.error('获取用户资料失败:', error);
                message.error('获取用户资料失败');
                navigate('/profile');
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
            
            const token = localStorage.getItem('token');
            const formData = new FormData();
            
            // 检查是否有新的头像文件
            const avatarField = form.getFieldValue('avatar');
            if (avatarField?.fileList?.[0]?.originFileObj) {
                formData.append('avatar', avatarField.fileList[0].originFileObj);
            }
            
            // 添加其他字段
            Object.keys(values).forEach(key => {
                if (values[key] !== undefined && key !== 'avatar') {
                    formData.append(key, values[key]);
                }
            });

            const response = await axios.put(
                'http://localhost:5000/api/users/profile',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.data) {
                message.success('个人资料更新成功');
                onSuccess?.();
            }
        } catch (error) {
            console.error('更新个人资料失败:', error);
            message.error('更新失败，请重试');
        } finally {
            setLoading(false);
            message.destroy();
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

                <Form.Item label="主页可见性" name="profileVisibility">
                    <Select>
                        <Option value="public">公开</Option>
                        <Option value="private">私密</Option>
                    </Select>
                </Form.Item>

                <Form.Item label="显示邮箱" name="showEmail" valuePropName="checked">
                    <Switch />
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