# Day 3 第十三小時：Docker Compose（基礎 + 進階）

---

## 一、為什麼需要 Docker Compose（10 分鐘）

### 1.1 開場：一個真實的 Web 應用

好，各位同學，我們終於來到了一個非常重要的主題——Docker Compose。

在開始之前，我想先帶大家回顧一下。前面的課程我們學了什麼？Day 2 學了所有的 Docker 基礎指令，今天上午學了 Volume、容器網路、Dockerfile、Multi-stage Build、docker push......到目前為止，你們已經具備了操作單一容器的所有技能。

但是我現在要問大家一個問題：在真實的工作環境裡面，你的應用程式只有一個容器嗎？

不可能嘛，對吧？

讓我舉一個最典型的例子。假設你今天要部署一個電商網站，這個網站至少會包含這些東西：

```
┌─────────────────────────────────────────────────────┐
│              一個典型的電商系統                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│   Nginx（前端 / 反向代理）                            │
│        │                                             │
│        ▼                                             │
│   Node.js API（後端商業邏輯）                         │
│        │              │                              │
│        ▼              ▼                              │
│   MySQL（資料庫）   Redis（快取 / Session）            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

四個服務。如果再加上訊息佇列 RabbitMQ、搜尋引擎 Elasticsearch、監控 Prometheus......輕輕鬆鬆就超過六、七個。

每一個服務，在 Docker 的世界裡，就是一個容器。

### 1.2 如果用 docker run 會怎樣

好，那我們用之前學的方式，把這四個服務跑起來。大家跟我一起看看要打多少指令。

**第一步，建立網路：**

```bash
docker network create my-app-network
```

**第二步，建立 Volume：**

```bash
docker volume create mysql-data
docker volume create redis-data
```

**第三步，啟動 MySQL：**

```bash
docker run -d \
  --name mysql \
  --network my-app-network \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppass \
  -v mysql-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8
```

**第四步，啟動 Redis：**

```bash
docker run -d \
  --name redis \
  --network my-app-network \
  -v redis-data:/data \
  redis:7-alpine
```

**第五步，啟動 Node.js API：**

```bash
docker run -d \
  --name api \
  --network my-app-network \
  -e DATABASE_HOST=mysql \
  -e DATABASE_USER=appuser \
  -e DATABASE_PASSWORD=apppass \
  -e REDIS_HOST=redis \
  -p 3000:3000 \
  my-api:latest
```

**第六步，啟動 Nginx：**

```bash
docker run -d \
  --name nginx \
  --network my-app-network \
  -p 80:80 \
  -v ./nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
```

大家看到了嗎？光是四個服務，我就打了六個指令，每個指令還都一大串參數。

我問大家，這樣做有什麼問題？

**第一，你煩不煩？** 每次要啟動整個應用，就要打這六個指令。每個指令的參數都要記住，少打一個 `-e`，少打一個 `-v`，整個就壞掉了。你覺得你每次都能完美無誤地把這六個指令打對嗎？我跟你說，一定會錯。不是這次錯就是下次錯。

**第二，順序要記住。** MySQL 要先啟動，因為 API 依賴它。你如果先啟動 API，API 去連 MySQL，連不到，直接報錯退出。Redis 也是一樣的道理。你每次都要記住「先啟動資料庫，再啟動快取，然後 API，最後 Nginx」——這個順序記在哪裡？記在你腦子裡？那如果你請假了呢？

**第三，團隊新人加入怎麼辦？** 小明是新來的工程師，他第一天上班，要把開發環境跑起來。你跟他說：「你去看 Wiki 上的步驟。」他打開 Wiki，看到六個指令，複製貼上，結果第三個指令的密碼已經改了但 Wiki 沒更新......然後他花了一整天在 debug 環境問題。這個場景，我相信在座的各位或多或少都經歷過。

**第四，要停掉的時候更痛苦。** 你要一個一個 `docker stop`，然後一個一個 `docker rm`，然後 `docker network rm`......你確定你沒有忘記刪某個容器嗎？

所以我說，用 `docker run` 來管理多個容器，在真實的專案裡面是不切實際的。

### 1.3 Docker Compose 來救場

Docker Compose 的核心思想非常簡單：**把所有服務的設定寫在一個 YAML 檔案裡面，然後用一個指令就能啟動全部、停止全部、管理全部。**

剛才那六個指令，用 Docker Compose 來寫，就是一個檔案加一個指令：

```bash
docker compose up -d
```

搞定。全部跑起來。

要停呢？

```bash
docker compose down
```

全部停掉、清理乾淨。

就這樣。是不是簡單到不可思議？

而且這個 YAML 檔案可以放進 Git 跟程式碼一起版本控制。新同事加入？`git clone` 下來，`docker compose up -d`，整個開發環境就跑起來了。不用看 Wiki，不用問人，不用猜參數。

這就是 Docker Compose 的價值。它不是什麼新的技術，本質上就是幫你把 `docker run` 的參數用一個檔案寫下來，然後用一個統一的指令來管理。但就這麼簡單的一件事，可以省下你無數的時間和痛苦。

### 1.4 版本：v1 vs v2

在正式開始之前，我要特別提一個很容易搞混的東西——版本問題。

你在網路上查 Docker Compose 的資料，會看到兩種寫法：

```bash
# 舊版 v1（有 dash）
docker-compose up -d

