/**
 * Remove.bg API 代理 Serverless Function
 * 读取 REMOVE_BG_API_KEY 环境变量，转发请求到 Remove.bg API
 */

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.REMOVE_BG_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Remove.bg API key not configured' });
  }

  try {
    const removeBgUrl = 'https://api.remove.bg/v1.0/removebg';

    // 直接读取请求体
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // 获取原始 Content-Type
    const contentType = req.headers['content-type'];

    // 转发到 Remove.bg API
    const response = await fetch(removeBgUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': contentType,
      },
      body: body,
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
    const responseContentType = response.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', responseContentType);
    res.send(Buffer.from(blob));
  } catch (err) {
    console.error('Remove.bg proxy error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
