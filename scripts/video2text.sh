#!/usr/bin/env bash
#
# video2text.sh — 视频语音转文字（本地，Apple Silicon 优先 MLX Whisper）
#
# 用法:
#   ./scripts/video2text.sh <视频文件> [语言=zh] [模型=large-v3-turbo|medium|small|tiny]
#
# 示例:
#   ./scripts/video2text.sh ./video.mp4
#   ./scripts/video2text.sh ./video.mp4 zh large-v3-turbo
#   ./scripts/video2text.sh ./video.mkv en medium
#
# 环境变量（可选）:
#   WHISPER_PROMPT   自定义提示词（例如专有名词、人名，提高识别准确率）
#                    中文默认会注入“使用简体中文”的提示，避免输出繁体
#   WHISPER_CPP_MODELS  whisper.cpp 回退时的 ggml 模型目录
#   WHISPER_OFFLINE  设为 1 时完全离线：仅用本地缓存，不访问任何网络
#                    （需先联网跑过一次，把模型和 OpenCC 缓存到本地）
#
# 输出: 视频同目录下 transcript_<文件名>/ ，包含：
#   transcript.txt          机器原始转录
#   transcript_校对版.txt    转简体 + 错字修正后的版本
#   transcript_校对版.srt    校对后的字幕
#   transcript.srt / .vtt / .json  时间戳字幕与结构化结果
#
# 错字修正词表: scripts/whisper_fixes.txt（短语级，格式 错词=>正确词）
#
set -euo pipefail

# uv tool 安装的可执行文件默认在 ~/.local/bin，确保脚本能找到 mlx_whisper
export PATH="$HOME/.local/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 离线模式：WHISPER_OFFLINE=1 时仅使用本地缓存，不访问网络
if [ "${WHISPER_OFFLINE:-}" = "1" ] || [ "${WHISPER_OFFLINE:-}" = "true" ]; then
  export HF_HUB_OFFLINE=1
  export TRANSFORMERS_OFFLINE=1
  export UV_OFFLINE=1
  echo "==> 离线模式：仅使用本地缓存"
fi

INPUT="${1:?用法: $0 <视频文件> [语言=zh] [模型=large-v3-turbo]}"
LANG="${2:-zh}"
MODEL="${3:-large-v3-turbo}"

if [ ! -f "$INPUT" ]; then
  echo "错误: 找不到文件 $INPUT" >&2
  exit 1
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "错误: 未找到 ffmpeg，请先 'brew install ffmpeg'" >&2
  exit 1
fi

# MLX 模型仓库名不统一，这里做别名映射（也可直接传完整 HuggingFace repo）
case "$MODEL" in
  tiny)                 MLX_REPO="mlx-community/whisper-tiny" ;;
  small)                MLX_REPO="mlx-community/whisper-small-mlx" ;;
  medium)               MLX_REPO="mlx-community/whisper-medium" ;;
  large-v3)             MLX_REPO="mlx-community/whisper-large-v3-mlx" ;;
  large-v3-turbo|turbo) MLX_REPO="mlx-community/whisper-large-v3-turbo" ;;
  *)                    MLX_REPO="$MODEL" ;;
esac

# 中文默认提示使用简体，避免 Whisper 输出繁体
PROMPT="${WHISPER_PROMPT:-}"
if [ -z "$PROMPT" ]; then
  case "$LANG" in
    zh|Chinese|Mandarin) PROMPT="以下是普通话的句子，请使用简体中文。" ;;
  esac
fi

OUTDIR="$(dirname "$INPUT")/transcript_$(basename "${INPUT%.*}")"
mkdir -p "$OUTDIR"
WAV="$OUTDIR/audio.wav"

echo "==> 提取音频 (16kHz mono)"
ffmpeg -y -hide_banner -loglevel error -i "$INPUT" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$WAV"

if command -v mlx_whisper >/dev/null 2>&1; then
  echo "==> MLX Whisper ($MLX_REPO)"
  if [ -n "$PROMPT" ]; then
    mlx_whisper "$WAV" \
      --model "$MLX_REPO" --language "$LANG" --initial-prompt "$PROMPT" \
      --output-name transcript --output-dir "$OUTDIR" \
      --output-format all --verbose False
  else
    mlx_whisper "$WAV" \
      --model "$MLX_REPO" --language "$LANG" \
      --output-name transcript --output-dir "$OUTDIR" \
      --output-format all --verbose False
  fi
else
  echo "==> 未找到 mlx_whisper，回退 whisper.cpp ($MODEL)"
  if ! command -v whisper-cli >/dev/null 2>&1; then
    echo "错误: MLX 和 whisper.cpp 都不可用。安装 MLX: uv tool install mlx-whisper" >&2
    exit 1
  fi
  MODELS_DIR="${WHISPER_CPP_MODELS:-$HOME/.cache/whisper-cpp/models}"
  mkdir -p "$MODELS_DIR"
  GGML="$MODELS_DIR/ggml-$MODEL.bin"
  if [ ! -f "$GGML" ]; then
    echo "==> 下载模型 ggml-$MODEL.bin ..."
    curl -L --progress-bar \
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$MODEL.bin" \
      -o "$GGML"
  fi
  if [ -n "$PROMPT" ]; then
    whisper-cli -m "$GGML" -f "$WAV" -l "$LANG" --prompt "$PROMPT" \
      -otxt -osrt -of "$OUTDIR/transcript"
  else
    whisper-cli -m "$GGML" -f "$WAV" -l "$LANG" \
      -otxt -osrt -of "$OUTDIR/transcript"
  fi
fi

# 后处理：繁体转简体 + 同音错字修正（保留原始文件，另存“校对版”）
FIX_SCRIPT="$SCRIPT_DIR/fix_transcript.py"
FIXES="$SCRIPT_DIR/whisper_fixes.txt"

run_fix() {
  if command -v uv >/dev/null 2>&1; then
    uv run --quiet --with opencc-python-reimplemented --python 3.12 \
      "$FIX_SCRIPT" "$1" --fixes "$FIXES" --output "$2"
  elif command -v python3 >/dev/null 2>&1; then
    python3 "$FIX_SCRIPT" "$1" --fixes "$FIXES" --output "$2"
  else
    return 1
  fi
}

if [ -f "$FIX_SCRIPT" ]; then
  echo "==> 校对（转简体 + 错字修正）"
  if [ -f "$OUTDIR/transcript.txt" ]; then
    run_fix "$OUTDIR/transcript.txt" "$OUTDIR/transcript_校对版.txt" \
      || echo "警告: txt 后处理失败，请直接使用 transcript.txt"
  fi
  if [ -f "$OUTDIR/transcript.srt" ]; then
    run_fix "$OUTDIR/transcript.srt" "$OUTDIR/transcript_校对版.srt" \
      || echo "警告: srt 后处理失败"
  fi
fi

echo "==> 完成，输出目录: $OUTDIR"
ls -la "$OUTDIR"