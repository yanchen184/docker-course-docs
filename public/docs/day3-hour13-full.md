# Day 3 第十三小時：Dockerfile 入門

---

## 一、前情提要（2 分鐘）

前面我們都是用別人做好的映像檔。

這堂課學怎麼自己做映像檔：
- Dockerfile 是什麼
- 基本指令
- 建構映像檔
- 最佳實踐

---

## 二、什麼是 Dockerfile（5 分鐘）

### 2.1 Dockerfile 的定義

Dockerfile 是一個文字檔案，包含一系列指令，描述如何建構 Docker 映像檔。

就像食譜：
- 從什麼基礎材料開始（FROM）
- 需要哪些配料（RUN apt install）
- 怎麼組合（COPY, ADD）
- 最後怎麼呈現（CMD, ENTRYPOINT）

### 2.2 為什麼需要 Dockerfile

**方法一：手動建構（不推薦）**

```bash
docker run -it ubuntu bash
# 在容器內安裝東西...
apt update && apt install -y python3
# 退出
docker commit <container_id> my-image
```

問題：
- 不可重複
- 不知道做了什麼
- 不好維護

**方法二：Dockerfile（推薦）**

```dockerfile
FROM ubuntu
RUN apt update && apt install -y python3
```

優點：
- 版本控制
- 可重複
- 自動化
- 可追蹤變更

### 2.3 基本結構

```dockerfile
# 基礎映像
FROM ubuntu:22.04

# 維護者資訊
LABEL maintainer="you@example.com"

# 執行命令
RUN apt update && apt install -y python3

# 設定工作目錄
WORKDIR /app

# 複製檔案
COPY . .

# 暴露 port
EXPOSE 8080

# 預設命令
CMD ["python3", "app.py"]
```

---

## 三、Dockerfile 指令詳解（25 分鐘）

### 3.1 FROM - 基礎映像

每個 Dockerfile 必須以 FROM 開始。

```dockerfile
FROM ubuntu:22.04
FROM python:3.11-slim
FROM node:20-alpine
FROM scratch  # 空映像，用於靜態編譯的程式
```

Docker Hub 上 99% 的映像檔都是從 `scratch` 這個最基礎的映像開始構建的。例如 CentOS、Ubuntu 等作業系統映像，都是在 `scratch` 之上透過 `ADD` 指令加入系統檔案。我們自己寫的映像通常從這些作業系統映像（或語言執行環境映像）開始，再往上疊加。

**選擇基礎映像的原則**

- 官方映像優先
- 選擇適合的大小（alpine < slim < 預設）
- 指定版本，不要用 latest

### 3.2 RUN - 執行命令

在建構時執行命令。

```dockerfile
# Shell 格式
RUN apt update && apt install -y python3

# Exec 格式
RUN ["apt", "update"]
```

**重要：合併 RUN 減少 Layer**

```dockerfile
# 不好：每個 RUN 產生一個 Layer
RUN apt update
RUN apt install -y python3
RUN apt install -y pip
RUN apt clean

# 好：合併成一個 Layer
RUN apt update && \
    apt install -y python3 pip && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*
```

### 3.3 COPY - 複製檔案

從主機複製檔案到映像。

```dockerfile
# 複製單一檔案
COPY app.py /app/

# 複製目錄
COPY src/ /app/src/

# 複製多個檔案
COPY package.json package-lock.json /app/

# 使用萬用字元
COPY *.py /app/
```

### 3.4 ADD - 複製檔案（進階）

和 COPY 類似，但有額外功能：

```dockerfile
# 自動解壓縮 tar（ADD 會自動解壓 .tar.gz 等格式）
ADD app.tar.gz /app/

# 支援 URL（不推薦）
ADD https://example.com/file.tar.gz /app/
```

ADD 最常見的用法是在建構自訂映像時，將 JDK、Tomcat 等壓縮包加入映像並自動解壓：

```dockerfile
# 實際案例：建構包含 JDK + Tomcat 的映像
FROM centos
ADD jdk-8u11-linux-x64.tar.gz /usr/local/
ADD apache-tomcat-9.0.22.tar.gz /usr/local/
```

**建議：優先用 COPY，除非需要解壓功能。**

### 3.5 WORKDIR - 設定工作目錄

