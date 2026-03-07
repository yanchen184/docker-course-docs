# Day 2 第四小時：Docker 基本指令

---

## 一、前情提要（2 分鐘）

Docker 裝好了，開始學指令。

本堂課重點：
- docker pull：拉取映像檔
- docker images：列出映像檔
- docker run：執行容器
- docker ps：查看容器

---

## 二、docker pull - 拉取映像檔（10 分鐘）

### 基本用法

```bash
docker pull nginx
docker pull nginx:1.25
docker pull nginx:alpine
```

### 常見 Tag 含義

| Tag | 含義 |
|-----|-----|
| latest | 預設標籤（不一定是最新） |
| 1.25 | 主版本號 |
| 1.25.3 | 精確版本號 |
| alpine | 基於 Alpine Linux（超小） |
| slim | 精簡版 |

### 從其他 Registry 拉取

```bash
docker pull gcr.io/google-containers/nginx
docker pull 192.168.1.100:5000/myapp:v1
```

---

## 三、docker images - 列出映像檔（8 分鐘）

### 基本用法

```bash
docker images
```

```
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
nginx        1.25      a6bd71f48f68   2 weeks ago   187MB
ubuntu       22.04     ca2b0f26964c   3 weeks ago   77.9MB
```

### 常用參數

```bash
docker images nginx          # 篩選特定映像檔
docker images -q             # 只顯示 IMAGE ID
docker images -f dangling=true  # 顯示無 Tag 的映像檔
docker image prune           # 清理 dangling images
```

---

## 四、docker run - 執行容器（25 分鐘）

### 基本用法

```bash
docker run nginx    # 本機沒有會自動 pull
```

### 重要參數

| 參數 | 功能 | 範例 |
|-----|-----|-----|
| -d | 背景執行 | `docker run -d nginx` |
| -it | 互動模式 | `docker run -it ubuntu bash` |
| --name | 指定名稱 | `docker run --name web nginx` |
| --rm | 停止後自動刪除 | `docker run --rm nginx` |
| -e | 環境變數 | `docker run -e KEY=value nginx` |
| -p | Port Mapping | `docker run -p 8080:80 nginx` |
| -v | Volume 掛載 | `docker run -v /host:/container nginx` |

### 前景 vs 背景執行

```bash
docker run nginx      # 前景，Ctrl+C 停止
docker run -d nginx   # 背景，回傳容器 ID
```

### 互動模式

```bash
docker run -it ubuntu bash
# -i：保持 STDIN 開啟
# -t：分配偽終端
```

### Port Mapping

```bash
docker run -d -p 8080:80 nginx
# 格式：主機Port:容器Port
# 訪問 http://localhost:8080
```

### 組合範例

```bash
docker run -d \
  --name web \
  -p 8080:80 \
  -e NGINX_HOST=example.com \
  -v /data/html:/usr/share/nginx/html \
  --restart unless-stopped \
  nginx:1.25
```

---

## 五、docker ps - 查看容器（10 分鐘）

### 基本用法

```bash
docker ps       # 執行中的容器
docker ps -a    # 所有容器（包含已停止）
```

```
CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS                  NAMES
abc123def456   nginx   "..."     5 min     Up       0.0.0.0:8080->80/tcp   my-nginx
```

### 常用參數

```bash
docker ps -q                    # 只顯示 ID
docker ps -l                    # 最後建立的容器
docker ps -f name=my-nginx      # 篩選名稱
docker ps -f status=running     # 篩選狀態
docker ps -f ancestor=nginx     # 篩選映像檔
```

### 批次操作

```bash
docker stop $(docker ps -q)                      # 停止所有容器
docker rm $(docker ps -aq -f status=exited)      # 刪除已停止容器
```

---

## 六、實作練習（3 分鐘）

```bash
docker pull nginx:alpine
docker run -d --name test-nginx -p 8080:80 nginx:alpine
docker ps
# 開瀏覽器訪問 http://localhost:8080
```

---

## 七、小結（2 分鐘）

| 指令 | 功能 |
|-----|-----|
| docker pull | 拉取映像檔 |
| docker images | 列出本機映像檔 |
| docker run | 建立並執行容器 |
| docker ps | 查看容器 |

下一堂課：停止、刪除、日誌、進入容器。

---

## 板書 / PPT 建議

1. docker pull 流程圖（Layer 下載）
2. docker run 參數表
3. docker run 執行流程圖
4. docker ps 輸出欄位說明

