import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, Spin, Alert, Progress } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CloudOutlined, ThunderboltOutlined, DatabaseOutlined, KeyOutlined } from '@ant-design/icons';
import axios from 'axios';
import styled from 'styled-components';

const { Option } = Select;

const StyledCard = styled(Card)`
    margin-bottom: 24px;
    .ant-statistic-title {
        margin-bottom: 16px;
        font-size: 16px;
    }
`;

const IconWrapper = styled.span`
    margin-right: 8px;
    color: #1890ff;
`;

const CacheMonitor = () => {
    const [metrics, setMetrics] = useState(null);
    const [history, setHistory] = useState([]);
    const [period, setPeriod] = useState('24h');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [metricsRes, historyRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/admin/cache/metrics', {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`http://localhost:5000/api/admin/cache/metrics/history?period=${period}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                setMetrics(metricsRes.data.metrics);
                setHistory(historyRes.data.metrics);
            } catch (error) {
                console.error('获取缓存数据失败:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [period]);

    const renderPerformanceCard = () => (
        <StyledCard title="性能指标">
            <Row gutter={16}>
                <Col span={12}>
                    <Progress
                        type="dashboard"
                        percent={metrics?.hitRate || 0}
                        format={percent => `${percent.toFixed(2)}%`}
                    />
                    <div style={{ textAlign: 'center', marginTop: 8 }}>缓存命中率</div>
                </Col>
                <Col span={12}>
                    <Progress
                        type="dashboard"
                        percent={(metrics?.memoryUsage / 1024) * 100 || 0}
                        format={percent => `${percent.toFixed(2)}MB`}
                        strokeColor="#1890ff"
                    />
                    <div style={{ textAlign: 'center', marginTop: 8 }}>内存使用</div>
                </Col>
            </Row>
        </StyledCard>
    );

    if (loading) {
        return <Spin size="large" />;
    }

    return (
        <div>
            {renderPerformanceCard()}

            <Row gutter={16}>
                <Col span={6}>
                    <StyledCard>
                        <Statistic 
                            title={<><IconWrapper><CloudOutlined /></IconWrapper>缓存命中率</>}
                            value={metrics?.hitRate || 0}
                            suffix="%" 
                            precision={2}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </StyledCard>
                </Col>
                <Col span={6}>
                    <StyledCard>
                        <Statistic 
                            title={<><IconWrapper><ThunderboltOutlined /></IconWrapper>平均延迟</>}
                            value={metrics?.averageLatency || 0}
                            suffix="ms" 
                            precision={2}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </StyledCard>
                </Col>
                <Col span={6}>
                    <StyledCard>
                        <Statistic 
                            title={<><IconWrapper><DatabaseOutlined /></IconWrapper>内存使用</>}
                            value={metrics?.memoryUsage || 0}
                            suffix="MB" 
                            valueStyle={{ color: '#faad14' }}
                        />
                    </StyledCard>
                </Col>
                <Col span={6}>
                    <StyledCard>
                        <Statistic 
                            title={<><IconWrapper><KeyOutlined /></IconWrapper>键总数</>}
                            value={metrics?.keysCount || 0}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </StyledCard>
                </Col>
            </Row>

            <StyledCard 
                title="性能趋势"
                extra={
                    <Select value={period} onChange={setPeriod}>
                        <Option value="1h">1小时</Option>
                        <Option value="24h">24小时</Option>
                        <Option value="7d">7天</Option>
                    </Select>
                }
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer>
                                <AreaChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="timestamp"
                                        tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                                    />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip 
                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="hitRate" 
                                        stroke="#1890ff"
                                        fill="#1890ff"
                                        fillOpacity={0.2}
                                        name="命中率"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer>
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="timestamp"
                                        tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                                    />
                                    <YAxis />
                                    <Tooltip 
                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="averageLatency" 
                                        stroke="#52c41a"
                                        name="平均延迟"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Col>
                </Row>
            </StyledCard>

            {metrics?.hitRate < 50 && (
                <Alert
                    message="缓存性能警告"
                    description="当前缓存命中率低于50%，建议检查缓存策略"
                    type="warning"
                    showIcon
                    style={{ marginTop: 16 }}
                />
            )}
        </div>
    );
};

export default CacheMonitor; 