import styled from 'styled-components';
import { Form, Input, Button, Card } from 'antd';

// 定义主题色
const theme = {
    primary: '#4CAF50',      
    primaryHover: '#45a049', 
    lightGreen: '#e8f5e9',   
    border: '#c8e6c9',       
    text: '#2e7d32',         
    greyBg: '#f5f5f5',      
    greyBorder: '#e0e0e0'    
};

// 先定义 ButtonOverlay
export const ButtonOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
        45deg,
        ${theme.primary}22 0%,
        transparent 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
`;

export const ButtonContent = styled.div`
    position: relative;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
`;

export const AppStoreButton = styled.a`
    position: relative;
    cursor: pointer;
    border-radius: 8px;
    overflow: hidden;
    background: linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        
        img {
            transform: scale(1.05);
        }
        
        ${ButtonOverlay} {
            opacity: 0.1;
        }
    }

    &:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
`;

export const AppStoreButtons = styled.div`
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
    padding: 0 20px;
`;

export const AuthContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: ${theme.lightGreen};
    padding: 20px;
`;

export const AuthCard = styled(Card)`
    background-color: #fff;
    border: 1px solid ${theme.border};
    border-radius: 8px;
    padding: 20px 40px;
    box-shadow: 0 2px 4px rgba(76, 175, 80, 0.1);
    
    .ant-card-body {
        padding: 20px 0;
    }
`;

export const LogoContainer = styled.div`
    text-align: center;
    margin-bottom: 24px;
`;

export const StyledForm = styled(Form)`
    width: 100%;
`;

export const StyledInput = styled(Input)`
    height: 36px;
    background-color: ${theme.greyBg};
    border: 1px solid ${theme.greyBorder};
    border-radius: 6px;
    
    &:focus, &:hover {
        border-color: ${theme.primary};
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
    }
`;

export const StyledPassword = styled(Input.Password)`
    height: 36px;
    background-color: ${theme.greyBg};
    border: 1px solid ${theme.greyBorder};
    border-radius: 6px;
    
    &:focus, &:hover {
        border-color: ${theme.primary};
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
    }

    .ant-input {
        background-color: ${theme.greyBg};
    }
`;

export const StyledButton = styled(Button)`
    height: 36px;
    background-color: ${theme.primary};
    border-color: ${theme.primary};
    border-radius: 6px;
    font-weight: 600;
    
    &:hover, &:focus {
        background-color: ${theme.primaryHover};
        border-color: ${theme.primaryHover};
    }

    &:active {
        background-color: ${theme.primaryHover};
        border-color: ${theme.primaryHover};
    }
`;

export const AuthLink = styled.div`
    text-align: center;
    font-size: 14px;
    
    a {
        color: ${theme.text};
        font-weight: 600;
        
        &:hover {
            color: ${theme.primary};
            text-decoration: underline;
        }
    }
`;

export const GetAppText = styled.p`
    color: ${theme.text};
    font-size: 14px;
    margin: 10px 0;
    font-weight: 500;
`;

export const Divider = styled.div`
    display: flex;
    align-items: center;
    color: ${theme.text};
    font-size: 13px;
    margin: 20px 0;
    text-transform: uppercase;
    
    &::before,
    &::after {
        content: '';
        flex: 1;
        height: 1px;
        background-color: ${theme.border};
        margin: 0 16px;
    }
`; 