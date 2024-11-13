import React, { useState } from 'react';
import { Input, Button, message, Upload } from 'antd';
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
    .ant-upload-list {
        display: flex;
        justify-content: center;
    }
    
    .ant-upload.ant-upload-select {
        width: 100%;
        height: 200px;
        margin: 0;
    }
`;

const ActionButtons = styled.div`
    display: flex;
    justify-content: flex-end;
`;

const CreatePost = ({ onPostCreated }) => {
    const [content, setContent] = useState('');
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleUploadChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

    const handleSubmit = async () => {
        if (!content.trim() && fileList.length === 0) {
            return message.warning('请输入内容或上传图片');
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const formData = new FormData();
            formData.append('content', content);
            
            if (fileList.length > 0 && fileList[0].originFileObj) {
                const file = fileList[0].originFileObj;
                formData.append('image', file);
            }

            console.log('准备发送的数据:', {
                content,
                hasImage: fileList.length > 0,
                token: token ? '存在' : '不存在'
            });

            const response = await axios.post(
                'http://localhost:5000/api/posts',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    },
                    timeout: 10000,
                    validateStatus: function (status) {
                        return status >= 200 && status < 500;
                    }
                }
            );

            if (response.status === 201) {
                setContent('');
                setFileList([]);
                message.success('发布成功！');
                
                if (onPostCreated) {
                    onPostCreated(response.data);
                }
            } else {
                throw new Error(response.data.message || '发布失败');
            }
        } catch (error) {
            console.error('发布失败详情:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            message.error(error.response?.data?.message || '发布失败，请重试');
        } finally {
            setLoading(false);
        }
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
                        beforeUpload={() => false}
                        maxCount={1}
                    >
                        {fileList.length === 0 && (
                            <div>
                                <PictureOutlined />
                                <div style={{ marginTop: 8 }}>上传图片</div>
                            </div>
                        )}
                    </Upload>
                </UploadArea>

                <ActionButtons>
                    <Button 
                        type="primary"
                        onClick={handleSubmit}
                        loading={loading}
                    >
                        发布
                    </Button>
                </ActionButtons>
            </PostForm>
        </CreatePostContainer>
    );
};

export default CreatePost; 