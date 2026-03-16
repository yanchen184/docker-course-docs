#!/usr/bin/env python3
"""
批次將逐字稿轉換為語音 MP3
使用 Edge TTS（微軟免費 TTS 引擎）
"""

import asyncio
import edge_tts
import re
import os

VOICE = "zh-TW-YunJheNeural"  # 台灣男聲
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(PROJECT_ROOT, "public", "docs")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "audio")

HOURS = [
    ("day3-hour8-full.md", "day3-hour8.mp3", "Day3 Hour8：Volume 資料持久化"),
    ("day3-hour9-full.md", "day3-hour9.mp3", "Day3 Hour9：容器網路與 Port Mapping 進階"),
    ("day3-hour10-full.md", "day3-hour10.mp3", "Day3 Hour10：Dockerfile 基礎"),
    ("day3-hour11-full.md", "day3-hour11.mp3", "Day3 Hour11：Dockerfile 進階與最佳化"),
    ("day3-hour12-full.md", "day3-hour12.mp3", "Day3 Hour12：Dockerfile 實戰與映像檔發佈"),
    ("day3-hour13-full.md", "day3-hour13.mp3", "Day3 Hour13：Docker Compose 基礎與進階"),
    ("day3-hour14-full.md", "day3-hour14.mp3", "Day3 Hour14：Docker Compose 實戰與課程總結"),
]


def clean_transcript(md_path: str) -> str:
    """把 Markdown 逐字稿整理成適合朗讀的純文字"""
    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    # 移除「板書 / PPT 建議」之後的內容
    idx = text.find("板書")
    if idx > 0:
        text = text[:idx]

    # 移除 markdown 標題符號，但保留文字
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)

    # 移除水平線
    text = re.sub(r"^---+\s*$", "\n", text, flags=re.MULTILINE)

    # 處理程式碼區塊：轉成口語描述
    def replace_code_block(match):
        code = match.group(0)
        # 取得語言標記
        lang_match = re.match(r"```(\w*)", code)
        lang = lang_match.group(1) if lang_match else ""

        # 提取程式碼內容
        content = re.sub(r"```\w*\n?", "", code)
        content = content.strip()

        if not content:
            return ""

        # 如果是純指令（bash/shell），轉成口語
        if lang in ("bash", "sh", "shell", ""):
            lines = [l.strip() for l in content.split("\n") if l.strip() and not l.strip().startswith("#")]
            if not lines:
                # 只有註解，提取註解內容
                comments = [l.strip().lstrip("#").strip() for l in content.split("\n") if l.strip().startswith("#")]
                if comments:
                    return "。".join(comments) + "。\n"
                return ""

            # 如果只有 1-2 行短指令，口語化
            if len(lines) <= 2:
                cmds = []
                for line in lines:
                    line = line.strip()
                    if line.startswith("$"):
                        line = line[1:].strip()
                    cmds.append(f"指令是 {line}")
                return "\n".join(cmds) + "\n"

            # 多行指令，簡化描述
            return f"這邊有一段指令，大家可以看講義上的範例。\n"

        # nginx 設定檔
        if lang == "nginx":
            return "這是一段 Nginx 設定檔，詳細內容請看講義。\n"

        # JSON
        if lang == "json":
            return "這是一段 JSON 格式的設定，詳細內容請看講義。\n"

        # Dockerfile
        if lang in ("dockerfile", "Dockerfile"):
            return "這是一段 Dockerfile，詳細內容請看講義。\n"

        # HTML
        if lang in ("html", "htm"):
            return "這是一段 HTML 程式碼，詳細內容請看講義。\n"

        # YAML (docker compose)
        if lang in ("yaml", "yml"):
            return "這是一段 YAML 設定檔，詳細內容請看講義。\n"

        # Python
        if lang in ("python", "py"):
            return "這是一段 Python 程式碼，詳細內容請看講義。\n"

        # JavaScript / TypeScript
        if lang in ("javascript", "js", "typescript", "ts"):
            return "這是一段程式碼，詳細內容請看講義。\n"

        # Java
        if lang == "java":
            return "這是一段 Java 程式碼，詳細內容請看講義。\n"

        # Go
        if lang == "go":
            return "這是一段 Go 程式碼，詳細內容請看講義。\n"

        # 其他程式碼
        return "這邊有一段程式碼範例，請看講義。\n"

    text = re.sub(r"```[\s\S]*?```", replace_code_block, text)

    # 處理 ASCII 圖表（連續多行包含 ┌ ├ └ │ ─ 等字元）
    text = re.sub(r"(^.*[┌┐├┤└┘│─═╔╗╚╝║]+.*\n)+", "這邊有一個圖表，請看講義上的示意圖。\n", text, flags=re.MULTILINE)

    # 處理表格：提取表頭作為口語描述
    def replace_table(match):
        table_text = match.group(0)
        lines = [l.strip() for l in table_text.strip().split("\n") if l.strip()]
        if len(lines) >= 1:
            # 取第一行（表頭）
            headers = [h.strip() for h in lines[0].split("|") if h.strip()]
            if headers:
                return f"這邊有一個表格，欄位包括{'、'.join(headers)}，詳細內容請看講義。\n"
        return "這邊有一個表格，請看講義。\n"

    text = re.sub(r"(\|.*\|[\s]*\n)+", replace_table, text)

    # 移除行內程式碼的反引號，保留裡面的文字
    text = re.sub(r"`([^`]+)`", r"\1", text)

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

    # 把技術指令轉成更口語的說法
    replacements = [
        (r"docker run", "docker run"),
        (r"docker pull", "docker pull"),
        (r"docker ps", "docker ps"),
        (r"docker images", "docker images"),
        (r"docker rm", "docker rm"),
        (r"docker rmi", "docker rmi"),
        (r"docker exec", "docker exec"),
        (r"docker stop", "docker stop"),
        (r"docker kill", "docker kill"),
        (r"docker logs", "docker logs"),
        (r"docker cp", "docker cp"),
        (r"docker commit", "docker commit"),
        (r"docker inspect", "docker inspect"),
        (r"docker compose up", "docker compose up"),
        (r"docker compose down", "docker compose down"),
        (r"docker compose", "docker compose"),
        (r"docker build", "docker build"),
        (r"docker push", "docker push"),
        (r"docker tag", "docker tag"),
        (r"docker volume", "docker volume"),
        (r"docker network", "docker network"),
        (r"docker history", "docker history"),
        (r"docker save", "docker save"),
        (r"docker load", "docker load"),
        (r"docker stats", "docker stats"),
        (r"docker update", "docker update"),
        (r"compose\.yaml", "compose 點 yaml"),
        (r"compose\.yml", "compose 點 yml"),
        (r"docker-compose\.yml", "docker dash compose 點 yml"),
        (r"Dockerfile", "Dockerfile"),
        (r"\.dockerignore", "點 dockerignore"),
        (r"\.env", "點 env"),
        (r"\.gitignore", "點 gitignore"),
        (r"Ctrl\+C", "Control C"),
        (r"Ctrl\+P\+Q", "Control P Q"),
        (r"Ctrl \+ C", "Control C"),
        (r"Ctrl \+ P \+ Q", "Control P Q"),
        (r"/bin/bash", "bin bash"),
        (r"/bin/sh", "bin sh"),
        (r"0\.0\.0\.0", "零點零點零點零"),
        (r"127\.0\.0\.1", "一二七點零點零點一"),
        (r"localhost:(\d+)", r"localhost 冒號 \1"),
        (r"(\d+):(\d+)", r"\1 對應 \2"),
    ]
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text)

    # 在段落之間加停頓（兩個換行變成停頓標記）
    text = re.sub(r"\n{2,}", "\n\n", text)

    # 移除首尾空白
    text = text.strip()

    return text


