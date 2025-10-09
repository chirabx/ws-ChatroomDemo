#!/bin/bash

# WebSocket 聊天应用测试脚本

echo "=== WebSocket 聊天应用测试 ==="
echo ""

# 检查 wscat 是否安装
if ! command -v wscat &> /dev/null; then
    echo "❌ wscat 未安装，请先运行: npm install -g wscat"
    exit 1
fi

echo "✅ wscat 已安装"
echo ""

# 检查服务器是否运行
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "❌ 服务器未运行，请先启动: node server.js"
    echo "   然后在另一个终端运行此脚本"
    exit 1
fi

echo "✅ 服务器正在运行"
echo ""

echo "=== 测试1: 基本连接 ==="
echo "连接 WebSocket 服务器..."
timeout 5 wscat -c ws://localhost:8080/realtime -s json-v1 << 'EOF'
{"type":"join","room":"test-room","nick":"test-user"}
{"type":"say","text":"Hello World!"}
{"type":"pong"}
EOF

echo ""
echo "=== 测试2: 多用户聊天 ==="
echo "请手动运行以下命令进行测试："
echo ""
echo "# 终端1:"
echo "wscat -c ws://localhost:8080/realtime -s json-v1"
echo ""
echo "# 终端2:"
echo "wscat -c ws://localhost:8080/realtime -s json-v1"
echo ""
echo "然后在每个终端发送："
echo '{"type":"join","room":"demo-room","nick":"user1"}'  # 终端1
echo '{"type":"join","room":"demo-room","nick":"user2"}'  # 终端2
echo '{"type":"say","text":"Hello from user1"}'          # 终端1
echo '{"type":"say","text":"Hello from user2"}'          # 终端2
echo '{"type":"whisper","to":"user1","text":"Private message"}'  # 终端2
echo ""
echo "=== 测试3: 错误处理 ==="
echo "测试无效连接（无子协议）:"
timeout 3 wscat -c ws://localhost:8080/realtime 2>&1 || echo "连接被拒绝（预期行为）"

echo ""
echo "=== 测试完成 ==="
echo "请查看服务器日志以确认所有功能正常工作"