# 新版 v2（空格）
docker compose up -d
```

看起來差別不大對吧？就差一個 dash 和空格。但底層完全不同。

| 比較項目 | Compose v1（舊版） | Compose v2（新版） |
|---------|-------------------|-------------------|
| 指令寫法 | `docker-compose`（有 dash） | `docker compose`（空格） |
| 安裝方式 | 獨立安裝的 Python 程式 | Docker CLI 的外掛 |
| 效能 | 較慢（Python 寫的） | 較快（Go 語言重寫） |
| 維護狀態 | 已停止維護 | 官方推薦，持續更新 |

v1 已經停止維護了，不要再用了。**本課程統一使用 v2**，也就是 `docker compose`（空格）的寫法。

我們先來確認一下環境：

```bash
docker compose version
# Docker Compose version v2.24.5
```

只要看到 `v2.x.x`，就沒問題。如果你用的是 Docker Desktop，不管 Windows、Mac 還是 Linux，v2 都已經內建了，不需要額外安裝。

好，環境確認完了，我們開始正式學 Docker Compose。

---

## 二、compose.yaml 基本結構（15 分鐘）

### 2.1 檔案命名

首先聊一下檔案怎麼命名。Docker Compose 會自動尋找以下名稱的檔案，按優先順序：

1. `compose.yaml`（官方推薦）
2. `compose.yml`
3. `docker-compose.yaml`
4. `docker-compose.yml`

以前大家都習慣用 `docker-compose.yml`，但現在官方推薦的名稱是 `compose.yaml`。原因很簡單——`.yaml` 是 YAML 格式的官方副檔名，`.yml` 只是一個縮寫慣例而已。既然要選，就選官方推薦的。

本課程統一使用 `compose.yaml`。你在網路上看到 `docker-compose.yml` 的話，知道是舊的命名慣例就好，功能是一樣的。

### 2.2 最簡範例

我們先來看一個最簡單的 `compose.yaml`：

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
```

就這四行。這個檔案在說什麼呢？「我有一個服務叫 `web`，用 `nginx:alpine` 映像檔，把主機的 8080 port 對應到容器的 80 port。」

這等同於：

```bash
docker run -d --name web -p 8080:80 nginx:alpine
```

是不是很直覺？compose.yaml 就是把 `docker run` 的參數用 YAML 格式寫下來。

### 2.3 完整的基本結構

好，現在來看一個更完整的例子。我一行一行帶大家看：

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: myapp
    volumes:
      - db-data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

volumes:
  db-data:
```

來，我們逐行拆解。

**`services:`** —— 這是最上層的關鍵字。所有的服務都定義在這底下。一個服務 = 一個容器。

**`web:` / `db:`** —— 服務的名稱，你可以自己取。這個名字非常重要，因為它同時也是這個容器在 Docker 網路裡面的 hostname。別的容器要連到它，就用這個名字。

**`image:`** —— 指定映像檔。跟 `docker run` 後面接的映像檔名一模一樣。

**`ports:`** —— Port mapping。格式是 `"主機 port:容器 port"`。我特別提醒大家，**一定要加引號**。為什麼？因為 YAML 有一個很奇怪的特性——它會把 `80:80` 解讀成六十進位的數字。沒錯，你沒聽錯，YAML 有六十進位的支援。所以 port mapping 請養成加引號的習慣。

**`volumes:`**（在服務裡面）—— 掛載資料卷。有兩種寫法：
- `./html:/usr/share/nginx/html:ro` 是 bind mount，把本機的 `./html` 掛載到容器裡，`:ro` 表示唯讀
- `db-data:/var/lib/mysql` 是 named volume，用一個叫 `db-data` 的具名 Volume

**`environment:`** —— 設定環境變數，對應 `docker run -e`。

**`restart:`** —— 重啟策略。`unless-stopped` 的意思是除非你手動停止它，否則容器掛了就自動重啟。這個在正式環境非常常用。

**`volumes:`**（在最外層）—— 宣告具名 Volume。你在服務裡面用了 `db-data` 這個 Volume，就要在最外層宣告它。

### 2.4 三大區塊

一個 compose.yaml 主要有三個頂層區塊：

```yaml
services:    # 定義服務（容器）
  ...

volumes:     # 定義具名 Volume
  ...

networks:    # 定義自訂網路（可選）
  ...
