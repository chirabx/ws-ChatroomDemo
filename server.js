const WebSocket = require('ws');
const http = require('http');

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket服务器，监听 /realtime 路径
const wss = new WebSocket.Server({
    server,
    path: '/realtime',
    maxPayload: 1024 * 1024, // 1MB maxPayload
    verifyClient: (info) => {
        // 握手校验：检查子协议
        const protocols = info.req.headers['sec-websocket-protocol'];
        if (!protocols || !protocols.includes('json-v1')) {
            console.log('Handshake failed: missing json-v1 protocol');
            return false;
        }
        return true;
    }
});

// 房间管理：room -> Set<ws>
const rooms = new Map();
// 客户端信息映射：ws -> {nick, room, lastPing, messageCount, burstCount}
const clientInfo = new Map();

// 限流配置
const RATE_LIMIT = {
    MAX_MESSAGES_PER_SECOND: 10,
    MAX_BURST: 20,
    WINDOW_SIZE: 1000 // 1秒窗口
};

// 心跳配置
const HEARTBEAT_INTERVAL = 30000; // 30秒
const HEARTBEAT_TIMEOUT = 10000; // 10秒超时

server.listen(8082, () => {
    console.log('WebSocket server running on ws://localhost:8082/realtime');
});

wss.on('connection', function connection(ws, request) {
    console.log('Client connected');

    // 初始化客户端信息
    clientInfo.set(ws, {
        nick: null,
        room: null,
        lastPing: Date.now(),
        messageCount: 0,
        burstCount: 0,
        lastResetTime: Date.now()
    });

    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to WebSocket server'
    }));

    // 启动心跳
    startHeartbeat(ws);

    // 处理消息
    ws.on('message', function incoming(data) {
        console.log('Received: %s', data);

        // 检查消息大小
        if (data.length > 1024 * 1024) {
            ws.close(1009, 'Message too large');
            return;
        }

        // 限流检查
        if (!checkRateLimit(ws)) {
            ws.close(1008, 'Rate limit exceeded');
            return;
        }

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
    ws.on('close', function close(code, reason) {
        console.log(`Client disconnected: ${code} ${reason}`);
        const info = clientInfo.get(ws);
        if (info && info.room && info.nick) {
            // 广播用户离开消息
            broadcastToRoom(info.room, {
                type: 'left',
                nick: info.nick,
                timestamp: Date.now()
            });

            // 从房间移除
            removeFromRoom(ws, info.room);
        }
        clientInfo.delete(ws);
    });

    // 错误处理
    ws.on('error', function error(err) {
        console.error('WebSocket error: ', err);
    });
});

// 限流检查
function checkRateLimit(ws) {
    const info = clientInfo.get(ws);
    if (!info) return false;

    const now = Date.now();

    // 重置计数器（每秒重置）
    if (now - info.lastResetTime >= RATE_LIMIT.WINDOW_SIZE) {
        info.messageCount = 0;
        info.burstCount = 0;
        info.lastResetTime = now;
    }

    // 检查每秒消息限制
    if (info.messageCount >= RATE_LIMIT.MAX_MESSAGES_PER_SECOND) {
        return false;
    }

    // 检查突发限制
    if (info.burstCount >= RATE_LIMIT.MAX_BURST) {
        return false;
    }

    // 增加计数
    info.messageCount++;
    info.burstCount++;

    return true;
}

// 心跳管理
function startHeartbeat(ws) {
    const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));

            // 设置超时检查
            const timeout = setTimeout(() => {
                console.log('Heartbeat timeout, closing connection');
                ws.close(1008, 'Heartbeat timeout');
            }, HEARTBEAT_TIMEOUT);

            // 存储超时ID以便清除
            ws.heartbeatTimeout = timeout;
        } else {
            clearInterval(heartbeatInterval);
        }
    }, HEARTBEAT_INTERVAL);

    ws.heartbeatInterval = heartbeatInterval;
}

// 房间管理函数
function joinRoom(ws, room, nick) {
    // 从原房间移除
    const info = clientInfo.get(ws);
    if (info && info.room) {
        removeFromRoom(ws, info.room);
    }

    // 加入新房间
    if (!rooms.has(room)) {
        rooms.set(room, new Set());
    }
    rooms.get(room).add(ws);

    // 更新客户端信息
    if (info) {
        info.room = room;
        info.nick = nick;
    }

    // 广播加入消息
    broadcastToRoom(room, {
        type: 'joined',
        nick: nick,
        timestamp: Date.now()
    });

    console.log(`${nick} joined room ${room}`);
}

function removeFromRoom(ws, room) {
    const roomSet = rooms.get(room);
    if (roomSet) {
        roomSet.delete(ws);
        if (roomSet.size === 0) {
            rooms.delete(room);
        }
    }
}

function broadcastToRoom(room, message) {
    const roomSet = rooms.get(room);
    if (roomSet) {
        const data = JSON.stringify(message);
        roomSet.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }
}

function sendToUser(room, targetNick, message, senderNick) {
    const roomSet = rooms.get(room);
    if (roomSet) {
        roomSet.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                const info = clientInfo.get(client);
                if (info && info.nick === targetNick) {
                    client.send(JSON.stringify({
                        type: 'whisper',
                        from: senderNick,
                        text: message,
                        timestamp: Date.now()
                    }));
                    return;
                }
            }
        });
    }
}

// 处理特定消息
function handleMessage(ws, message) {
    const info = clientInfo.get(ws);
    if (!info) return;

    switch (message.type) {
        case 'join':
            if (message.room && message.nick) {
                joinRoom(ws, message.room, message.nick);
                ws.send(JSON.stringify({
                    type: 'joined',
                    room: message.room,
                    nick: message.nick,
                    timestamp: Date.now()
                }));
            }
            break;

        case 'say':
            if (info.room && info.nick && message.text) {
                broadcastToRoom(info.room, {
                    type: 'say',
                    nick: info.nick,
                    text: message.text,
                    timestamp: Date.now()
                });
            }
            break;

        case 'whisper':
            if (info.room && info.nick && message.to && message.text) {
                sendToUser(info.room, message.to, message.text, info.nick);
            }
            break;

        case 'pong':
            // 清除心跳超时
            if (ws.heartbeatTimeout) {
                clearTimeout(ws.heartbeatTimeout);
                ws.heartbeatTimeout = null;
            }
            info.lastPing = Date.now();
            break;

        case 'ping':
            // 客户端ping，服务端响应pong
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

        default:
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown message type'
            }));
    }
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    wss.close(() => {
        server.close(() => {
            process.exit(0);
        });
    });
});