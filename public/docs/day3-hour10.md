# Day 3 第十小時：Dockerfile 基礎

---

## 一、為什麼需要 Dockerfile（10 分鐘）

### 背景問題

到目前為止，跑的容器（nginx、mysql、redis、ubuntu 等）全都是「別人做好的」 Image。

**問題核心**：如果今天你自己寫了一個應用程式，要怎麼打包成 Docker Image，讓別人能 `docker run` 一行跑起來？

### Dockerfile 三部曲

| 堂次 | 主題 |
|------|------|
| 第一堂（本堂） | Dockerfile 基礎——把所有指令學會 |
| 第二堂 | Dockerfile 進階與最佳化——Image 又小又安全 |
| 第三堂 | 實戰應用——打包多語言專案，整合 CI/CD |

### docker commit 的三大致命問題

| 問題 | 說明 |
|------|------|
| **不可重現** | 步驟只在腦子裡，無法精確重複 |
| **不可追溯** | 別人拿到 Image 不知道裡面怎麼建的 |
| **不可自動化** | 無法整合 CI/CD |

### docker commit vs Dockerfile

| 比較項目 | docker commit | Dockerfile |
|---------|---------------|------------|
| 可重現性 | 差，步驟在腦子裡 | 好，步驟寫在檔案裡 |
| 可追溯性 | 差，黑盒子 | 好，可放進版本控制 |
| 可自動化 | 無法自動化 | 完美整合 CI/CD |
| 比喻 | 冰箱拍照（看到結果，不知來源） | **食譜**（任何人都能重現） |

### 用 docker history 偷看別人的 Dockerfile

```bash
docker history nginx:latest
docker history --no-trunc nginx:latest  # 看完整指令
```

每一行輸出就是 Dockerfile 的一個指令，從下往上讀即可還原建構流程。

---

## 二、第一個 Dockerfile（10 分鐘）

### 建立第一個 Dockerfile

**注意事項**：D 大寫、沒有副檔名、放在專案根目錄。

```dockerfile
# 我的第一個 Dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y curl
CMD ["curl", "--version"]
```

| 指令 | 說明 |
|------|------|
| `FROM ubuntu:22.04` | 以 Ubuntu 22.04 作為基礎（地基） |
| `RUN apt-get update && apt-get install -y curl` | 建構時執行命令；`-y` 必填，否則互動問答會卡住 |
| `CMD ["curl", "--version"]` | 容器啟動時的預設命令 |

### docker build 與 Build Context

```bash
docker build -t my-curl:v1 .
```

- `-t my-curl:v1`：命名 Image 並加版本標籤
- `.`：**Build Context**——Docker Client 把此目錄打包送給 Docker Daemon

**大坑警示**：若在有大量檔案的目錄（如含 `node_modules`）下執行，會把幾 GB 資料都送過去。後面學 `.dockerignore` 來排除不需要的檔案。

### 觀察建構輸出（理解 Layer）

```
Step 1/3 : FROM ubuntu:22.04        → 基礎 Layer
Step 2/3 : RUN apt-get install...   → 新 Layer（Running in <暫時容器>，跑完刪掉）
Step 3/3 : CMD ["curl", "--version"] → 新 Layer
Successfully tagged my-curl:v1
```

Dockerfile 建構本質：**一層一層疊上去**。

### Build Cache 的威力

只改 CMD 最後一行，重新 build：

```
Step 1/3 : FROM ubuntu:22.04         → Using cache ✅
Step 2/3 : RUN apt-get install curl  → Using cache ✅
Step 3/3 : CMD ["curl", "-V"]        → 重新執行（內容改了）
```

**重要規則**：一旦某一層快取失效，它後面的所有層都要重新建構（連續性快取）。

> **練習題 1**：基於 `alpine:3.18`，安裝 `curl` 和 `wget`（用 `apk add --no-cache`），容器啟動時顯示 curl 版本。改 CMD 重新 build，觀察哪些 Step 用了 cache。

---

## 三、Dockerfile 指令完整詳解（30 分鐘）

### 3.1 FROM：一切的起點

```dockerfile
FROM python:3.11        # 完整版（~900MB）
FROM node:20-slim       # 精簡版（推薦生產環境）
FROM alpine:3.18        # 極小 Linux（注意 musl libc 相容性）
FROM python@sha256:abc123...  # Digest 指定（百分之百可重現）
FROM scratch            # 完全空白（給靜態編譯的二進位檔用）
```

**選擇原則**：開發用完整版，正式環境用 slim 或 alpine。

### 3.2 RUN：在建構過程中執行命令