```

`services` 是必須的，`volumes` 和 `networks` 看你需不需要。今天這堂課三個都會用到。

### 2.5 compose.yaml vs docker run 對照表

這張表非常重要，我建議大家把它記下來。compose.yaml 裡面的每一個設定，都有對應的 `docker run` 參數：

| compose.yaml 設定 | docker run 參數 | 說明 |
|-------------------|----------------|------|
| `image: nginx` | `docker run nginx` | 使用的映像檔 |
| `ports: ["8080:80"]` | `-p 8080:80` | Port mapping |
| `volumes: [./html:/app]` | `-v ./html:/app` | 掛載資料卷 |
| `environment: {KEY: val}` | `-e KEY=val` | 環境變數 |
| `container_name: my-web` | `--name my-web` | 容器名稱 |
| `restart: always` | `--restart always` | 重啟策略 |
| `networks: [my-net]` | `--network my-net` | 加入網路 |
| `command: ["node", "app.js"]` | 映像檔後面的指令 | 覆蓋預設 CMD |

你看，本質上就是一一對應。Docker Compose 並沒有發明什麼新的功能，它只是幫你把 `docker run` 的參數用更易讀、更好管理的 YAML 格式記錄下來而已。

### 2.6 YAML 語法常見陷阱

在繼續之前，我快速提醒幾個 YAML 最容易踩到的坑。每年都有學生因為這些小細節卡半天，我先提醒你們，省得你們到時候 debug 到懷疑人生。

**第一，縮排很重要，而且只能用空格，不能用 Tab。** YAML 用縮排來表示層級關係。建議統一用 2 個空格。

```yaml
# 正確
services:
  web:
    image: nginx

# 錯誤（用了 Tab，肉眼看不出來，但 YAML 會報錯）
services:
	web:
		image: nginx
```

你看，肉眼根本看不出差別，但 YAML parser 會直接報錯。所以請把你的編輯器設定成「用空格取代 Tab」。

**第二，冒號後面要有空格。**

```yaml
# 正確
image: nginx

# 錯誤
image:nginx
```

這個錯很細，但犯的人超級多。冒號後面沒有空格，YAML 不會把它當成 key-value pair，整個結構就爛掉了。

**第三，port 一定要加引號。** 我前面講過了，YAML 有六十進位的解析規則。`8080:80` 如果不加引號，YAML 可能會把它當成一個奇怪的數值。

```yaml
# 正確
ports:
  - "8080:80"

# 可能出問題
ports:
  - 8080:80
```

養成加引號的習慣就好。

好，這些陷阱知道就好，我們繼續。

---

## 三、docker compose 指令（10 分鐘）

### 3.1 啟動：docker compose up

這是你用得最多的指令：

```bash
# 前景啟動（會佔住終端機，即時看到 log）
docker compose up

# 背景啟動（推薦，服務跑在後面）
docker compose up -d
```

`-d` 就是 detach，讓服務在背景跑。跟 `docker run -d` 一樣的意思。

第一次執行 `docker compose up` 的時候，Docker 會做這些事情：

1. 讀取 `compose.yaml`
2. 拉取需要的映像檔（如果本地沒有的話）
3. 自動建立一個專屬的網路
4. 建立需要的 Volume
5. 按照設定啟動所有容器

你會看到類似這樣的輸出：

```
[+] Running 4/4
 ✔ Network myproject_default  Created
 ✔ Volume "myproject_db-data" Created
 ✔ Container myproject-web-1  Started
 ✔ Container myproject-db-1   Started
```

注意看命名規則——Compose 會用你的**資料夾名稱**當前綴。你的 compose.yaml 放在 `myproject/` 裡面，容器就叫 `myproject-web-1`，網路就叫 `myproject_default`。

### 3.2 停止並清除：docker compose down

```bash
# 停止並刪除所有容器和網路
docker compose down
```

這個指令會做三件事：
1. 停止所有容器
2. 刪除所有容器
3. 刪除自動建立的網路

注意——**Volume 不會被刪除**。你的資料庫資料是安全的。下次 `docker compose up` 的時候，資料還在。

但如果你想連 Volume 一起刪呢？

```bash
# 停止並刪除容器、網路、以及 Volume
docker compose down -v
```

> **警告：`docker compose down -v` 會刪除所有 Volume！** 這表示你的資料庫資料、上傳的檔案，全部歸零。這個操作不可逆，務必謹慎使用。我在正式環境裡面看過有人不小心加了 `-v`，整個資料庫沒了。所以我建議你們養成一個習慣——打 `docker compose down` 的時候，手指離 `-v` 遠一點。除非你百分之百確定要刪資料。

### 3.3 查看狀態：docker compose ps

```bash
docker compose ps
```

輸出像這樣：

```
NAME               IMAGE          COMMAND                  SERVICE   STATUS          PORTS
myproject-web-1    nginx:alpine   "/docker-entrypoint.…"   web       Up 2 minutes    0.0.0.0:8080->80/tcp
myproject-db-1     mysql:8        "docker-entrypoint.s…"   db        Up 2 minutes    0.0.0.0:3306->3306/tcp
```

可以看到每個服務的名稱、映像檔、狀態、port mapping。如果某個服務沒有出現在列表裡，或者狀態是 Exited，那就表示有問題。

### 3.4 查看日誌：docker compose logs

```bash
# 查看所有服務的日誌
docker compose logs

# 持續追蹤日誌（類似 tail -f）
docker compose logs -f

# 只看某個服務的日誌
docker compose logs web

