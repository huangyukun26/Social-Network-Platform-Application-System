import React from 'react';
import { Button, Tooltip } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const StyledButton = styled(Button)`
  position: absolute;
  right: 24px;
  top: 24px;
`;

const RefreshButton = ({ loading, onClick }) => {
  return (
    <Tooltip title="刷新分析数据">
      <StyledButton
        type="text"
        icon={<SyncOutlined spin={loading} />}
        onClick={onClick}
        disabled={loading}
      />
    </Tooltip>
  );
};

export default RefreshButton;