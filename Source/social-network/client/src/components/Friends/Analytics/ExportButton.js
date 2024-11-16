import React from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const StyledButton = styled(Button)`
  margin-left: 8px;
`;

const ExportButton = ({ data }) => {
  const handleExport = () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '社交分析数据.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('数据导出成功');
    } catch (error) {
      message.error('数据导出失败');
    }
  };

  return (
    <StyledButton
      type="link"
      icon={<DownloadOutlined />}
      onClick={handleExport}
    >
      导出数据
    </StyledButton>
  );
};

export default ExportButton;