# 持續追蹤某個服務
docker compose logs -f db
```

`docker compose logs -f` 是開發時的好朋友。它會同時顯示所有服務的輸出，每一行前面會標註是哪個服務，用不同顏色區分。你一邊改程式碼，一邊看 log，錯誤訊息馬上就能看到。

### 3.5 進入容器：docker compose exec

```bash
# 進入 web 容器的 shell
docker compose exec web bash

# 如果容器裡沒有 bash，用 sh
docker compose exec web sh

# 直接執行一個指令
docker compose exec db mysql -uroot -psecret
```

跟 `docker exec` 一模一樣，只是不需要記容器的完整名稱，直接用 **service name** 就好。方便吧？

### 3.6 停止 / 啟動 / 重啟

```bash
# 停止（不刪除容器）
docker compose stop

# 啟動已停止的容器
docker compose start

# 重啟
docker compose restart

# 只重啟某個服務
docker compose restart web
```

這裡要特別注意 `stop` 和 `down` 的差別：
- `stop` 只是暫停，容器還在，資料還在，下次 `start` 就能恢復
- `down` 是停止 + 刪除容器和網路，要重新來過

什麼時候用 `stop`？比如你午休想暫時停掉服務省資源，等下還要用。什麼時候用 `down`？比如你做完了要清理環境，或者想從頭開始。

### 3.7 指令速查表

| 指令 | 說明 |
|-----|------|
| `docker compose up -d` | 背景啟動所有服務 |
| `docker compose down` | 停止並刪除容器和網路 |
| `docker compose down -v` | 連 Volume 一起刪（危險！） |
| `docker compose ps` | 查看服務狀態 |
| `docker compose logs -f` | 持續追蹤所有日誌 |
| `docker compose logs -f <服務>` | 追蹤特定服務日誌 |
| `docker compose exec <服務> <指令>` | 在容器中執行指令 |
| `docker compose stop` | 停止服務（不刪除） |
| `docker compose start` | 啟動已停止的服務 |
| `docker compose restart` | 重啟服務 |

這些指令不用刻意背，用幾次就記住了。最常用的就是 `up -d`、`down`、`ps`、`logs -f`、`exec` 這五個。

---

## 四、進階功能（20 分鐘）

好，基本的東西講完了。接下來我們進入進階的部分。

前面的基礎已經可以讓你把幾個服務跑起來了。但在實際工作中，你會遇到更多的需求。比如：

- 我想讓某些服務之間不能互相連線，怎麼做？
- 資料庫密碼不想寫死在 compose.yaml 裡面，怎麼辦？
- API 要等資料庫「真的準備好」才能啟動，怎麼設定？
- 我想直接在 compose 裡面 build 自己的 Dockerfile，可以嗎？

這堂課的後半段，我們就來一一解決這些問題。

### 4.1 Networks：自訂網路隔離

#### Compose 預設的網路行為

當你執行 `docker compose up` 的時候，Compose 會自動建立一個 bridge network。這個 network 的名字是 `資料夾名稱_default`。

比如你的 compose.yaml 放在 `myproject/` 資料夾，Compose 就會建立一個叫 `myproject_default` 的 network，然後把所有服務都接上去。

```bash
docker compose up -d
docker network ls

# NETWORK ID     NAME                DRIVER    SCOPE
# abc123         myproject_default   bridge    local
```

在這個預設 network 裡面，**所有服務之間都可以互相連線**，而且可以直接用 **service name 當 hostname**。

這是 Compose 內建的 DNS 功能。比如你定義了 `web` 和 `db` 兩個服務，`web` 容器裡面可以直接用 `db` 這個名字來連到 MySQL。不需要查 IP，不需要用 `--link`，Compose 自動幫你搞定。

```bash
# 從 web 容器裡面 ping db
docker compose exec web ping db
# PING db (172.18.0.3): 56 data bytes
# 64 bytes from 172.18.0.3: icmp_seq=0 ttl=64 time=0.089 ms
```

#### 為什麼要自訂 Network？

預設的行為是「所有服務都在同一個 network」。大部分開發環境這樣做沒問題。但在正式環境，你通常會希望做**網路隔離**。

為什麼？安全性。

想像一個三層架構：前端 Nginx、後端 API、資料庫 MySQL。

你會希望：
- Nginx 可以連到 API（因為 Nginx 要把請求轉發給 API）
- API 可以連到 MySQL（因為 API 要存取資料）
- **但 Nginx 不能直接連到 MySQL**

為什麼 Nginx 不該直接連 MySQL？因為如果前端有漏洞被駭客攻破了，他還要再突破 API 層才能碰到資料庫。這是**縱深防禦**的概念——多一層屏障，就多一分安全。

怎麼做到呢？Hour 9 我們學了自訂網路和多網路隔離的架構，在 Compose 裡面，同樣的事情只需要在 YAML 裡面宣告就好：

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - frontend-net

  api:
    image: node:20-slim
    networks:
      - frontend-net
      - backend-net

  db:
    image: mysql:8.0
    networks:
      - backend-net

networks:
  frontend-net:
  backend-net:
```

`api` 同時加入了兩個 network，所以它可以跟兩邊都通訊。但 `nginx` 只在 `frontend-net`，`db` 只在 `backend-net`，它們之間是完全隔離的。

