# Day 2 第四小時：Docker 基本指令（上）

---

## 一、前情提要（2 分鐘）

Docker 裝好了，現在開始學指令。

這堂課學「取得和執行」：
- docker pull：拉取映像檔
- docker images：列出映像檔
- docker run：執行容器
- docker ps：查看容器

下一堂課學「管理和清理」。

---

## 二、docker pull - 拉取映像檔（10 分鐘）

### 2.1 基本用法

```bash
docker pull nginx
```

從 Docker Hub 下載 nginx 映像檔。

### 2.2 指定版本

```bash
docker pull nginx:1.25
docker pull nginx:1.25.3
docker pull nginx:alpine
docker pull nginx:1.25-alpine
```

**常見 Tag 含義**

| Tag | 含義 |
|-----|-----|
| latest | 預設標籤（不一定是最新） |
| 1.25 | 主版本號 |
| 1.25.3 | 精確版本號 |
| alpine | 基於 Alpine Linux（超小） |
| slim | 精簡版 |
| bullseye/bookworm | Debian 版本代號 |

### 2.3 從其他 Registry 拉取

```bash
# Google Container Registry
docker pull gcr.io/google-containers/nginx

# 私有 Registry
docker pull 192.168.1.100:5000/myapp:v1
```

### 2.4 拉取過程解析

```bash
$ docker pull nginx:1.25

1.25: Pulling from library/nginx
a2abf6c4d29d: Pull complete      # Layer 1
a9edb18cadd1: Pull complete      # Layer 2
589b7251471a: Pull complete      # Layer 3
186b1aaa4aa6: Pull complete      # Layer 4
Digest: sha256:abc123...          # 映像檔的唯一識別碼
Status: Downloaded newer image for nginx:1.25
docker.io/library/nginx:1.25
```

每一行是一個 Layer。如果 Layer 已經存在本機，會顯示 `Already exists`。

### 2.5 查看可用版本

Docker Hub 網站搜尋映像檔名稱，可以看到所有可用的 Tag。

或用命令查詢（需安裝額外工具）：

```bash
# 使用 skopeo
skopeo list-tags docker://nginx
```

---

## 三、docker images - 列出映像檔（8 分鐘）

### 3.1 基本用法

```bash
docker images
```

輸出：

```
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
nginx        1.25      a6bd71f48f68   2 weeks ago   187MB
ubuntu       22.04     ca2b0f26964c   3 weeks ago   77.9MB
python       3.11      22140cbb3b0c   1 month ago   1.01GB
```

**欄位說明**

| 欄位 | 說明 |
|-----|-----|
| REPOSITORY | 映像檔名稱 |
| TAG | 版本標籤 |
| IMAGE ID | 唯一識別碼（前 12 碼） |
| CREATED | 建立時間（映像檔本身，不是下載時間） |
| SIZE | 大小 |

### 3.2 篩選映像檔

```bash
# 只看特定映像檔
docker images nginx

# 只看特定標籤
docker images nginx:1.25
```

### 3.3 格式化輸出

```bash
# 只顯示 IMAGE ID
docker images -q

# 自訂格式
docker images --format "{{.Repository}}:{{.Tag}} - {{.Size}}"

# 輸出成 JSON
docker images --format json
```

`-q` 很常用，配合其他命令批次操作。

### 3.4 查看所有映像檔（包含中間層）

```bash
docker images -a
```

會顯示建構過程中產生的中間映像檔，通常不需要。

### 3.5 Dangling Images

沒有 Tag 的映像檔，顯示為 `<none>`：

```
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
<none>       <none>    d1234567890a   1 hour ago    150MB
```

這些通常是舊版映像檔被新版覆蓋後留下的。

查看 dangling images：

```bash
docker images -f dangling=true
```

清理：

```bash
docker image prune
```

---

## 四、docker run - 執行容器（25 分鐘）

這是最重要的指令。

### 4.1 基本用法

```bash
docker run nginx
```

用 nginx 映像檔建立並啟動一個容器。

如果本機沒有這個映像檔，會自動 pull。

### 4.2 前景執行 vs 背景執行

**前景執行（預設）**

```bash
docker run nginx
```

容器的輸出直接顯示在終端機。按 Ctrl+C 會停止容器。

終端機被佔住，不能做其他事。

**背景執行（-d）**

```bash
docker run -d nginx
```

容器在背景執行，終端機立刻回來。

輸出容器 ID。

### 4.3 互動模式（-it）

```bash
docker run -it ubuntu bash
```

- `-i`：保持 STDIN 開啟（可以輸入）
- `-t`：分配偽終端（有正常的終端介面）

通常 `-it` 一起用，進入容器的 shell。

```bash
root@abc123:/# ls
root@abc123:/# exit
```

### 4.4 指定容器名稱（--name）

```bash
docker run -d --name my-nginx nginx
```

不指定的話，Docker 會自動產生隨機名稱（like `admiring_newton`）。

名稱必須唯一，重複會報錯。

### 4.5 自動刪除（--rm）

```bash
docker run --rm nginx
```

