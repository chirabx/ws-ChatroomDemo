import React, { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const ChatComponent = () => {
  const [messageInput, setMessageInput] = useState('');
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [whisperTarget, setWhisperTarget] = useState('');
  const [whisperText, setWhisperText] = useState('');
  const [showWhisper, setShowWhisper] = useState(false);
  const [userSet, setUserSet] = useState(false);

  const {
    isConnected,
    messages,
    currentRoom,
    currentNick,
    sendMessage,
    joinRoom,
    sendWhisper
  } = useWebSocket('ws://localhost:8082/realtime', {
    onOpen: () => console.log('WebSocket connected'),
    onMessage: (message) => console.log('Received message:', message),
    onClose: () => console.log('WebSocket disconnected'),
    onError: (error) => console.error('WebSocket error:', error)
  });

  const handleSendMessage = () => {
    if (messageInput.trim() && sendMessage({
      type: 'say',
      text: messageInput,
      timestamp: Date.now()
    })) {
      setMessageInput('');
    }
  };

  const handleJoinRoom = () => {
    if (username.trim() && roomName.trim()) {
      if (joinRoom(roomName, username)) {
        setUserSet(true);
      }
    }
  };

  const handleSendWhisper = () => {
    if (whisperTarget.trim() && whisperText.trim()) {
      if (sendWhisper(whisperTarget, whisperText)) {
        setWhisperText('');
        setShowWhisper(false);
      }
    }
  };

  const renderMessage = (message, index) => {
    switch (message.type) {
      case 'welcome':
        return (
          <div key={index} className="system-message">
            <span className="system-text">系统: {message.message}</span>
          </div>
        );

      case 'joined':
        return (
          <div key={index} className="system-message">
            <span className="system-text">系统: {message.nick} 加入了房间</span>
          </div>
        );

      case 'left':
        return (
          <div key={index} className="system-message">
            <span className="system-text">系统: {message.nick} 离开了房间</span>
          </div>
        );

      case 'say':
        return (
          <div key={index} className="message">
            <span className="user">{message.nick}: </span>
            <span className="content">{message.text}</span>
          </div>
        );

      case 'whisper':
        return (
          <div key={index} className="whisper-message">
            <span className="whisper-label">私聊</span>
            <span className="user">{message.from}: </span>
            <span className="content">{message.text}</span>
          </div>
        );

      case 'error':
        return (
          <div key={index} className="error-message">
            <span className="error-text">错误: {message.message}</span>
          </div>
        );

      default:
        return (
          <div key={index} className="message">
            <span className="content">{JSON.stringify(message)}</span>
          </div>
        );
    }
  };

  if (!userSet) {
    return (
      <div className="login-container">
        <h2>加入聊天房间</h2>
        <div className="input-group">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名"
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
          />
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="房间名"
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
          />
        </div>
        <button onClick={handleJoinRoom} disabled={!isConnected}>
          加入房间
        </button>
        <div className="status">
          连接状态: {isConnected ? '已连接' : '未连接'}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="status">
          连接状态: {isConnected ? '已连接' : '未连接'} |
          房间: {currentRoom} |
          用户: {currentNick}
        </div>
        <button
          className="whisper-toggle"
          onClick={() => setShowWhisper(!showWhisper)}
        >
          {showWhisper ? '隐藏私聊' : '显示私聊'}
        </button>
      </div>

      <div className="messages">
        {messages.map((message, index) => renderMessage(message, index))}
      </div>

      {showWhisper && (
        <div className="whisper-area">
          <input
            type="text"
            value={whisperTarget}
            onChange={(e) => setWhisperTarget(e.target.value)}
            placeholder="私聊对象"
          />
          <input
            type="text"
            value={whisperText}
            onChange={(e) => setWhisperText(e.target.value)}
            placeholder="私聊内容"
            onKeyPress={(e) => e.key === 'Enter' && handleSendWhisper()}
          />
          <button onClick={handleSendWhisper} disabled={!isConnected}>
            发送私聊
          </button>
        </div>
      )}

      <div className="input-area">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={!isConnected}
          placeholder="输入消息..."
        />
        <button onClick={handleSendMessage} disabled={!isConnected}>
          发送
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;