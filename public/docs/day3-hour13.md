# Day 3 第十三小時：Dockerfile 入門

---

## 一、前情提要（2 分鐘）

上堂課：Volume 資料持久化。

本堂課：Dockerfile 入門
- Dockerfile 是什麼
- 基本指令
- 建構映像檔
- 最佳實踐

---

## 二、為什麼需要 Dockerfile（5 分鐘）

### 手動 vs Dockerfile

| 方法 | 優點 | 缺點 |
|-----|------|------|
| docker commit | 快速測試 | 不可重複、難維護 |
| Dockerfile | 版本控制、可重複、自動化 | 需要學習語法 |

### 基本結構

```dockerfile
FROM ubuntu:22.04
LABEL maintainer="you@example.com"
RUN apt update && apt install -y python3
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["python3", "app.py"]
```

---

## 三、Dockerfile 指令詳解（25 分鐘）

### 核心指令

| 指令 | 功能 | 範例 |
|-----|------|------|
| FROM | 基礎映像 | `FROM python:3.11-slim` |
| RUN | 執行命令 | `RUN apt install -y curl` |
| COPY | 複製檔案 | `COPY app.py /app/` |
| ADD | 複製（可解壓） | `ADD app.tar.gz /app/` |
| WORKDIR | 工作目錄 | `WORKDIR /app` |
| ENV | 環境變數 | `ENV NODE_ENV=production` |
| ARG | 建構參數 | `ARG VERSION=1.0` |
| EXPOSE | 宣告 Port | `EXPOSE 80` |
| CMD | 預設命令 | `CMD ["python", "app.py"]` |
| ENTRYPOINT | 入口點 | `ENTRYPOINT ["python"]` |

### ARG vs ENV

| 指令 | 建構時 | 執行時 |
|-----|--------|-------|
| ARG | 可用 | 不可用 |
| ENV | 可用 | 可用 |

### CMD vs ENTRYPOINT

```dockerfile
ENTRYPOINT ["python3"]
CMD ["app.py"]
```

```bash
docker run my-image              # python3 app.py
docker run my-image other.py     # python3 other.py
```

### 合併 RUN 減少 Layer

```dockerfile
# 好：一個 Layer
RUN apt update && \
    apt install -y python3 pip && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*
```

### 安全：非 root 使用者

```dockerfile
RUN useradd -m appuser
USER appuser
```

---

## 四、建構映像檔（10 分鐘）

### docker build

```bash
docker build -t my-app:v1 .
docker build -t my-app -f Dockerfile.prod .
docker build --no-cache -t my-app .
```

### .dockerignore

```
node_modules
.git
*.log
.env
```

---

## 五、實作：打包 Python 應用（8 分鐘）

### Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
EXPOSE 5000
CMD ["python", "app.py"]
```

### 建構與執行

```bash
docker build -t my-flask-app:v1 .
docker run -d -p 5000:5000 my-flask-app:v1
curl http://localhost:5000
```

---

## 六、Dockerfile 最佳實踐（8 分鐘）

| 實踐 | 說明 |
|-----|------|
| 合併 RUN | 減少 Layer 數量 |
| 善用快取 | 不常變的放前面 |
| 非 root | 安全考量 |
| 清理暫存 | 減少映像大小 |
| 具體版本 | 避免 latest |

### 快取順序範例

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .      # 不常變
RUN pip install -r requirements.txt
COPY . .                      # 常變
CMD ["python", "app.py"]
```

---

## 七、小結（2 分鐘）

| 指令 | 功能 |
|-----|------|
| FROM | 基礎映像 |
| RUN | 執行命令 |
| COPY | 複製檔案 |
| WORKDIR | 工作目錄 |
| ENV | 環境變數 |
| EXPOSE | 宣告 port |
| CMD | 預設命令 |
| ENTRYPOINT | 入口點 |

**建構**：`docker build -t name:tag .`

**最佳實踐**：合併 RUN、善用快取、非 root、具體版本

下一堂：Dockerfile 實戰與課程總結。

---

## 板書 / PPT 建議

1. Dockerfile 指令列表
2. 建構流程圖
3. Layer 快取原理
4. CMD vs ENTRYPOINT 比較

