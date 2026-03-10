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


---

## 📺 補充教材：狂神說 Docker

> 以下內容來自【狂神說Java】Docker 教程系列，作為本節的補充參考資料。

### P09：鏡像的基本命令

<sub>[00:00-00:12]</sub>
我們來繼續講，了解完了 Docker 的一些基本安裝和基本的一些概念之後，大家肯定現在是模稜兩可的。我們來把這些所有的命令一學，大家頭腦瞬間就清醒起來了，然後我們再做一些作業，大家就懂了。

<sub>[00:12-00:32]</sub>
那我們來看一下，首先把這個幫助命令說一下，這是一個萬能的。就是我們以後不會東西，就去這邊查就可以了。來我們寫到這裡，還是一樣的，比如說第一個 `docker version`，這個我們剛才已經看了對吧。那除了這個之外 `docker info` 可以看 Docker 的信息，還有一個就是 `docker 命令 --help`，這是我們的一個萬能命令。

<sub>[00:32-00:55]</sub>
我們之後的話都會通過這個命令，這是一個萬能命令。可以都通過它來看，我們來看一下。首先 `docker version` 這個已經給大家講解過了，就是打印咱們當前 Docker 的一些基本的信息對不對，那就是顯示 Docker 的版本信息。然後再往下 `docker info` 什麼意思呢，我們來看一下。

<sub>[00:55-01:35]</sub>
這個 info 也是信息的意思對不對，那這個就會顯示 Docker 的一些更加詳細的信息。點開之後在這裡面就可以看到 `docker info` 當前的客戶端、它的一些模式、服務器它這裡面運行了什麼。你看看，當前運行的是零，咱們停止的對吧，這是跟容器相關的。然後當前這裡面有多少個鏡像，然後它的一個服務器的版本地址，然後它的一些插件信息。所以這個信息會更加詳細一點，顯示 Docker 的系統信息，也就是 System 級別的，包括咱們的鏡像和容器，我們剛才可以看到鏡像和容器的數量。

<sub>[01:35-02:09]</sub>
OK 那再往下 `docker --help`，這就是一個幫助命令。就是以後我們不知道怎麼用了，比如說我想看 Docker 有哪些命令，那這個時候我就可以 `docker --help`。在這裡面的話就可以看到 Docker 的所有命令，是非常非常多的，從上到下命令非常多，我們後面這些命令幾乎都要學到。第二個我們需要知道幫助文檔的地址，就是你們要學會，以後我們的命令不會就查 `docker --help`，然後再不會的話可以去官網看。

<sub>[02:09-03:15]</sub>
那我們來看一下這個鏡像是哪裡的，在這邊往下翻，我們去找一下它的一個 Docker 文檔。還是從 Docker 官網翻到下面的一個 Docs，到了 Docs 這個文檔之後，側面是不是有一個咱們的 Get Started、還有一些幫助，然後上面有一個 Reference。我們可以去找一下 Reference，在 Reference 裡面就可以找到我們的所有命令了。在側邊第一個 Command Line 命令行那些，你可以看到這邊就非常多命令。我們之後就可以在這邊查詢，所以說要找到官方文檔的位置，在 Docs 下面的 Reference 命令行這邊就有，所有跟 Docker 客戶端相關的命令，每一個命令都可以在這查到。

<sub>[03:15-04:00]</sub>
OK 那現在我們就已經做好了準備，對吧，就可以學一下咱們第一個關於 Docker 最重要的就是鏡像的命令。鏡像的話是一個，然後第二個我們要學它的容器命令，這兩個是基礎的。很多人會 Docker 覺得自己會了，就會了這兩個，這兩個連入門都不算。我們說了整個課程學到我們的 Dockerfile 集成，其實只佔這個課程的大概四分之一這個樣子。

<sub>[04:00-05:05]</sub>
來我們來說一下鏡像命令。首先一個一個來，比如說 `docker images`，我們來看一下剛才我們用過這個命令，是不是查看我們的所有鏡像，對吧，查看所有本地主機上的鏡像。我們給大家下了個 Hello World，那這個時候你們就可以去官方文檔上來看，跟著我思路學習方法，這個很重要。在這邊下面是不是有個 `docker images`，你點擊就可以了，找到對應的命令。

