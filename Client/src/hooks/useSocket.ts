import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Socket.IO events emitted by the backend
export type InventoryEvent =
  | 'inventory:product-added'
  | 'inventory:stock-updated'
  | 'inventory:stock-corrected'
  | 'inventory:vendor-assigned'
  | 'inventory:low-stock-alert'
  | 'vendor:pending-approval'
  | 'vendor:approved'
  | 'vendor:rejected'
  | 'vendor:score-updated';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const on = useCallback(
    (event: InventoryEvent, handler: (data: unknown) => void) => {
      socketRef.current?.on(event, handler);
      return () => {
        socketRef.current?.off(event, handler);
      };
    },
    [],
  );

  return { socket: socketRef.current, isConnected, on };
}
