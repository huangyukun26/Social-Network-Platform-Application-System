import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, Spin } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import styled from 'styled-components';

const { Option } = Select;

const StyledCard = styled(Card)`
    margin-bottom: 24px;
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

    if (loading) {
        return <Spin size="large" />;
    }

    return (
        <div>
            <Row gutter={16}>
                <Col span={6}>
                    <StyledCard>
                        <Statistic 
                            title="缓存命中率" 
                            value={metrics?.hitRate || 0}
                            suffix="%" 
                            precision={2}
                        />
                    </StyledCard>
                </Col>
                <Col span={6}>
                    <StyledCard>
                        <Statistic 
                            title="平均延迟" 
                            value={metrics?.averageLatency || 0}
                            suffix="ms" 
                            precision={2}
                        />
                    </StyledCard>
                </Col>
                <Col span={6}>
                    <StyledCard>
                        <Statistic 
                            title="内存使用" 
                            value={metrics?.memoryUsage || 0}
                            suffix="MB" 
                        />
                    </StyledCard>
                </Col>
                <Col span={6}>
                    <StyledCard>
                        <Statistic 
                            title="键总数" 
                            value={metrics?.keysCount || 0}
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
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="timestamp"
                                tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                            />
                            <YAxis domain={[0, 100]} />
                            <Tooltip 
                                labelFormatter={(label) => new Date(label).toLocaleString()}
                                formatter={(value) => [`${value.toFixed(2)}%`, '命中率']}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="hitRate" 
                                stroke="#1890ff" 
                                name="命中率"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </StyledCard>
        </div>
    );
};

export default CacheMonitor; 