```dockerfile
WORKDIR /app

# 之後的命令都在 /app 下執行
RUN npm install
COPY . .
```

可以多次設定，路徑會累加：

```dockerfile
WORKDIR /app
WORKDIR src
# 現在在 /app/src
```

### 3.6 ENV - 環境變數

```dockerfile
ENV NODE_ENV=production
ENV APP_HOME=/app
ENV PATH=$APP_HOME/bin:$PATH
```

容器執行時這些環境變數會存在。

### 3.7 ARG - 建構時的參數

```dockerfile
ARG VERSION=1.0
ARG BASE_IMAGE=python:3.11

FROM ${BASE_IMAGE}
RUN echo "Building version ${VERSION}"
```

建構時可以覆蓋：

```bash
docker build --build-arg VERSION=2.0 .
```

**ARG vs ENV**

| 指令 | 何時可用 | 容器內可用 |
|-----|---------|-----------|
| ARG | 建構時 | 否 |
| ENV | 建構時 + 執行時 | 是 |

### 3.8 EXPOSE - 宣告 Port

```dockerfile
EXPOSE 80
EXPOSE 443
EXPOSE 8080/tcp
EXPOSE 53/udp
```

**注意**：EXPOSE 只是宣告，不會真的開啟 port。執行時還是要 `-p`。

### 3.9 CMD - 預設命令

容器啟動時執行的預設命令。

```dockerfile
# Exec 格式（推薦）
CMD ["python3", "app.py"]

# Shell 格式
CMD python3 app.py
```

**特點**

- 只能有一個 CMD
- 可以被 docker run 覆蓋

```bash
docker run my-image            # 執行 CMD
docker run my-image bash       # 覆蓋 CMD
```

### 3.10 ENTRYPOINT - 入口點

定義容器的主程式。

```dockerfile
ENTRYPOINT ["python3", "app.py"]
```

**ENTRYPOINT vs CMD**

```dockerfile
ENTRYPOINT ["python3"]
CMD ["app.py"]
```

- ENTRYPOINT：固定的執行程式
- CMD：提供預設參數，可被覆蓋

```bash
docker run my-image              # 執行 python3 app.py
docker run my-image other.py     # 執行 python3 other.py
```

**關鍵區別：替換 vs 追加**

用 CMD 時，`docker run` 後面的參數會**整個替換** CMD 指令：

```dockerfile
# Dockerfile
FROM centos
CMD ["ls", "-a"]
```

```bash
docker run cmd-test              # 正常執行 ls -a
docker run cmd-test -l           # 報錯！-l 替換了整個 CMD，但 -l 不是命令
docker run cmd-test ls -al       # 必須寫完整命令才行
```

用 ENTRYPOINT 時，`docker run` 後面的參數會**追加**到 ENTRYPOINT 後面：

```dockerfile
# Dockerfile
FROM centos
ENTRYPOINT ["ls", "-a"]
```

```bash
docker run entrypoint-test       # 正常執行 ls -a
docker run entrypoint-test -l    # 執行 ls -a -l（-l 被追加）
```

簡單來說：如果希望使用者可以方便地追加參數，用 ENTRYPOINT；如果希望使用者可以完全替換命令，用 CMD。

### 3.11 USER - 執行使用者

```dockerfile
# 建立使用者
RUN useradd -m appuser

# 切換使用者
USER appuser

# 之後的命令都用 appuser 執行
```

**安全最佳實踐**：不要用 root 跑應用程式。

### 3.12 VOLUME - 宣告資料卷

```dockerfile
VOLUME /data
VOLUME ["/data", "/config"]
```

Docker 會自動建立匿名 Volume。

### 3.13 HEALTHCHECK - 健康檢查

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

---

## 四、建構映像檔（10 分鐘）

### 4.1 docker build 基本用法

```bash
docker build -t my-app:v1 .
```

- `-t`：指定名稱和 tag
- `.`：Dockerfile 所在目錄（build context）

### 4.2 指定 Dockerfile

```bash
# 預設找 ./Dockerfile
docker build -t my-app .

# 指定其他檔案
docker build -t my-app -f Dockerfile.prod .
docker build -t my-app -f docker/Dockerfile .
```

