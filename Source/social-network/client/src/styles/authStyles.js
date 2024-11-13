import styled from 'styled-components';
import { Button, Input, Form } from 'antd';
import { theme } from './theme';

export const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${theme.colors.background};
  padding: 20px;
`;

export const cardStyles = {
  width: '100%',
  maxWidth: '350px',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  '.ant-card-head': {
    borderBottom: 'none',
    padding: '24px 24px 0',
  },
  '.ant-card-head-title': {
    fontSize: '24px',
    textAlign: 'center',
    padding: '0',
  },
  '.ant-card-body': {
    padding: '24px',
  },
};

export const StyledForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 16px;
  }
`;

export const StyledInput = styled(Input)`
  height: 40px;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border};
  background-color: ${theme.colors.background};
  
  &:focus,
  &:hover {
    border-color: ${theme.colors.primary};
    box-shadow: none;
  }
  
  .ant-input-prefix {
    color: ${theme.colors.text.secondary};
    margin-right: 8px;
  }
`;

export const StyledPassword = styled(Input.Password)`
  height: 40px;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border};
  background-color: ${theme.colors.background};
  
  &:focus,
  &:hover {
    border-color: ${theme.colors.primary};
    box-shadow: none;
  }
  
  .ant-input-prefix {
    color: ${theme.colors.text.secondary};
    margin-right: 8px;
  }
`;

export const StyledButton = styled(Button)`
  height: 40px;
  border-radius: 20px;
  font-weight: 600;
  background-color: ${theme.colors.primary};
  border-color: ${theme.colors.primary};
  
  &:hover,
  &:focus {
    background-color: ${theme.colors.hover.primary};
    border-color: ${theme.colors.hover.primary};
  }
`;

export const AuthLink = styled.div`
  text-align: center;
  margin-top: 16px;
  color: ${theme.colors.text.secondary};
  
  a {
    color: ${theme.colors.primary};
    font-weight: 600;
    margin-left: 4px;
    
    &:hover {
      color: ${theme.colors.hover.primary};
    }
  }
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 20px 0;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: ${theme.colors.border};
  }
  
  span {
    padding: 0 16px;
    color: ${theme.colors.text.light};
    font-size: 13px;
  }
`; 