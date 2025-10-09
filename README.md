# WebSocket 聊天应用

基于 Node.js + React 的实时聊天应用，支持房间管理、私聊、心跳检测、限流等功能。

## 功能特性

### 后端功能
- ✅ **握手校验**: 支持 `json-v1` 子协议
- ✅ **房间管理**: 维护 `room -> Set<ws>` 映射
- ✅ **消息类型**: 支持 `join`、`say`、`whisper` 消息
- ✅ **心跳机制**: 服务端 ping / 客户端 pong，超时断开
- ✅ **限流保护**: 每连接每秒≥10条、突发≤20条，超限关闭(1008)
- ✅ **消息大小限制**: maxPayload ≥ 1MB 消息被拒绝
- ✅ **用户离开广播**: 连接关闭时广播 "left" 消息

### 前端功能
- ✅ **Web界面**: 可连接、加入房间、发送消息
- ✅ **系统提示**: 显示用户加入/离开消息
- ✅ **私聊功能**: 支持同房间内私聊
- ✅ **连接状态**: 实时显示连接状态
- ✅ **消息类型区分**: 普通消息、私聊、系统消息不同样式

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动后端服务器

```bash
node server.js
```

服务器将在 `ws://localhost:8080/realtime` 启动

### 3. 启动前端应用

```bash
npm run dev
```

前端将在 `http://localhost:5173` 启动

## 使用方法

### 浏览器使用

1. 打开 `http://localhost:5173`
2. 输入用户名和房间名
3. 点击"加入房间"
4. 开始聊天：
   - 在输入框输入消息并发送
   - 点击"显示私聊"进行私聊
   - 查看系统提示消息

### 命令行使用 (wscat)

#### 安装 wscat
```bash
npm install -g wscat
```

#### 连接服务器
```bash
wscat -c ws://localhost:8080/realtime -s json-v1
```

#### 发送消息
```json
{"type":"join","room":"test-room","nick":"user1"}
{"type":"say","text":"Hello everyone!"}
{"type":"whisper","to":"user2","text":"Private message"}
```

## 消息格式

### 客户端发送

#### 加入房间
```json
{
  "type": "join",
  "room": "room-name",
  "nick": "nickname"
}
```

#### 发送消息
```json
{
  "type": "say",
  "text": "message content"
}
```

#### 私聊
```json
{
  "type": "whisper",
  "to": "target-nickname",
  "text": "private message"
}
```

#### 心跳响应
```json
{
  "type": "pong"
}
```

### 服务端发送

#### 欢迎消息
```json
{
  "type": "welcome",
  "message": "Connected to WebSocket server"
}
```

#### 用户加入
```json
{
  "type": "joined",
  "nick": "nickname",
  "timestamp": 1234567890
}
```

#### 用户离开
```json
{
  "type": "left",
  "nick": "nickname",
  "timestamp": 1234567890
}
```

#### 普通消息
```json
{
  "type": "say",
  "nick": "sender",
  "text": "message content",
  "timestamp": 1234567890
}
```

#### 私聊消息
```json
{
  "type": "whisper",
  "from": "sender",
  "text": "private message",
  "timestamp": 1234567890
}
```

#### 心跳检测
```json
{
  "type": "ping"
}
```

#### 错误消息
```json
{
  "type": "error",
  "message": "error description"
}
```

## 测试

### 运行测试脚本

#### Windows
```bash
test-wscat.bat
```

#### Linux/Mac
```bash
./test-wscat.sh
```

### 手动测试

1. **多用户测试**: 打开多个浏览器标签页或使用多个 wscat 连接
2. **私聊测试**: 在不同客户端间发送私聊消息
3. **限流测试**: 快速发送大量消息测试限流机制
4. **心跳测试**: 长时间连接测试心跳机制
5. **错误处理**: 发送无效消息测试错误处理

## 技术栈

- **后端**: Node.js + ws
- **前端**: React + Vite
- **通信**: WebSocket
- **样式**: CSS

## 项目结构

```
websocket-chat-app/
├── server.js              # 后端服务器
├── src/
│   ├── components/
│   │   └── ChatComponent.jsx    # 聊天组件
│   ├── hooks/
│   │   └── useWebSocket.js      # WebSocket Hook
│   ├── App.jsx                  # 主应用
│   └── main.jsx                 # 入口文件
├── package.json
├── README.md
├── wscat-demo.md               # wscat 演示指南
├── test-wscat.bat             # Windows 测试脚本
└── test-wscat.sh              # Linux/Mac 测试脚本
```

## 部署到 Linux 服务器

### 1. 上传代码到服务器

### 2. 安装 Node.js 和依赖
```bash
# 安装 Node.js (使用 nvm 推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
nvm use node

# 安装项目依赖
npm install
```

### 3. 启动服务
```bash
# 启动后端
node server.js

# 或使用 PM2 管理进程
npm install -g pm2
pm2 start server.js --name "websocket-chat"
```

### 4. 配置反向代理 (可选)
使用 Nginx 配置 WebSocket 代理：
```nginx
location /realtime {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

## 故障排除

### 连接问题
- 检查服务器是否启动: `node server.js`
- 检查端口是否被占用: `netstat -ano | findstr :8080` (Windows)
- 检查防火墙设置

### 消息不显示
- 检查浏览器控制台错误
- 确认 WebSocket 连接状态
- 检查消息格式是否正确

### 心跳超时
- 检查网络连接稳定性
- 确认客户端正确响应 pong 消息

## 许可证

MIT License