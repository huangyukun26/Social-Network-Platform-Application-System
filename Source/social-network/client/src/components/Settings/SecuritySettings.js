import React from 'react';
import { Card } from 'antd';
import SessionManager from '../SessionManager';

const SecuritySettings = () => {
    return (
        <Card title="安全设置">
            <Card type="inner" title="当前登录设备">
                <SessionManager />
            </Card>
        </Card>
    );
};

export default SecuritySettings; 