<sub>[05:00-06:17]</sub>
到了這個 `docker images`，這個地方告訴了它的使用方式、它的一個介紹，可以看到所有的一些鏡像地址，包括倉庫和它的一些 Tag 標籤。你可以通過一些參數，比如說通過 `-a` 可以看到所有的鏡像，比如說 `--filter` 可以來過濾，你也可以去做一些輸出配置，還有只顯示 ID 這個我們經常用。那第二個，不會用 `docker images --help`，在這個地方也可以告訴我們當前常用命令是不是 `-a`、`-f`、`-q`。那現在知道這兩個查詢命令的方式，我們就可以玩一下。首先 `docker images` 可以查詢出來當前這個信息對不對。那現在我們來把這個命令給大家詳細解釋一下。第一個叫 REPOSITORY，就是鏡像的倉庫源、它的名字；TAG 就是一個版本標籤信息，鏡像的標籤；IMAGE ID 就是咱們鏡像的 ID；CREATED 就是咱們鏡像的創建時間；SIZE 就是鏡像的大小，你看這 Hello World 才 13K 是不是非常小。

<sub>[06:17-07:07]</sub>
那再往下走就是可選項。大概是這麼三個，`-a`、`-f`、`-q`。`-a` 的話就是列出所有的鏡像。然後 `--filter` 是一個過濾、`--format` 是格式化，這幾個想要就可以要，不經常用就不用它。然後 `-q` 就是只顯示鏡像的 ID，這個我們會經常用。以後刪除的話就可以把所有的鏡像列出來刪掉，等會給大家講一些騷操作。現在我可以來試一下這兩個命令，`docker images -a` 就是顯示所有，`-q` 只是顯示這個 ID，這個命令我們之後會經常用。`-aq` 把它聯合起來，其實就是顯示所有的鏡像 ID。

<sub>[07:07-08:42]</sub>
OK 那這是咱們的 `docker images` 命令，比較簡單。除了這個之外，我們經常要去搜索，好比我們現在要去 Docker Hub 上搜索一個東西。Docker 它是有一個 Docker Hub 的，Docker Hub 裡面就是一個商店，我們可以在裡面搜索很多東西，比如說搜索一個 Tomcat 或者搜一個 MySQL。你們就可以看到 MySQL 的服務就在這個地方有，這是網頁版的搜索。我們正常搜索的話，也可以直接在這邊用 `docker search` 命令搜索鏡像。

<sub>[08:42-09:32]</sub>
默認的話你們在官網上就可以看到相關的 MySQL 鏡像說明。它這邊有點描述、當前支持的版本，比如說我們一般喜歡使用 5.7 或者 8.0 也是支持的。然後再往下走它會介紹什麼是 MySQL，然後 How to use the image 就告訴你如何使用了。那我們現在通過 `docker search` 來搜索，跟我們在網頁上搜索是一樣的，搜出來之後跟 GitHub 一樣這邊有很多信息，比如說 Stars 9.5K 非常多。

<sub>[09:32-11:12]</sub>
我們把搜索命令的可選項也看一下。不知道 `docker search` 怎麼用，可以通過兩種方式。第一種去官方文檔找 `docker search` 命令，第二種用 `search --help`。這裡面就顯示了比如說你可以去過濾一些跟 Stars 相關的。那現在我想搜索比如說 Stars 在 3000 以上的收藏，可以通過 `--filter`，比如說 `--filter=STARS=3000`，那搜索出來的鏡像就是 Stars 大於 3000。這個命令有時也會去用，當然不是一個必要的命令。我們測試一下，比如說搜 MySQL 再追加參數 `--filter=STARS=3000`，回車之後就只搜出來 3000 以上的了。如果搜 5000 以上就只剩下 MySQL 了。

<sub>[11:12-13:04]</sub>
`docker search` 完了之後，我們還有 `docker pull`，我們現在能搜索了就要下載對不對。怎麼下載呢，還是一樣，`docker pull` 來下載鏡像。首先看一下 `docker pull --help`，命令比較少，下載的時候可以通過 `-a` 跟 `-q`。我們直接來搜 `docker pull mysql`，就跟拉取一樣。這個時候它就會去下載 MySQL，它現在使用默認的 Tag 就是 Latest，就是默認使用最新的版本，我們也可以指定版本的下載。如果不寫 Tag 默認就是 Latest 最新版。

