# Day 2 第四小時：Docker 基本指令（上）

---

## 一、前情提要（2 分鐘）

Docker 裝好了，開始學指令。

### 三個萬能幫助命令

```bash
docker version          # 查看版本
docker info             # 查看系統資訊
docker 命令 --help       # 查看任何命令的用法
```

本堂課重點（取得和執行）：
- docker pull：拉取映像檔
- docker images：列出映像檔
- docker run：執行容器
- docker ps：查看容器

下一堂課：管理和清理（停止、刪除、日誌、進入容器）。

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

### 完整地址與省略寫法

```bash
# 完整寫法
docker pull docker.io/library/nginx:latest

# 省略寫法（等價）
docker pull nginx
```

### 拉取過程解析

- 分層下載（Layer by Layer）
- 相同 Layer 不重複下載
- **Digest**：映像檔的 SHA256 簽名，確保完整性

### 搜尋映像檔

```bash
docker search mysql
docker search mysql --filter=STARS=3000    # 篩選星數
```

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
docker images -a             # 顯示所有映像檔（含中間層）
docker images -f dangling=true  # 顯示無 Tag 的映像檔
```

### 格式化輸出

```bash
docker images --format "{{.Repository}}:{{.Tag}} - {{.Size}}"
```

### 刪除映像檔（docker rmi）

```bash
docker rmi nginx:1.25              # 刪除指定映像檔
docker rmi -f nginx                # 強制刪除
docker rmi $(docker images -q)     # 刪除所有映像檔
docker image prune                 # 清理 dangling images
```

**rmi = remove image**（i 代表 image，區分 `docker rm` 刪容器）

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
| -P | 隨機 Port | `docker run -P nginx` |
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

兩種退出方式：
- `exit`：停止容器並退出
- `Ctrl+P+Q`：退出但容器繼續跑

### Port Mapping

```bash
docker run -d -p 8080:80 nginx    # 指定 Port
docker run -d -P nginx             # 隨機分配 Port
# -p 格式：主機Port:容器Port
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

### docker run 完整流程

```
docker run nginx
        ↓
  本機有 Image？
     /        \
   有          沒有 → Docker Hub pull
   ↓                        ↓
 建立容器              找到 → pull → 建立容器
                       找不到 → 報錯
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
docker ps -n 3                  # 最近 3 個容器
docker ps -f name=my-nginx      # 篩選名稱
docker ps -f status=running     # 篩選狀態
docker ps -f ancestor=nginx     # 篩選映像檔
```

### 格式化輸出

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

### 刪除容器（docker rm）

```bash
docker rm 容器ID                           # 刪除已停止的容器
docker rm -f 容器ID                        # 強制刪除（含執行中）
docker rm $(docker ps -aq -f status=exited)  # 刪除所有已停止容器
```

### 啟動和停止容器

```bash
docker start 容器ID      # 啟動已停止的容器
docker restart 容器ID    # 重啟容器
docker stop 容器ID       # 優雅停止（SIGTERM，10秒後 SIGKILL）
docker kill 容器ID       # 強制停止（立即 SIGKILL）
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

## 七、本堂課小結（2 分鐘）

| 指令 | 功能 |
|-----|-----|
| docker pull | 拉取映像檔（分層下載、Layer 共用） |
| docker images | 列出本機映像檔 |
| docker rmi | 刪除映像檔 |
| docker search | 搜尋 Docker Hub |
| docker run | 建立並執行容器（-d/-it/-p/-v/-e） |
| docker ps | 查看容器（-a/-q/-f） |
| docker rm | 刪除容器 |
| docker start/stop | 啟動/停止容器 |

下一堂課：進入容器、日誌、拷貝檔案、更多管理指令。

---

## 板書 / PPT 建議

1. 三個萬能幫助命令
2. docker pull 流程圖（Layer 分層下載）
3. docker run 參數表 + 執行流程圖
4. docker ps 輸出欄位說明
5. exit vs Ctrl+P+Q 差異
6. docker stop vs docker kill 差異
