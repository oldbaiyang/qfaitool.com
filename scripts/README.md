# video2text — 本地视频语音转文字工具

把任意视频（或音频）转成文字稿，全本地运行、不上传云端、无需 API Key。
默认针对 **Apple Silicon (M 系列) + 中文**优化：用 MLX Whisper 推理，速度快于实时；
转录后自动做**繁体转简体 + 同音错字修正**，直接产出可用的文字稿和字幕。

> 本目录是独立工具，可整体复制到其他项目使用，不依赖 qfaitool 的代码。

---

## 1. 能力一览

| 能力 | 说明 |
|------|------|
| 视频 → 音频 | ffmpeg 自动抽取 16kHz 单声道（Whisper 最佳输入） |
| 语音识别 | MLX Whisper（Apple Silicon 首选），自动回退 whisper.cpp |
| 多语言 | 60+ 语言，中文、英文、中英混说均可 |
| 时间戳 | 同步产出 `.srt` / `.vtt` 字幕 |
| 转简体 | OpenCC 自动把繁体输出转成简体 |
| 错字修正 | 自定义词表，短语级替换同音错别字 |
| 速度参考 | M1 上 `large-v3-turbo`，4分20秒视频约 36 秒（≈7× 实时） |

---

## 2. 依赖与安装

### 必需

```bash
# 1. ffmpeg（音频抽取）
brew install ffmpeg

# 2. MLX Whisper（Apple Silicon 推理引擎）
uv tool install mlx-whisper

# 3. uv（用于按需加载 OpenCC，通常随 mlx-whisper 一并可用）
brew install uv
```

### 可选（回退方案 / 非 Apple Silicon）

```bash
# whisper.cpp：没有 mlx_whisper 时脚本会自动回退到它
brew install whisper-cpp
```

`opencc` 无需手动安装，`uv run --with opencc-python-reimplemented` 会在首次运行时自动拉取并缓存。

### 环境自检

```bash
ffmpeg -version | head -1
mlx_whisper --help | head -1
uv --version
```

> `uv tool install` 会把可执行文件放到 `~/.local/bin`，脚本已内置该路径，无需手动改 PATH。

---

## 3. 快速开始

```bash
# 最基本的用法（默认中文 + large-v3-turbo）
./scripts/video2text.sh ./video.mp4

# 指定语言和模型
./scripts/video2text.sh ./video.mp4 zh large-v3-turbo
./scripts/video2text.sh ./video.mkv en medium

# 用提示词提升专有名词准确率
WHISPER_PROMPT="涉及声学、隔音、吸音、主讲人代松波" \
  ./scripts/video2text.sh ./video.mp4
```

---

## 4. 参数

### 位置参数

| 参数 | 默认 | 说明 |
|------|------|------|
| `$1` 视频文件 | 必填 | 支持 mp4 / mov / webm / m4a / mp3 / wav 等 ffmpeg 能读的格式 |
| `$2` 语言 | `zh` | `zh` / `en` / `ja` / `yue` …，见下表；不填则中文 |
| `$3` 模型 | `large-v3-turbo` | `tiny` / `small` / `medium` / `large-v3` / `large-v3-turbo` |

### 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `WHISPER_PROMPT` | 中文自动注入简体提示 | 自定义提示词，提高人名、术语识别率；会覆盖默认简体提示 |
| `WHISPER_CPP_MODELS` | `~/.cache/whisper-cpp/models` | 回退 whisper.cpp 时的 ggml 模型目录 |
| `WHISPER_OFFLINE` | 未设置 | 设为 `1` 完全离线，仅用本地缓存，不访问网络 |

### 离线使用

**推理本身完全在本地**，识别阶段不联网。但默认情况下，`huggingface_hub`
启动时会做一次 Hub 检查、`uv` 会查 PyPI 索引——断网时通常能回退到缓存，但可能变慢。
要 **100% 离线**，加 `WHISPER_OFFLINE=1`：

```bash
WHISPER_OFFLINE=1 ./scripts/video2text.sh ./video.mp4
```

它等价于设置 `HF_HUB_OFFLINE=1`、`TRANSFORMERS_OFFLINE=1`、`UV_OFFLINE=1`。

> **前提**：需先联网完整跑过一次，把模型和 OpenCC 缓存到本地。之后即可永久离线。
>
> 各组件是否依赖网络：
> | 组件 | 首次 | 之后 |
> |------|------|------|
> | ffmpeg | 不联网 | 本地 |
> | mlx-whisper 程序 | 安装时联网 | 本地 |
> | Whisper 模型 | 首次下载（~1.6GB） | **本地缓存** |
> | OpenCC | 首次由 uv 拉取 | **本地缓存** |
> | whisper.cpp 回退 | 首次下载 ggml 模型 | **本地缓存** |

### 模型选择

| 模型参数 | 实际 HF 仓库 | 首次下载 | 建议场景 |
|----------|--------------|----------|----------|
| `tiny` | `mlx-community/whisper-tiny` | ~75MB | 快速草稿 |
| `small` | `mlx-community/whisper-small-mlx` | ~460MB | 日常够用 |
| `medium` | `mlx-community/whisper-medium` | ~1.5GB | 精度更好 |
| `large-v3-turbo` | `mlx-community/whisper-large-v3-turbo` | ~1.6GB | **中文首选**，快且准 |
| `large-v3` | `mlx-community/whisper-large-v3-mlx` | ~3GB | 追求极致精度 |