容器停止後自動刪除。

適合一次性任務、測試用。

### 4.6 環境變數（-e）

```bash
docker run -e MYSQL_ROOT_PASSWORD=secret mysql
```

設定容器內的環境變數。

可以多次使用：

```bash
docker run -e VAR1=value1 -e VAR2=value2 myapp
```

或用檔案：

```bash
docker run --env-file ./env.list myapp
```

### 4.7 Port Mapping（-p）

```bash
docker run -d -p 8080:80 nginx
```

把主機的 8080 port 對應到容器的 80 port。

格式：`主機Port:容器Port`

現在訪問 http://localhost:8080 就能看到 Nginx。

多個 port：

```bash
docker run -d -p 8080:80 -p 8443:443 nginx
```

### 4.8 Volume 掛載（-v）

```bash
docker run -d -v /host/path:/container/path nginx
```

把主機的目錄掛載到容器內。

詳細留到 Day 3 講。

### 4.9 組合範例

```bash
docker run -d \
  --name web \
  -p 8080:80 \
  -e NGINX_HOST=example.com \
  -v /data/html:/usr/share/nginx/html \
  --restart unless-stopped \
  nginx:1.25
```

這個命令：
- 背景執行 nginx:1.25
- 容器名稱叫 web
- 主機 8080 對應容器 80
- 設定環境變數
- 掛載目錄
- 除非手動停止，否則自動重啟

### 4.10 docker run 完整流程

當你執行 `docker run nginx`：

1. Docker Client 送請求給 Daemon
2. Daemon 檢查本機有無 nginx Image
3. 沒有的話，從 Registry 下載
4. 用 Image 建立 Container
5. 分配網路、準備檔案系統
6. 啟動 Container 內的程序
7. 連接終端（如果是前景執行）

---

## 五、docker ps - 查看容器（10 分鐘）

### 5.1 查看執行中的容器

```bash
docker ps
```

輸出：

```
CONTAINER ID   IMAGE   COMMAND                  CREATED         STATUS         PORTS                  NAMES
abc123def456   nginx   "/docker-entrypoint.…"   5 minutes ago   Up 5 minutes   0.0.0.0:8080->80/tcp   my-nginx
```

**欄位說明**

| 欄位 | 說明 |
|-----|-----|
| CONTAINER ID | 容器 ID（前 12 碼） |
| IMAGE | 使用的映像檔 |
| COMMAND | 啟動命令 |
| CREATED | 建立時間 |
| STATUS | 狀態（Up、Exited 等） |
| PORTS | Port 對應關係 |
| NAMES | 容器名稱 |

### 5.2 查看所有容器（包含已停止）

```bash
docker ps -a
```

已停止的容器 STATUS 會顯示 `Exited (0) 2 hours ago`。

### 5.3 只顯示容器 ID

```bash
docker ps -q      # 執行中
docker ps -aq     # 全部
```

用於批次操作：

```bash
# 停止所有容器
docker stop $(docker ps -q)

# 刪除所有已停止的容器
docker rm $(docker ps -aq -f status=exited)
```

### 5.4 篩選容器

```bash
# 根據名稱篩選
docker ps -f name=my-nginx

# 根據狀態篩選
docker ps -f status=running
docker ps -f status=exited

# 根據映像檔篩選
docker ps -f ancestor=nginx
```

### 5.5 格式化輸出

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

常用模板變數：
- `.ID`：容器 ID
- `.Image`：映像檔
- `.Names`：名稱
- `.Status`：狀態
- `.Ports`：Port 對應
- `.CreatedAt`：建立時間

### 5.6 查看最後建立的容器

```bash
docker ps -l    # 最後一個
docker ps -n 5  # 最後五個
```

---

## 六、實作練習（3 分鐘）

現在動手試試：

1. 拉取 nginx:alpine 映像檔
2. 用這個映像檔啟動一個容器，名稱叫 test-nginx，背景執行，port 8080
3. 查看容器是否在執行
4. 用瀏覽器訪問 http://localhost:8080

```bash
# 參考答案
docker pull nginx:alpine
docker run -d --name test-nginx -p 8080:80 nginx:alpine
docker ps
# 開瀏覽器訪問 http://localhost:8080
```

---

## 七、本堂課小結（2 分鐘）

這堂課學了四個基本指令：

| 指令 | 功能 |
|-----|-----|
| docker pull | 拉取映像檔 |
| docker images | 列出本機映像檔 |
| docker run | 建立並執行容器 |
| docker ps | 查看容器 |

**docker run 重要參數**

| 參數 | 功能 |
|-----|-----|
| -d | 背景執行 |
| -it | 互動模式 |
| --name | 指定名稱 |
| --rm | 自動刪除 |
| -e | 環境變數 |
| -p | Port Mapping |
| -v | Volume 掛載 |

下一堂課學停止、刪除、日誌、進入容器。

---

## 板書 / PPT 建議

1. docker pull 流程圖（包含 Layer 下載）
2. docker run 參數表
3. docker run 執行流程圖
4. docker ps 輸出欄位說明