<sub>[13:04-14:19]</sub>
然後它下載的時候你看，它是一層一層下載的，這個叫分層下載，也叫 Layer。分層下載是 Docker Image 的核心，這個分層下載是怎麼做的呢，我們後面要說到一個聯合文件系統，後面給大家解釋底層原理的時候再說。然後這邊有它的一個簽名信息就是防偽標誌，下面這個 `docker.io` 就是它的一個真實地址。短短一個 `docker pull` 裡面就包含了這麼多信息。`docker pull mysql` 就等價於 `docker pull docker.io/library/mysql:latest`，這兩個命令是等價的。

<sub>[14:19-15:50]</sub>
那如果我們要指定其他版本，比如說 `docker pull mysql:5.7`，這個版本一定要在官方文檔有，你不要瞎寫，瞎寫版本肯定不存在的。我的 5.7 在這地方是有的，來下載一下。你可以看到下載的層級，這個分層是一個非常高明的設計。上面是不是下載這些鏡像的時候它說已經存在了（Already exists），這個分層的好處是它可以共用。比如說 8.0 跟 5.7 的鏡像前面是一樣的，它可以不用下載了，這一塊就共用了。可能甚至幾十個幾百個鏡像前面東西都是共用的，不需要重複下載，極大的節省內存。這個地方只下載了下面四個，它只需要更新新的東西就好了，以前跟其他東西重複的層就不用了。這個是 Linux 裡面一個非常核心的聯合文件系統。

<sub>[15:50-16:17]</sub>
下載完之後使用的就是 5.7 版了，這就叫指定版本下載通過 Tag。我們 `docker images` 就可以看到版本信息了，5.7 的 Tag 就是 5.7，沒有標版本的就是最新版的 Latest。然後這邊顯示它的大小，官方鏡像還是比較大的，我們還可以自己做一個鏡像。

<sub>[16:17-17:55]</sub>
除了這個之外，我們現在會下載了、會搜索了，最後我們再把它刪除。刪除鏡像用 `docker rmi`，這個 `rm` 就是 Linux 的刪除，`rmi` 這個 `i` 就代表 Image，`rmi` 就是刪除鏡像，非常好理解。`-f` 就是全部刪掉。刪除可以通過鏡像的 ID 來刪，也可以通過鏡像名稱來刪，一般通過 ID 刪方便一點。比如說我把 5.7 的 ID 複製過來，回車它就刪完了。你看刪除的層數並沒有把 8.0 的刪除，因為它們共用的層還在。

<sub>[17:55-19:05]</sub>
那除了一個一個刪之外，我們想批量刪除全部的可以怎麼操作？`docker rmi -f` 後面跟 `$(docker images -aq)`，這是不是就是查出所有鏡像的 ID 啊，然後它就會一個一個遞歸刪除。回車兩個都刪掉了，`docker images` 再看就沒有了。所以這幾個命令也非常簡單。刪除指定的鏡像 `docker rmi -f 鏡像ID`，刪除多個鏡像通過空格分隔，刪除全部鏡像 `docker rmi -f $(docker images -aq)`。

<sub>[19:00-19:05]</sub>
那到目前為止我們的鏡像命令到這個地方就夠了。回顧一下：第一會查看，第二會搜索，第三會下載，下載下來之後就可以用了，用起來就是容器的事情了，然後我們會刪除。增刪改查就這麼回事。那這是關於咱們鏡像的這幾個命令，一定要下去吸收理解。

### P10：容器的基本命令

<sub>[00:00-00:34]</sub>
我們來繼續啊。剛才那個地方我們把鏡像寫成容器了，那個地方是我們的 Image ID 就是鏡像 ID，給大家改過來了。然後我們來看一下容器命令。先說明一下，我們有了鏡像才可以創建容器，這是一個前提，所以說我們要先下載鏡像。我們都學了 Linux，所以這個地方我們來下載一個 CentOS 鏡像來測試學習。我們就在 Docker 裡面再裝一個容器，就好比咱們的一個虛擬機。

<sub>[00:34-01:32]</sub>
那現在我們要做一個準備工作，來下載一下。還是一樣的 `docker pull centos`，我們就用最新版本的。現在我們就是用 Docker 去跑了一個 CentOS 系統，這個比你們那個虛擬機快多了。下載完之後我們就可以啟動了。第一個我們要研究新建容器並啟動。這個 CentOS 是一個基本鏡像，你可以發現它就一層，非常小，很快就下完了。下載完畢之後，我們就可以通過 `docker run` 命令來啟動。

