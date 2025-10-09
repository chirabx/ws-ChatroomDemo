import React, { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const ChatComponent = () => {
  const [messageInput, setMessageInput] = useState('');
  const [username, setUsername] = useState('');
  const [userSet, setUserSet] = useState(false);
  
  const { isConnected, messages, sendMessage } = useWebSocket('ws://localhost:3000', {
    onOpen: () => console.log('WebSocket connected'),
    onMessage: (message) => console.log('Received message:', message),
    onClose: () => console.log('WebSocket disconnected'),
    onError: (error) => console.error('WebSocket error:', error)
  });

  const handleSendMessage = () => {
    if (messageInput.trim() && sendMessage({
      type: 'chat',
      user: username,
      content: messageInput,
      timestamp: Date.now()
    })) {
      setMessageInput('');
    }
  };

  const handleSetUsername = () => {
    if (username.trim()) {
      setUserSet(true);
    }
  };

  if (!userSet) {
    return (
      <div className="login-container">
        <h2>Enter Your Username</h2>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          onKeyPress={(e) => e.key === 'Enter' && handleSetUsername()}
        />
        <button onClick={handleSetUsername}>Join Chat</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="status">Connection status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index} className="message">
            {message.user && <span className="user">{message.user}: </span>}
            <span className="content">{message.content}</span>
          </div>
        ))}
      </div>
      
      <div className="input-area">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={!isConnected}
          placeholder="Type your message..."
        />
        <button onClick={handleSendMessage} disabled={!isConnected}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;