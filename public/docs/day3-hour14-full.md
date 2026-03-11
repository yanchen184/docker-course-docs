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
compose.yaml
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

## 五、發布映像檔（10 分鐘）

### 5.1 發布到 Docker Hub

映像檔建好之後，可以推送到 Docker Hub 讓其他人使用。流程就像 Git 一樣：先登入，再推送。

**步驟一：登入**

```bash
docker login -u your-username
# 輸入密碼後顯示 Login Succeeded
```

**步驟二：為映像檔加上標籤**

推送前映像檔名稱必須包含你的使用者名稱：

```bash
# 語法：docker tag 本地映像 使用者名/映像名:版本
docker tag my-app:v1 your-username/my-app:v1
```

**步驟三：推送**

```bash
docker push your-username/my-app:v1
```

推送時 Docker 會按照 Layer 逐層上傳，已存在的 Layer 會跳過，和 `docker pull` 的機制一樣。

**步驟四：登出**

```bash
docker logout
```

### 5.2 發布到私有映像檔倉庫

企業中通常不會把映像檔放到公開的 Docker Hub，而是使用私有倉庫。以阿里雲容器鏡像服務為例：

1. **建立命名空間**：在阿里雲容器鏡像服務中建立一個命名空間（用於隔離不同專案）
2. **建立映像檔倉庫**：在命名空間下建立倉庫，可選擇公開或私有
3. **按照頁面指引操作**：阿里雲會提供完整的登入、標籤、推送命令

```bash
# 登入阿里雲 Registry
docker login --username=your-username registry.cn-hangzhou.aliyuncs.com

# 標籤
docker tag my-app:v1 registry.cn-hangzhou.aliyuncs.com/your-namespace/my-app:v1

# 推送
docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/my-app:v1
```

其他雲端廠商（AWS ECR、GCP Artifact Registry、Azure Container Registry）的操作流程類似。

### 5.3 Docker 完整流程總覽

到這裡，Docker 的完整工作流程就串起來了：

```
Dockerfile ──► docker build ──► Image ──► docker run ──► Container
                                  │                         │
                            docker push              docker commit
                                  │                         │
                                  ▼                         │
                            Docker Hub ◄────────────────────┘
                                  │
                            docker pull
                                  │
                                  ▼
                               Image
```

另外，映像檔也可以透過檔案傳輸（離線部署）：

```bash
# 匯出映像檔為 tar 檔案
docker save -o my-app.tar my-app:v1

# 在另一台機器匯入
docker load -i my-app.tar
```

不過有了 Docker Hub 或私有倉庫後，通常直接 `push` / `pull` 就好，`save` / `load` 主要用於離線環境。

---

## 六、Spring Boot 微服務打包（5 分鐘）

### 6.1 打包流程

將 Spring Boot 應用打包成 Docker 映像檔只需要幾步：

1. 用 Maven/Gradle 打包成 jar 檔
2. 撰寫 Dockerfile
3. 建構映像檔
4. 執行

### 6.2 Dockerfile 範例

```dockerfile
FROM java:8

COPY *.jar /app.jar

# 設定伺服器埠（可選）
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app.jar"]
```

### 6.3 建構和執行

```bash
# 把 jar 檔和 Dockerfile 放在同一目錄
docker build -t my-spring-app .

# 執行
docker run -d -p 8080:8080 --name spring-app my-spring-app
```

以後交付專案時，只需要給對方一個映像檔（或映像檔名稱），對方直接 `docker pull` + `docker run` 就能跑起來，不用再操心環境配置。

---

## 七、實戰：Docker 搭建 Redis 叢集（5 分鐘）

如果想把前面學到的 Docker 網路、容器啟動與設定管理串起來，可以快速搭建一個 Redis 叢集來體驗多節點服務的概念。

### 7.1 建立叢集網路

```bash
docker network create redis --subnet 172.38.0.0/16
```

### 7.2 批次建立配置檔

用 shell 腳本一次建立 6 個 Redis 節點的配置：

```bash
for port in $(seq 1 6); do
mkdir -p /mydata/redis/node-${port}/conf
cat << EOF > /mydata/redis/node-${port}/conf/redis.conf
port 6379
bind 0.0.0.0
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
cluster-announce-ip 172.38.0.1${port}
cluster-announce-port 6379
cluster-announce-bus-port 16379
appendonly yes
EOF
done
```

### 7.3 啟動 6 個 Redis 容器

