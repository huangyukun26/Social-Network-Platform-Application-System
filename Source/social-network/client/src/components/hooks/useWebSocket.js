import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const useWebSocket = (userId) => {
    const socket = useRef(null);

    const connect = useCallback(() => {
        const token = sessionStorage.getItem('token');
        socket.current = io('http://localhost:5000', {
            query: { userId },
            auth: { token }
        });

        socket.current.on('connect', () => {
            console.log('WebSocket connected');
        });

        socket.current.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            // 可以实现重连逻辑
        });

        return () => {
            if (socket.current) {
                socket.current.disconnect();
            }
        };
    }, [userId]);

    useEffect(() => {
        if (userId) {
            return connect();
        }
    }, [userId, connect]);

    return socket.current;
};

export default useWebSocket;