#!/usr/bin/env python3
"""
fix_transcript.py — Whisper 转录文本后处理

两个功能：
  1. 繁体转简体（依赖 opencc-python-reimplemented，缺失时自动跳过）
  2. 同音错字修正（读取词表，短语级替换，长词优先）

用法:
  python3 fix_transcript.py transcript.txt --fixes whisper_fixes.txt
  python3 fix_transcript.py transcript.txt --fixes whisper_fixes.txt --output out.txt
  python3 fix_transcript.py transcript.txt --no-simplify   # 只做错字修正
"""
import argparse
import sys


def load_fixes(path):
    fixes = []
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.rstrip("\n")
                if not line.strip() or line.lstrip().startswith("#"):
                    continue
                if "=>" not in line:
                    continue
                wrong, right = line.split("=>", 1)
                wrong, right = wrong.strip(), right.strip()
                if wrong:
                    fixes.append((wrong, right))
    except FileNotFoundError:
        print(f"[fix] 未找到词表 {path}，跳过错字修正", file=sys.stderr)
    # 长词优先，避免短词先替换破坏长词
    fixes.sort(key=lambda x: len(x[0]), reverse=True)
    return fixes


def to_simplified(text):
    try:
        from opencc import OpenCC
    except ImportError:
        print("[fix] 未安装 opencc，跳过繁体转简体", file=sys.stderr)
        return text
    return OpenCC("t2s").convert(text)


def main():
    ap = argparse.ArgumentParser(description="Whisper 转录文本后处理")
    ap.add_argument("input", help="输入文本文件")
    ap.add_argument("--fixes", default="", help="错字修正词表路径")
    ap.add_argument("--output", default="", help="输出文件（默认原地覆盖）")
    ap.add_argument("--no-simplify", action="store_true", help="不做繁体转简体")
    args = ap.parse_args()

    with open(args.input, encoding="utf-8") as f:
        text = f.read()

    # 1) 繁体 -> 简体（词表按简体书写，因此先转简体再套词表）
    if not args.no_simplify:
        text = to_simplified(text)

    # 2) 同音错字修正
    count = 0
    if args.fixes:
        for wrong, right in load_fixes(args.fixes):
            n = text.count(wrong)
            if n:
                text = text.replace(wrong, right)
                count += n

    out = args.output or args.input
    with open(out, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"[fix] 错字修正 {count} 处，输出: {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
