# Day 3 第十一小時：Dockerfile 進階與最佳化

---

## 一、開場與前情提要（3 分鐘）

上堂課：Dockerfile 基本指令（FROM、RUN、COPY、ADD、WORKDIR、ENV、ARG、EXPOSE、CMD、ENTRYPOINT、USER、VOLUME、HEALTHCHECK）+ Python Flask Docker 化實作。

本堂課（Dockerfile 三部曲第二堂）：
- .dockerignore
- Dockerfile Best Practices（六條黃金法則）
- Multi-stage Build（重頭戲）
- docker push 發佈到 Docker Hub
- Image 大小優化總結

---

## 二、.dockerignore（5 分鐘）

### Build Context 的陷阱

```bash
docker build -t my-app .
# 這個「.」代表 Build Context——Docker 會把整個目錄打包送給 Docker Daemon
```

典型 Node.js 專案的問題：

```
my-project/
├── src/              （2 MB）
├── node_modules/     （300 MB）
├── .git/             （150 MB）
├── .env              （含資料庫密碼！）
└── ...
```

- **速度問題**：每次 build 傳幾百 MB，白白浪費時間
- **安全問題**：`COPY . .` 會把 .env 的機密資訊複製進 Image

### .dockerignore 語法

放在專案根目錄（與 Dockerfile 同層），語法與 .gitignore 相同：

```bash
# .dockerignore
.git
.gitignore
node_modules
__pycache__
*.pyc
.venv
.env
.env.local
.env.*.local
.vscode
.idea
*.md
tests/
coverage/
Dockerfile
docker-compose.yml
.dockerignore
.DS_Store
dist/
build/
*.log
```

效果：Build Context 從 512 MB 降至 4 MB（百倍以上差距）。

**原則**：每個有 Dockerfile 的專案都要配一個 .dockerignore，如同 .gitignore 是基本配備。

---

## 三、Dockerfile Best Practices（15 分鐘）

### 法則一：合併 RUN 指令，減少 Layer

```dockerfile
# ❌ 菜鳥寫法：6 個 RUN = 6 個 Layer，且有隱藏 Bug
RUN apt-get update
RUN apt-get install -y python3
RUN apt-get install -y curl
RUN apt-get clean

# ✅ 正確寫法：一個 RUN，一個 Layer
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    vim \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
```

> 隱藏 Bug：分開寫時，`apt-get update` 會被快取住，一週後套件清單過期，`apt-get install` 可能裝到舊版本。

### 法則二：善用 Build Cache——依賴先裝，程式碼後放

| 語言 | 先 COPY 的檔案 | 先執行的指令 |
|------|--------------|------------|
| Python | requirements.txt | pip install |
| Node.js | package.json, package-lock.json | npm ci |
| Java Maven | pom.xml | mvn dependency:go-offline |
| Go | go.mod, go.sum | go mod download |

```dockerfile
# ✅ Python 範例
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .           # 程式碼放最後
```

### 法則三：不要用 root 執行——安全性

```dockerfile
# 先用 root 安裝套件，最後切換使用者
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser        # USER 放在所有需要 root 的操作之後
CMD ["python", "app.py"]
```

Alpine 版本語法：`addgroup -S / adduser -S`

### 法則四：清理暫存檔案——在同一個 RUN 裡

```dockerfile
# ❌ 沒有用！前面 Layer 已凝固，刪除只是標記
RUN apt-get install -y python3
RUN rm -rf /var/lib/apt/lists/*

# ✅ 安裝與清理在同一個 RUN
RUN apt-get update && apt-get install -y python3 \
    && rm -rf /var/lib/apt/lists/*

# pip 加 --no-cache-dir
RUN pip install --no-cache-dir -r requirements.txt
```

> 比喻：Layer 像紙張，後面的 Layer 刪掉前面 Layer 的檔案，如同在第二頁塗修正液——第一頁的字還在。

### 法則五：使用具體版本號

永遠指定版本，如 `python:3.11-slim`，不要用 `latest`，確保可重現性。

### 法則六：每個容器只跑一個程序

- 彈性擴展：只擴展需要的服務
- 獨立維護：升級不互相影響
- 日誌清晰：每個容器只有一個服務的輸出

---

## 四、Multi-stage Build（20 分鐘）——本堂重點

### 核心問題：建構時需要的 ≠ 運行時需要的

| 建構時需要（施工工具） | 運行時需要（住的房子） |
|---------------------|-------------------|
| 編譯器（gcc、javac、Go compiler） | 編譯好的執行檔或靜態檔案 |
| 套件管理器（npm、pip、maven） | 運行時依賴（JRE）|
| 建構工具（webpack、vite、babel） | 設定檔 |
| 原始碼 | — |

> 比喻：蓋完房子不會把鷹架和起重機留在客廳。

