import React, { useState } from 'react';
import { Input, Button, message, Upload, Carousel } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import axios from 'axios';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

const { TextArea } = Input;

const CreatePostContainer = styled.div`
    background: white;
    border: 1px solid ${theme.colors.border};
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
`;

const PostForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const UploadArea = styled.div`
    margin: 16px 0;
    
    .ant-upload-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
        margin-top: 16px;
    }
    
    .ant-upload-list-picture-card-container,
    .ant-upload.ant-upload-select {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
    }
    
    .ant-upload-list-picture-card .ant-upload-list-item {
        padding: 0;
        border-radius: 4px;
        overflow: hidden;
        
        &::before {
            content: "";
            display: block;
            padding-top: 100%;
        }
        
        img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }
    
    .ant-upload.ant-upload-select {
        border: 2px dashed #e8e8e8;
        border-radius: 4px;
        background: #fafafa;
        
        &:hover {
            border-color: #1890ff;
        }
        
        .ant-upload {
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            
            .anticon {
                font-size: 24px;
                color: #999;
                margin-bottom: 8px;
            }
        }
    }
`;

const ActionButtons = styled.div`
    display: flex;
    justify-content: flex-end;
`;

const CreatePost = ({ onSuccess, onError }) => {
    const [content, setContent] = useState('');
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim() && fileList.length === 0) {
            message.error('请输入内容或上传图片');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('content', content);
            
            fileList.forEach(file => {
                if (file.originFileObj) {
                    formData.append('images', file.originFileObj);
                }
            });

            const token = sessionStorage.getItem('token');
            const sessionId = sessionStorage.getItem('sessionId');
            
            const response = await axios.post(
                'http://localhost:5000/api/posts',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Session-ID': sessionId,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setContent('');
            setFileList([]);
            message.success('发布成功');
            
            if (onSuccess) {
                onSuccess(response.data);
            }
        } catch (error) {
            console.error('发布失败:', error);
            if (onError) {
                onError(error);
            } else {
                message.error('发布失败，请重试');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUploadChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

    const beforeUpload = (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('只能上传图片文件！');
            return false;
        }
        
        const isLt20M = file.size / 1024 / 1024 < 20;
        if (!isLt20M) {
            message.error('图片必须小于 20MB！');
            return false;
        }
        
        return false; // 返回 false 阻止自动上传
    };

    return (
        <CreatePostContainer>
            <PostForm>
                <TextArea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="分享新动态..."
                    autoSize={{ minRows: 3, maxRows: 6 }}
                />
                
                <UploadArea>
                    <Upload
                        listType="picture-card"
                        fileList={fileList}
                        onChange={handleUploadChange}
                        beforeUpload={beforeUpload}
                        multiple={true}
                        maxCount={10}
                        accept="image/*"
                    >
                        {fileList.length < 10 && (
                            <div>
                                <PictureOutlined />
                                <div style={{ marginTop: 8, color: '#666' }}>上传图片</div>
                                <div style={{ 
                                    fontSize: '12px', 
                                    color: '#999',
                                    marginTop: 4 
                                }}>
                                    最多10张，单张限20MB
                                </div>
                            </div>
                        )}
                    </Upload>
                </UploadArea>

                <Button 
                    type="primary"
                    onClick={handleSubmit}
                    loading={loading}
                >
                    发布
                </Button>
            </PostForm>
        </CreatePostContainer>
    );
};

export default CreatePost; 