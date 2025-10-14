import { useState, useEffect, useRef } from "react";

export const useWebSocket = (url, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentNick, setCurrentNick] = useState(null);
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const heartbeatTimeout = useRef(null);
  // 添加一个ref来跟踪已处理的消息
  const processedMessages = useRef(new Set());

  const connect = () => {
    try {
      // 创建WebSocket连接，通过URL参数传递token
      const token = 'demo-token-123';
      const wsUrl = `${url}?token=${encodeURIComponent(token)}`;

      ws.current = new WebSocket(wsUrl, ['json-v1']);

      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        if (options.onOpen) options.onOpen();
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);

        // 处理心跳
        if (message.type === 'ping') {
          ws.current.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // 使用消息的唯一标识符来检查是否已处理过该消息
        const messageId = `${message.timestamp}-${message.nick || message.user}-${message.text || message.content}`;

        // 如果消息没有被处理过，则添加到消息列表中
        if (!processedMessages.current.has(messageId)) {
          processedMessages.current.add(messageId);
          setMessages((prev) => [...prev, message]);
          if (options.onMessage) options.onMessage(message);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log('WebSocket closed:', event.code, event.reason);
        if (options.onClose) options.onClose();

        // 心跳超时(1008)或正常关闭(1000)时不重连
        if (event.code === 1000 || event.code === 1008) {
          console.log('Connection closed normally or due to timeout, not reconnecting');
          return;
        }

        console.log('Attempting to reconnect...');
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
      console.log(`Reconnecting attempt ${reconnectAttempts.current}...`);
      setTimeout(() => {
        connect();
        // 重连成功后重新加入房间
        if (currentRoom && currentNick) {
          setTimeout(() => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({
                type: 'join',
                room: currentRoom,
                nick: currentNick
              }));
              console.log(`Rejoined room ${currentRoom} as ${currentNick}`);
            }
          }, 1000);
        }
      }, (options.reconnectInterval || 1000) * reconnectAttempts.current);
    } else {
      console.log('Max reconnection attempts reached');
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

  const manualReconnect = () => {
    reconnectAttempts.current = 0;
    connect();
  };

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  const joinRoom = (room, nick) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'join',
        room: room,
        nick: nick
      }));
      setCurrentRoom(room);
      setCurrentNick(nick);
      return true;
    }
    return false;
  };

  const sendWhisper = (to, text) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'whisper',
        to: to,
        text: text
      }));
      return true;
    }
    return false;
  };

  return {
    isConnected,
    messages,
    error,
    currentRoom,
    currentNick,
    sendMessage,
    joinRoom,
    sendWhisper,
    closeConnection,
    manualReconnect
  };
};
