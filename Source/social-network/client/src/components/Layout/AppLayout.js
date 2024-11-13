import React from 'react';
import { Layout } from 'antd';
import Navbar from './Navbar';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

const { Content } = Layout;

const StyledLayout = styled(Layout)`
  background-color: ${theme.colors.background};
`;

const StyledContent = styled(Content)`
  min-height: calc(100vh - 64px);
  margin-top: 64px;
  padding-top: 24px;
  background-color: ${theme.colors.background};
`;

const AppLayout = ({ children }) => {
    return (
        <StyledLayout>
            <Navbar />
            <StyledContent>
                {children}
            </StyledContent>
        </StyledLayout>
    );
};

export default AppLayout; 