<sub>[01:32-03:00]</sub>
那我們還是看一下 `run --help`，你看到 `run` 命令能跟的參數多得要死。比如說 `-a`、`-d`，然後還有常用的 `-p`、`-h`，這些都是我們經常用的，`-v` 掛載一些外卷。來看參數說明，經常會用的第一個 `--name`，就是我們要給這個容器起個名字，它跑起來了我們得知道它叫什麼對不對，比如說跑起來的 Tomcat 要有個 tomcat01、tomcat02，用來區分容器。`-d` 代表以後台方式運行，我們經常啟動一些應用，以前是用 `nohup`，現在用 Docker 運行 `-d` 就可以了。`-it` 就是使用交互方式運行，比如說我們要進入容器查看內容。

<sub>[03:00-04:48]</sub>
然後 `-p` 就是指定容器的端口，比如說我們要啟動一個 8080 端口就得把它打開。`-p` 有四種使用方式：第一種 `主機端口:容器端口`（這是最常用的），第二種直接寫容器端口，第三種 `ip:主機端口:容器端口`，還有隨機指定端口用大寫 `-P`。我們最常使用的還是 `主機端口:容器端口` 這種方式，一定要記住。

<sub>[04:48-06:08]</sub>
現在了解了 `docker run` 命令，我們來先體驗一下。`docker images` 看一下，現在我們下載了一個 CentOS 鏡像對不對。我現在要運行，`docker run -it centos /bin/bash`，`-it` 我們說了這樣可以進入容器、交互運行，後面 `/bin/bash` 是指定控制台。來看到區別了嗎，現在我們已經進入了容器，這個地方就是啟動並進入容器。注意我們的區別，Linux 後面跟的是主機名稱，啟動了 CentOS 之後這個主機名變成了容器的鏡像 ID。

<sub>[06:08-07:28]</sub>
現在我可以在這邊 `ls` 看一下，這個容器裡面跟我們容器外面是一樣的，因為這個就是我們下載的 CentOS，它就是一個小型的服務器環境。容器內部其實就是一個自己的服務器環境，內部的 CentOS 跟外部現在有關係嗎？沒有半毛錢的關係。而且這個內部的基礎鏡像很多命令都是不完善的。現在我進來了這個容器想退出去，`exit` 退出去，又回到我們的主機了。鏡像裡面的東西跟鏡像外面的區別，鏡像外面咱們是服務器有完整的環境。

<sub>[07:28-09:00]</sub>
那這就是退出容器的命令，就是以後你們進入了容器怎麼退出來。現在我已經退出來了，我還想去查看一下有哪些容器正在運行，就列出所有運行中的容器。`docker ps` 回車就可以看到當前正在運行的容器，這邊沒有運行因為我們已經 exit 退出了。`docker ps -a` 就是查看曾經運行過的，可以看到剛才運行的東西全部都有。

<sub>[09:00-10:07]</sub>
`docker ps` 命令常用參數：默認列出當前正在運行的容器，加了 `-a` 代表 All 的意思就會帶出歷史運行過的容器。`-n=?` 就是顯示最近創建的容器，可以顯示個數，比如 `-n=1` 就只顯示最近一個。`-q` 也是只顯示容器的編號。剛才說只顯示鏡像 ID 是 `docker images -aq`，容器也是一樣的用 `docker ps -aq`，這些區別一定要多去練。

<sub>[10:07-11:38]</sub>
現在我們來講退出容器。有兩種方式：第一種 `exit` 直接容器停止並退出。第二種我要容器不停止但退出，可以通過快捷鍵 `Ctrl + P + Q` 三個鍵。我們測試一下，現在 `docker ps` 當前沒有運行的，我啟動一下 `docker run -it centos /bin/bash`，進去之後我按 `Ctrl + P + Q`，看到它直接從容器退回到主機了。現在 `docker ps` 可以看到這個容器正在運行。這就是第二種退出方式，大家如果想退出之後容器不停止就通過 `Ctrl + P + Q`。

<sub>[11:38-13:06]</sub>
刪除容器也是比較簡單的。`docker rm` 就是指容器（`docker rmi` 才是移除鏡像），所以整個 Docker 就是在圍繞著鏡像跟容器打交道。刪除指定容器 `docker rm 容器ID`，刪除所有容器 `docker rm -f $(docker ps -aq)`。注意正在運行的容器是不能刪除的，如果要強制刪除就是 `rm -f`。