#### Service Name 就是 Hostname

我再強調一個非常重要的觀念：**在 Compose 的 network 裡面，service name 就是 hostname。**

所以你的程式碼裡面，連線資料庫的 host 應該寫 service name：

```javascript
// Node.js 連線 MySQL
const connection = mysql.createConnection({
  host: 'db',        // 寫 service name，不是 localhost！
  user: 'root',
  password: 'secret',
  database: 'myapp'
});
```

```python
# Python 連線 MySQL
connection = pymysql.connect(
    host='db',        # service name
    user='root',
    password='secret',
    database='myapp'
)
```

很多同學第一次用 Compose 都會踩到這個坑——程式碼裡面寫 `localhost`，結果連不到資料庫。記住，在 Compose 裡面，每個 service 都是獨立的容器，`localhost` 指的是容器自己，不是別的服務。你要用 service name 來連。

### 4.2 Environment 與 .env 檔案

#### 為什麼要用環境變數

好，接下來講環境變數管理。

前面我們設定 MySQL 的時候，是不是直接把密碼寫在 compose.yaml 裡面？

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: my-secret-pw
```

這樣做有什麼問題？

**第一，安全性。** compose.yaml 通常會放到 Git 做版本控制。你把密碼寫在裡面，密碼就跟著進了 Git。如果是公開的 repo，你的密碼就全世界都看得到。即使是私有 repo，團隊裡面每個人都能看到密碼，這也不好。

**第二，環境差異。** 開發環境的密碼可能是 `dev123`，測試環境是 `test456`，正式環境是一串超長的隨機密碼。你不可能為每個環境各維護一份 compose.yaml。

環境變數就是解決這些問題的標準做法。

#### 三種設定方式

**方式一：直接在 compose.yaml 裡寫。** 這是最基本的寫法，適合非敏感的設定值：

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: my-secret-pw
      MYSQL_DATABASE: myapp
```

你也可以用列表語法：

```yaml
    environment:
      - MYSQL_ROOT_PASSWORD=my-secret-pw
      - MYSQL_DATABASE=myapp
```

兩種寫法效果一樣。

**方式二：使用 env_file 指向外部檔案。** 把環境變數放到一個獨立的檔案裡：

```bash
# .env 檔案內容
MYSQL_ROOT_PASSWORD=my-secret-pw
MYSQL_DATABASE=myapp
MYSQL_USER=appuser
MYSQL_PASSWORD=apppass
NODE_ENV=development
API_PORT=3000
```

然後在 compose.yaml 裡面用 `env_file` 引用：

```yaml
services:
  db:
    image: mysql:8.0
    env_file:
      - .env
  api:
    image: node:20-slim
    env_file:
      - .env
```

**方式三：用 `${}` 變數替換。** Compose 會自動讀取同目錄下的 `.env` 檔案，你可以在 compose.yaml 裡面用 `${VARIABLE}` 來引用：

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    ports:
      - "${DB_PORT:-3306}:3306"
```

看到那個 `${DB_PORT:-3306}` 嗎？這個語法的意思是：如果 `DB_PORT` 有值就用它，沒有的話就用 `3306` 當預設值。很實用。

#### 變數優先順序

如果同一個變數在不同地方都有定義，誰的優先順序比較高？

| 優先順序 | 來源 | 說明 |
|---------|------|------|
| 1（最高）| Shell 環境變數 | 執行 compose 時 shell 裡的變數 |
| 2 | .env 檔案 | compose.yaml 同目錄下的 .env |
| 3（最低）| compose.yaml 預設值 | `${VAR:-default}` 裡的 default |

```bash
# Shell 環境變數的優先順序最高
export MYSQL_ROOT_PASSWORD=from-shell
docker compose up -d
# 這時候 MYSQL_ROOT_PASSWORD 會是 from-shell
```

#### 安全最佳實踐

最後非常重要：**把 .env 加到 .gitignore**。

```bash
# .gitignore
.env
```

然後提供一個 `.env.example` 範本檔：

```bash
# .env.example（這個檔案可以 commit 到 Git）
MYSQL_ROOT_PASSWORD=your_password_here
MYSQL_DATABASE=your_database_name
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
```

新成員加入的時候，把 `.env.example` 複製一份改名 `.env`，填上自己的值就好：

```bash
cp .env.example .env
vim .env   # 填入實際的值
```

這是業界的標準做法，大家一定要養成這個習慣。我看過太多次 GitHub 上有人不小心把 `.env` 推上去，裡面有 AWS 的 Access Key，帳單直接炸掉的案例。千萬不要犯這個錯。

### 4.3 depends_on + healthcheck

#### 啟動順序的問題

好，接下來講一個大家一定會遇到的問題——**服務的啟動順序**。

場景是這樣的：你的 API 需要連 MySQL。如果 MySQL 還沒準備好，API 就先跑起來了，API 去連 MySQL 會怎樣？連線失敗，程式報錯，直接掛掉。

所以我們需要一個機制：讓 API 等 MySQL 準備好了再啟動。

#### depends_on 基本用法

Compose 提供了 `depends_on`：

```yaml
services:
  api:
    image: node:20-slim
    depends_on:
      - db

  db:
    image: mysql:8.0
