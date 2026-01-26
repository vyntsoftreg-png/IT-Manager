import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { notification } from 'antd';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Connect to backend (assumes same host if relative, or use env var)
        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
            withCredentials: true,
            autoConnect: true,
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('🔌 Connected to Socket.io');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Disconnected from Socket.io');
            setIsConnected(false);
        });

        // Global Notification Handler
        newSocket.on('notification', (data) => {
            notification[data.type || 'info']({
                message: data.title,
                description: data.message,
                duration: 5,
            });
        });

        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