<sub>[13:06-14:30]</sub>
除了用 `$()` 這種方式，還可以通過管道符。`docker ps -aq | xargs docker rm` 也可以刪除所有容器，只要 Linux 玩得好怎麼玩都不會錯。

<sub>[14:30-16:55]</sub>
然後就是啟動和停止容器的操作。`docker start 容器ID` 啟動容器，`docker restart 容器ID` 重啟容器，`docker stop 容器ID` 停止當前正在運行的容器，`docker kill 容器ID` 強制停止當前容器。這幾個命令都是 Linux 的命令，大家聽起來非常輕鬆。比如說現在我運行一下 CentOS，進去之後 exit 退出，`docker ps` 沒有正在運行的，`docker ps -a` 歷史運行過的在這。現在 `docker start 容器ID` 把它啟動，`docker ps` 可以看到正在運行。`docker stop` 把它停掉，`docker ps` 就看不到它了。

<sub>[16:55-16:55]</sub>
到目前為止容器命令先了解這些，這些都是基本命令。這是你要玩一個 Docker，這些命令是你閉著眼睛都得會的。這些命令完了之後我們肯定還有一些常用的進階命令。

### P13：常用命令小結

<sub>[00:00-00:18]</sub>
我們來看一下，剛才已經把基本的命令都講完了。給大家來畫了一幅圖，這幅圖是官方的，我們來給它小結一下。在裡面講了我們所有的命令，你可以看到我們學的命令主要是跟容器、鏡像相關的，除了這個之外還有跟遠程倉庫的一些東西。所以命令是非常非常多的，但不要著急，不難。

<sub>[00:18-01:02]</sub>
我們現在把容器這個地方的命令學完了之後，還要去學習 Dockerfile、Repository 還有一些相關的文件，那還有一些命令。在這個圖裡面就把所有東西顯示了。比如說我們想從容器內拷貝到 Linux 上是不是用 `cp` 命令。我們要把一個 Image 啟動成一個容器通過 `run` 命令就可以進行啟動了。運行之後要停止怎麼辦呢，可以通過 `exit` 和 `stop` 進行停止；要啟動可以通過 `start` 啟動，也可以通過 `pause` 進行暫停。

<sub>[01:02-01:54]</sub>
除了這個之外裡面有一些常用的命令，比如說 `logs` 查看日誌、`inspect` 查看元數據，`attach` 也是進入容器的一個命令。`-p` 和 `-P` 是控制端口的，`ps` 看裡面所有的容器信息，`rm` 移除，`exec` 也是進入執行。這邊寫得非常明顯，`exec` 是開一個命令行終端，而 `attach` 是直接進入，這兩個命令非常重要，平時容易有人搞混了。`top` 就是查看一些進程信息。

<sub>[01:54-02:31]</sub>
除了這些命令，你看這些只是容器跟鏡像相關的，剩下命令還多著呢，我們要一點一點學習。Docker 容器的一些命令在這邊顯示的，比如說 `docker version`、`docker info`、`docker events`，你們在這邊都可以看。那這是我們的命令小結，具體的命令是十分多的。還是給大家講那句話，每學一個命令就把它記到博客裡面，否則有些命令隔時忘了你還經常要回來看。

<sub>[02:31-03:54]</sub>
你一定要寫一個自己的手冊，像我下面那種小結這樣的，以後要看什麼命令直接來手冊上面一查，一眼就看清楚了。這邊用英文字母給大家排序好了，以後要查什麼直接查看就可以了，非常方便。所以在這個地方記住，Docker 的命令是十分多的，上面我們學習的那些都是最常用的一些容器和鏡像的命令，之後我們還會學習很多命令。

<sub>[02:55-03:54]</sub>
比如說我們自己寫了一個鏡像怎麼發布呢？我們還有 `login` 命令，可以登錄 Docker Hub 或者登錄阿里雲，然後把你的鏡像通過 `push` 傳上去，跟 GitHub 是一樣的。你也可以通過 Dockerfile 來製作一個鏡像，這是一個單向的，我們可以通過 Dockerfile 這個文件直接生成一個鏡像 `build`，這個東西非常高級，是我們之後學的一個核心。你把 Dockerfile 徹底理解了，你就知道 Docker 的所有原理了。當然在此之前還要把 Docker 的鏡像認真練一下，還要做一些練習。接下來就是一堆的練習，我帶大家練習幾個，剩下的大家可以自行下去練習，來體驗一下用 Docker 的好處，比如部署一些真實的環境來測試一下。

