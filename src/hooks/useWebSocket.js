import { useState, useEffect, useRef } from "react";

export const useWebSocket = (url, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  // 添加一个ref来跟踪已处理的消息
  const processedMessages = useRef(new Set());

  const connect = () => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        if (options.onOpen) options.onOpen();
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        // 使用消息的唯一标识符（如时间戳+用户+内容的组合）来检查是否已处理过该消息
        const messageId = `${message.timestamp}-${message.user}-${message.content}`;

        // 如果消息没有被处理过，则添加到消息列表中
        if (!processedMessages.current.has(messageId)) {
          processedMessages.current.add(messageId);
          setMessages((prev) => [...prev, message]);
          if (options.onMessage) options.onMessage(message);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        if (options.onClose) options.onClose();
        attemptReconnect();
      };

      ws.current.onerror = (error) => {
        setError(error);
        if (options.onError) options.onError(error);
      };
    } catch (error) {
      setError(error);
    }
  };

  const attemptReconnect = () => {
    if (reconnectAttempts.current < (options.maxReconnectAttempts || 5)) {
      reconnectAttempts.current++;
      setTimeout(() => {
        connect();
      }, (options.reconnectInterval || 1000) * reconnectAttempts.current);
    }
  };

  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  const closeConnection = () => {
    if (ws.current) {
      ws.current.close();
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  return {
    isConnected,
    messages,
    error,
    sendMessage,
    closeConnection
  };
};
