# 视频总结文章功能 — 本机 Agent 集成指南

> 本文档说明：如何让**你机器上的其他项目 / Agent** 调用「视频 → 文章」的 AI Pipeline。

---

## 📖 概述

把一段视频（本地 mp4 / B站 / YouTube / 已有字幕文件）一键变成结构化文章：

```
视频输入  ───▶  ASR 转写  ───▶  LLM 总结  ───▶  文章输出
   │             │              │              │
本地文件      BiliSum CLI    MiniMax-M3      Markdown
YouTube                     （或其他 LLM）   JSON / HTML
B站 URL
字幕文件 (.srt / .txt)
```

**典型场景**：
- B 站长视频 → 5 分钟读完的文章草稿
- 课程录屏 → 知识笔记
- 播客音频 → 文字版摘要
- 批量处理收藏夹 → 自动化流水线

**核心组件**：

| 组件 | 作用 | 部署位置 |
|------|------|----------|
| BiliSum CLI | 视频下载 + ASR 转写 | 本机 npm 全局包 |
| MiniMax-M3 API | 结构化总结（OpenAI 兼容） | 云端（国内直连） |
| Wrapper 服务 | 统一接口，对外暴露 | 本机常驻 |

---

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────┐
│                    你本机（macOS）                       │
│                                                         │
│  ┌─────────────────┐       ┌──────────────────────┐     │
│  │  其他项目 / Agent │       │  Wrapper 服务         │     │
│  │                  │       │  (FastAPI)            │     │
│  │  • Claude Code   │ HTTP  │                       │     │
│  │  • qfaitool.com  │──────▶│  http://127.0.0.1:    │     │
│  │  • qifeiblog     │       │       3840            │     │
│  │  • 自研脚本      │       │                       │     │
│  │  • curl / Python │       │  任务调度 + 缓存       │     │
│  └─────────────────┘       └──────────┬───────────┘     │
│                                       │                  │
│                          ┌────────────┴────────────┐     │
│                          ▼                         ▼     │
│              ┌──────────────────┐      ┌────────────────┐│
│              │  BiliSum CLI     │      │ MiniMax-M3 API ││
│              │  (端口 3838)     │      │ api.minimax.cn ││
│              │  ASR + 下载      │      │  (云端)        ││
│              └──────────────────┘      └────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## ✅ 前置条件（一次性）

