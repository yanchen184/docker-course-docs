# Day 3 第十四小時：Dockerfile 實戰與課程總結

---

## 一、前情提要（2 分鐘）

上堂課學了 Dockerfile 基本指令。

這堂課進入實戰：
- Multi-stage Build
- 完整專案打包
- 常見問題排解
- 課程總回顧
- 銜接 Kubernetes

---

## 二、Multi-stage Build（15 分鐘）

### 2.1 為什麼需要 Multi-stage

傳統 Dockerfile 的問題：

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

這個映像檔會包含：
- 原始碼
- 開發依賴（devDependencies）
- 建構工具（TypeScript、Webpack 等）

結果：映像檔很大，而且有不必要的檔案。

### 2.2 Multi-stage Build 原理

```
Stage 1: Build Stage          Stage 2: Production Stage
┌─────────────────────┐       ┌─────────────────────┐
│ Node.js + npm       │       │ Node.js（精簡）      │
│ 原始碼              │  ──►  │ 編譯後的程式碼       │
│ 編譯工具            │ COPY  │ 生產依賴            │
│ devDependencies     │       │                     │
│ 編譯後的程式碼       │       │                     │
└─────────────────────┘       └─────────────────────┘
     1.2 GB                        200 MB
```

只把需要的東西複製到最終映像檔。

### 2.3 Multi-stage Dockerfile

```dockerfile
# ===== Stage 1: Build =====
FROM node:20 AS builder

WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm ci

# 複製原始碼並建構
COPY . .
RUN npm run build

# ===== Stage 2: Production =====
FROM node:20-slim

WORKDIR /app

# 只複製需要的檔案
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 非 root 使用者
RUN useradd -m appuser
USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 2.4 關鍵語法

**命名 Stage**

```dockerfile
FROM node:20 AS builder
```

**從其他 Stage 複製**

```dockerfile
COPY --from=builder /app/dist ./dist
```

**從外部映像檔複製**

```dockerfile
COPY --from=nginx:alpine /etc/nginx/nginx.conf /etc/nginx/
```

### 2.5 Go 語言範例

Go 可以編譯成靜態二進位，Multi-stage 效果更明顯：

```dockerfile
# Build stage
FROM golang:1.21 AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# 靜態編譯
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Production stage - 使用空映像！
FROM scratch

COPY --from=builder /app/main /main

ENTRYPOINT ["/main"]
```

最終映像檔只有幾 MB，因為 `scratch` 是空的。

### 2.6 Java 範例

```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn package -DskipTests

# Production stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 三、完整專案打包實戰（15 分鐘）

### 3.1 專案結構

假設有一個 Node.js + TypeScript 專案：

```
my-api/
├── src/
│   ├── index.ts
│   ├── routes/
│   └── services/
├── package.json
├── package-lock.json
├── tsconfig.json
├── .dockerignore
└── Dockerfile
```

### 3.2 .dockerignore

```
# .dockerignore
node_modules
npm-debug.log
dist
.git
.gitignore
.env
.env.*
*.md
.vscode
.idea
coverage
tests
__tests__
*.test.ts
*.spec.ts
Dockerfile
docker-compose.yml
```

### 3.3 完整 Dockerfile

```dockerfile
# ===== Build Stage =====
FROM node:20-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝所有依賴（包含 devDependencies）
RUN npm ci

# 複製原始碼
COPY tsconfig.json ./
COPY src ./src

# 建構 TypeScript
RUN npm run build

# 移除 devDependencies，只留生產依賴
RUN npm ci --only=production

# ===== Production Stage =====
FROM node:20-alpine

# 安裝 dumb-init（正確處理信號）
RUN apk add --no-cache dumb-init

# 設定環境變數
ENV NODE_ENV=production

# 建立非 root 使用者
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 設定工作目錄
WORKDIR /app

# 從 builder 複製檔案
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# 切換使用者
USER appuser

# 暴露 port
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 使用 dumb-init 啟動
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### 3.4 為什麼用 dumb-init

Node.js（和大多數應用程式）不善於處理 Linux 信號。

問題：
- `docker stop` 發送 SIGTERM
- Node.js 可能不正確處理
- 導致強制 kill（資料可能遺失）

`dumb-init` 是一個輕量的 init 系統，正確轉發信號。

### 3.5 建構和測試

```bash
# 建構
docker build -t my-api:v1 .

