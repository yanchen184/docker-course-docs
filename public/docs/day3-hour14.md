# Day 3 第十四小時：Dockerfile 實戰與課程總結

---

## 一、前情提要（2 分鐘）

上堂課：Dockerfile 基本指令。

本堂課：實戰與總結
- Multi-stage Build
- 完整專案打包
- 常見問題排解
- 課程總回顧
- 銜接 Kubernetes

---

## 二、Multi-stage Build（15 分鐘）

### 為什麼需要

```
Stage 1: Build              Stage 2: Production
┌────────────────┐         ┌────────────────┐
│ 原始碼          │         │ 編譯後程式碼    │
│ 編譯工具        │  COPY   │ 生產依賴       │
│ devDependencies│  ──►   │               │
└────────────────┘         └────────────────┘
    1.2 GB                      200 MB
```

### Multi-stage Dockerfile

```dockerfile
# ===== Build Stage =====
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ===== Production Stage =====
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Go 範例（極致精簡）

```dockerfile
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o main .

FROM scratch
COPY --from=builder /app/main /main
ENTRYPOINT ["/main"]
```

最終映像只有幾 MB！

---

## 三、完整專案打包（15 分鐘）

### .dockerignore

```
node_modules
.git
.env
*.md
coverage
tests
```

### 完整 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm ci --only=production

FROM node:20-alpine
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --spider http://localhost:3000/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### 映像檔大小比較

| 版本 | 大小 |
|-----|------|
| node:20 + 所有檔案 | ~1.2 GB |
| node:20-slim + Multi-stage | ~300 MB |
| node:20-alpine + Multi-stage | ~150 MB |

---

## 四、常見問題排解（10 分鐘）

| 問題 | 原因 | 解決 |
|-----|------|------|
| 建構緩慢 | 快取失效 | 先 COPY package.json，再 COPY . |
| 映像太大 | 沒用 Multi-stage | 使用 alpine + Multi-stage |
| 容器無法啟動 | CMD 錯誤 | docker logs 檢查 |
| COPY 失敗 | .dockerignore 排除 | 檢查 build context |
| 權限問題 | 目錄屬於 root | COPY --chown |

### 診斷指令

```bash
docker history my-image:latest    # 查看每層大小
docker logs my-container          # 查看錯誤
docker run -it my-image sh        # 互動式除錯
```

---

## 五、課程總回顧（10 分鐘）

### Day 2：Docker 基礎

| 小時 | 主題 | 重點 |
|-----|------|------|
| 1 | 環境問題 | 為什麼需要容器 |
| 2 | Docker 架構 | Client-Daemon-Registry |
| 3 | 安裝 | CentOS、Ubuntu、Desktop |
| 4 | 基本指令（上）| pull、images、run、ps |
| 5 | 基本指令（下）| stop、rm、logs、exec |
| 6 | Nginx 實戰 | Port mapping、Volume |
| 7 | 實作練習 | 綜合應用 |

### Day 3：Docker 進階

| 小時 | 主題 | 重點 |
|-----|------|------|
| 8 | 映像檔深入 | 分層、儲存、快取 |
| 9 | 容器生命週期 | 狀態、資源限制、重啟 |
| 10 | 容器網路 | Bridge、Host、自訂網路 |
| 11 | Port Mapping | -p 語法、綁定策略 |
| 12 | Volume | 三種掛載、備份還原 |
| 13 | Dockerfile | 指令、建構 |
| 14 | Dockerfile 實戰 | Multi-stage、總結 |

### 最佳實踐速查

| 領域 | 實踐 |
|-----|------|
| 映像檔 | 指定版本、官方映像、alpine/slim |
| Dockerfile | Multi-stage、合併 RUN、非 root |
| 容器 | 一容器一程序、資源限制、健康檢查 |
| 網路 | 自訂網路、只暴露必要 port |
| Volume | 重要資料用 Volume、定期備份 |

---

## 六、銜接 Kubernetes（6 分鐘）

### Docker 的限制

- 只能單機
- 手動擴展
- 無高可用

### Docker → Kubernetes 對應

| Docker | Kubernetes |
|--------|------------|
| Container | Pod |
| docker run | kubectl create |
| docker compose | Deployment + Service |
| 手動擴展 | ReplicaSet 自動擴展 |
| 手動健康檢查 | Liveness/Readiness Probe |

### Kubernetes 解決

| 問題 | 解決方案 |
|-----|----------|
| 多主機管理 | Cluster |
| 容器調度 | Scheduler |
| 高可用 | ReplicaSet |
| 負載均衡 | Service |
| 滾動更新 | Deployment |

---

## 七、課程總結（2 分鐘）

### 學習成果

- 理解容器化價值
- 使用 Docker 指令管理容器
- 撰寫 Dockerfile 打包應用
- 設定網路和資料持久化
- 為 Kubernetes 做好準備

### 課後練習

1. 把自己的專案容器化
2. 用 Multi-stage Build 優化
3. 設定健康檢查
4. 嘗試多容器應用
5. 練習備份還原 Volume

### 推薦資源

- docs.docker.com
- hub.docker.com
- labs.play-with-docker.com
- kubernetes.io/docs

---

## 板書 / PPT 建議

1. Multi-stage Build 流程圖
2. 完整 Dockerfile 範例
3. 兩天課程內容總覽表
4. Docker 到 Kubernetes 對應表