async def generate_audio(text: str, output: str):
    """用 Edge TTS 生成語音"""
    print(f"  語音引擎：{VOICE}")
    print(f"  文字長度：{len(text)} 字")
    print(f"  輸出檔案：{output}")
    print("  正在生成語音...")

    communicate = edge_tts.Communicate(text, VOICE, rate="+5%")
    await communicate.save(output)

    size_mb = os.path.getsize(output) / (1024 * 1024)
    print(f"  完成！{size_mb:.1f} MB\n")
    return size_mb


SEM = asyncio.Semaphore(2)  # 最多同時 2 個請求，避免限流
MAX_RETRIES = 3


async def generate_audio_with_retry(text: str, output: str, title: str):
    """帶重試機制的語音生成"""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            communicate = edge_tts.Communicate(text, VOICE, rate="+5%")
            await communicate.save(output)
            size_mb = os.path.getsize(output) / (1024 * 1024)
            return size_mb
        except Exception as e:
            print(f"  [{title}] 第 {attempt} 次嘗試失敗：{e}")
            if attempt < MAX_RETRIES:
                wait = attempt * 10
                print(f"  [{title}] 等待 {wait} 秒後重試...")
                await asyncio.sleep(wait)
            else:
                raise


async def process_hour(md_file, mp3_file, title):
    """處理單個小時的 TTS 生成"""
    md_path = os.path.join(DOCS_DIR, md_file)
    mp3_path = os.path.join(OUTPUT_DIR, mp3_file)

    if not os.path.exists(md_path):
        print(f"  [{title}] 跳過：找不到 {md_path}")
        return None

    text = clean_transcript(md_path)
    print(f"  [{title}] 開始生成（{len(text)} 字）...")

    async with SEM:
        size = await generate_audio_with_retry(text, mp3_path, title)

    print(f"  [{title}] 完成！{size:.1f} MB")
    return (title, mp3_file, len(text), size)


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 60)
    print("批次生成 Day3 課程語音 MP3（並行模式）")
    print(f"語音：{VOICE}（台灣男聲）")
    print(f"輸出目錄：{OUTPUT_DIR}")
    print("=" * 60)

    tasks = [process_hour(md, mp3, title) for md, mp3, title in HOURS]
    raw_results = await asyncio.gather(*tasks)
    results = [r for r in raw_results if r is not None]

    print("\n" + "=" * 60)
    print("全部完成！")
    print("=" * 60)
    total_size = 0
    for title, mp3, chars, size in results:
        print(f"  {title}")
        print(f"    {chars} 字 → {mp3} ({size:.1f} MB)")
        total_size += size
    print(f"\n  總大小：{total_size:.1f} MB")
    print(f"\n播放：open {OUTPUT_DIR}/day3-hour8.mp3")


if __name__ == "__main__":
    asyncio.run(main())