```

加了 `depends_on` 之後，`docker compose up` 會先啟動 `db`，再啟動 `api`。

看起來很完美對吧？但是——

#### 最大的坑

**`depends_on` 只保證「容器啟動」的順序，不保證「服務準備好」的順序。**

什麼意思？MySQL 的容器啟動了，不代表 MySQL 已經準備好接受連線。MySQL 啟動的時候要初始化資料庫、建立系統表、設定權限......這些步驟可能需要十幾二十秒。

所以你會看到這種悲劇：

```
時間線：
0s  → db 容器啟動了
1s  → api 容器也啟動了（因為 db 容器已經「啟動」了）
2s  → api 嘗試連線 db → 失敗！（MySQL 還在初始化）
3s  → api 程式報錯退出
......
15s → MySQL 初始化完成，但 api 已經掛了
```

這就是 `depends_on` 最常被踩到的坑。好多同學都會問我：「老師，我明明有設 depends_on 了，為什麼 API 還是連不到資料庫？」就是這個原因。

#### 正確的解法：healthcheck + condition

Compose 提供了更精確的控制方式：

```yaml
services:
  api:
    image: node:20-slim
    depends_on:
      db:
        condition: service_healthy    # 等 db 的 healthcheck 通過才啟動

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secret
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-psecret"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 30s
```

我解釋一下這些參數：

- **test**：健康檢查指令。這裡用 `mysqladmin ping` 來測試 MySQL 是否就緒。
- **interval**：每隔多久檢查一次。5 秒一次。
- **timeout**：每次檢查最多等多久。超過 3 秒就算這次失敗。
- **retries**：連續失敗幾次才判定為 unhealthy。
- **start_period**：容器啟動後的寬限期。MySQL 初始化比較慢，給它 30 秒的緩衝時間，這段時間內的失敗不計入 retries。

加了 `condition: service_healthy` 之後，Compose 會一直等到 db 的 healthcheck 通過（狀態變成 healthy）才啟動 api。

```bash
docker compose ps

# NAME    IMAGE       STATUS
# db      mysql:8.0   Up 30s (healthy)    ← 注意這個 (healthy)
# api     node:20     Up 5s
```

看到那個 `(healthy)` 了嗎？只有當 db 顯示 healthy 之後，api 才會啟動。

#### 常見服務的 Healthcheck 寫法

不同的服務有不同的 healthcheck 方式，我整理了一張表：

| 服務 | Healthcheck 指令 |
|------|-----------------|
| MySQL | `mysqladmin ping -h localhost` |
| PostgreSQL | `pg_isready -U postgres` |
| Redis | `redis-cli ping` |
| MongoDB | `mongosh --eval "db.runCommand('ping')"` |
| Elasticsearch | `curl -f http://localhost:9200/_cluster/health` |
| Nginx | `curl -f http://localhost/` |

```yaml
# PostgreSQL healthcheck 範例
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

# Redis healthcheck 範例
  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

建議大家把這張表存起來，以後寫 compose.yaml 的時候直接查。

### 4.4 Build 整合

#### 在 Compose 裡面 Build 映像檔

前面我們用的映像檔都是從 Docker Hub 拉下來的——`nginx`、`mysql`、`redis`。但在實際開發中，你一定會有自己的 Dockerfile。

以前的做法是：先 `docker build` 出映像檔，然後在 compose.yaml 裡面指向它。每次改程式碼就要先 build，再 up，很麻煩。

好消息——Compose 可以直接幫你 build！

```yaml
services:
  api:
    build:
      context: ./backend          # Build context，Dockerfile 所在目錄
      dockerfile: Dockerfile      # Dockerfile 名稱（預設就是 Dockerfile，可省略）
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
```

這樣寫的話，當你 `docker compose up` 的時候，Compose 會先到 `./backend` 目錄找 Dockerfile，build 出映像檔，然後用這個映像檔啟動容器。一氣呵成。

#### Build 相關指令

```bash
# 只 build，不啟動
docker compose build

# build 並啟動（如果映像檔已存在，不會重新 build）
docker compose up -d

# 強制重新 build 並啟動（改了程式碼一定要用這個！）
docker compose up -d --build

# 只 build 特定服務
docker compose build api
```

**特別注意 `--build` 這個旗標。** 如果你改了程式碼但沒加 `--build`，Compose 會用上次 build 的映像檔，你的改動不會生效。這是很多人會踩的坑。

養成習慣——**改了程式碼就用 `docker compose up -d --build`**。

#### 開發模式：Volume 掛載原始碼

每次改程式碼都重新 build 其實也滿慢的。有沒有更快的方式？

有。你可以用 Volume 把原始碼直接映射進容器：

```yaml
services:
  api:
    build:
      context: ./backend
    ports:
      - "3000:3000"
    volumes:
      - ./backend/src:/app/src    # 本機的 src 直接同步到容器裡
    environment:
      NODE_ENV: development