```dockerfile
# ✅ 好的寫法：合併成一個 RUN，同步清理暫存
RUN apt-get update && apt-get install -y \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*
```

```dockerfile
# ❌ 不好的寫法：四個 RUN = 四個 Layer，清理無效
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y vim
RUN rm -rf /var/lib/apt/lists/*
```

**關鍵原因**：清理操作必須在同一個 RUN 裡，否則暫存檔已寫進前一層，後面的清理只是「標記刪除」，空間仍佔著。

**Shell Form vs Exec Form**：RUN 大部分情況用 Shell Form（可用 `&&`、`|` 等 shell 語法）。

### 3.3 COPY vs ADD：複製檔案進 Image

```dockerfile
COPY requirements.txt .      # 複製單一檔案
COPY src/ /app/src/           # 複製整個目錄
COPY *.py /app/               # 萬用字元

ADD app.tar.gz /app/          # 自動解壓 tar（ADD 獨有）
```

| 功能 | COPY | ADD |
|------|------|-----|
| 複製本地檔案 | ✅ | ✅ |
| 自動解壓 tar | ❌ | ✅ |
| 支援 URL | ❌ | ✅（不建議） |
| 建議使用 | ✅ **99% 情況優先用** | 只在需要解壓時使用 |

> **練習題 2**：基於 `nginx:alpine`，把自訂 `index.html` 複製到 `/usr/share/nginx/html/`。`docker run -d -p 8080:80` 確認瀏覽器能看到自訂頁面。

### 3.4 WORKDIR：設定工作目錄

```dockerfile
WORKDIR /app
RUN pwd          # 輸出：/app
COPY . .         # 等同於 COPY . /app/
```

**常見錯誤**：

```dockerfile
# ❌ 每個 RUN 是獨立 shell，cd 效果不持續
RUN cd /app
RUN pwd          # 輸出 /，不是 /app！

# ✅ 正確
WORKDIR /app
RUN pwd          # 輸出 /app
```

### 3.5 ENV vs ARG：環境變數 vs 建構參數

**記憶口訣**：
- **ENV = 刺青**（建構時刺上去，容器跑起來後還在）
- **ARG = 貼紙**（建構時用一下，建構完就撕掉）

```dockerfile
ENV APP_VERSION=1.0.0       # 執行時也存在
ENV NODE_ENV=production

ARG PYTHON_VERSION=3.11     # 只在建構時存在
FROM python:${PYTHON_VERSION}
```

```bash
docker run -e NODE_ENV=development my-app        # 覆蓋 ENV
docker build --build-arg PYTHON_VERSION=3.10 .   # 覆蓋 ARG
```

| 比較 | ENV（刺青） | ARG（貼紙） |
|------|------------|------------|
| 建構時可用 | ✅ | ✅ |
| **執行時可用** | **✅** | **❌** |
| 建構時覆蓋 | ❌ | ✅（`--build-arg`） |
| 執行時覆蓋 | ✅（`-e`） | ❌ |

**搭配技巧**：用 ARG 接收建構參數，轉存到 ENV 讓執行時也能用：

```dockerfile
ARG APP_VERSION=1.0.0
ENV APP_VERSION=$APP_VERSION
```

> **練習題 3**：用 ARG 定義 `BUILD_ENV`（預設 `production`），用 ENV 定義 `APP_VERSION=1.0.0`。建構兩次（帶/不帶 `--build-arg`），用 `docker run <image> env` 確認哪個變數在容器裡看得到。

### 3.6 EXPOSE：宣告埠號

```dockerfile
EXPOSE 80
EXPOSE 3000
```

**重要**：EXPOSE **只是文件說明**，不會真的打開埠號。外部要存取仍需 `-p` 映射。

用途：
1. 文件作用（讓使用者知道要映射哪個 port）
2. 配合 `docker run -P`（大寫 P）自動隨機映射所有 EXPOSE 的埠號

### 3.7 CMD vs ENTRYPOINT（重點！）

#### CMD：容器的「預設命令」

```dockerfile
FROM ubuntu:22.04
CMD ["echo", "Hello World"]
```

```bash
docker run demo-cmd                  # → Hello World（執行 CMD）
docker run demo-cmd echo "Goodbye"   # → Goodbye（CMD 被完全覆蓋）
docker run demo-cmd ls -la           # → 目錄列表（CMD 完全消失）
```

**比喻**：手機預設鈴聲——你不改就用預設，一改就完全換掉。

#### ENTRYPOINT：容器的「主程序」

```dockerfile
FROM ubuntu:22.04
ENTRYPOINT ["echo", "Hello"]
```

```bash
docker run demo-ep               # → Hello
docker run demo-ep World         # → Hello World（參數被附加！）
docker run demo-ep Docker rocks  # → Hello Docker rocks
```