| 依赖 | 检查命令 | 安装 |
|------|----------|------|
| Python 3.12 | `python3.12 --version` | `brew install python@3.12` |
| Node.js 20+ | `node --version` | `brew install node@22` |
| BiliSum CLI | `bilisum --version` | `npm install -g bilisum` |
| MiniMax API Key | — | 控制台生成（OpenAI 兼容接口） |
| SiliconFlow API Key | — | [硅基流动](https://siliconflow.cn) 注册（新用户免费额度） |

**为什么需要 SiliconFlow？** 因为 BiliSum 转写用的是 ASR 服务，MiniMax 不做 ASR。SiliconFlow 性价比最高（新用户免费额度够用几十个视频）。

---

## 🚀 一次性安装（5 分钟）

### 1. 启动 BiliSum 后端服务

```bash
# 初始化 CLI 独立环境（首次需要，约 3-5 分钟）
bilisum env setup

# 配置 API Key（写到 ~/.zshrc，关闭终端就消失，更安全写到 ~/.config/bilisum/.env）
cat >> ~/.zshrc <<'EOF'
# === BiliSum 服务 ===
export VIDEO_SUM_LLM_ENABLED=true
export VIDEO_SUM_LLM_PROVIDER=openai-compatible
export VIDEO_SUM_LLM_BASE_URL="https://api.minimax.cn/v1"
export VIDEO_SUM_LLM_MODEL="MiniMax-M3"
export VIDEO_SUM_LLM_API_KEY="<your-key>"

export VIDEO_SUM_TRANSCRIPTION_PROVIDER=siliconflow
export VIDEO_SUM_SILICONFLOW_ASR_BASE_URL="https://api.siliconflow.cn/v1"
export VIDEO_SUM_SILICONFLOW_ASR_MODEL="TeleAI/TeleSpeechASR"
export VIDEO_SUM_SILICONFLOW_ASR_API_KEY="<siliconflow-key>"
EOF
source ~/.zshrc

# 启动 BiliSum 服务（端口 3838）
bilisum start

# 验证
bilisum doctor
# 应该看到：Service: http://127.0.0.1:3838, Token: <token>
```

### 2. 安装 Wrapper 服务

我们写一个 FastAPI wrapper，把 BiliSum + MiniMax-M3 包装成统一 HTTP API（端口 3840）。

**目录约定**：所有 wrapper 代码放在 `~/dev/video-summarizer/`

```bash
mkdir -p ~/dev/video-summarizer
cd ~/dev/video-summarizer

# 创建 server.py（见下文"完整代码"章节）
# 创建 start.sh
# 创建 requirements.txt（仅 fastapi + uvicorn + requests + pydantic）
```

### 3. 安装依赖并启动

```bash
cd ~/dev/video-summarizer
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 启动 wrapper（端口 3840）
./start.sh
# 或前台运行：uvicorn server:app --host 127.0.0.1 --port 3840
```

### 4. 让 wrapper 开机自启（可选）

macOS 用 launchd：

```bash
mkdir -p ~/Library/LaunchAgents

cat > ~/Library/LaunchAgents/com.zcy.video-summarizer.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.zcy.video-summarizer</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/zcy/dev/video-summarizer/venv/bin/uvicorn</string>
        <string>server:app</string>
        <string>--host</string>
        <string>127.0.0.1</string>
        <string>--port</string>
        <string>3840</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/zcy/dev/video-summarizer</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.zcy.video-summarizer.plist
launchctl list | grep video-summarizer  # 应该看到进程
```

---

## 🔌 调用接口

### 接口规范

**端点**：`POST http://127.0.0.1:3840/summarize`

**请求体**：

```json
{
  "input": "/Users/zcy/Downloads/video.mp4",
  "input_type": "video_file",  // 或 "url" / "transcript"
  "title_hint": "可选：视频标题（影响总结风格）",
  "language": "zh",
  "output_format": "markdown"  // 或 "json" / "both"
}
```

**响应**（同步，最长等待 5 分钟）：

```json
{
  "task_id": "abc123",
  "status": "completed",
  "duration_sec": 142,
  "result": {
    "title": "隔音棉根本不隔音——装修圈最大的起名学骗局",
    "overview": "材料学专家拆解...",
    "key_points": ["...", "...", "..."],
    "chapters": [
      {"title": "...", "start": 0, "summary": "..."}
    ]
  },
  "article_markdown": "# 隔音棉根本不隔音\n\n## 概览\n...",
  "usage": {
    "asr_provider": "siliconflow",
    "llm_model": "MiniMax-M3",
    "llm_tokens": {"prompt": 1149, "completion": 3034, "total": 4183}
  }
}
```

---

## 📞 其他项目 / Agent 怎么调用

### 方式 1：HTTP 调用（任何语言）

**curl**：

```bash
curl -X POST http://127.0.0.1:3840/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "input": "/Users/zcy/Downloads/video.mp4",
    "input_type": "video_file",
    "output_format": "both"
  }' \
  -o result.json

# 提取 Markdown 文章
jq -r '.article_markdown' result.json > article.md
```

**Python**：

```python
import requests

def summarize_video(path: str, output_format: str = "markdown") -> dict:
    """调用 wrapper 服务总结视频"""
    resp = requests.post(
        "http://127.0.0.1:3840/summarize",
        json={
            "input": path,
            "input_type": "video_file",
            "output_format": output_format,
        },
        timeout=300,
    )
    resp.raise_for_status()
    return resp.json()

# 用法
result = summarize_video("/Users/zcy/Downloads/代松波/xxx.mp4")
with open("article.md", "w") as f:
    f.write(result["article_markdown"])
```

**Node.js**：

```javascript
async function summarizeVideo(videoPath) {
  const resp = await fetch("http://127.0.0.1:3840/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: videoPath,
      input_type: "video_file",
      output_format: "markdown",
    }),
  });
  return await resp.json();
}

const result = await summarizeVideo("/Users/zcy/Downloads/video.mp4");
console.log(result.article_markdown);
```

---

### 方式 2：Claude Code / Claude Desktop（MCP）

把 wrapper 暴露成 MCP server，agent 自动识别工具。

**MCP 配置**（`~/.config/claude/mcp_servers.json` 或 Claude Desktop 设置）：

```json
{
  "mcpServers": {
    "video-summarizer": {
      "command": "/Users/zcy/dev/video-summarizer/venv/bin/python",
      "args": ["-m", "video_summarizer.mcp_server"],
      "env": {
        "BILISUM_HOST": "127.0.0.1",
        "BILISUM_PORT": "3838",
        "BILISUM_TOKEN": "<从 bilisum doctor 获取>"
      }
    }
  }
}
```

**agent 使用**：

> 用户：「帮我把 `/Users/zcy/Downloads/代松波` 目录下所有视频生成博客文章」
>
> Agent：自动调用 `summarize_video` 工具，循环处理，写入文件

---

### 方式 3：qfaitool.com 集成（前端工具按钮）

在 QFAITool 加一个"视频总结"页面：

```javascript
// src/pages/video-summarizer.js
async function summarizeVideo(file) {
  const formData = new FormData();
  formData.append("file", file);

  const resp = await fetch("/api/summarize", {
    method: "POST",
    body: formData,
  });
  return await resp.json();
}
```

后端加 `/api/summarize` 反代到 wrapper：

```javascript
// api/summarize.js (Vercel Serverless)
export default async function handler(req, res) {
  const resp = await fetch("http://127.0.0.1:3840/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  });
  const data = await resp.json();
  res.json(data);
}
```

---

### 方式 4：Shell 脚本（一行命令）

在 `~/dev/video-summarizer/bin/summarize` 创建可执行脚本：

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT="$1"
OUTPUT="${2:-article.md}"

result=$(curl -s -X POST http://127.0.0.1:3840/summarize \
  -H "Content-Type: application/json" \
  -d "{\"input\": \"$INPUT\", \"input_type\": \"video_file\", \"output_format\": \"markdown\"}")

echo "$result" | jq -r '.article_markdown' > "$OUTPUT"
echo "✓ 已保存到 $OUTPUT"
```

用法：

```bash
chmod +x ~/dev/video-summarizer/bin/summarize
summarize ./video.mp4                  # → article.md
summarize ./video.mp4 ~/Desktop/x.md   # → 指定输出
```

---

## 🛠️ 完整代码

### `~/dev/video-summarizer/server.py`

```python
"""
视频总结 wrapper 服务
- 接收 HTTP 请求
- 调用 BiliSum CLI 转写（如果是视频/URL）
- 调用 MiniMax-M3 API 总结
- 返回 Markdown + JSON
"""
import os
import json
import time
import subprocess
from pathlib import Path
from typing import Literal, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# === 配置 ===
BILISUM_BASE = os.getenv("BILISUM_BASE", "http://127.0.0.1:3838")
BILISUM_TOKEN = os.getenv("BILISUM_TOKEN", "")
MINIMAX_BASE = os.getenv("MINIMAX_BASE", "https://api.minimax.cn/v1")
MINIMAX_MODEL = os.getenv("MINIMAX_MODEL", "MiniMax-M3")
MINIMAX_KEY = os.getenv("MINIMAX_API_KEY", "")
CACHE_DIR = Path(os.getenv("CACHE_DIR", "/tmp/video-summarizer-cache"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="video-summarizer", version="1.0.0")


# === 请求 / 响应模型 ===
class SummarizeRequest(BaseModel):
    input: str = Field(..., description="视频文件路径 / URL / 字幕文件路径")
    input_type: Literal["video_file", "url", "transcript"] = "video_file"
    title_hint: Optional[str] = None
    language: str = "zh"
    output_format: Literal["markdown", "json", "both"] = "both"


# === MiniMax-M3 总结 ===
SYSTEM_PROMPT = """你是中文视频内容编辑。
任务：基于视频转写输出结构化 JSON。
要求：
1. 合法 JSON（不要 markdown fence）；
2. 顶层字段：title, overview, key_points, chapters；
3. title 10-25 字；
4. overview 3-5 句中文；
5. key_points 5-8 条，每条 20-60 字；
6. chapters 3-6 个，含 title/start/summary，start 单位秒（按内容比例估算）；
7. 忠实原文，不编造。"""

def call_minimax(transcript: str, title_hint: str) -> tuple[dict, dict]:
    if not MINIMAX_KEY:
        raise HTTPException(500, "MINIMAX_API_KEY 未设置")
    payload = {
        "model": MINIMAX_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"视频标题：{title_hint}\n\n转写文本：\n{transcript}"},
        ],
        "temperature": 0.3,
        "max_tokens": 4000,
    }
    headers = {
        "Authorization": f"Bearer {MINIMAX_KEY}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=120) as client:
        resp = client.post(f"{MINIMAX_BASE}/chat/completions",
                           json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})

    # 解析 JSON（处理 CoT 思维链）
    if "</think>" in content:
        content = content.split("</think>", 1)[1].strip()
    content = content.strip().strip("```json").strip("```").strip()
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        # 截取 {} 块
        start = content.find("{")
        end = content.rfind("}") + 1
        result = json.loads(content[start:end])

    return result, usage


