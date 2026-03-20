/**
 * 本地开发用 Mock Remove.bg API 服务器
 * 使用方法: node api/mock-remove-bg.js
 *
 * 注意：这是纯本地测试用，不会真正去除背景，只会返回原图
 */

import { createServer } from 'http';
import { parse } from 'url';
import { Readable } from 'stream';

const PORT = 3001;

const server = createServer(async (req, res) => {
  const { pathname } = parse(req.url);

  if (pathname === '/api/remove-bg' && req.method === 'POST') {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);

      // 解析 Content-Type 获取 boundary
      const contentType = req.headers['content-type'] || '';
      let boundary = '';
      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (boundaryMatch) {
        boundary = boundaryMatch[1];
      }

      if (!boundary) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No boundary found' }));
        return;
      }

      // 简单解析 multipart/form-data（只处理第一个文件）
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      let idx = 0;

      // 找文件内容的起始位置
      const headerEndMarker = Buffer.from('\r\n\r\n');
      let headerEndIdx = -1;
      let fileStartIdx = -1;

      // 搜索整个 body
      for (let i = 0; i < body.length - headerEndMarker.length; i++) {
        let found = true;
        for (let j = 0; j < headerEndMarker.length; j++) {
          if (body[i + j] !== headerEndMarker[j]) {
            found = false;
            break;
          }
        }
        if (found) {
          headerEndIdx = i;
          fileStartIdx = i + headerEndMarker.length;
          break;
        }
      }

      if (headerEndIdx === -1 || fileStartIdx === -1) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Could not parse multipart data' }));
        return;
      }

      // 找到文件结束位置（找下一个 boundary）
      let fileEndIdx = body.length;
      for (let i = fileStartIdx; i < body.length - boundaryBuffer.length; i++) {
        let found = true;
        for (let j = 0; j < boundaryBuffer.length; j++) {
          if (body[i + j] !== boundaryBuffer[j]) {
            found = false;
            break;
          }
        }
        if (found) {
          fileEndIdx = i - 2; // 去掉 \r\n
          break;
        }
      }

      const fileData = body.slice(fileStartIdx, fileEndIdx);

      // 获取原始文件名
      const headerStr = body.slice(0, headerEndIdx).toString('utf-8');
      const filenameMatch = headerStr.match(/filename="([^"]+)"/);
      const originalFilename = filenameMatch ? filenameMatch[1] : 'image.png';

      console.log(`[Mock API] Received file: ${originalFilename} (${fileData.length} bytes)`);

      // 模拟处理延迟
      await new Promise(r => setTimeout(r, 1000));

      // 返回原图作为"处理结果"（实际就是原图，用于测试）
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="removed_bg_${originalFilename}"`,
      });

      // 返回原文件作为结果
      const readable = new Readable({
        read() {
          this.push(fileData);
          this.push(null);
        }
      });
      readable.pipe(res);

    } catch (err) {
      console.error('[Mock API] Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 健康检查
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`\n🧪 Mock Remove.bg API Server running at http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/api/remove-bg`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
