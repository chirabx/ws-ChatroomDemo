const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// 连接管理
const clients = new Set();

wss.on('connection', function connection(ws, request) {
    console.log('Client connected');
    clients.add(ws);

    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to WebSocket server'
    }));

    // 处理消息
    ws.on('message', function incoming(data) {
        console.log('Received: %s', data);

        try {
            const message = JSON.parse(data);
            handleMessage(ws, message);
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid JSON format'
            }));
        }
    });

    // 处理关闭
    ws.on('close', function close() {
        console.log('Client disconnected');
        clients.delete(ws);
    });

    // 错误处理
    ws.on('error', function error(err) {
        console.error('WebSocket error: ', err);
    });
});

// 广播消息给所有客户端
function broadcast(message) {
    const data = JSON.stringify(message);
    clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// 处理特定消息
function handleMessage(ws, message) {
    switch (message.type) {
        case 'chat':
            // 广播聊天消息
            broadcast({
                type: 'chat',
                user: message.user,
                content: message.content,
                timestamp: Date.now()
            });
            break;
        case 'ping':
            // 响应ping
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        default:
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown message type'
            }));
    }
}