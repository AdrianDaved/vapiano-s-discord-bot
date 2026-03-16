#!/bin/bash
set -e
cd /root/vapiano-bot/vapiano-s-discord-bot

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔄 Restarting bot and API..."
pm2 restart vapiano-bot vapiano-api

echo "🏗️  Rebuilding dashboard..."
docker build -t vapiano-dashboard ./dashboard --quiet
docker stop vapiano-dashboard 2>/dev/null || true
docker rm vapiano-dashboard 2>/dev/null || true
docker run -d --name vapiano-dashboard --restart unless-stopped -p 80:80 vapiano-dashboard

echo ""
echo "✅ Deploy completo!"
pm2 list
