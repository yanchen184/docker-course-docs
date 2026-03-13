#!/usr/bin/env python3
"""
批次將逐字稿轉換為語音 MP3
使用 Edge TTS（微軟免費 TTS 引擎）
"""

import asyncio
import edge_tts
import re
import os
import sys

VOICE = "zh-TW-YunJheNeural"  # 台灣男聲
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(PROJECT_ROOT, "public", "docs")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "audio")

HOURS = [
    ("day2-hour1-full.md", "day2-hour1.mp3", "Day2 Hour1：環境一致性問題與容器技術"),
    ("day2-hour2-full.md", "day2-hour2.mp3", "Day2 Hour2：Docker 架構與工作原理"),
    ("day2-hour4-full.md", "day2-hour4.mp3", "Day2 Hour4：Docker 基本指令（上）"),
    ("day2-hour5-full.md", "day2-hour5.mp3", "Day2 Hour5：Docker 基本指令（下）"),
    ("day2-hour6-full.md", "day2-hour6.mp3", "Day2 Hour6：Nginx 容器實戰"),
]


def clean_transcript(md_path: str) -> str:
    """把 Markdown 逐字稿整理成適合朗讀的純文字"""
    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    # 移除 markdown 標題符號，但保留文字
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)

    # 移除水平線
    text = re.sub(r"^---+\s*$", "", text, flags=re.MULTILINE)

    # 移除程式碼區塊（整塊移除）
    text = re.sub(r"```[\s\S]*?```", "", text)

    # 移除行內程式碼的反引號，保留裡面的文字
    text = re.sub(r"`([^`]+)`", r"\1", text)

    # 移除表格（以 | 開頭的行）
    text = re.sub(r"^\|.*$", "", text, flags=re.MULTILINE)

    # 移除 markdown 粗體/斜體符號
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)

    # 移除 blockquote 符號
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)

    # 移除 markdown 連結，保留文字
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)

    # 移除圖片語法
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)

    # 移除列表符號
    text = re.sub(r"^[\s]*[-*]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[\s]*\d+\.\s+", "", text, flags=re.MULTILINE)

    # 移除「板書 / PPT 建議」之後的內容
    idx = text.find("板書")
    if idx > 0:
        text = text[:idx]

    # 把多個連續空行縮成一個
    text = re.sub(r"\n{3,}", "\n\n", text)

    # 移除首尾空白
    text = text.strip()

    return text


async def generate_audio(text: str, output: str, title: str):
    """用 Edge TTS 生成語音"""
    print(f"  語音引擎：{VOICE}")
    print(f"  文字長度：{len(text)} 字")
    print(f"  輸出檔案：{output}")
    print("  正在生成語音...")

    communicate = edge_tts.Communicate(text, VOICE, rate="+5%")
    await communicate.save(output)

    size_mb = os.path.getsize(output) / (1024 * 1024)
    print(f"  完成！{size_mb:.1f} MB\n")


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 60)
    print("批次生成 Day2 課程語音 MP3")
    print(f"語音：{VOICE}（台灣男聲）")
    print(f"輸出目錄：{OUTPUT_DIR}")
    print("=" * 60)

    results = []

    for md_file, mp3_file, title in HOURS:
        md_path = os.path.join(DOCS_DIR, md_file)
        mp3_path = os.path.join(OUTPUT_DIR, mp3_file)

        print(f"\n[{title}]")

        if not os.path.exists(md_path):
            print(f"  跳過：找不到 {md_path}")
            continue

        # 如果已經存在且不是 hour6（hour6 之前已生成），可以跳過
        # 但這裡我們全部重新生成確保一致性

        text = clean_transcript(md_path)
        await generate_audio(text, mp3_path, title)

        size_mb = os.path.getsize(mp3_path) / (1024 * 1024)
        results.append((title, mp3_file, len(text), size_mb))

    print("=" * 60)
    print("全部完成！")
    print("=" * 60)
    for title, mp3, chars, size in results:
        print(f"  {title}")
        print(f"    {chars} 字 → {mp3} ({size:.1f} MB)")
    print(f"\n播放方式：open {OUTPUT_DIR}/day2-hour1.mp3")


if __name__ == "__main__":
    asyncio.run(main())
