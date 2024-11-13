import { createGlobalStyle } from 'styled-components';
import { theme } from './theme';

export const GlobalStyle = createGlobalStyle`
  // 覆盖 antd 默认样式
  .ant-btn-primary {
    background-color: ${theme.colors.primary};
    border-color: ${theme.colors.primary};
    
    &:hover,
    &:focus {
      background-color: ${theme.colors.hover.primary} !important;
      border-color: ${theme.colors.hover.primary} !important;
    }
  }
  
  .ant-input-affix-wrapper:focus,
  .ant-input-affix-wrapper-focused {
    border-color: ${theme.colors.primary} !important;
    box-shadow: 0 0 0 2px ${theme.colors.interaction.focus} !important;
  }
  
  .ant-input-affix-wrapper:hover {
    border-color: ${theme.colors.primary} !important;
  }
  
  .ant-input:focus,
  .ant-input-focused {
    border-color: ${theme.colors.primary} !important;
    box-shadow: 0 0 0 2px ${theme.colors.interaction.focus} !important;
  }
  
  .ant-input:hover {
    border-color: ${theme.colors.primary} !important;
  }
  
  .ant-menu-item-selected {
    color: ${theme.colors.primary} !important;
  }
  
  .ant-menu-item:hover {
    color: ${theme.colors.hover.primary} !important;
  }
  
  .ant-menu-item-selected::after {
    border-bottom-color: ${theme.colors.primary} !important;
  }
`; 