### Multi-stage 語法

```dockerfile
# 階段一：建構（施工）
FROM <build-image> AS builder
# ... 安裝依賴、編譯、打包 ...

# 階段二：運行（入住）
FROM <runtime-image>
COPY --from=builder /path/to/artifact /destination
```

**關鍵**：最終 Image 只包含最後一個 `FROM` 階段的內容，前面的階段建完即丟。

---

### 範例一：Node.js 前端應用

```dockerfile
# ========== 階段一：建構 ==========
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ========== 階段二：運行 ==========
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

| 項目 | 傳統寫法 | Multi-stage |
|------|---------|-------------|
| 最終 Image 大小 | ~1.2 GB | ~40 MB |
| 包含 Node.js | 是 | 否 |
| 包含 node_modules | 是 | 否 |
| 包含原始碼 | 是 | 否 |
| Web Server | serve（Node.js） | Nginx（高效能） |

**縮小 97%！**

---

### 範例二：Go 應用

```dockerfile
# ========== 階段一：編譯 ==========
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# ========== 階段二：運行 ==========
FROM scratch
COPY --from=builder /app/main /main
EXPOSE 8080
ENTRYPOINT ["/main"]
```

`scratch` = 完全空的 Image，0 bytes，連 shell 都沒有。

`CGO_ENABLED=0` 產生靜態連結的執行檔，不依賴任何外部函式庫。

| 項目 | 傳統寫法 | Multi-stage |
|------|---------|-------------|
| 最終 Image 大小 | ~800 MB | ~8 MB |
| Base Image | golang:1.22（800 MB） | scratch（0 MB） |

**縮小 99%！**

> 需要除錯能力時改用 `FROM alpine:3.19`（約 15 MB）。
> 需要 HTTPS 時，需另行複製 CA 憑證：`COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/`

---

### 範例三：Java Spring Boot 應用

```dockerfile
# ========== 階段一：建構 ==========
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

# ========== 階段二：運行 ==========
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

| 項目 | 傳統寫法 | Multi-stage |
|------|---------|-------------|
| 最終 Image 大小 | ~800 MB | ~250 MB |
| 包含 Maven | 是 | 否 |
| 包含 JDK | 是（完整版） | 否（只有 JRE） |

> `-XX:+UseContainerSupport`：讓 JVM 正確感知容器資源限制，避免讀宿主機記憶體而 OOM Kill。

---

### 三種語言大小比較

| 語言 | 傳統 Image | Multi-stage Image | 縮減比例 |
|------|-----------|------------------|---------|
| Node.js 前端 | ~1.2 GB | ~40 MB | 97% |
| Go | ~800 MB | ~8 MB | 99% |
| Java Spring Boot | ~800 MB | ~250 MB | 69% |

### 進階用法

```dockerfile
# 超過兩個階段
FROM node:20-alpine AS deps       # 階段一：安裝依賴
FROM node:20-alpine AS builder    # 階段二：建構
COPY --from=deps /app/node_modules ./node_modules
FROM nginx:alpine                 # 階段三：運行
COPY --from=builder /app/dist /usr/share/nginx/html

# 從外部 Image 複製
COPY --from=nginx:alpine /etc/nginx/nginx.conf /etc/nginx/nginx.conf
```

---

## 五、docker push 發佈到 Docker Hub（10 分鐘）

### 完整流程

```bash
# 1. 登入
docker login

# 2. 命名（命名規範：username/image-name:tag）
docker build -t johndoe/my-flask-app:1.0 .
# 或先 build 再 tag
docker tag my-flask-app johndoe/my-flask-app:1.0
docker tag my-flask-app johndoe/my-flask-app:latest

# 3. 推送
docker push johndoe/my-flask-app:1.0
docker push johndoe/my-flask-app:latest

# 4. 任何機器都可拉取使用
docker pull johndoe/my-flask-app:1.0
docker run -d -p 5000:5000 johndoe/my-flask-app:1.0
```

### 離線部署（docker save / docker load）

```bash
# 匯出成 tar 檔案（用 USB 搬到離線環境）
docker save -o my-flask-app.tar johndoe/my-flask-app:1.0

# 離線環境載入
docker load -i my-flask-app.tar
```

### Private Registry 選項

| Registry | 說明 | 適用場景 |
|----------|------|---------|
| Docker Hub | 付費方案支援 Private Repo | 小團隊、個人 |
| Harbor | VMware 開源，可自己架設 | 企業自建 |
| AWS ECR | Amazon 容器 Registry | 用 AWS 的團隊 |
| Google GCR / Artifact Registry | GCP 容器 Registry | 用 GCP 的團隊 |
| GitHub GHCR | GitHub Container Registry | 程式碼在 GitHub 的團隊 |
| Azure ACR | Azure 容器 Registry | 用 Azure 的團隊 |