**比喻**：咖啡機——機器不變（ENTRYPOINT），你選不同口味（參數），出來的一定是咖啡。

#### CMD + ENTRYPOINT 搭配使用（最精華！）

```dockerfile
ENTRYPOINT ["python", "app.py"]   # 固定主程序
CMD ["--port", "8080"]             # 可變的預設參數
```

```bash
docker run my-app                  # → python app.py --port 8080
docker run my-app --port 3000      # → python app.py --port 3000
```

#### Shell Form vs Exec Form（必用 Exec Form！）

```
# Exec Form 的程序樹（正確）
PID 1: python app.py   ← 你的程式直接收到 SIGTERM，優雅退出

# Shell Form 的程序樹（危險）
PID 1: /bin/sh -c "python app.py"   ← shell 不轉發 SIGTERM
  └── PID 7: python app.py           ← 你的程式收不到信號，被強制 SIGKILL
```

**結論：CMD 和 ENTRYPOINT 一律使用 Exec Form（JSON 陣列格式）。**

#### 完整對照表

| 特性 | CMD | ENTRYPOINT |
|------|-----|------------|
| 用途 | 預設命令/參數 | 主程序 |
| docker run 帶參數時 | **被完全覆蓋** | **參數被附加** |
| 被 docker run 覆蓋 | 直接覆蓋 | 需要 `--entrypoint` |
| 推薦寫法 | Exec Form | Exec Form |
| 搭配使用 | 當預設參數 | 當主程序 |

> **練習題 4**：分別建構只用 CMD 和只用 ENTRYPOINT 的兩個 Image，執行 `docker run <image>` 和 `docker run <image> "I am a student"`，記錄輸出差異，用一句話總結核心差異。

### 3.8 USER：指定執行身份

```dockerfile
# 先用 root 安裝，再切換到非 root 使用者
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser
CMD ["python", "app.py"]
```

**原因**：預設容器以 root 執行，若應用程式有漏洞，攻擊者直接獲得容器內 root 權限。正式環境的最佳實踐，開發階段可先略過。

### 3.9 VOLUME：在 Dockerfile 中宣告掛載點

```dockerfile
VOLUME /var/lib/mysql   # 若用戶不用 -v 掛載，Docker 自動建立匿名 Volume
```

更推薦在 `docker run` 時明確指定：`-v mysql-data:/var/lib/mysql`。Dockerfile 的 VOLUME 更像是「提醒」。

### 3.10 HEALTHCHECK：健康檢查

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=5s \
  CMD curl -f http://localhost/ || exit 1
```

| 參數 | 說明 | 預設 |
|------|------|------|
| `--interval` | 每隔多久檢查一次 | 30s |
| `--timeout` | 超過多久算超時 | 30s |
| `--retries` | 連續失敗幾次才算不健康 | 3 |
| `--start-period` | 啟動緩衝時間 | 0s |

容器狀態：`starting` → `healthy` / `unhealthy`

### 3.11 指令總覽

| 指令 | 用途 | 會產生新 Layer？ |
|------|------|----------------|
| FROM | 指定基礎映像檔 | ✅ |
| RUN | 建構時執行命令 | ✅ |
| COPY | 複製檔案到 Image | ✅ |
| ADD | 複製檔案（支援解壓） | ✅ |
| WORKDIR | 設定工作目錄 | ✅ |
| ENV | 設定環境變數 | ✅ |
| ARG | 建構時參數 | ❌ |
| EXPOSE | 宣告埠號 | ❌ |
| CMD | 容器預設命令 | ❌ |
| ENTRYPOINT | 容器主程序 | ❌ |
| USER | 指定執行身份 | ❌ |
| VOLUME | 宣告掛載點 | ❌ |
| HEALTHCHECK | 健康檢查 | ❌ |

---

## 四、實作練習：打包 Python Flask 應用（10 分鐘）

### 專案結構

```
flask-docker-demo/
├── app.py
├── requirements.txt
└── Dockerfile
```

`requirements.txt`：
```
flask==3.0.0
```

### Dockerfile（含 Cache 最佳化）

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 先複製依賴檔並安裝（利用 Cache）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 再複製程式碼（常變動，放後面）
COPY app.py .

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1

CMD ["python", "app.py"]
```

**關鍵設計說明**：

| 決策 | 原因 |
|------|------|
| 用 `python:3.11-slim` | 完整版 ~900MB，slim 版 ~120MB，省 700MB |
| COPY 分兩步 | 善用 Build Cache，改程式碼不重跑 pip install |
| `--no-cache-dir` | pip 快取在 Docker 裡沒用，省空間 |