# === BiliSum 调用 ===
def call_bilisum_create_task(input_path: str, input_type: str) -> str:
    """创建 BiliSum 任务，返回 task_id"""
    url = f"{BILISUM_BASE}/api/v1/tasks"
    headers = {}
    if BILISUM_TOKEN:
        headers["Authorization"] = f"Bearer {BILISUM_TOKEN}"

    body = {
        "input_type": input_type,  # url / video_file
        "source": input_path,
        "options": {
            "language": "zh",
            "summary_scope": "knowledge_note",
        },
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        return resp.json()["task_id"]


def call_bilisum_wait(task_id: str, timeout: int = 600) -> dict:
    """等待 BiliSum 任务完成"""
    url = f"{BILISUM_BASE}/api/v1/tasks/{task_id}"
    headers = {}
    if BILISUM_TOKEN:
        headers["Authorization"] = f"Bearer {BILISUM_TOKEN}"

    start = time.time()
    with httpx.Client(timeout=timeout) as client:
        while True:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            status = data["status"]
            if status in ("completed", "failed", "cancelled"):
                return data
            if time.time() - start > timeout:
                raise HTTPException(504, f"任务超时: {task_id}")
            time.sleep(5)


def get_transcript_from_bilisum(task: dict) -> str:
    """从 BiliSum 任务结果提取转写文本"""
    result = task.get("result", {})
    return result.get("transcript_text", "")


# === Markdown 渲染 ===
def render_markdown(result: dict) -> str:
    lines = [f"# {result.get('title', '未命名')}", ""]
    if result.get("overview"):
        lines.extend(["## 概览", "", result["overview"], ""])
    if result.get("key_points"):
        lines.extend(["## 核心要点", ""])
        for p in result["key_points"]:
            lines.append(f"- {p}")
        lines.append("")
    if result.get("chapters"):
        lines.extend(["## 章节", ""])
        for c in result["chapters"]:
            ts = c.get("start", 0)
            m, s = divmod(int(ts), 60)
            lines.append(f"- **[{m:02d}:{s:02d}] {c['title']}** — {c.get('summary', '')}")
        lines.append("")
    return "\n".join(lines)


# === 缓存：避免重复处理 ===
def get_cache_key(input_path: str, title_hint: str) -> str:
    import hashlib
    key = f"{input_path}|{title_hint}"
    return hashlib.md5(key.encode()).hexdigest()


def load_cache(key: str) -> Optional[dict]:
    cache_file = CACHE_DIR / f"{key}.json"
    if cache_file.exists():
        # 缓存 24 小时
        age = time.time() - cache_file.stat().st_mtime
        if age < 86400:
            return json.loads(cache_file.read_text(encoding="utf-8"))
    return None


def save_cache(key: str, data: dict):
    cache_file = CACHE_DIR / f"{key}.json"
    cache_file.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                          encoding="utf-8")


