import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Socket.io hook for real-time communication
 */
export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('Socket connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('Socket disconnected');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  return socket ? { ...socket, connected } : null;
};