**官方命名慣例**：檔案命名為 `Dockerfile`（首字母大寫，無副檔名）時，`docker build` 會自動找到它，不需要 `-f` 參數。實際專案中幾乎都遵循這個慣例。

### 4.3 Build Context

`.` 是 build context，會把這個目錄的內容送給 Docker Daemon。

大目錄會很慢，用 `.dockerignore` 排除不需要的檔案。

### 4.4 .dockerignore

```
# .dockerignore
node_modules
.git
*.log
.env
Dockerfile
.dockerignore
```

就像 .gitignore，但用於 Docker build。

### 4.5 查看建構過程

```bash
docker build -t my-app .

# 輸出
Step 1/5 : FROM python:3.11-slim
 ---> abc123
Step 2/5 : WORKDIR /app
 ---> Running in def456
 ---> 789xyz
Step 3/5 : COPY requirements.txt .
 ---> Using cache        # 快取命中
 ---> 111aaa
...
Successfully built bbb222
Successfully tagged my-app:latest
```

### 4.6 不使用快取

```bash
docker build --no-cache -t my-app .
```

強制重新建構所有 Layer。

### 4.7 用 docker history 研究映像檔

建構完成後，可以用 `docker history` 查看映像檔的建構歷史，了解每一層是怎麼來的：

```bash
docker history my-app:v1
```

這個命令也可以用來研究別人的映像檔是怎麼建構的，例如：

```bash
docker history nginx:alpine
docker history mysql:8.0
```

透過觀察每一層的 `CREATED BY` 欄位，可以推測出原始 Dockerfile 的寫法。

---

## 五、實作：打包 Python 應用（8 分鐘）

### 5.1 準備檔案

**app.py**

```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello from Docker!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**requirements.txt**

```
flask==3.0.0
```

### 5.2 撰寫 Dockerfile

```dockerfile
# 基礎映像
FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 先複製依賴檔案（利用快取）
COPY requirements.txt .

# 安裝依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製程式碼
COPY app.py .

# 暴露 port
EXPOSE 5000

# 啟動命令
CMD ["python", "app.py"]
```

### 5.3 建構和執行

```bash
# 建構
docker build -t my-flask-app:v1 .

# 執行
docker run -d -p 5000:5000 my-flask-app:v1

# 測試
curl http://localhost:5000
# Hello from Docker!
```

---

## 六、Dockerfile 最佳實踐（8 分鐘）

### 6.1 減少 Layer 數量

```dockerfile
# 不好
RUN apt update
RUN apt install -y python3
RUN apt clean

# 好
RUN apt update && \
    apt install -y python3 && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*
```

### 6.2 善用快取

把不常變動的放前面：

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# 先複製依賴檔案（不常變）
COPY requirements.txt .
RUN pip install -r requirements.txt

# 最後複製程式碼（常變）
COPY . .

CMD ["python", "app.py"]
```

這樣改程式碼時，pip install 那層可以用快取。

### 6.3 不要用 root

```dockerfile
FROM python:3.11-slim

RUN useradd -m appuser

WORKDIR /app
COPY --chown=appuser:appuser . .

USER appuser

CMD ["python", "app.py"]
```

### 6.4 清理暫存檔案

```dockerfile
RUN apt update && \
    apt install -y build-essential && \
    pip install -r requirements.txt && \
    apt purge -y build-essential && \
    apt autoremove -y && \
    rm -rf /var/lib/apt/lists/*
```

在同一個 RUN 裡安裝、編譯、清理，避免中間層留下垃圾。

### 6.5 使用具體版本

```dockerfile
# 不好
FROM python
RUN pip install flask

# 好
FROM python:3.11.7-slim
RUN pip install flask==3.0.0
```

---

## 七、本堂課小結（2 分鐘）

這堂課學了 Dockerfile：

**核心指令**

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

**建構指令**

```bash
docker build -t name:tag .
```

**最佳實踐**
- 合併 RUN 減少 Layer
- 善用快取（不常變的放前面）
- 不用 root
- 清理暫存檔
- 使用具體版本

下一堂：Dockerfile 實戰與課程總結。

---

## 板書 / PPT 建議

1. Dockerfile 指令列表
2. 建構流程圖
3. Layer 快取原理
4. CMD vs ENTRYPOINT 比較（替換 vs 追加的對比測試）
5. docker history 輸出解析