### 建構與驗證

```bash
docker build -t flask-demo:v1 .
docker run -d -p 5000:5000 --name my-flask flask-demo:v1
curl http://localhost:5000
# → {"hostname": "...", "message": "Hello from Docker!", "version": "1.0.0"}
```

### 體驗 Build Cache 的威力

修改 `app.py` 的 version 改為 `2.0.0`，重新 build：

```
Step 1-4: Using cache ✅（FROM、WORKDIR、COPY requirements、pip install 全部快取）
Step 5:   重新執行（app.py 改了）
```

**pip install 整個跳過，省下一兩分鐘！**

**錯誤寫法 vs 正確寫法對比**：

```dockerfile
# ❌ Cache 不友善：改任何檔案都會重跑 pip install
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

# ✅ Cache 友善：只有 requirements.txt 改了才重跑 pip install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
```

**口訣：依賴先裝，程式碼後放。**

> **練習題 5**：用你熟悉的語言寫一個 Hello World HTTP 伺服器，用 Dockerfile 打包，要求使用 WORKDIR、EXPOSE，`docker run -p` 執行後瀏覽器能看到回應。

---

## 五、本堂課小結

| 主題 | 重點 |
|------|------|
| 為什麼用 Dockerfile | 可重現、可追溯、可自動化；docker commit 三大問題 |
| docker build | `-t name:tag .`；`.` 是 Build Context |
| Layer 與 Cache | 每個指令一層；快取從上到下連續，中間斷了後面全失效 |
| FROM | 選基礎映像檔；slim 省空間；scratch 給靜態二進位 |
| RUN | 合併命令減少 Layer；清理在同一 RUN 裡 |
| COPY vs ADD | 99% 用 COPY；ADD 只在需自動解壓時 |
| WORKDIR | 不要用 RUN cd，每個 RUN 是獨立 shell |
| ENV vs ARG | ENV 刺青（執行時有）；ARG 貼紙（建構完沒了） |
| CMD vs ENTRYPOINT | CMD 可被覆蓋；ENTRYPOINT 參數附加；搭配使用最強大 |
| Shell vs Exec Form | 一律 Exec Form，否則收不到 SIGTERM |
| Cache 友善順序 | 依賴先裝，程式碼後放 |

### 核心指令速記

| 指令 | 一句話說明 | 口訣 |
|------|----------|------|
| FROM | 選基礎映像檔 | 地基 |
| RUN | 建構時執行命令 | 施工 |
| COPY | 複製檔案 | 搬東西 |
| WORKDIR | 設定工作目錄 | 定位 |
| ENV | 環境變數（容器內也有） | 刺青 |
| ARG | 建構參數（建構完就沒了） | 貼紙 |
| EXPOSE | 宣告埠號（只是文件） | 門牌 |
| CMD | 預設命令（可被覆蓋） | 預設鈴聲 |
| ENTRYPOINT | 主程序（參數附加） | 咖啡機 |
| USER | 指定執行身份 | 安全帽 |
| VOLUME | 宣告掛載點 | 保險箱 |
| HEALTHCHECK | 健康檢查 | 體檢 |

**下一堂**：Dockerfile 三部曲第二部——**Dockerfile 進階與最佳化**（`.dockerignore`、Multi-stage Build、Image 縮小與安全強化）。

---

## 板書 / PPT 建議

1. **docker commit vs Dockerfile 比較表** —— 三列對比：可重現、可追溯、可自動化；加「食譜 vs 冰箱照片」比喻
2. **Build Context 示意圖** —— Client 把目錄打包送給 Docker Daemon 的流程圖；標示大目錄陷阱
3. **Image 分層示意圖** —— 每個 Dockerfile 指令疊一層 Layer；標示哪些指令產生 Layer
4. **CMD vs ENTRYPOINT 行為對比** —— 兩欄表格展示帶參數/不帶參數的行為；加「鈴聲 vs 咖啡機」比喻
5. **Shell Form vs Exec Form 差異圖** —— 畫出 PID 1 是誰的程序樹；標示 SIGTERM 的傳遞路徑
6. **ENV vs ARG 生命週期圖** —— 時間軸標出「建構時」和「執行時」，ENV 跨越兩個階段，ARG 只在建構時
7. **Cache 友善的 COPY 順序** —— requirements.txt → pip install → app.py 流程圖，標示哪些步驟用了 cache
8. **Flask 實作的完整 Dockerfile** —— 投影在螢幕上，每一行都有註解，突出 COPY 分兩步的設計
9. **指令速查表** —— 所有指令、用途、口訣、是否產生 Layer 的完整表格
