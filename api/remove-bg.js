/**
 * Remove.bg API 代理 Serverless Function
 * 读取 REMOVE_BG_API_KEY 环境变量，转发请求到 Remove.bg API
 */

export const config = {
  api: {
    bodyParser: false, // 禁用内置 body parsing 以处理 multipart/form-data
  },
};

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.REMOVE_BG_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Remove.bg API key not configured' });
  }

  try {
    // 构建 Remove.bg API 请求
    const removeBgUrl = 'https://api.remove.bg/v1.0/removebg';

    // 获取请求体（multipart/form-data）
    const formData = await getFormData(req);

    const response = await fetch(removeBgUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = 'Remove.bg API error';
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.errors?.[0]?.title || errorJson.errors?.[0]?.detail || errorMsg;
      } catch {
        errorMsg = errorText || errorMsg;
      }
      return res.status(response.status).json({ error: errorMsg });
    }

    // 返回处理后的图片
    const blob = await response.arrayBuffer();
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/png');
    res.send(Buffer.from(blob));
  } catch (err) {
    console.error('Remove.bg proxy error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

async function getFormData(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // 手动构建 FormData
  const formData = new FormData();

  // 解析 multipart/form-data
  const boundary = req.headers['content-type']?.split('boundary=')[1];
  if (!boundary) {
    throw new Error('No boundary found');
  }

  const parts = parseMultipart(buffer, boundary);

  for (const part of parts) {
    if (part.filename) {
      // 是文件
      const blob = new Blob([part.data], { type: part.contentType });
      formData.append(part.name, blob, part.filename);
    } else {
      // 是普通字段
      formData.append(part.name, part.data.toString());
    }
  }

  return formData;
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundary = Buffer.from(`--${boundary}--`);

  let start = 0;

  while (start < buffer.length) {
    // 找 boundary
    let boundaryIdx = indexOf(buffer, boundaryBuffer, start);
    if (boundaryIdx === -1) break;

    // 跳过 boundary 和 CRLF
    let pos = boundaryIdx + boundaryBuffer.length;
    if (buffer[pos] === 0x0D) pos++; // \r
    if (buffer[pos] === 0x0A) pos++; // \n

    // 找下一个 boundary
    let nextBoundary = indexOf(buffer, boundaryBuffer, pos);
    let end = nextBoundary === -1 ? buffer.length : nextBoundary;

    // 减去结尾的 CRLF--boundary--CRLF
    if (buffer[end - 1] === 0x0A) end--;
    if (buffer[end - 1] === 0x0D) end--;

    const partData = buffer.slice(pos, end);

    // 解析 part header 和 body
    const headerEndIdx = indexOf(partData, Buffer.from('\r\n\r\n'), 0);
    if (headerEndIdx === -1) {
      start = nextBoundary === -1 ? buffer.length : nextBoundary;
      continue;
    }

    const headerStr = partData.slice(0, headerEndIdx).toString('utf-8');
    const body = partData.slice(headerEndIdx + 4);

    // 解析 Content-Disposition
    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);
    const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/);

    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: filenameMatch ? filenameMatch[1] : null,
        contentType: contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream',
        data: body,
      });
    }

    start = nextBoundary === -1 ? buffer.length : nextBoundary;
  }

  return parts;
}

function indexOf(buffer, needle, start = 0) {
  for (let i = start; i <= buffer.length - needle.length; i++) {
    let found = true;
    for (let j = 0; j < needle.length; j++) {
      if (buffer[i + j] !== needle[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}