# 查看大小
docker images my-api:v1

# 執行
docker run -d --name my-api \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  my-api:v1

# 查看日誌
docker logs -f my-api

# 測試健康檢查
docker inspect --format='{{.State.Health.Status}}' my-api

# 停止（測試優雅關閉）
docker stop my-api
```

### 3.6 映像檔大小優化

**優化前後比較**

| 版本 | 大小 |
|-----|------|
| node:20 + 所有檔案 | ~1.2 GB |
| node:20-slim + Multi-stage | ~300 MB |
| node:20-alpine + Multi-stage | ~150 MB |

**優化技巧**

1. 使用 alpine 基礎映像
2. Multi-stage build
3. 只安裝生產依賴
4. 清理快取
5. 合併 RUN 指令

---

## 四、常見問題排解（10 分鐘）

### 4.1 建構緩慢

**問題**：每次建構都重新安裝依賴

**原因**：COPY . . 在 npm install 之前，任何檔案變動都導致快取失效

**解決**：先複製 package.json

```dockerfile
# 好
COPY package*.json ./
RUN npm install
COPY . .

# 不好
COPY . .
RUN npm install
```

### 4.2 映像檔太大

**診斷**

```bash
docker history my-image:latest
```

查看每一層的大小。

**常見原因**

- 沒用 Multi-stage
- 基礎映像太大（用 alpine）
- 沒清理快取
- 複製了不需要的檔案（用 .dockerignore）

### 4.3 容器無法啟動

**診斷步驟**

```bash
# 1. 查看日誌
docker logs my-container

# 2. 互動式執行
docker run -it my-image sh

# 3. 檢查 CMD/ENTRYPOINT
docker inspect my-image --format='{{.Config.Cmd}}'
docker inspect my-image --format='{{.Config.Entrypoint}}'
```

**常見原因**

- 命令不存在
- 權限問題
- 缺少依賴
- 環境變數未設定

### 4.4 COPY 失敗

**錯誤訊息**

```
COPY failed: file not found in build context
```

**原因**

- 檔案不在 build context
- 被 .dockerignore 排除
- 路徑錯誤

**診斷**

```bash
# 查看 build context 裡有什麼
docker build -t test --progress=plain .
```

### 4.5 權限問題

**問題**：容器內無法寫入檔案

**原因**：使用非 root 使用者，但目錄屬於 root

**解決**

```dockerfile
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data
USER appuser
```

或用 COPY --chown：

```dockerfile
COPY --chown=appuser:appgroup . .
```

---

## 五、Docker 課程總回顧（10 分鐘）

### 5.1 兩天學習內容

**Day 2：Docker 基礎**

| 小時 | 主題 | 重點 |
|-----|------|------|
| 1 | 環境一致性問題 | 為什麼需要容器 |
| 2 | Docker 架構 | Client-Daemon-Registry |
| 3 | Docker 安裝 | CentOS、Ubuntu、Desktop |
| 4 | 基本指令（上） | pull、images、run、ps |
| 5 | 基本指令（下） | stop、rm、logs、exec |
| 6 | Nginx 實戰 | Port mapping、Volume |
| 7 | 實作練習 | 綜合應用 |

**Day 3：Docker 進階**

| 小時 | 主題 | 重點 |
|-----|------|------|
| 8 | 映像檔深入 | 分層、儲存、快取 |
| 9 | 容器生命週期 | 狀態、資源限制、重啟 |
| 10 | 容器網路 | Bridge、Host、自訂網路 |
| 11 | Port Mapping | -p 語法、綁定策略 |
| 12 | Volume | 三種掛載、備份還原 |
| 13 | Dockerfile | 指令、建構 |
| 14 | Dockerfile 實戰 | Multi-stage、完整範例 |

### 5.2 核心概念回顧

**容器 vs 虛擬機**

```
容器                        虛擬機
┌─────────────────┐        ┌─────────────────┐
│    App A        │        │    App A        │
├─────────────────┤        ├─────────────────┤
│   Container     │        │   Guest OS      │
├─────────────────┤        ├─────────────────┤
│   Docker Engine │        │   Hypervisor    │
├─────────────────┤        ├─────────────────┤
│   Host OS       │        │   Host OS       │
└─────────────────┘        └─────────────────┘
     輕量、快速                  完全隔離