# === 主端点 ===
@app.post("/summarize")
def summarize(req: SummarizeRequest):
    """主入口：总结视频 / URL / 转写文本"""
    cache_key = get_cache_key(req.input, req.title_hint or "")

    # 检查缓存
    cached = load_cache(cache_key)
    if cached:
        return cached

    # 1. 获取转写文本
    if req.input_type == "transcript":
        # 已有转写：直接读取
        transcript = Path(req.input).read_text(encoding="utf-8")
    elif req.input_type in ("video_file", "url"):
        # 视频 / URL：通过 BiliSum 转写
        task_id = call_bilisum_create_task(req.input, req.input_type)
        task = call_bilisum_wait(task_id)
        if task["status"] != "completed":
            raise HTTPException(500, f"BiliSum 任务失败: {task.get('error_message')}")
        transcript = get_transcript_from_bilisum(task)
        if not transcript:
            raise HTTPException(500, "未获取到转写文本")
    else:
        raise HTTPException(400, f"不支持的 input_type: {req.input_type}")

    # 2. 调用 MiniMax-M3 总结
    title_hint = req.title_hint or Path(req.input).stem[:60]
    structured, usage = call_minimax(transcript, title_hint)

    # 3. 渲染 Markdown
    article_md = render_markdown(structured) if req.output_format in ("markdown", "both") else None

    # 4. 组装响应
    response = {
        "task_id": f"local-{cache_key[:8]}",
        "status": "completed",
        "input": req.input,
        "result": structured,
        "article_markdown": article_md,
        "usage": {
            "llm_model": MINIMAX_MODEL,
            "llm_tokens": usage,
            "transcript_length": len(transcript),
        },
    }

    # 5. 缓存
    save_cache(cache_key, response)
    return response


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=3840, log_level="info")
```

### `~/dev/video-summarizer/requirements.txt`

```
fastapi>=0.115
uvicorn[standard]>=0.34
httpx>=0.28
pydantic>=2.10
```

### `~/dev/video-summarizer/start.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# 确保 BiliSum 在跑
if ! curl -sf http://127.0.0.1:3838/api/v1/system/status > /dev/null 2>&1; then
    echo "[warn] BiliSum 服务没启动，先启动它：bilisum start"
    exit 1