```bash
# 範例：啟動第一個節點
docker run -d -p 6371:6379 -p 16371:16379 --name redis-1 \
  -v /mydata/redis/node-1/data:/data \
  -v /mydata/redis/node-1/conf/redis.conf:/etc/redis/redis.conf \
  --net redis --ip 172.38.0.11 \
  redis:5.0.9-alpine3.11 redis-server /etc/redis/redis.conf

# 依此類推啟動 redis-2 到 redis-6（改埠號和 IP）
```

### 7.4 建立叢集

```bash
# 進入任一個 Redis 容器
docker exec -it redis-1 sh

# 建立叢集（3 主 3 從）
redis-cli --cluster create \
  172.38.0.11:6379 172.38.0.12:6379 172.38.0.13:6379 \
  172.38.0.14:6379 172.38.0.15:6379 172.38.0.16:6379 \
  --cluster-replicas 1
```

叢集建好後，可以測試高可用：停掉一個主節點，對應的從節點會自動升為主節點，資料不會遺失。這展示了 Docker 在快速搭建分散式環境方面的優勢——傳統方式至少需要 6 台機器，用 Docker 一台機器就能搞定。

---

## 八、Docker 課程總回顧（10 分鐘）

### 8.1 兩天學習內容

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
| 14 | Dockerfile 實戰 | Multi-stage、發布映像、完整範例 |

### 8.2 核心概念回顧

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

### 8.3 重要指令速查

**映像檔**

```bash
docker pull nginx:alpine
docker images
docker rmi nginx
docker build -t myapp:v1 .
docker tag myapp:v1 username/myapp:v1
docker login
docker push username/myapp:v1
docker save -o myapp.tar myapp:v1
docker load -i myapp.tar
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

### 8.4 最佳實踐回顧

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

## 九、銜接 Kubernetes（6 分鐘）

### 9.1 Docker 的限制

單機 Docker 可以管理幾個、幾十個容器。

但當你有：
- 數百個容器
- 多台主機
- 需要高可用性
- 需要自動擴展
- 需要滾動更新

單機 Docker 不夠用了。

### 9.2 為什麼需要 Kubernetes

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

### 9.3 Docker 到 Kubernetes

Docker 的概念在 Kubernetes 裡的對應：

| Docker | Kubernetes |
|--------|------------|
| Container | Pod |
| docker run | kubectl create |
| docker compose | Deployment + Service |
| 手動擴展 | ReplicaSet 自動擴展 |
| 手動健康檢查 | Liveness/Readiness Probe |

### 9.4 下一步學習

Kubernetes 課程將包含：

- Kubernetes 架構（Master、Node）
- Pod 基本操作
- Deployment 部署
- Service 網路
- Ingress 入口
- ConfigMap 和 Secret
- 持久化儲存
- Helm 套件管理

### 9.5 Docker 技能的延續

你在 Docker 學到的：
- 容器化思維
- Dockerfile 撰寫
- 映像檔管理
- 網路和 Volume 概念

這些在 Kubernetes 都會用到！

Kubernetes 是 Docker 的延伸，不是替代。

---

## 十、課程總結與問答（2 分鐘）

### 10.1 學習成果

完成這兩天的課程，你應該能夠：

- 理解容器化的價值
- 使用 Docker 指令管理容器
- 撰寫 Dockerfile 打包應用程式
- 發布映像檔到 Docker Hub 或私有倉庫
- 設定網路和資料持久化
- 為 Kubernetes 做好準備

### 10.2 課後練習建議

1. 把自己的專案容器化
2. 用 Multi-stage Build 優化映像檔
3. 設定適當的健康檢查
4. 嘗試多容器應用（資料庫 + 應用）
5. 練習備份和還原 Volume

### 10.3 推薦資源

- Docker 官方文件：docs.docker.com
- Docker Hub：hub.docker.com
- Play with Docker：labs.play-with-docker.com
- Kubernetes 官方文件：kubernetes.io/docs

### 10.4 下次見

下一堂課，我們將進入 Kubernetes 的世界！

---

## 板書 / PPT 建議

1. Multi-stage Build 流程圖
2. 完整 Dockerfile 範例
3. Docker 完整流程圖（Dockerfile → build → Image → run → Container → push → Registry）
4. docker login / tag / push 指令流程
5. 兩天課程內容總覽表
6. Docker 到 Kubernetes 對應表
7. Redis 叢集架構圖（3 主 3 從）
