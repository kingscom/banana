const http = require('http');
const httpProxy = require('http-proxy-middleware');
const express = require('express');
require('dotenv').config({ path: '.env.local' });

const app = express();

// 환경변수에서 설정 읽기
const PROXY_HOST = process.env.PROXY_HOST || 'localhost';
const PROXY_PORT = process.env.PROXY_PORT || 3001;
const PROXY_TARGET = process.env.PROXY_TARGET || 'http://localhost:3000';

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 설정된 타겟으로 프록시
const proxy = httpProxy.createProxyMiddleware({
  target: PROXY_TARGET,
  changeOrigin: true,
  ws: true, // WebSocket 지원
  onProxyReq: (proxyReq, req, res) => {
    // 원본 호스트 정보 보존
    proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
    proxyReq.setHeader('X-Forwarded-Proto', 'http');
    console.log(`📡 프록시 요청: ${req.method} ${req.url} → ${PROXY_TARGET}`);
  },
  onError: (err, req, res) => {
    console.error('프록시 오류:', err);
    res.status(500).send('프록시 서버 오류');
  }
});

app.use('/', proxy);

app.listen(PROXY_PORT, PROXY_HOST, () => {
  console.log(`🔗 프록시 서버가 http://${PROXY_HOST}:${PROXY_PORT} 에서 실행 중`);
  console.log(`📡 ${PROXY_TARGET} 으로 프록시됩니다`);
  console.log(`🌐 브라우저에서 http://${PROXY_HOST}:${PROXY_PORT} 으로 접속하세요`);
  console.log(`⚙️  환경변수 설정:`);
  console.log(`   PROXY_HOST=${PROXY_HOST}`);
  console.log(`   PROXY_PORT=${PROXY_PORT}`);
  console.log(`   PROXY_TARGET=${PROXY_TARGET}`);
});