fi

source venv/bin/activate
exec uvicorn server:app --host 127.0.0.1 --port 3840 "$@"
```

### `~/dev/video-summarizer/README.md`

```markdown
# video-summarizer

视频 → 文章的 wrapper 服务，统一调用 BiliSum + MiniMax-M3。

## 启动

\`\`\`bash
./start.sh
\`\`\`

监听 `127.0.0.1:3840`。

## 依赖服务

- BiliSum 后端（端口 3838）：`bilisum start`
- MiniMax-M3 API Key（写到 `~/.zshrc` 的 `MINIMAX_API_KEY`）

## 测试

\`\`\`bash
curl http://127.0.0.1:3840/health
curl -X POST http://127.0.0.1:3840/summarize \
  -H "Content-Type: application/json" \
  -d '{"input": "./test.mp4", "input_type": "video_file"}'
\`\`\`
```

---

## 🔄 多项目调用示例

### 示例 1：qfaitool.com 加视频总结工具

1. 在 `src/tools/registry.js` 注册：

```javascript
{
  id: 'video-summarizer',
  nameKey: 'tool.video-summarizer.name',
  descKey: 'tool.video-summarizer.desc',
  icon: '🎬',
  tags: ['ai', 'media'],
  route: '/video-summarizer',
}
```

2. 创建 `src/pages/video-summarizer.js`：

```javascript
export function renderVideoSummarizer(router) {
  const pageContent = document.getElementById('page-content');
  pageContent.innerHTML = `
    <div class="tool-container">
      <h1>视频总结</h1>
      <input type="file" id="video-input" accept="video/*,.srt,.txt">
      <button id="submit-btn">生成文章</button>
      <div id="result"></div>
    </div>
  `;

  document.getElementById('submit-btn').addEventListener('click', async () => {
    const file = document.getElementById('video-input').files[0];
    if (!file) return alert('请选择文件');

    document.getElementById('result').textContent = '处理中...';

    // 上传到本机 wrapper（需要 Vercel API 反代，见方式 3）
    const formData = new FormData();
    formData.append('file', file);

    const resp = await fetch('/api/summarize', { method: 'POST', body: formData });
    const data = await resp.json();

    document.getElementById('result').innerHTML = `
      <h2>${data.result.title}</h2>
      <pre>${data.article_markdown}</pre>
      <button onclick="navigator.clipboard.writeText(\`${data.article_markdown}\`)">
        复制 Markdown
      </button>
    `;
  });
}
```

3. 注册路由（`src/main.js`）：

```javascript
import { renderVideoSummarizer } from './pages/video-summarizer.js';
router.register('/video-summarizer', (path) => renderLayout(renderVideoSummarizer, path));
```

### 示例 2：qifeiblog 自动发布

```python
# qifeiblog/scripts/auto_publish.py
import requests
from pathlib import Path

def auto_publish_video(video_path: str):
    # 1. 总结
    result = requests.post("http://127.0.0.1:3840/summarize", json={
        "input": video_path,
        "input_type": "video_file",
        "output_format": "markdown",
    }, timeout=600).json()

    # 2. 写入博客
    slug = Path(video_path).stem[:30]
    article_path = Path(f"content/posts/{slug}.md")
    article_path.parent.mkdir(parents=True, exist_ok=True)

    frontmatter = f"""---
title: "{result['result']['title']}"
date: "{result.get('created_at', '')}"
tags: [{', '.join(result['result'].get('tags', ['video', 'ai-summary']))}]
---

"""
    article_path.write_text(frontmatter + result["article_markdown"], encoding="utf-8")
    print(f"✓ 已发布: {article_path}")

# 批量处理
import sys
for video in sys.argv[1:]:
    auto_publish_video(video)
```