> 也可直接传完整 HuggingFace 仓库名（`--model` 的别名机制会透传），例如
> `./scripts/video2text.sh v.mp4 zh mlx-community/whisper-large-v3-turbo`。

#### 常用语言代码

`zh`（中文）、`en`（英语）、`ja`（日语）、`ko`（韩语）、`yue`（粤语）、
`fr` / `de` / `es` / `ru` …（完整列表见 `mlx_whisper --help`）。

---

## 5. 输出

输出到**视频文件同目录**的 `transcript_<视频文件名>/`：

| 文件 | 内容 |
|------|------|
| `transcript.txt` | 机器原始转录（未校对） |
| `transcript_校对版.txt` | **转简体 + 错字修正后，日常使用这份** ✅ |
| `transcript.srt` | 原始字幕 |
| `transcript_校对版.srt` | 校对后字幕 |
| `transcript.vtt` | Web 字幕 |
| `transcript.json` | 结构化结果（含分段/时间戳） |
| `audio.wav` | 抽取出的 16kHz 音频（可删） |

处理流程：

```
视频 ──ffmpeg──▶ 16kHz wav ──MLX Whisper──▶ transcript.txt / .srt
                                                    │
                                        fix_transcript.py
                                        （OpenCC 转简体 + 词表替换）
                                                    ▼
                              transcript_校对版.txt / transcript_校对版.srt
```

---

## 6. 错字修正词表

文件：`whisper_fixes.txt`，格式为每行一条 `错词=>正确词`，`#` 开头为注释。

```
# 通用
隔血搔痒=>隔靴搔痒
商业黑河=>商业黑话

# 领域词
用升学的物理定律=>用声学的物理定律   # 避免单写“升学=>声学”误伤正常词
```

规则：

- **短语级替换**，长词优先匹配；
- 建议写完整短语而非单字，避免误伤正常表达；
- 修改后下次运行自动生效，无需其它操作。

追加新词示例：

```bash
echo '配菜单单独拎出来=>配角单独拎出来' >> scripts/whisper_fixes.txt
```

---

## 7. 移植到其他项目

本工具是自包含的，最小移植只需 **3 个文件**：

```
scripts/video2text.sh      # 主脚本
scripts/fix_transcript.py  # 后处理（可选，但建议保留）
scripts/whisper_fixes.txt  # 词表（可留空文件）
```

步骤：

1. 复制上述 3 个文件到目标项目的 `scripts/`（或任意目录，脚本用自身路径定位词表和 Python 文件，不依赖当前工作目录）；
2. 给执行权限：`chmod +x scripts/video2text.sh`；
3. 安装依赖（见第 2 节）：`ffmpeg` + `uv tool install mlx-whisper`；
4. 直接调用：`./scripts/video2text.sh 视频.mp4`。

### 平台差异

| 平台 | 建议 |
|------|------|
| Apple Silicon | 默认即可（MLX Whisper） |
| 已有 whisper.cpp | 不装 mlx-whisper 时会自动回退 |
| Linux / NVIDIA | MLX 不可用。建议改接 `faster-whisper` 或直接跑 whisper.cpp，只需替换脚本中 `mlx_whisper ...` 那一段推断调用 |

### 单独复用后处理

`fix_transcript.py` 可脱离视频流程，对任意文本做转简体+纠错：

```bash
uv run --with opencc-python-reimplemented --python 3.12 \
  scripts/fix_transcript.py 草稿.txt \
  --fixes scripts/whisper_fixes.txt \
  --output 输出.txt

# 只做错字修正，不转简体
... scripts/fix_transcript.py 草稿.txt --fixes scripts/whisper_fixes.txt --no-simplify
```

---

## 8. 常见问题

**Q: 提示 `mlx_whisper: command not found`？**
执行 `uv tool install mlx-whisper`；脚本已把 `~/.local/bin` 加入 PATH，重开终端即可。

**Q: 支持 MKV / AVI 吗？**
音频抽取用 ffmpeg，绝大多数容器都能读；识别本身对音频格式无要求。若 ffmpeg 解不出音轨，先用 ffmpeg 转成 mp4/mp3。

**Q: 断网能用吗？**
能。推理完全本地，模型已缓存。加固方式：先联网跑一次，再加 `WHISPER_OFFLINE=1` 运行，即完全不访问网络。详见第 4 节「离线使用」。

**Q: 输出是繁体？**
脚本已默认注入简体提示，并在后处理用 OpenCC 强制转简体（`transcript_校对版.txt`）。

**Q: 第一次运行很慢？**
首次会下载模型（`large-v3-turbo` 约 1.6GB），之后本地缓存，不再下载。

**Q: 专有名词/人名识别不准？**
用 `WHISPER_PROMPT` 传入相关词汇与背景，或把已发现的错词加入 `whisper_fixes.txt`。

**Q: 长视频很慢？**
`large-v3-turbo` 在 M 系列上通常快于实时；追求速度可换 `small`，或在有 GPU 的机器上用 `large-v3`。

**Q: 后处理失败会丢原文吗？**
不会。原始 `transcript.txt` / `.srt` 始终保留，失败时脚本会打印警告，直接用原始版即可。

---

## 9. 许可证 / 致谢

- 识别引擎：[MLX Whisper](https://github.com/ml-explore/mlx-examples)、[whisper.cpp](https://github.com/ggerganov/whisper.cpp)、[OpenAI Whisper](https://github.com/openai/whisper)
- 简繁转换：[OpenCC](https://github.com/BYVoid/OpenCC)
