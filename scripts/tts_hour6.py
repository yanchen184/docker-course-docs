#!/usr/bin/env python3
"""
將 Day2 Hour6 逐字稿轉換為語音 MP3
使用 Edge TTS（微軟免費 TTS 引擎）
"""

import asyncio
import edge_tts
import re
import os

# 台灣男聲
VOICE = "zh-TW-YunJheNeural"
OUTPUT_DIR = os.path.expanduser("~/docker-demo/audio")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "day2-hour6.mp3")


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


async def generate_audio(text: str, output: str):
    """用 Edge TTS 生成語音"""
    print(f"語音引擎：{VOICE}")
    print(f"文字長度：{len(text)} 字")
    print(f"輸出檔案：{output}")
    print("正在生成語音，請稍候...")

    communicate = edge_tts.Communicate(text, VOICE, rate="+5%")
    await communicate.save(output)

    size_mb = os.path.getsize(output) / (1024 * 1024)
    print(f"完成！檔案大小：{size_mb:.1f} MB")


def main():
    md_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "public", "docs", "day2-hour6-full.md"
    )

    if not os.path.exists(md_path):
        print(f"找不到逐字稿：{md_path}")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 50)
    print("Day2 Hour6 逐字稿 → 語音 MP3")
    print("=" * 50)

    # 整理文字
    text = clean_transcript(md_path)

    # 預覽前 200 字
    print(f"\n--- 預覽前 200 字 ---")
    print(text[:200])
    print("...\n")

    # 生成語音
    asyncio.run(generate_audio(text, OUTPUT_FILE))
    print(f"\n播放方式：open {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
