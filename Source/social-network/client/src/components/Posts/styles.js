import styled from 'styled-components';
import { theme } from '../../styles/theme';

export const CreatePostContainer = styled.div`
    background: white;
    border: 1px solid ${theme.colors.border};
    border-radius: 8px;
    padding: ${theme.spacing.md};
    margin-bottom: ${theme.spacing.lg};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

export const PostForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};

    .ant-upload-list {
        display: flex;
        justify-content: center;
    }
`;

export const MediaPreview = styled.div`
    margin-top: ${theme.spacing.sm};
    
    img {
        max-width: 100%;
        border-radius: 4px;
    }
`;

export const ActionButtons = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: ${theme.spacing.md};
`; 