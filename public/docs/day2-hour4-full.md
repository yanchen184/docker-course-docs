# Day 2 第四小時：Docker 基本指令（上）

---

## 一、前情提要（2 分鐘）

Docker 裝好了，現在開始學指令。

不知道怎麼用的時候，有三個萬能的幫助命令：

```bash
docker version          # 查看 Docker 版本資訊
docker info             # 查看 Docker 系統級別的詳細資訊（包含映像檔和容器數量）
docker 命令 --help       # 查看任何命令的用法（萬能命令）
```

`docker info` 會顯示比 `docker version` 更詳細的資訊，包括當前有多少容器在執行、多少映像檔、伺服器版本、插件資訊等。遇到不會的命令，第一時間用 `--help` 查詢，或去 Docker 官方文檔的 Reference > Command Line 查閱。

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

### 2.4 完整地址與省略寫法

`docker pull nginx` 其實是省略寫法，完整地址是：

```bash
docker pull docker.io/library/nginx:latest
```

不寫 Tag 預設就是 `latest`（最新版）。指定版本時，版本號必須是官方文檔中確實存在的，不能隨便填寫。

### 2.5 拉取過程解析

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

每一行是一個 Layer（分層下載）。如果 Layer 已經存在本機，會顯示 `Already exists`。

**分層下載的好處：不同映像檔之間可以共用相同的 Layer。** 例如 MySQL 8.0 和 5.7 的映像檔底層可能有相同的 Layer，下載 5.7 時這些共用的 Layer 就不需要重複下載，大幅節省磁碟空間和下載時間。這是 Docker 映像檔基於聯合檔案系統（UnionFS）的核心設計。

### 2.6 搜尋映像檔

除了在 Docker Hub 網站上搜尋，也可以用命令列搜尋：

```bash
# 搜尋映像檔
docker search mysql

# 篩選 Stars 數量大於 3000 的映像檔
docker search mysql --filter=STARS=3000

# 篩選 Stars 數量大於 5000 的
docker search mysql --filter=STARS=5000
```

搜尋結果會顯示映像檔名稱、描述、Stars 數量等資訊，類似 GitHub 的搜尋結果。

### 2.7 查看可用版本

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

### 3.6 刪除映像檔（docker rmi）

`rmi` 中的 `rm` 是 Linux 的刪除命令，`i` 代表 Image。注意和 `docker rm`（刪除容器）的區別。

```bash
# 刪除指定映像檔（透過 IMAGE ID）
docker rmi -f <IMAGE_ID>

# 刪除指定映像檔（透過名稱）
docker rmi -f nginx:1.25

# 刪除多個映像檔（空格分隔）
docker rmi -f <IMAGE_ID1> <IMAGE_ID2>

# 刪除所有映像檔（配合 docker images -aq）
docker rmi -f $(docker images -aq)
```

`-f` 是強制刪除。刪除映像檔時，如果有共用的 Layer 被其他映像檔使用，那些 Layer 不會被刪除。

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
docker run -it ubuntu /bin/bash
```

- `-i`：保持 STDIN 開啟（可以輸入）
- `-t`：分配偽終端（有正常的終端介面）

通常 `-it` 一起用，進入容器的 shell。後面的 `/bin/bash` 指定使用 bash 作為控制台。

進入容器後，命令提示符會變成容器的 ID（如 `root@abc123:/#`），這時你已經「在容器裡面」了。容器內部就是一個獨立的小型系統環境，和外部主機沒有關係。

```bash
root@abc123:/# ls        # 查看容器內的檔案系統
root@abc123:/# exit       # 離開容器
```

**退出容器的兩種方式：**

| 方式 | 效果 |
|------|------|
| `exit` | 停止容器並退出 |
| `Ctrl + P + Q` | 退出但容器繼續在背景執行 |

如果你只是想暫時離開容器、稍後再進去，用 `Ctrl + P + Q` 就不會把容器停掉。

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

### 4.7 Port Mapping（-p / -P）

```bash
docker run -d -p 8080:80 nginx
```

把主機的 8080 port 對應到容器的 80 port。

**`-p`（小寫）的四種用法：**

| 格式 | 說明 |
|------|------|
| `-p 主機Port:容器Port` | 最常用，指定主機和容器的 port 對應 |
| `-p 容器Port` | 只指定容器 port，主機 port 隨機分配 |
| `-p ip:主機Port:容器Port` | 綁定特定 IP |
| `-P`（大寫） | 隨機分配主機 port |

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

### 5.7 刪除容器（docker rm）

注意 `docker rm` 是刪除容器，`docker rmi` 是刪除映像檔（多了一個 `i` 代表 Image）。

```bash
# 刪除指定容器
docker rm <CONTAINER_ID>

# 強制刪除（包含執行中的容器）
docker rm -f <CONTAINER_ID>

# 刪除所有容器
docker rm -f $(docker ps -aq)

# 用管道符刪除所有容器（效果一樣）
docker ps -aq | xargs docker rm
```

正在執行的容器不能直接刪除，需要先停止或使用 `-f` 強制刪除。

### 5.8 啟動和停止容器

```bash
docker start <CONTAINER_ID>      # 啟動已停止的容器
docker restart <CONTAINER_ID>    # 重啟容器
docker stop <CONTAINER_ID>       # 優雅停止容器
docker kill <CONTAINER_ID>       # 強制停止容器
```

`stop` 會發送 SIGTERM 信號讓容器優雅關閉，`kill` 則是直接發送 SIGKILL 強制終止。

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

Docker 的命令主要圍繞著**映像檔**和**容器**兩大主題。

**映像檔相關指令**

| 指令 | 功能 |
|-----|-----|
| docker pull | 拉取映像檔 |
| docker images | 列出本機映像檔 |
| docker search | 搜尋 Docker Hub 上的映像檔 |
| docker rmi | 刪除映像檔 |

**容器相關指令**

| 指令 | 功能 |
|-----|-----|
| docker run | 建立並執行容器 |
| docker ps | 查看容器 |
| docker start / stop | 啟動 / 停止容器 |
| docker restart | 重啟容器 |
| docker kill | 強制停止容器 |
| docker rm | 刪除容器 |

**docker run 重要參數**

| 參數 | 功能 |
|-----|-----|
| -d | 背景執行 |
| -it | 互動模式 |
| --name | 指定名稱 |
| --rm | 自動刪除 |
| -e | 環境變數 |
| -p / -P | Port Mapping（指定 / 隨機） |
| -v | Volume 掛載 |

**後續會學到的常用指令預覽**

| 指令 | 功能 |
|-----|-----|
| docker logs | 查看容器日誌 |
| docker exec | 進入容器（開啟新的命令行終端） |
| docker attach | 進入容器（直接進入正在執行的終端） |
| docker inspect | 查看容器或映像檔的詳細元數據 |
| docker top | 查看容器內的程序資訊 |
| docker cp | 從容器內複製檔案到主機 |
| docker pause | 暫停容器 |

`exec` 和 `attach` 的區別很重要：`exec` 會開啟一個新的終端，`attach` 則是直接進入容器正在執行的終端。

下一堂課學停止、刪除、日誌、進入容器。

---

## 板書 / PPT 建議

1. docker pull 流程圖（包含 Layer 下載）
2. docker run 參數表
3. docker run 執行流程圖
4. docker ps 輸出欄位說明

