# Docker 課程講稿閱讀器

> **14 小時 Docker 完整課程的線上講稿** — Day 2(7 小時)+ Day 3(7 小時),從基礎概念到 production 部署。

**講師**：陳彥彤 YC（Java 後端 8 年 · AI 工程師 2 年）｜[bobchen184@gmail.com](mailto:bobchen184@gmail.com) ｜ [品牌站](https://yanchen184.github.io/ai-lecturer-bob/)

**🌐 線上閱讀**：https://yanchen184.github.io/docker-course-docs/

---

## 課程結構

| Day | 小時數 | 內容範圍 |
|:---:|:---:|---|
| **Day 2** | hour1 → hour7 | Docker 核心 — image / container / volume / network / Compose |
| **Day 3** | hour8 → hour14 | 進階 + production — 多階段 build / 私有 registry / 安全 / 部署 |

每小時都有 **summary 版**(快速複習)+ **full 版**(完整講稿)兩種。對應檔案見下方「Active Content」。

---

## 為什麼做這個閱讀器

實體授課用投影片,但學員上課後常常想回頭翻講師講的話。傳統做法是發 PDF,但:
- PDF 在手機讀不友善
- 沒法搜尋特定關鍵字快速跳轉
- 學員拿到後就石沉大海,沒人會主動回看

這份閱讀器解決上面 3 個問題:**RWD 排版 + 全文搜尋 + 一鍵連結分享**。

---

## 企業內訓資訊

- 14 小時 Docker 課程支援企業內訓客製化(可調整為 8h / 12h / 16h 版本)
- 對應主題:Docker、Kubernetes、CI/CD、DevOps
- 來信討論:[bobchen184@gmail.com](mailto:bobchen184@gmail.com)
- 更多教學內容:[ai-lecturer-bob](https://yanchen184.github.io/ai-lecturer-bob/)

---

# 👇 以下為閱讀器技術文件

## Tech Stack

Docker course material viewer built with React, TypeScript, and Vite.

## Development

```bash
npm ci
npm run dev
```

The app renders the active course content from `public/docs/` and maps it through `src/App.tsx`.

## Active Content

These files define the active lesson flow rendered by the app, plus the schedule used to keep titles in sync:

- `src/App.tsx`
- `public/docs/day2-hour1.md` to `public/docs/day2-hour7.md`
- `public/docs/day2-hour1-full.md` to `public/docs/day2-hour7-full.md`
- `public/docs/day3-hour8.md` to `public/docs/day3-hour14.md`
- `public/docs/day3-hour8-full.md` to `public/docs/day3-hour14-full.md`
- `public/docs/course-schedule.md`

## Supplemental Files

The following files are not rendered directly by the app and should be treated as supporting or archived material unless they are explicitly wired into the UI:

- `public/docs/day2-hour1-outline.md`
- `public/docs/day2-hour1-script.md`
- `public/docs/hands-on-labs.md`
- `public/docs/quizzes-and-breaks.md`
- `public/docs/notion-export-all.md`

## Validation

```bash
npm run build
npm run lint
```