---

## 六、Image 大小優化總結（5 分鐘）

### 四大優化策略（效果由大到小）

| 策略 | 效果 | 說明 |
|------|------|------|
| Multi-stage Build | 最大，97~99% | 建構環境與運行環境分離 |
| 選擇小的 Base Image | 大 | alpine < slim < 完整版 |
| 合併 RUN + 清理暫存 | 中 | 減少 Layer，同 RUN 內清理 |
| .dockerignore | 小（加速 build） | 減少 Build Context 大小 |

### Base Image 大小參考

| Base Image | 大小 | 建議 |
|-----------|------|------|
| ubuntu:22.04 | ~77 MB | 功能齊全 |
| python:3.11 | ~920 MB | 避免直接用 |
| python:3.11-slim | ~130 MB | 一般首選 |
| python:3.11-alpine | ~50 MB | 追求極小 |
| node:20-alpine | ~130 MB | 前端建構 |
| alpine:3.19 | ~7 MB | 超輕量基底 |
| scratch | 0 MB | Go 靜態執行檔 |

### Node.js 前端優化累積效果

| 優化步驟 | Image 大小 | 備註 |
|---------|-----------|------|
| 未優化（FROM node:20） | ~1.2 GB | 完整版，含所有檔案 |
| 換 Base Image（node:20-alpine） | ~400 MB | Alpine 版本 |
| 加 .dockerignore | ~350 MB | 排除 node_modules、.git |
| 善用 Build Cache | ~350 MB | 大小不變，build 速度大幅提升 |
| Multi-stage Build（Nginx） | ~40 MB | 只留 dist/ + Nginx |

**縮小 97%（1.2 GB → 40 MB）**

Image 小的四大好處：
1. **拉取速度快**——CI/CD 部署更快
2. **啟動更快**——彈性擴展更敏捷
3. **省儲存空間**——Registry 費用降低
4. **攻擊面小**——安全性提升

---

## 七、學生練習題

| 題號 | 練習主題 | 重點 |
|------|---------|------|
| 練習 1 | 撰寫 .dockerignore | 辨別應排除與不能排除的檔案（node_modules、.env、.git vs src/、package.json） |
| 練習 2 | 修正快取問題的 Dockerfile | 套用「依賴先裝，程式碼後放」原則，修正 Python 範例 |
| 練習 3 | React 前端改寫 Multi-stage | Builder 用 node:20 編譯；運行用 nginx:alpine 只留 dist/ |
| 練習 4 | Go 應用 Multi-stage Build | 編譯用 golang:1.22-alpine；運行用 scratch 或 alpine；大小控制在 15 MB 以內 |
| 練習 5 | docker push 實戰 | build → tag → push 到 Docker Hub → rmi → pull → 驗證可 run |
| 練習 6 | 綜合最佳化（找 7 個問題） | ubuntu 無版本、多個 RUN 未合併、快取順序錯、root 執行、暫存未清、CMD 字串格式、無 WORKDIR 等 |

---

## 八、本堂課小結

| 主題 | 重點 |
|------|------|
| .dockerignore | 排除 .env、node_modules、.git；語法同 .gitignore |
| Best Practices | 合併 RUN、善用快取、非 root 執行、同 RUN 內清理、具體版本、單一程序 |
| Multi-stage Build | 多個 FROM + AS + COPY --from=；最終 Image 只含最後階段 |
| docker push | login → tag → push；命名規範 username/name:tag |
| 離線部署 | docker save / docker load |
| 四大優化策略 | Multi-stage > 小 Base Image > 合併 RUN > .dockerignore |

---

## 板書 / PPT 建議

1. Build Context 概念圖（docker build 時整個目錄打包送給 Docker Daemon 的流程）
2. Build Cache 快取失效的骨牌效應示意圖（一層失效，後面全部重建）
3. 「依賴先裝，程式碼後放」對比圖（錯誤 vs 正確寫法的快取命中情況）
4. Layer 清理比喻圖（修正液的比喻：在第二頁塗不影響第一頁）
5. Multi-stage Build 兩階段流程圖（Builder Stage → Final Stage，COPY --from 箭頭）
6. 蓋房子比喻圖（施工：鷹架工具 → 入住：乾淨房子）
7. Node.js Multi-stage 前後對比（1.2 GB vs 40 MB，內容物比較）
8. Go Multi-stage 前後對比（特別標注 scratch = 0 MB）
9. Java Multi-stage 前後對比（JDK vs JRE）
10. 三種語言 Image 大小比較總表
11. Base Image 大小階梯圖（ubuntu → slim → alpine → distroless → scratch）
12. docker push 完整流程圖（build → tag → login → push → Hub → pull）
13. 優化步驟累積效果表（1.2 GB → 40 MB 逐步過程）