```

這樣你在本機改 `./backend/src` 裡面的檔案，容器裡的 `/app/src` 會立刻同步。如果你的框架支援 hot reload（像 nodemon、vite），改完直接就重新載入了，連 build 都不用。

```bash
# 開發流程
# 第一次啟動（需要 build）
docker compose up -d --build

# 之後修改程式碼 → 自動同步、自動 hot reload

# 如果改了 Dockerfile 或 package.json → 才需要重新 build
docker compose up -d --build

# 開發完畢
docker compose down
```

#### build 的進階選項

```yaml
services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev    # 可以指定不同的 Dockerfile
      args:                         # 傳入 build arguments
        NODE_VERSION: "20"
        APP_ENV: "development"
      target: development           # Multi-stage build 時指定 target stage
```

`target` 在 Multi-stage build 的時候非常好用。你可以有一個 Dockerfile 定義了 development 和 production 兩個 stage，然後在 compose.yaml 裡面選擇要 build 哪個。開發環境 build development stage，正式環境 build production stage，一個 Dockerfile 搞定兩種場景。

### 4.5 其他實用設定

最後再快速補充幾個很常用的設定。

#### restart 重啟策略

```yaml
services:
  api:
    image: node:20-slim
    restart: unless-stopped
```

| 值 | 行為 |
|----|------|
| `no` | 不自動重啟（預設值） |
| `always` | 永遠自動重啟 |
| `on-failure` | 只有非正常退出才重啟 |
| `unless-stopped` | 除非手動停止，否則自動重啟 |

實務上最常用 `unless-stopped`。正式環境的服務一定要加這個，這樣即使伺服器重開機，服務也會自動跑起來。

#### 資源限制

```yaml
services:
  api:
    image: node:20-slim
    deploy:
      resources:
        limits:
          cpus: '0.50'        # 最多用 0.5 個 CPU
          memory: 512M        # 最多用 512MB 記憶體
        reservations:
          cpus: '0.25'        # 保留 0.25 個 CPU
          memory: 256M        # 保留 256MB 記憶體
```

多個服務跑在同一台機器的時候，資源限制可以防止某個服務把所有資源吃光。我見過有個 Java 應用吃掉 8GB 記憶體，把同機器的 MySQL 擠到 OOM（Out of Memory）直接掛掉。設了 memory limit 就不會發生這種事。

#### command 覆蓋 CMD

```yaml
services:
  api:
    image: node:20-slim
    command: ["node", "server.js"]

  db:
    image: mysql:8.0
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

`command` 會覆蓋映像檔的 CMD。這在開發的時候很方便——你可以用同一個映像檔，但給不同的容器不同的啟動指令。

---

## 五、綜合實作：三層架構應用

好，我們把今天學的東西全部串起來，做一個完整的實作。

### 5.1 架構

```
瀏覽器
  │
  ▼
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Nginx  │────▶│ Node.js │────▶│  MySQL  │
│ (前端)   │     │  (API)  │     │  (DB)   │
└─────────┘     └─────────┘     └─────────┘
  Port 80        Port 3000       Port 3306

 frontend-net    frontend-net    backend-net
                 backend-net
```

用到的技術：
- **Networks**：前後端隔離
- **.env**：敏感資訊不寫死
- **healthcheck + depends_on**：確保啟動順序
- **build**：直接 build API 的 Dockerfile
- **volumes**：資料庫持久化 + 原始碼掛載

### 5.2 專案結構

```
my-app/
├── compose.yaml
├── .env
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── index.js
└── nginx/
    └── default.conf
```

### 5.3 完整 compose.yaml

```yaml
services:
  # ====== 前端反向代理 ======
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      api:
        condition: service_started
    networks:
      - frontend-net
    restart: unless-stopped

  # ====== 後端 API ======
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./backend/src:/app/src
    depends_on:
      db:
        condition: service_healthy
    networks:
      - frontend-net
      - backend-net
    restart: unless-stopped

  # ====== 資料庫 ======
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 30s
    networks:
      - backend-net
    restart: unless-stopped

networks:
  frontend-net:
  backend-net:

volumes:
  db-data:
```

### 5.4 .env 檔案

```bash
# .env
MYSQL_ROOT_PASSWORD=rootpass123
MYSQL_DATABASE=myapp
MYSQL_USER=appuser
MYSQL_PASSWORD=apppass456
NODE_ENV=development
API_PORT=3000
```

### 5.5 Nginx 反向代理設定

```nginx
# nginx/default.conf
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://api:3000;    # 用 service name 連到 API
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

注意看 `proxy_pass http://api:3000` 這行——我們用的是 service name `api`，不是 IP。這就是 Compose DNS 的威力。

### 5.6 後端 Dockerfile

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/index.js"]
```

### 5.7 啟動與驗證

```bash
# 啟動所有服務
docker compose up -d --build

# 查看狀態（等 db 變成 healthy）
docker compose ps

# 看 log，觀察啟動順序
docker compose logs -f

# 測試
curl http://localhost

# 驗證網路隔離
docker compose exec nginx ping api      # 可以連
docker compose exec nginx ping db       # 連不到！不同 network
docker compose exec api ping db         # 可以連

