/**
 * 本地开发用 Remove.bg API 代理服务器
 *
 * 使用方法:
 *   1. 设置环境变量: export REMOVE_BG_API_KEY=your_api_key
 *   2. 启动服务器: node api/local-remove-bg-server.js
 *   3. Vite 开发服务器会自动代理 /api/remove-bg 到本服务器
 */

import { createServer } from 'http';

const PORT = 3001;
const API_URL = 'https://api.remove.bg/v1.0/removebg';

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/remove-bg' && req.method === 'POST') {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;

    if (!apiKey) {
      console.error('[Local Proxy] REMOVE_BG_API_KEY not set!');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'REMOVE_BG_API_KEY environment variable not set' }));
      return;
    }

    try {
      console.log('[Local Proxy] Forwarding request to Remove.bg API...');

      // 读取请求头（特别是 Content-Type）
      const requestContentType = req.headers['content-type'];
      console.log('[Local Proxy] Content-Type:', requestContentType);

      // 读取请求体
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      console.log('[Local Proxy] Body length:', body.length);

      // 转发到 Remove.bg API（必须包含 Content-Type）
      const headers = {
        'X-Api-Key': apiKey,
      };
      if (requestContentType) {
        headers['Content-Type'] = requestContentType;
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: body,
      });

      console.log(`[Local Proxy] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Remove.bg API error';
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.errors?.[0]?.title || errorJson.errors?.[0]?.detail || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorMsg }));
        return;
      }

      // 返回处理后的图片
      const contentType = response.headers.get('content-type') || 'image/png';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(Buffer.from(await response.arrayBuffer()));

      console.log('[Local Proxy] Success!');

    } catch (err) {
      console.error('[Local Proxy] Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 健康检查
  if (url.pathname === '/health' && req.method === 'GET') {
    const hasKey = !!process.env.REMOVE_BG_API_KEY;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      hasApiKey: hasKey,
      message: hasKey ? 'API key configured' : 'API key NOT configured - set REMOVE_BG_API_KEY'
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log('\n🔧 Local Remove.bg Proxy Server');
  console.log(`   URL: http://localhost:${PORT}/api/remove-bg`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API Key: ${process.env.REMOVE_BG_API_KEY ? '✅ configured' : '❌ NOT set!'}`);
  console.log('\n   To set API key: export REMOVE_BG_API_KEY=your_key_here\n');
});
