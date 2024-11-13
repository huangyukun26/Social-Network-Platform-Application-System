export const formatTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    
    // 转换为秒
    const seconds = Math.floor(diff / 1000);
    
    // 不同时间段的显示逻辑
    if (seconds < 60) {
        return '刚刚';
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes}分钟前`;
    } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        return `${hours}小时前`;
    } else if (seconds < 604800) {
        const days = Math.floor(seconds / 86400);
        return `${days}天前`;
    } else {
        // 超过7天显示具体日期
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}; 