#!/bin/bash

# Shopify Clone - Start Script
# Cleans ports and starts the development server

PORT=3000

echo "🧹 Cleaning up port $PORT..."

# Find and kill any process using port 3000
PID=$(lsof -ti:$PORT 2>/dev/null)
if [ -n "$PID" ]; then
    echo "   Killing process $PID on port $PORT"
    kill -9 $PID 2>/dev/null
    sleep 1
fi

# Also kill any running next dev processes
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null

# Wait a moment for ports to be released
sleep 1

# Verify port is free
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "❌ Port $PORT is still in use. Please close the application manually."
    exit 1
fi

echo "✅ Port $PORT is free"
echo ""
echo "🚀 Starting Shopify Clone..."
echo "   Open http://localhost:$PORT in your browser"
echo ""

# Start the development server
npm run dev
