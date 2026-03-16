# Day 3 第十二小時：Dockerfile 實戰與映像檔發佈

---

## 一、開場（3 分鐘）

前兩堂課回顧：
- **Hour 10**：Dockerfile 所有指令 + 打包第一個 Flask 應用 → 能寫出可用的 Dockerfile
- **Hour 11**：.dockerignore、Best Practices、Multi-stage Build、推上 Docker Hub → 能寫出優化的 Dockerfile

本堂課目標：讓你在公司裡真正能用。
1. 完整打包 **Node.js + TypeScript** 生產級專案
2. 完整打包 **Spring Boot Java** 應用（JVM 容器坑）
3. **Dockerfile 常見問題排查寶典**

---

## 二、實戰一：Node.js + TypeScript 生產級專案（20 分鐘）

### 為什麼選 TypeScript 做第一個實戰

TypeScript 需要先編譯成 JavaScript 才能跑，這是 Multi-stage Build 最完美的使用場景：
- Build 階段：TypeScript 編譯器、型別定義、devDependencies
- Production 階段：只有編譯好的 JavaScript + 生產依賴

### 專案結構

```
my-ts-api/
├── src/index.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── .dockerignore
└── Dockerfile
```

**package.json 關鍵點：**

```json
{
  "scripts": { "build": "tsc", "start": "node dist/index.js" },
  "dependencies": { "express": "^4.18.2" },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/express": "^4.17.21",
    "ts-node": "^10.9.1"
  }
}
```