```

**Docker 三元素**

```
Registry (Docker Hub)
        │
        │ docker pull
        ▼
      Image ──────────► Container
              docker run
```

**Dockerfile 流程**

```
Dockerfile ──► docker build ──► Image ──► docker run ──► Container
```

### 5.3 重要指令速查

**映像檔**

```bash
docker pull nginx:alpine
docker images
docker rmi nginx
docker build -t myapp:v1 .
```

**容器**

```bash
docker run -d --name web -p 8080:80 nginx
docker ps -a
docker logs -f web
docker exec -it web sh
docker stop web
docker rm web
```

**網路**

```bash
docker network create mynet
docker run --network mynet ...
docker network ls
```

**Volume**

```bash
docker volume create mydata
docker run -v mydata:/data ...
docker volume ls
```

### 5.4 最佳實踐回顧

1. **映像檔**
   - 指定版本，不用 latest
   - 使用官方映像
   - 選擇 alpine 或 slim

2. **Dockerfile**
   - Multi-stage build
   - 合併 RUN 減少 Layer
   - 不常變的放前面（利用快取）
   - 不用 root

3. **容器**
   - 一個容器一個程序
   - 設定資源限制
   - 使用健康檢查
   - 使用 restart policy

4. **網路**
   - 使用自訂網路（有 DNS）
   - 只暴露必要的 port
   - 敏感服務不要對外

5. **Volume**
   - 重要資料用 Volume
   - 定期備份
   - 給 Volume 有意義的名稱

---

## 六、銜接 Kubernetes（6 分鐘）

### 6.1 Docker 的限制

單機 Docker 可以管理幾個、幾十個容器。

但當你有：
- 數百個容器
- 多台主機
- 需要高可用性
- 需要自動擴展
- 需要滾動更新

單機 Docker 不夠用了。

### 6.2 為什麼需要 Kubernetes

Kubernetes 解決的問題：

| 問題 | Kubernetes 解決方案 |
|-----|---------------------|
| 多主機管理 | 叢集（Cluster） |
| 容器調度 | Scheduler |
| 高可用 | ReplicaSet |
| 負載均衡 | Service |
| 滾動更新 | Deployment |
| 設定管理 | ConfigMap、Secret |
| 儲存管理 | PersistentVolume |

### 6.3 Docker 到 Kubernetes

Docker 的概念在 Kubernetes 裡的對應：

| Docker | Kubernetes |
|--------|------------|
| Container | Pod |
| docker run | kubectl create |
| docker-compose | Deployment + Service |
| 手動擴展 | ReplicaSet 自動擴展 |
| 手動健康檢查 | Liveness/Readiness Probe |

### 6.4 下一步學習

Kubernetes 課程將包含：

- Kubernetes 架構（Master、Node）
- Pod 基本操作
- Deployment 部署
- Service 網路
- Ingress 入口
- ConfigMap 和 Secret
- 持久化儲存
- Helm 套件管理

### 6.5 Docker 技能的延續

你在 Docker 學到的：
- 容器化思維
- Dockerfile 撰寫
- 映像檔管理
- 網路和 Volume 概念

這些在 Kubernetes 都會用到！

Kubernetes 是 Docker 的延伸，不是替代。

---

## 七、課程總結與問答（2 分鐘）

### 7.1 學習成果

完成這兩天的課程，你應該能夠：

- 理解容器化的價值
- 使用 Docker 指令管理容器
- 撰寫 Dockerfile 打包應用程式
- 設定網路和資料持久化
- 為 Kubernetes 做好準備

### 7.2 課後練習建議

1. 把自己的專案容器化
2. 用 Multi-stage Build 優化映像檔
3. 設定適當的健康檢查
4. 嘗試多容器應用（資料庫 + 應用）
5. 練習備份和還原 Volume

### 7.3 推薦資源

- Docker 官方文件：docs.docker.com
- Docker Hub：hub.docker.com
- Play with Docker：labs.play-with-docker.com
- Kubernetes 官方文件：kubernetes.io/docs

### 7.4 下次見

下一堂課，我們將進入 Kubernetes 的世界！

---

## 板書 / PPT 建議

1. Multi-stage Build 流程圖
2. 完整 Dockerfile 範例
3. 兩天課程內容總覽表
4. Docker 到 Kubernetes 對應表