# 關閉
docker compose down

# 連資料一起刪（小心！）
docker compose down -v
```

---

## 六、學生練習題

> **練習題 1：基本 Compose 操作**
>
> 在 `~/compose-practice` 目錄下建立一個 `compose.yaml`，包含以下服務：
> - `web`：nginx:alpine，port `9090:80`
> - `cache`：redis:7-alpine，port `6379:6379`
>
> 啟動後：
> 1. 用 `docker compose ps` 確認兩個服務都在跑
> 2. 瀏覽器訪問 `http://localhost:9090` 確認 Nginx 預設頁面
> 3. 用 `docker compose exec cache redis-cli ping` 測試 Redis（應該回覆 PONG）
> 4. 用 `docker compose down` 清理

---

> **練習題 2：Network 隔離**
>
> 建立三個服務：`frontend`（nginx）、`backend`（httpd）、`database`（postgres）。
> 設定兩個 network（front-net 和 back-net），讓 frontend 無法直接連到 database。
> 啟動後用 `docker compose exec frontend ping database` 驗證確實連不到。

---

> **練習題 3：環境變數管理**
>
> 建立 compose.yaml 啟動 PostgreSQL，要求：
> - 所有敏感資訊（密碼、使用者名稱）放在 `.env` 檔案
> - compose.yaml 裡面用 `${VARIABLE}` 引用
> - 提供 `.env.example` 範本檔
> - 驗證：進入容器，用 `.env` 裡面的帳號密碼登入資料庫

---

> **練習題 4：Healthcheck 實作**
>
> 修改練習 3 的 compose.yaml，加入 healthcheck。
> 新增一個 `adminer` 服務（資料庫管理介面），設定 depends_on 搭配 condition: service_healthy。
> 觀察 `docker compose ps` 的輸出，確認看到 `(healthy)` 狀態。

---

> **練習題 5（挑戰題）：完整三層架構**
>
> 從零建立一個三層架構應用：
> - 前端：Nginx 反向代理
> - 後端：自己寫的 API（任何語言），要能連線資料庫並回傳資料
> - 資料庫：MySQL 或 PostgreSQL
>
> 要求使用：自訂 network、.env、healthcheck、build、named volume。
> 這題是今天所有內容的綜合應用，能做出來就代表你真的學會了。

---

## 七、本堂課小結

好，我們來做一個快速回顧。今天這堂課內容量不小，我幫大家整理一下重點。

### 基礎部分

| 主題 | 重點 |
|------|------|
| 為什麼需要 Compose | 用 docker run 管理多容器太痛苦，一個 YAML 解決 |
| 版本 | v2（`docker compose` 空格），不要用 v1 |
| compose.yaml 結構 | services / volumes / networks 三大區塊 |
| 核心指令 | up -d / down / ps / logs -f / exec |

### 進階部分

| 主題 | 重點 |
|------|------|
| Networks | 自訂 network 隔離服務，service name = hostname |
| Environment | .env 管理敏感資訊，記得 .gitignore |
| depends_on | 基本用法只等容器啟動，搭配 healthcheck 才等服務 ready |
| Build 整合 | 直接在 compose 裡 build Dockerfile，`--build` 旗標 |
| 其他設定 | restart 策略、資源限制、command 覆蓋 |

### 三個最重要的觀念

今天如果你只能記住三件事，就記住這三個：

1. **Network 隔離是好習慣。** 不是所有服務都該在同一個 network。用 network 來控制誰能連誰。

2. **不要把密碼寫在 compose.yaml 裡面。** 用 `.env` + `.gitignore`。這不是建議，是基本的安全要求。

3. **depends_on 不等於 service ready。** 搭配 healthcheck + `condition: service_healthy` 才是正確的做法。很多線上事故就是因為沒做這一步。

下一堂課是我們這個課程的最後一堂，我們會做一個課程的總結回顧，把三天學到的東西串起來，然後展望一下容器技術的未來方向。

---

## 板書 / PPT 建議

1. **痛點對比圖**：6 個 docker run 指令 vs 1 個 compose.yaml + 1 個 docker compose up
2. **compose.yaml 結構圖**：services / volumes / networks 三大區塊的層級關係
3. **對照表**：compose.yaml 設定 vs docker run 參數的一一對應
4. **指令速查表**：docker compose 常用指令（up / down / ps / logs / exec）
5. **Network 隔離圖**：frontend-net 和 backend-net 的關係，標示哪些服務在哪個 network
6. **環境變數優先順序**：Shell > .env > compose.yaml default
7. **depends_on 的坑**：時序圖展示「容器啟動 ≠ 服務 ready」
8. **Healthcheck 參數說明**：interval、timeout、retries、start_period
9. **常見服務 healthcheck 對照表**：MySQL、PostgreSQL、Redis、MongoDB
10. **三層架構完整圖**：Nginx → API → MySQL，標示 network、volume、port 的關係
11. **開發流程圖**：改程式碼 → docker compose up --build → 測試 → 改程式碼（循環）
12. **警告標誌**：`docker compose down -v` 的危險性（紅色醒目標示）