| 分類 | 套件 | 生產需要？ |
|------|------|-----------|
| dependencies | express | 是 |
| devDependencies | typescript, @types/*, ts-node | 否（編譯完就不需要）|

**tsconfig.json 關鍵設定：**

```json
{ "compilerOptions": { "outDir": "./dist", "rootDir": "./src" } }
```

流程：`src/index.ts` → tsc 編譯 → `dist/index.js`

**src/index.ts（含 /health 端點）：**

```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});
```

`/health` 端點是給 Docker HEALTHCHECK 用的，生產環境 Kubernetes 或負載均衡器也會用它判斷服務狀態。

### .dockerignore

```
node_modules        # 容器內重新安裝，本機的可能有幾百 MB
dist                # 容器內重新編譯，避免用到過期版本
.git
.env
.env.*              # 機密資訊絕不打包進映像
coverage
.vscode
```

### 完整 Dockerfile（Multi-stage）

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./   # 先複製，利用 cache
RUN npm ci                               # 安裝所有依賴（含 devDependencies）
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build                        # 編譯 TypeScript → dist/

# Stage 2: Production
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init         # 處理 PID 1 信號問題
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force   # 只裝生產依賴 + 清快取
COPY --from=builder /app/dist ./dist     # 只取編譯產物
RUN chown -R node:node /app
USER node                                # 非 root 執行
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Build Stage 設計決策

**Cache 策略（重要！）**

```dockerfile
# 壞的寫法：每次改原始碼，npm ci 就重跑
COPY . .
RUN npm ci

# 好的寫法：package.json 不變就用快取，npm ci 幾乎秒完成
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
```

**npm ci vs npm install：**

| 比較 | npm ci | npm install |
|------|--------|-------------|
| 依據 | 嚴格按 package-lock.json | 可能更新版本 |
| 衝突時 | 直接報錯 | 默默修改 |
| 適用場景 | Dockerfile、CI/CD | 本地開發 |

### Production Stage 設計決策

**dumb-init — PID 1 信號問題：**

```
有 dumb-init：
docker stop → SIGTERM → dumb-init(PID 1) → 轉發 → Node.js → 優雅關閉（1-2 秒）

沒有 dumb-init：
docker stop → SIGTERM → Node.js(PID 1) → 沒反應 → 10 秒後 SIGKILL → 強制殺掉
```

Node.js 不是設計來當 PID 1 的。dumb-init 當 PID 1，負責信號轉發和孤兒程序回收。

**`--omit=dev` 與 cache 清理：**

```dockerfile
RUN npm ci --omit=dev && npm cache clean --force
```

`&&` 合在同一個 RUN：若拆成兩行，第一層的快取空間不會真正釋放。

**`chown` 要在 `USER` 之前：**

```dockerfile
RUN chown -R node:node /app    # root 才能執行 chown
USER node                       # 切換後就沒有 chown 權限了
```

**ENTRYPOINT + CMD 分開寫的好處：**

```bash
# CMD 可以被覆蓋，方便 debug 進入容器
docker run -it my-ts-api:1.0.0 sh
# 執行的是：dumb-init -- sh（ENTRYPOINT 還在，信號正確）
```

### 建構與驗證

```bash
docker build -t my-ts-api:1.0.0 .
docker images my-ts-api
# SIZE: 約 125MB（單 stage 不優化可能 500MB+）

docker run -d --name ts-api -p 3000:3000 my-ts-api:1.0.0
curl http://localhost:3000/          # {"message":"Hello from TypeScript API!"}
curl http://localhost:3000/health    # {"status":"healthy","uptime":5.123}

docker exec ts-api whoami           # node（非 root）
docker exec ts-api ps aux
# PID 1: dumb-init -- node dist/index.js
# PID 7: node dist/index.js

time docker stop ts-api             # 應在 1-2 秒完成，非 10 秒
```

---

## 三、實戰二：Spring Boot Java 應用（15 分鐘）

### 為什麼要學 Java 的 Dockerfile

- Java 在企業中佔有率極高
- JVM 在容器裡有獨特的**記憶體管理坑**，不知道一定會踩到

### 專案結構

```
my-spring-app/
├── src/main/java/com/example/demo/DemoApplication.java
├── src/main/resources/application.yml
├── pom.xml
├── .dockerignore
└── Dockerfile
```

**.dockerignore：**

```
target    # 相當於 Node.js 的 node_modules，編譯產物
.git
.idea
.vscode
```

### 完整 Dockerfile（Multi-stage）

```dockerfile
# Stage 1: Build（用 Maven 編譯）
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B          # 先下載依賴，利用 cache
COPY src ./src
RUN mvn package -DskipTests -B            # 打包（跳過測試）

# Stage 2: Production（只需要 JRE）
FROM eclipse-temurin:21-jre-alpine AS production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup   # 建立非 root 使用者
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:InitialRAMPercentage=50.0 \
  -Djava.security.egd=file:/dev/./urandom"
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
```

### Build Stage 設計決策

```dockerfile
COPY pom.xml .
RUN mvn dependency:go-offline -B    # 先下載依賴（快取，否則改一行就重下載幾百 MB）
COPY src ./src
RUN mvn package -DskipTests -B      # 再打包，-DskipTests 避免重複跑測試
```

Maven 下載比 npm 慢，cache 效益更大。`-B` batch mode 讓 log 更乾淨。

**JDK vs JRE：**

| | JDK | JRE |
|--|-----|-----|
| 含編譯器 javac | 是 | 否 |
| 映像大小 | ~430MB | ~100MB（Alpine）|
| 生產環境需要 | 否 | 是 |

### JVM 在容器中的特殊設定（重要！）

**`-XX:+UseContainerSupport` — 歷史坑：**

舊版 Java 8 JVM 讀 `/proc/meminfo`（宿主機總記憶體）而非容器限制：

```
宿主機 32GB → 容器限制 512MB
JVM 以為有 32GB → 分配 8GB 堆記憶體 → 超出容器限制 → OOM Kill → 容器閃退
```

Java 10+ 加入容器感知，讀 cgroup 限制。`-XX:+UseContainerSupport` 啟用它（Java 11+ 預設開啟，但建議明確寫出）。

**`-XX:MaxRAMPercentage=75.0` vs `-Xmx`：**

| | MaxRAMPercentage=75.0 | -Xmx384m |
|--|----------------------|----------|
| 方式 | 按比例 | 絕對值 |
| 容器記憶體改變時 | 自動調整 | 需改 Dockerfile 重 build |
| 推薦 | 是 | 否 |

為什麼留 25%？JVM 除了 Heap 還需要：Metaspace、Code Cache、Thread Stack、Direct Buffers、GC Overhead。

**`-Djava.security.egd=file:/dev/./urandom` — 加速啟動：**

容器環境熵池補充慢，`/dev/random` 可能造成 Spring Boot 啟動卡住數十秒。改用 `/dev/urandom` 不阻塞。

**HEALTHCHECK start-period：**

```
Node.js：start-period=5s     （啟動很快）
Spring Boot：start-period=30s  （JVM 初始化 + Spring Context 掃描需要 10-30 秒）
```

### 建構與驗證

```bash
docker build -t my-spring-app:1.0.0 .
docker run -d --name spring-app -p 8080:8080 -m 512m my-spring-app:1.0.0

curl http://localhost:8080/       # {"message":"Hello from Spring Boot!"}

# 驗證 JVM 有正確讀取容器記憶體限制
docker exec spring-app java -XX:+PrintFlagsFinal -version 2>&1 | grep MaxHeapSize
# MaxHeapSize = 402653184（約 384MB = 512MB × 75%）
```

---

## 四、常見 Dockerfile 問題排查（15 分鐘）

每個問題格式：**症狀 → 原因 → 解法 → 診斷指令**

### 問題一：建構速度非常慢

**原因一：Build Context 太大**

```bash
docker build -t test . 2>&1 | head -3
# Sending build context to Docker daemon  850MB  ← 太大！正常應在幾 MB
```

解法：補 .dockerignore，排除 node_modules、.git、target 等。

**原因二：Cache 沒用好**

```dockerfile
# 壞：每次改原始碼就重跑 npm install
COPY . .
RUN npm install

# 好：package.json 不變就用快取
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
```

```bash
# 診斷：看每步是 CACHED 還是重新執行
docker build -t test . --progress=plain 2>&1 | grep -E "(CACHED|RUN)"
```

### 問題二：映像檔太大

**原因一：Base image 太肥**

| Base Image | 大小 |
|-----------|------|
| node:20 | ~350MB |
| node:20-slim | ~200MB |
| node:20-alpine | ~50MB |
| eclipse-temurin:21-jdk | ~430MB |
| eclipse-temurin:21-jre-alpine | ~100MB |
| python:3.12 | ~350MB |
| python:3.12-alpine | ~50MB |

**原因二：快取沒清理（注意 layer 陷阱）**

```dockerfile
# 壞：快取留在 layer，刪除無效
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean           # 這層只是新增「刪除」，底層快取還在

# 好：同一 RUN 裡清理
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
```

```bash
# 診斷：看哪一層特別大
docker history my-image:latest
```

### 問題三：容器啟動就退出

**第一步：永遠先看日誌**

```bash
docker logs my-container    # 90% 的答案在這裡
```

**常見原因一：Alpine 沒有 bash**

```dockerfile
# 錯誤：Alpine 只有 sh
CMD ["bash", "-c", "node app.js"]

# 正確
CMD ["node", "app.js"]
```

**常見原因二：程式找不到**

```bash
docker logs my-container
# Error: Cannot find module '/app/dist/index.js'

# 診斷：進去看檔案結構
docker run -it --entrypoint sh my-image
ls -la /app/dist/
```

**常見原因三：缺少環境變數**

```bash
docker logs my-container
# Error: connect ECONNREFUSED 127.0.0.1:3306

docker run -d -e DATABASE_URL=mysql://user:pass@host:3306/db my-app
```

**診斷工具箱：**

```bash
docker inspect my-container --format='{{.State.ExitCode}}'
# 137 = OOM Kill（記憶體不足）
# 143 = 正常 stop
# 1   = 應用程式錯誤

docker run -it --entrypoint sh my-image    # 覆蓋 entrypoint 進去除錯
```

### 問題四：COPY 失敗

```
COPY failed: file not found in build context or excluded by .dockerignore
```

**原因一：路徑相對於 Build Context，不是 Dockerfile 位置**

```bash
# 在 project/ 執行 docker build -f docker/Dockerfile .
# Build context = project/
COPY config/app.conf /app/   # 正確（相對於 project/）
COPY ../config/app.conf /app/ # 錯誤（不能跳出 build context）
```

**原因二：.dockerignore 排除了需要的檔案**

```bash
mv .dockerignore .dockerignore.bak
docker build -t test .
# 如果成功 → 問題在 .dockerignore
mv .dockerignore.bak .dockerignore
```

**原因三：Linux 大小寫敏感**

Mac 開發（不分大小寫）推到 CI/CD（Linux）失敗的經典坑。`README.md` 和 `Readme.md` 在 Linux 是不同檔案。

### 問題五：權限問題

```
Error: EACCES: permission denied, open '/app/data/logs.txt'
```

切換到非 root 使用者後，COPY、RUN 建立的檔案預設是 root 擁有，非 root 讀寫不了。

```dockerfile
# 解法一：COPY 時指定擁有者
COPY --chown=node:node dist/ /app/dist/

# 解法二：切換 USER 之前 chown（chown 需要 root 權限）
RUN mkdir -p /app/data && chown -R node:node /app
USER node
```

```bash
# 診斷
docker exec my-container ls -la /app/
docker exec my-container whoami
docker exec my-container id
```

### 排查流程決策樹

```
問題發生
├── 建構失敗？
│   ├── COPY 失敗 → 路徑、.dockerignore、大小寫
│   ├── RUN 失敗 → 看錯誤訊息（套件安裝、編譯問題）
│   └── 建構很慢 → build context 大小、cache 使用
├── 容器啟動失敗？
│   ├── docker logs → 看錯誤訊息
│   ├── 退出碼 137 → OOM Kill，增加記憶體
│   ├── 退出碼 1   → 應用程式錯誤，覆蓋 entrypoint 進去 debug
│   └── exec format error → CMD/ENTRYPOINT 格式問題
├── 容器跑起來但功能異常？
│   ├── 連不上 → 檢查 -p 和 EXPOSE
│   ├── 權限問題 → 檢查 USER 和檔案擁有者
│   └── 環境變數缺失 → docker exec env
└── 映像檔太大？
    ├── docker history → 看每層大小
    ├── Multi-stage 去除建構工具
    └── 換更小的 base image
```

---

## 五、Dockerfile 三堂課總結（10 分鐘）

### 學習路徑

| 堂課 | 主題 | 學完能做什麼 |
|------|------|-------------|
| Hour 10 | 基礎指令（FROM/RUN/COPY/CMD 等） | 寫出能跑的 Dockerfile |
| Hour 11 | .dockerignore、Best Practices、Multi-stage | 寫出優化的 Dockerfile |
| Hour 12 | TypeScript 實戰、Java 實戰、問題排查 | 在公司裡真正能用 |

```
Hour 10：能寫 → Hour 11：寫得好 → Hour 12：實際能用
```

### 映像檔完整生命週期

```
Dockerfile + 原始碼 + .dockerignore
        ↓ docker build
      Image（映像檔）
        ↓ docker push          ↓ docker run
    Registry（Hub/ECR/Harbor）   Container（容器）
        ↓ docker pull
   任何有 Docker 的機器
```

### 帶走的核心觀念

| 觀念 | 說明 |
|------|------|
| Dockerfile 就是程式碼 | 放 Git、要 code review、要維護更新 |
| Multi-stage 幾乎是必須 | 分離建構環境和生產環境，映像小且乾淨 |
| 安全性不是選配 | 非 root 執行、最小化映像、機密不入映像 |
| 建構效率靠 Cache | 不常變的放前面，常變的放後面 |
| 出問題先看 logs | `docker logs` 和 `--progress=plain` 是最好的朋友 |

### 下一步預告

真實系統不只有一個容器：前端 + 後端 API + 資料庫 + 快取 = 四個容器。

一個一個 `docker run` 管理非常痛苦。下一堂課：**Docker Compose**——一個 YAML 檔定義所有服務，一個指令啟動整個系統。

---

## 六、學生練習題

**練習一：Node.js + TypeScript Dockerfile 實作**

自己從頭寫完整 Dockerfile，要求：Multi-stage、dumb-init、非 root、HEALTHCHECK、正確 cache 策略、.dockerignore。驗證：curl、whoami 回傳 node、ps aux 確認 PID 1 是 dumb-init、docker stop 在 2 秒內完成。

**練習二：診斷有問題的 Dockerfile（至少找出 8 個問題）**

```dockerfile
FROM node:20
COPY . /app
WORKDIR /app
RUN npm install
RUN npm run build
RUN apt-get update
RUN apt-get install -y curl vim wget htop net-tools
ENV NODE_ENV=production
EXPOSE 3000
CMD npm start
```

**練習三：Spring Boot Dockerfile + JVM 思考題**

容器限制 1GB 時，JVM 堆記憶體會被設定為多少？為什麼要用 `MaxRAMPercentage` 而非 `-Xmx`？

**練習四：容器啟動失敗除錯流程**

列出至少 5 步完整除錯步驟，包含每步使用的 Docker 指令。

---

## 七、本堂課小結（5 分鐘）

| 主題 | 重點學習 |
|------|---------|
| Node.js + TypeScript | dumb-init PID 1 信號、npm ci --omit=dev、COPY --chown、HEALTHCHECK |
| Spring Boot Java | UseContainerSupport、MaxRAMPercentage=75%、JRE vs JDK、start-period=30s |
| 問題排查 | 建構慢、映像大、啟動失敗、COPY 失敗、權限問題 —— 5 大類問題 |

Dockerfile 三部曲圓滿結束。下一堂課：Docker Compose 多容器編排。

---

## 板書 / PPT 建議

1. **Node.js Multi-stage 結構圖**：左 Builder（npm ci 全部依賴 + tsc 編譯），右 Production（npm ci --omit=dev + COPY --from=builder dist/），箭頭標示 COPY --from
2. **PID 1 信號流程對比**：有 dumb-init（1-2 秒優雅關閉）vs 無 dumb-init（10 秒強制 kill）
3. **JVM 容器記憶體示意圖**：容器限制 512MB → Heap 384MB (75%) + Off-heap 128MB (25%)
4. **JVM 記憶體誤判示意圖**：宿主機 32GB → 容器 512MB → 沒有 UseContainerSupport → JVM 分配 8GB → OOM Kill
5. **常見問題排查決策樹**：建構失敗 / 啟動失敗 / 功能異常 / 映像太大 四條分支
6. **Dockerfile 三堂課學習路徑**：Hour 10 能寫 → Hour 11 寫得好 → Hour 12 實際能用
7. **完整工作流程圖**：Dockerfile → build → Image → push/run → Registry/Container
8. **Base Image 大小對照表**：各語言 full / slim / alpine 版本大小比較