### 示例 3：批量处理收藏夹

```bash
#!/usr/bin/env bash
# 处理 ~/Downloads/视频素材/ 下所有 mp4
for video in ~/Downloads/视频素材/*.mp4; do
  name=$(basename "$video" .mp4)
  echo "处理: $name"

  result=$(curl -s -X POST http://127.0.0.1:3840/summarize \
    -H "Content-Type: application/json" \
    -d "{\"input\": \"$video\", \"input_type\": \"video_file\", \"output_format\": \"markdown\"}")

  echo "$result" | jq -r '.article_markdown' > ~/Downloads/视频素材/"${name}.md"
done
```

---

## 🔍 故障排查

### Q1：端口冲突 / 服务没启动

```bash
# 检查端口
lsof -i :3840  # wrapper
lsof -i :3838  # BiliSum

# 启动 wrapper
cd ~/dev/video-summarizer && ./start.sh

# 启动 BiliSum
bilisum start
bilisum doctor
```

### Q2：API Key 错误

```bash
# 检查环境变量
echo $MINIMAX_API_KEY | head -c 10
echo $VIDEO_SUM_LLM_API_KEY | head -c 10

# 重新加载
source ~/.zshrc
```

### Q3：转写超时 / BiliSum 卡住

```bash
# 查看 BiliSum 任务
bilisum tasks

# 看具体某个任务的进度
bilisum status <task-id>

# 检查日志
tail -f ~/.bilisum/logs/*.log
```

### Q4：JSON 解析失败（MiniMax-M3 返回的不是合法 JSON）

通常是因为 MiniMax-M3 的 **CoT 思维链**。wrapper 已处理（剥离 `` 后再解析），如果还失败：

```bash
# 单独测试 MiniMax
curl -X POST https://api.minimax.cn/v1/chat/completions \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "MiniMax-M3", "messages": [{"role":"user","content":"用 JSON 格式介绍北京"}]}'
```

### Q5：缓存导致用了旧结果

```bash
# 清缓存
rm -rf /tmp/video-summarizer-cache
```

---

## 🎯 进阶

### 切换其他 LLM

改 `server.py` 顶部常量：

```python
MINIMAX_MODEL = "abab6.5s-chat"  # 备选模型
# 或者用 DeepSeek（OpenAI 兼容）：
# MINIMAX_BASE = "https://api.deepseek.com/v1"
# MINIMAX_MODEL = "deepseek-chat"
```

### 不用 BiliSum（已有转写）

```bash
curl -X POST http://127.0.0.1:3840/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "input": "/path/to/transcript.txt",
    "input_type": "transcript"
  }'
```

跳过 BiliSum，直接调 LLM。更快。

### 加 MCP 接口（让 agent 自动调用）

在 `~/dev/video-summarizer/` 加 `mcp_server.py`，参考 [MCP Python SDK 文档](https://modelcontextprotocol.io/)。工具描述：

```python
@mcp.tool()
async def summarize_video(
    video_path: str,
    output_format: str = "markdown",
) -> str:
    """
    把视频文件总结成文章。

    Args:
        video_path: 视频文件绝对路径（支持 .mp4 / .mkv / .mov / .webm）
        output_format: "markdown" / "json" / "both"

    Returns:
        文章内容（markdown 字符串）或 JSON
    """
    resp = httpx.post("http://127.0.0.1:3840/summarize", json={
        "input": video_path,
        "input_type": "video_file",
        "output_format": output_format,
    })
    return resp.json()["article_markdown"]
```

---

## 📊 成本与性能

| 指标 | 数值 |
|------|------|
| 1 个 5 分钟视频的总成本 | ≈ ¥0.10（ASR 0.03 + LLM 0.07） |
| 总耗时 | 2-5 分钟（ASR 2 分钟 + LLM 10 秒） |
| 缓存命中时 | < 1 秒（24 小时内重复请求走缓存） |
| 并发支持 | BiliSum 单任务队列；wrapper 多进程可扩展 |

---

## 📚 相关资源

- [BiliSum 项目主页](https://github.com/lycohana/BiliSum)
- [MiniMax 开放平台](https://api.minimax.cn)
- [SiliconFlow 硅基流动](https://siliconflow.cn)
- [MCP 协议文档](https://modelcontextprotocol.io/)

---

**最后更新**：2026-01
**维护者**：zcy