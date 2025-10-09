import React, { useState, useEffect, useRef, useCallback } from 'react';

const RobustWebSocket = ({ url, onMessage, onStatusChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        onStatusChange && onStatusChange('connected');
        startHeartbeat();
      };
      
      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage && onMessage(message);
          
          if (message.type === 'pong') {
            console.log('Heartbeat received');
          }
        } catch (error) {
          console.error('Message parsing error:', error);
        }
      };
      
      ws.current.onclose = (event) => {
        setIsConnected(false);
        onStatusChange && onStatusChange('disconnected');
        stopHeartbeat();
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimer.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, Math.min(1000 * reconnectAttempts.current, 5000));
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onStatusChange && onStatusChange('error');
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [url, onMessage, onStatusChange]);

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatTimer.current = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  };

  const send = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const close = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    stopHeartbeat();
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      close();
    };
  }, [connect, close]);

  return {
    isConnected,
    send,
    close
  };
};

export default RobustWebSocket;