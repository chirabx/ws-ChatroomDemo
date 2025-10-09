# WebSocket 聊天应用演示指南

## 安装 wscat

```bash
npm install -g wscat
```

## 启动服务器

```bash
node server.js
```

## wscat 连接测试

### 1. 基本连接测试

```bash
wscat -c ws://localhost:8080/realtime -s json-v1
```

### 2. 加入房间

连接成功后，发送以下消息加入房间：

```json
{"type":"join","room":"test-room","nick":"user1"}
```

### 3. 发送消息

加入房间后，可以发送消息：

```json
{"type":"say","text":"Hello everyone!"}
```

### 4. 私聊功能

发送私聊消息：

```json
{"type":"whisper","to":"user2","text":"This is a private message"}
```

### 5. 心跳测试

服务器会定期发送 ping，客户端需要响应 pong：

```json
{"type":"pong"}
```

## 多客户端测试

### 终端1 - 用户1
```bash
wscat -c ws://localhost:8080/realtime -s json-v1
```
发送：
```json
{"type":"join","room":"test-room","nick":"user1"}
{"type":"say","text":"Hello from user1"}
```

### 终端2 - 用户2
```bash
wscat -c ws://localhost:8080/realtime -s json-v1
```
发送：
```json
{"type":"join","room":"test-room","nick":"user2"}
{"type":"say","text":"Hello from user2"}
{"type":"whisper","to":"user1","text":"Private message to user1"}
```

## 功能验证清单

### ✅ 握手校验
- 必须使用 `json-v1` 子协议连接
- 无子协议连接会被拒绝

### ✅ 房间管理
- 支持 `{"type":"join","room":"room-name","nick":"nickname"}`
- 维护 `room -> Set<ws>` 映射
- 用户离开时广播 `{"type":"left","nick":"nickname"}`

### ✅ 消息广播
- 支持 `{"type":"say","text":"message"}` 广播到房间
- 支持 `{"type":"whisper","to":"nickname","text":"message"}` 私聊

### ✅ 心跳机制
- 服务端每30秒发送 ping
- 客户端10秒内必须响应 pong
- 超时自动断开连接

### ✅ 限流机制
- 每连接每秒最多10条消息
- 突发限制20条消息
- 超限关闭连接（1008）

### ✅ 消息大小限制
- maxPayload: 1MB
- 超过1MB的消息被拒绝

## 错误处理测试

### 1. 无效JSON
发送非JSON格式消息，应该收到错误响应。

### 2. 未知消息类型
发送 `{"type":"unknown"}`，应该收到错误响应。

### 3. 限流测试
快速发送大量消息，超过限制后连接应该被关闭。

### 4. 大消息测试
发送超过1MB的消息，应该被拒绝。

## 前端测试

启动前端应用：
```bash
npm run dev
```

访问 `http://localhost:5173`，测试：
1. 连接状态显示
2. 房间加入功能
3. 消息发送和接收
4. 私聊功能
5. 系统提示消息
6. 用户离开提示

## 服务器日志

服务器会输出详细的连接和消息日志，包括：
- 客户端连接/断开
- 房间加入/离开
- 消息处理
- 错误信息
- 心跳状态
