# Day 3 第十四小時：Docker Compose 實戰 + 課程總結

---

## 一、開場（3 分鐘）

好，各位同學，歡迎來到我們整個 Docker 課程的最後一堂課。

我先問一下，大家今天的精神還好嗎？經過三天高密度的學習，我知道大家應該都有點累了。但是，最後這堂課非常重要，因為我們要把前面學到的所有東西，全部串在一起，做一個完整的實戰。

上一堂課我們學了什麼？Docker Compose 的進階功能對不對？自訂網路、環境變數管理、depends_on 搭配 healthcheck、build 整合，這些東西大家都還有印象嗎？

好，那這堂課我們要做三件事情：

第一件事，**真槍實彈的實戰**。我們要用 Docker Compose 從零開始搭建一個完整的部落格系統，四個服務一次全部跑起來。這不是練習題喔，這是你回去公司之後馬上可以用的真實架構。

第二件事，**Docker Compose 的實用技巧**。一些你在工作中一定會碰到的場景，像是怎麼區分開發環境和生產環境、怎麼驗證設定檔等等。

第三件事，**課程總結**。我會帶大家把這三天學到的所有東西做一個完整的回顧，然後告訴你們接下來該往哪個方向學習。

準備好了嗎？那我們開始吧。

---

## 二、實戰：完整的部落格系統（25 分鐘）

### 2.1 為什麼選 WordPress？

好，我們這個實戰要做的是搭建一個完整的 WordPress 部落格系統。

有同學可能會問：「老師，為什麼選 WordPress？我們公司用的是 React、Vue，不是 WordPress 啊。」

選 WordPress 不是因為要你們學 WordPress，而是因為它的架構特別經典。你們看，WordPress 是一個需要搭配資料庫的 PHP 應用，前面還可以加反向代理、加快取。這個「反向代理 + 應用程式 + 資料庫 + 快取」的架構，在業界叫做四層架構，不管你的應用是什麼語言寫的，Java、Python、Node.js，很多時候都是這個結構。

所以我們今天學會了這個架構，你回去把 WordPress 換成你自己的應用，MySQL 換成 PostgreSQL，道理都是一樣的。

### 2.2 系統架構說明

來，我先在白板上畫一下我們要搭的系統架構：

```
                    使用者（瀏覽器）
                         │
                         ▼
                ┌─────────────────┐
                │      Nginx      │  ← 反向代理，對外 Port 80
                │   (Web Server)  │
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │    WordPress    │  ← PHP 應用程式
                │   (App Server)  │
                └────┬───────┬────┘
                     │       │
             ┌───────▼──┐ ┌──▼───────┐
             │  MySQL   │ │  Redis   │
             │ (資料庫)  │ │  (快取)  │
             └──────────┘ └──────────┘
```

四個服務，我一個一個說：

**Nginx** 是最外面那層，它負責接收使用者的請求，然後轉發給後面的 WordPress。為什麼不讓 WordPress 直接對外呢？因為 Nginx 很擅長處理靜態檔案、負載均衡、SSL 加密，讓它來當門面，效能更好，安全性也更高。這就好像餐廳的接待員，客人進來先找接待員，接待員再把客人帶到座位。

**WordPress** 是真正處理業務邏輯的地方。它是一個 PHP 寫的應用程式，用 Apache 來跑。寫文章、管理評論、處理登入，都是它在做。

**MySQL** 是資料庫。WordPress 的文章內容、使用者帳號、網站設定，全部存在 MySQL 裡面。它就像圖書館的書架，所有的資料都放在這裡。

**Redis** 是快取。它的作用是什麼呢？WordPress 每次要顯示一篇文章，都要去 MySQL 查資料。但如果同一篇文章一分鐘有一千個人看，你不需要查一千次資料庫，查一次把結果放到 Redis 裡面，後面九百九十九次直接從 Redis 拿就好了。Redis 是記憶體型的資料庫，速度比 MySQL 快很多倍。它就像你桌上的便條紙，常用的電話號碼抄在便條紙上，不用每次都去翻通訊錄。

### 2.3 網路設計——安全性第一

架構圖看完了，接下來一個關鍵的設計決策：網路怎麼劃分？

我們要設計兩個網路：

```
┌──────────────────────────────────────────────────────┐
│  frontend 網路                                        │
│  ┌──────────┐         ┌──────────────┐               │
│  │  Nginx   │ ──────► │  WordPress   │               │
│  └──────────┘         └──────┬───────┘               │
│                              │                        │
└──────────────────────────────┼────────────────────────┘
                               │
┌──────────────────────────────┼────────────────────────┐
│  backend 網路                │                        │
│                       ┌──────▼───────┐               │
│                       │  WordPress   │               │
│                       └───┬──────┬───┘               │
│                           │      │                    │
│                    ┌──────▼──┐ ┌─▼────────┐          │
│                    │  MySQL  │ │  Redis   │          │
│                    └─────────┘ └──────────┘          │
└───────────────────────────────────────────────────────┘
```

來，有同學問了：「老師，為什麼要分兩個網路？全部放在一個網路裡不是比較簡單嗎？」

問得好。確實，全部放一個網路也能跑。但是，你想一想——Nginx 需要直接連 MySQL 嗎？不需要嘛！Nginx 的工作就是把請求轉給 WordPress，它根本不需要碰資料庫。如果 Nginx 哪天被駭了，駭客也碰不到你的資料庫，因為 Nginx 和 MySQL 根本不在同一個網路。

這就是我們上堂課講的**網路隔離**。在真實的生產環境中，這是一個非常重要的安全原則——**最小權限原則**。每個服務只連上它需要的網路，不多連。

注意看，WordPress 是兩個網路都有加入的，因為它是中間的橋樑。它要從 frontend 接收 Nginx 轉來的請求，也要從 backend 去連 MySQL 查資料。

### 2.4 動手實作——建立專案目錄

好，概念講完了，我們來動手。大家打開你們的終端機，跟我一起做。

第一步，建立專案目錄：

```bash
# 建立專案目錄
mkdir -p ~/wordpress-blog
cd ~/wordpress-blog

# 建立 Nginx 設定檔目錄
mkdir -p nginx

# 看一下目錄結構
# wordpress-blog/
# ├── .env                 ← 環境變數（密碼）
# ├── compose.yaml         ← 服務定義
# └── nginx/
#     └── default.conf     ← Nginx 設定
```

就三個檔案。你沒看錯，三個檔案就能搭起一個完整的四服務應用。Docker Compose 就是這麼強大。

### 2.5 撰寫 .env 環境變數檔

第二步，寫 `.env` 檔案。還記得上堂課我講的嗎？密碼、金鑰這種敏感資訊，絕對不要寫死在 compose.yaml 裡面。

```bash
# .env
MYSQL_ROOT_PASSWORD=my-secret-root-pw
MYSQL_DATABASE=wordpress
MYSQL_USER=wp_user
MYSQL_PASSWORD=wp_password_123

WORDPRESS_DB_HOST=mysql:3306
WORDPRESS_DB_USER=wp_user
WORDPRESS_DB_PASSWORD=wp_password_123
WORDPRESS_DB_NAME=wordpress
```

這裡有一個重點，大家看到 `WORDPRESS_DB_HOST=mysql:3306` 這行了嗎？`mysql` 這個不是 IP 地址，它是我們待會在 compose.yaml 裡面定義的服務名稱。在 Docker Compose 的自訂網路裡，服務名稱會自動變成 DNS 名稱，可以直接拿來當 hostname 用。這個是上堂課教的，大家還有印象吧？

另外我要特別提醒：`.env` 檔案一定要加到 `.gitignore` 裡面。你可以另外建一個 `.env.example` 當範本給團隊成員看：

```bash
# .env.example（這個可以推到 Git）
MYSQL_ROOT_PASSWORD=change-me
MYSQL_DATABASE=wordpress
MYSQL_USER=change-me
MYSQL_PASSWORD=change-me
WORDPRESS_DB_HOST=mysql:3306
WORDPRESS_DB_USER=change-me
WORDPRESS_DB_PASSWORD=change-me
WORDPRESS_DB_NAME=wordpress
```

### 2.6 撰寫 Nginx 反向代理設定

第三步，寫 Nginx 的反向代理設定：

```nginx
# nginx/default.conf
server {
    listen 80;
    server_name localhost;

    # WordPress 常常要上傳圖片，預設的 1M 太小
    client_max_body_size 64M;

    location / {
        proxy_pass http://wordpress:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

我來解釋一下這個設定檔。

`proxy_pass http://wordpress:80` 這行是最關鍵的，它告訴 Nginx：「所有的請求都轉發給 wordpress 這個服務的 80 port。」這裡的 `wordpress` 就是我們 compose.yaml 裡面的服務名稱。

下面那幾行 `proxy_set_header` 是在傳遞原始的用戶端資訊。為什麼需要這個呢？你想想看，如果沒有這些 header，WordPress 看到的所有請求都來自 Nginx 的 IP，它分不出來真正的使用者是誰。加了這些 header 之後，WordPress 就能知道真正的使用者 IP、使用的協定等資訊。

`client_max_body_size 64M` 也很重要。WordPress 的使用者會上傳圖片、影片，如果你不改這個設定，Nginx 預設只允許上傳 1MB 以下的檔案，很快就會被使用者投訴了。

### 2.7 撰寫 compose.yaml —— 重頭戲

好，重頭戲來了。大家深呼吸一下，我們來寫完整的 compose.yaml。這個檔案有點長，但裡面用到的每一個功能都是我們前面學過的，沒有新東西。

```yaml
# compose.yaml

services:
  # ========== Nginx 反向代理 ==========
  nginx:
    image: nginx:alpine
    container_name: blog-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - frontend
    depends_on:
      wordpress:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 128M

  # ========== WordPress 應用 ==========
  wordpress:
    image: wordpress:6-php8.2-apache
    container_name: blog-wordpress
    environment:
      WORDPRESS_DB_HOST: ${WORDPRESS_DB_HOST}
      WORDPRESS_DB_USER: ${WORDPRESS_DB_USER}
      WORDPRESS_DB_PASSWORD: ${WORDPRESS_DB_PASSWORD}
      WORDPRESS_DB_NAME: ${WORDPRESS_DB_NAME}
      WORDPRESS_CONFIG_EXTRA: |
        define('WP_REDIS_HOST', 'redis');
        define('WP_REDIS_PORT', 6379);
    volumes:
      - wordpress-data:/var/www/html
    networks:
      - frontend
      - backend
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M

  # ========== MySQL 資料庫 ==========
  mysql:
    image: mysql:8.0
    container_name: blog-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - backend
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M

  # ========== Redis 快取 ==========
  redis:
    image: redis:7-alpine
    container_name: blog-redis
    command: redis-server --maxmemory 64mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 128M

# ========== 網路定義 ==========
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge

# ========== Volume 定義 ==========
volumes:
  mysql-data:
  wordpress-data:
  redis-data:
```

好，我知道這個檔案看起來很長。但是你把它拆開來看，其實就是四個服務的重複結構。我們一個一個來分析。

**先看 Nginx 服務。** 它用的是 `nginx:alpine`，alpine 版本小巧快速。ports 只有 `"80:80"`，因為只有 Nginx 需要對外暴露 port。volumes 掛載了我們寫的 Nginx 設定檔，注意後面加了 `:ro`，代表唯讀，容器只能讀不能改。它只加入 frontend 網路。depends_on 設定了要等 WordPress healthy 才啟動——因為如果 WordPress 還沒準備好，Nginx 轉發過去也是白轉。

**再看 WordPress 服務。** 環境變數用 `${}` 語法從 .env 檔案讀取，沒有寫死。volumes 用了 named volume `wordpress-data` 來持久化 `/var/www/html` 目錄，這裡面放的是 WordPress 的所有檔案，包括你上傳的圖片、安裝的佈景主題和外掛。它同時加入 frontend 和 backend 兩個網路，因為它是中間的橋樑。depends_on 設定了要等 MySQL healthy、Redis started 才啟動。它自己也有 healthcheck，用 curl 去測 localhost:80 有沒有回應。

**MySQL 服務**在 backend 網路裡面。注意看它的 healthcheck，用的是 `mysqladmin ping` 這個指令，這是 MySQL 官方提供的健康檢查方式。`start_period: 30s` 是說啟動後前 30 秒不算失敗，因為 MySQL 啟動需要時間做初始化。

**Redis 服務**也在 backend 網路。它的 command 額外加了 `--maxmemory 64mb --maxmemory-policy allkeys-lru`，意思是最多用 64MB 記憶體，滿了之後自動淘汰最久沒用的資料。這是 Redis 快取的標準配法。

**最下面的 networks 和 volumes** 是全域定義。networks 定義了 frontend 和 backend 兩個 bridge 網路。volumes 定義了三個 named volume，讓資料不會隨容器刪除而消失。

大家注意到沒有？每一個服務都有 `restart: unless-stopped` 和 `deploy.resources.limits`。這兩個設定在生產環境非常重要。restart 確保服務掛了會自動重啟。resources limits 確保某個服務不會吃掉所有的系統資源，導致其他服務跟著掛。

### 2.8 啟動與驗證

好，三個檔案都寫好了。最令人興奮的時刻來了，我們來啟動：

```bash
# 啟動所有服務
docker compose up -d

# 你會看到類似這樣的輸出：
# [+] Running 7/7
#  ✔ Network wordpress-blog_frontend       Created
#  ✔ Network wordpress-blog_backend        Created
#  ✔ Volume "wordpress-blog_mysql-data"    Created
#  ✔ Volume "wordpress-blog_wordpress-data" Created
#  ✔ Volume "wordpress-blog_redis-data"    Created
#  ✔ Container blog-redis                  Started
#  ✔ Container blog-mysql                  Started
#  ✔ Container blog-wordpress              Started
#  ✔ Container blog-nginx                  Started
```

看到了嗎？一個指令，兩個網路、三個 Volume、四個容器，全部自動建立、自動啟動。你回想一下，如果用 `docker run` 手動做，你需要打多少指令？

好，來檢查一下狀態：

```bash
docker compose ps

# NAME              IMAGE                       STATUS                   PORTS
# blog-mysql        mysql:8.0                   Up (healthy)
# blog-nginx        nginx:alpine                Up                       0.0.0.0:80->80/tcp
# blog-redis        redis:7-alpine              Up (healthy)
# blog-wordpress    wordpress:6-php8.2-apache   Up (healthy)
```

全部 Up，而且有 healthcheck 的服務都顯示 healthy，完美。

再來看看啟動順序的日誌：

```bash
docker compose logs --tail=20
```

你可以觀察到啟動順序：Redis 和 MySQL 先起來（因為它們沒有依賴任何服務），等 MySQL 的 healthcheck 通過之後 WordPress 才啟動，最後 WordPress healthy 了 Nginx 才啟動。這就是 `depends_on` 搭配 `condition: service_healthy` 的效果。

現在，打開你的瀏覽器，輸入 `http://localhost`，你應該會看到 WordPress 的安裝畫面。選語言、設定管理員帳號密碼，一個完整的部落格就搭好了。

### 2.9 驗證 Volume 持久化——資料不怕丟

接下來我要示範一個很重要的東西。

先在 WordPress 裡面寫一篇文章，隨便打幾個字，標題就叫「Docker Compose 真好用」好了。發布文章，確認可以在前台看到。

現在，我要把所有容器全部刪掉：

```bash
# 停止並刪除所有容器和網路
docker compose down
```

注意看，我用的是 `docker compose down`，不是 `docker compose down -v`。`down` 只會刪除容器和網路，Volume 會保留。

然後重新啟動：

```bash
docker compose up -d
```

再打開瀏覽器，回到 WordPress，你會發現——文章還在！管理員帳號也還在！所有的資料都還在！

為什麼？因為 MySQL 的資料存在 named volume `mysql-data` 裡面，WordPress 上傳的檔案存在 `wordpress-data` 裡面。容器刪了再建，Volume 還在，資料就還在。

這就是我們 Day 3 第八堂課學的 Volume 資料持久化的威力。你看，前面學的東西全部用上了吧？

### 2.10 完整清理

實驗做完了，要清理怎麼辦？

```bash
# 只停止容器，保留資料
docker compose down

# 連 Volume 也刪掉（⚠️ 資料全部消失）
docker compose down -v

# 連映像檔也一起刪
docker compose down -v --rmi all
```

在生產環境，千萬千萬不要隨便加 `-v`。我再說一次，`-v` 會刪掉所有的 Volume，你的資料庫資料就真的沒了，救不回來。除非你有備份。

---

## 三、Docker Compose 實用技巧（10 分鐘）

### 3.1 開發環境 vs 生產環境分離

好，實戰做完了，接下來講一些你們上班馬上會用到的技巧。

第一個，也是最重要的一個：**環境分離**。

你想一想，開發的時候和上線的時候，需求是不一樣的。開發的時候你希望：
- 程式碼改了馬上看到效果（掛載本地原始碼）
- 看到詳細的錯誤訊息（開 debug 模式）
- 用方便的開發工具

上線的時候你希望：
- 程式碼打包在映像檔裡面，不掛載外部檔案
- 關掉 debug，只記錄必要的日誌
- 設定資源限制，避免某個服務吃掉所有記憶體

Docker Compose 有一個很聰明的機制來處理這個需求。你可以準備多個 compose 檔案：

**compose.yaml —— 基礎設定，所有環境共用：**

```yaml
services:
  web:
    image: myapp:latest
    ports:
      - "80:3000"
    environment:
      NODE_ENV: production
```

**compose.override.yaml —— 開發環境專用，自動載入：**

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DEBUG: "true"
    volumes:
      - .:/app
      - /app/node_modules
```

這裡有一個很重要的機制：當你的目錄下同時有 `compose.yaml` 和 `compose.override.yaml` 的時候，執行 `docker compose up`，Compose 會**自動**把兩個檔案合併。override 裡面的設定會覆蓋基礎設定。

所以在開發的時候，你只要打 `docker compose up`，就自動套用開發環境的設定了。不用記任何額外的參數。

**compose.prod.yaml —— 生產環境專用：**

```yaml
services:
  web:
    restart: always
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
      replicas: 3
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

部署到生產環境的時候，用 `-f` 參數明確指定要用哪些檔案：

```bash
# 生產環境啟動（跳過 override，用 prod）
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

這個機制的好處是什麼？基礎設定只寫一次，不會重複。開發和生產的差異部分各自獨立管理。新人進來只要 `docker compose up` 就能開始開發，不用看一大堆文件。

我在業界看過太多團隊，把開發和生產的設定混在一個檔案裡，用一堆註解來切換。那個維護起來真的很痛苦。用這種多檔案的方式，乾淨很多。

### 3.2 用 docker compose config 驗證設定

寫完多個 compose 檔案之後，你怎麼知道合併後的結果是不是你預期的？用 `docker compose config`：

```bash
# 驗證並顯示合併後的完整設定
docker compose config

# 驗證指定檔案的組合
docker compose -f compose.yaml -f compose.prod.yaml config

# 只驗證語法，不輸出內容
docker compose config --quiet
```

這個指令會把所有環境變數展開、所有檔案合併，然後輸出最終的結果。如果有語法錯誤，它會告訴你哪裡有問題。我建議你們每次改完 compose 檔案，都先跑一下 `config` 確認沒問題再啟動。

### 3.3 用 docker compose -f 指定檔案

除了環境分離之外，`-f` 還有很多用途。比如說你可能有不同的部署場景：

```bash
# 用指定的 compose 檔案
docker compose -f compose.prod.yaml up -d

# 合併多個檔案
docker compose -f compose.yaml -f compose.monitoring.yaml up -d
```

有些團隊會把監控相關的服務（Prometheus、Grafana）放在一個單獨的 compose 檔案裡。平常只跑核心服務，需要監控的時候再加上去。

### 3.4 更新映像檔

在生產環境，你經常需要更新服務的映像檔版本：

```bash
# 拉取所有服務的最新映像檔
docker compose pull

# 拉取後重新啟動
docker compose up -d
```

`docker compose up -d` 很聰明，它會去比對現在跑的容器和新的設定（或新的映像檔），只重建有變化的服務。沒變的服務完全不會被動到。所以你不用擔心一個 `up -d` 會把所有服務都重啟。

---

## 四、Docker Compose vs 手動 docker run 對比（5 分鐘）

好，到這裡 Docker Compose 的內容全部講完了。我們來做一個對比，讓大家真正感受到 Compose 幫了你多少忙。

### 4.1 對比表

| 面向 | docker run（手動） | Docker Compose |
|------|-------------------|----------------|
| **啟動多服務** | 一個一個打 docker run | `docker compose up` 一個指令搞定 |
| **網路管理** | 手動 create、手動 connect | 在 YAML 裡宣告，自動建立 |
| **Volume 管理** | 手動 create、每個容器手動 -v | 在 YAML 裡宣告，自動建立 |
| **環境變數** | 每個容器 -e 一個一個打 | 集中在 .env 統一管理 |
| **啟動順序** | 你自己記住順序，自己等 | depends_on + healthcheck |
| **查看日誌** | docker logs 一個一個看 | `docker compose logs` 全部一起看 |
| **清理資源** | stop、rm、network rm 一個一個來 | `docker compose down` 一次搞定 |
| **團隊協作** | 寫一堆腳本或文件 | 共享一個 compose.yaml |
| **版本控制** | 腳本很難管理 | YAML 是純文字，放 Git |

### 4.2 手動方式有多痛苦？

如果不用 Compose，剛才那個部落格系統要這樣啟動：

```bash
# 建立兩個網路
docker network create blog-frontend
docker network create blog-backend

# 建立三個 Volume
docker volume create blog-mysql-data
docker volume create blog-wordpress-data
docker volume create blog-redis-data

# 啟動 Redis
docker run -d --name blog-redis \
  --network blog-backend \
  -v blog-redis-data:/data \
  --restart unless-stopped \
  redis:7-alpine redis-server --maxmemory 64mb --maxmemory-policy allkeys-lru

# 啟動 MySQL
docker run -d --name blog-mysql \
  --network blog-backend \
  -v blog-mysql-data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=my-secret-root-pw \
  -e MYSQL_DATABASE=wordpress \
  -e MYSQL_USER=wp_user \
  -e MYSQL_PASSWORD=wp_password_123 \
  --restart unless-stopped \
  mysql:8.0

# 等 MySQL 起來...你要自己 sleep 或手動檢查

# 啟動 WordPress（注意，一個容器不能同時加兩個網路！）
docker run -d --name blog-wordpress \
  --network blog-backend \
  -v blog-wordpress-data:/var/www/html \
  -e WORDPRESS_DB_HOST=blog-mysql:3306 \
  -e WORDPRESS_DB_USER=wp_user \
  -e WORDPRESS_DB_PASSWORD=wp_password_123 \
  -e WORDPRESS_DB_NAME=wordpress \
  --restart unless-stopped \
  wordpress:6-php8.2-apache

# 還要額外連接第二個網路
docker network connect blog-frontend blog-wordpress

# 啟動 Nginx
docker run -d --name blog-nginx \
  --network blog-frontend \
  -p 80:80 \
  -v $(pwd)/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro \
  --restart unless-stopped \
  nginx:alpine
```

天啊，這得打多少行指令？而且你注意到一個很讓人抓狂的問題沒有——`docker run` 的 `--network` 參數只能指定一個網路！如果一個容器要加入兩個網路，你還得事後用 `docker network connect` 再接一次。

清理的時候更痛苦：

```bash
docker stop blog-nginx blog-wordpress blog-mysql blog-redis
docker rm blog-nginx blog-wordpress blog-mysql blog-redis
docker network rm blog-frontend blog-backend
# Volume 要不要刪？你確定嗎？要一個一個確認...
```

對比一下 Compose：啟動 `docker compose up -d`，清理 `docker compose down`。結案。

所以我的建議是：**只要你的應用超過一個容器，就用 Compose。** 即使只有一個容器，用 Compose 也有好處，至少你的啟動參數都寫在 YAML 檔裡面，不用每次去翻之前打過的指令。

---

## 五、Day 3 完整課程回顧（10 分鐘）

### 5.1 Day 3 七堂課回顧

好，同學們，到這裡所有的新內容都講完了。我們來花幾分鐘回顧一下 Day 3 這七堂課到底學了什麼。

**Hour 8：Volume 資料持久化。** 我們學了容器讀寫層的限制，然後用三種掛載方式解決資料持久化問題——bind mount、named volume、tmpfs。還學了資料備份和還原。一句話總結：**容器的資料不怕丟。**

**Hour 9：容器網路 + Port Mapping 進階。** 我們深入了解了 Bridge、Host、None 三種網路模式，學了自訂網路的 DNS 功能，還有 Port Mapping 的完整語法和防火牆的坑。一句話總結：**讓容器之間能溝通，讓外面能連進來。**

**Hour 10：Dockerfile 基礎。** 學了為什麼不該用 docker commit，然後把 Dockerfile 的所有指令都走過一遍——FROM、RUN、COPY、WORKDIR、EXPOSE、CMD、ENTRYPOINT。一句話總結：**能寫出可以用的 Dockerfile。**

**Hour 11：Dockerfile 進階與最佳化。** Multi-stage build、Build Cache 優化、安全性最佳實踐、.dockerignore。一句話總結：**能寫出又小又安全的 Dockerfile。**

**Hour 12：Dockerfile 實戰 + 除錯。** 打包多語言專案（Node.js、Python、Java、Go），學會排查常見的 build 和 runtime 問題。一句話總結：**能打包真實專案並解決問題。**

**Hour 13：Docker Compose 基礎與進階。** 學了 Compose 的語法、networks、environment、depends_on、build 整合，還有多網路隔離架構。一句話總結：**能用 YAML 管理多容器應用。**

**Hour 14（也就是這堂課）：Compose 實戰 + 課程總結。** 我們實際搭了一個四服務的部落格系統，學了環境分離的技巧，做了課程回顧。一句話總結：**能部署完整的應用。**

### 5.2 兩天完整回顧

把 Day 2 和 Day 3 放在一起看：

| 天數 | 小時 | 主題 | 你學會了什麼 |
|------|------|------|-------------|
| Day 2 | Hour 1 | 環境一致性問題 | 為什麼需要 Docker |
| Day 2 | Hour 2 | Docker 架構 | Client-Daemon-Registry |
| Day 2 | Hour 3 | Docker 安裝 | 在各種系統上裝 Docker |
| Day 2 | Hour 4 | 基本指令（上） | pull、images、run、ps |
| Day 2 | Hour 5 | 基本指令（下） | stop、rm、logs、exec |
| Day 2 | Hour 6 | Nginx 實戰 | Port mapping、Volume 初體驗 |
| Day 2 | Hour 7 | 實作練習 | 綜合應用 |
| Day 3 | Hour 8 | 映像檔深入 | 分層結構、快取機制 |
| Day 3 | Hour 9 | 容器生命週期 | 狀態管理、資源限制 |
| Day 3 | Hour 10 | 容器網路 | Bridge、Host、自訂網路 |
| Day 3 | Hour 11 | Port Mapping 進階 | 綁定策略、防火牆 |
| Day 3 | Hour 12 | Volume 持久化 | 三種掛載、備份還原 |
| Day 3 | Hour 13 | Dockerfile + Compose | 寫 Dockerfile、管理多容器 |
| Day 3 | Hour 14 | Compose 實戰 + 總結 | 部署完整應用、後續學習 |

### 5.3 Docker 完整工作流程

三天的內容串起來，就是這張 Docker 完整工作流程圖：

```
┌──────────────┐    docker build    ┌──────────────┐    docker push    ┌──────────────┐
│  Dockerfile  │ ────────────────►  │    Image     │ ────────────────► │   Registry   │
│  (設計圖)     │                    │  (映像檔)     │                   │  (Docker Hub) │
└──────────────┘                    └──────┬───────┘                   └──────┬───────┘
                                          │                                  │
                                          │ docker run                       │ docker pull
                                          │                                  │
                                          ▼                                  ▼
                                   ┌──────────────┐                   ┌──────────────┐
                                   │  Container   │                   │    Image     │
                                   │  (容器)       │                   │  (映像檔)     │
                                   └──────────────┘                   └──────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────┐
│  compose.yaml  ──►  docker compose up  ──►  多個 Container + Network + Volume        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

你可以把這張圖印出來貼在你的螢幕旁邊。

- **Dockerfile** 是設計圖——描述怎麼建構映像檔
- **Image** 是模板——可以推到 Registry 分享，也可以拉回來使用
- **Container** 是實例——Image 跑起來就是 Container
- **compose.yaml** 是編排方案——一次管理多個 Container、Network、Volume

### 5.4 核心概念速查

| 概念 | 一句話說明 |
|------|-----------|
| 容器 vs 虛擬機 | 容器共享核心，輕量快速；虛擬機有完整 OS，隔離更好但更重 |
| 映像檔分層 | 一層一層疊，每層唯讀，多映像可共享底層 |
| Volume | 容器是暫時的，Volume 才是永久的，重要資料一定用 Volume |
| 自訂網路 | 有 DNS 功能，容器用名稱互通，安全隔離 |
| Dockerfile | Multi-stage 減小體積、利用快取加速、不用 root |
| Docker Compose | 多容器標準管理工具，一個 YAML 定義一切 |

### 5.5 最佳實踐速查

| 類別 | 做法 |
|------|------|
| 映像檔 | 指定版本 tag，不用 latest；用 alpine 或 slim |
| Dockerfile | Multi-stage build；先複製依賴清單再複製原始碼；不用 root |
| 容器 | 一個容器一個程序；設資源限制；用 healthcheck |
| 網路 | 用自訂網路；只暴露必要的 port |
| Volume | 重要資料用 named volume；定期備份 |
| Compose | 用 .env 管敏感資訊；depends_on 搭配 healthcheck |
| 安全 | .env 不推 Git；用 non-root user；限制資源 |

---

## 六、銜接 Kubernetes（5 分鐘）

### 6.1 Docker 的限制

好，最後我要跟大家聊一下接下來的學習方向。

到目前為止，我們所有的操作都在一台機器上。Docker Compose 很強大沒錯，但它有幾個根本性的限制：

第一，**單機限制**。所有容器都跑在同一台機器上。那台機器硬碟壞了、電源掛了，全部服務一起掛。

第二，**沒有自動擴縮**。今天你的網站突然上了新聞，流量暴增十倍，你要自己手動加容器。流量降回來了，你又要自己手動減。

第三，**沒有跨機故障恢復**。`restart: always` 可以在容器掛掉時重啟，但如果整台機器掛了呢？沒人幫你把服務搬到另一台機器上。

第四，**沒有滾動更新**。你要更新應用版本，得先停舊的再啟新的，中間會有一段時間網站打不開。

第五，**沒有智能的負載均衡**。你有三個相同的 web 容器，但沒有內建的方式把流量平均分配給它們。

當你的應用規模越來越大——幾十個、幾百個容器，分散在多台機器上——Docker 單機就不夠用了。你需要一個「容器編排平台」，而目前業界的標準答案就是 **Kubernetes**（大家通常簡稱 K8s，因為 K 和 s 之間有 8 個字母）。

### 6.2 Docker 到 K8s 的概念對應

好消息是，你在 Docker 學到的所有概念，在 Kubernetes 裡面都有對應。你不是重學，你是「升級」。

| Docker 概念 | Kubernetes 對應 | 說明 |
|------------|-----------------|------|
| Container | Pod | Pod 是 K8s 最小調度單位，裡面可以有一或多個 Container |
| `docker run` | `kubectl apply` | 用 YAML 檔描述期望狀態 |
| compose.yaml | K8s manifest YAML | 格式不同，但概念一樣：用 YAML 定義一切 |
| 手動擴縮 | HPA（自動擴縮器） | 根據 CPU、記憶體自動擴縮 |
| `restart: always` | Deployment + ReplicaSet | 自動維持指定數量的 Pod |
| docker network | Service + Ingress | 服務發現和外部存取 |
| docker volume | PersistentVolume + PVC | 更完善的儲存管理 |
| .env 檔案 | ConfigMap + Secret | 設定和敏感資訊的標準管理方式 |

### 6.3 一個比喻

我用一個比喻來總結：

- **Docker** 就像你會開車——你可以開一台車從 A 到 B
- **Docker Compose** 就像你會管理一個車隊——你可以同時調度好幾台車
- **Kubernetes** 就像你是交通管理局——你管理整個城市的交通系統，自動處理路線規劃、故障應變、流量控制

你不會因為當了交通局長就忘記怎麼開車。Kubernetes 是 Docker 的延伸，不是替代。你在 Docker 學到的容器化思維、Dockerfile 撰寫、映像檔管理，在 Kubernetes 裡全部都會用到。

**Docker 是基礎，K8s 是進階。你們已經把基礎打好了。**

---

## 七、學生綜合練習題

最後出幾道練習題給大家，這些是綜合題，會用到你們三天學到的所有知識。

> **練習題 1：基礎 Compose**
>
> 用 Docker Compose 搭建一個「Nginx + PHP-FPM」的網站：
> - Nginx 對外開放 port 8080
> - PHP-FPM 只在內部網路
> - Nginx 的設定檔從本機掛載
> - 網站檔案用 named volume 共享
>
> 寫出完整的 compose.yaml。

> **練習題 2：Dockerfile + Compose 整合**
>
> 你有一個 Node.js Express 應用，需要搭配 MongoDB：
> 1. 寫一個 Dockerfile（Multi-stage build、non-root user）
> 2. 寫一個 compose.yaml 同時啟動 Express 和 MongoDB
> 3. MongoDB 的資料要持久化
> 4. 用 .env 管理連線資訊
> 5. 設定 healthcheck

> **練習題 3：環境分離**
>
> 基於練習題 2，建立環境分離：
> - compose.yaml：基礎設定
> - compose.override.yaml：開發環境（掛載原始碼、啟用 debug）
> - compose.prod.yaml：生產環境（資源限制、日誌設定）
>
> 寫出三個檔案，並說明怎麼分別啟動。

> **練習題 4：除錯題**
>
> 以下 compose.yaml 有 5 個問題，找出來並修正：
>
> ```yaml
> services:
>   web:
>     image: nginx
>     container_name: my-web
>     ports:
>       - "80:80"
>     depends_on:
>       - api
>     networks:
>       - frontend
>
>   api:
>     build: .
>     ports:
>       - "3000:3000"
>     environment:
>       DB_HOST: localhost
>       DB_PASSWORD: my-password
>     networks:
>       - frontend
>       - backend
>
>   db:
>     image: mysql
>     volumes:
>       - ./data:/var/lib/mysql
>     networks:
>       - backend
>
> networks:
>   frontend:
>   backend:
> ```
>
> 提示：考慮安全性、可靠性、最佳實踐。

> **練習題 5：架構設計題**
>
> 你的公司要部署一個微服務系統：
> - API Gateway（Nginx，port 80/443）
> - 使用者服務（Node.js，port 3001）
> - 訂單服務（Java Spring Boot，port 8080）
> - PostgreSQL 資料庫
> - Redis 快取
> - RabbitMQ 訊息佇列
>
> 請設計：
> 1. 網路拓撲（哪些服務在哪個網路）
> 2. Volume 規劃（哪些需要持久化）
> 3. 啟動順序
> 4. 畫出架構圖

---

## 八、附錄：Docker 常用指令速查表

### 映像檔管理

```bash
docker pull <image>:<tag>          # 下載映像檔
docker images                      # 列出本地映像檔
docker rmi <image>                 # 刪除映像檔
docker build -t <name>:<tag> .     # 建構映像檔
docker tag <src> <dst>             # 加標籤
docker push <image>:<tag>          # 推送到 Registry
docker save -o <file> <image>      # 匯出為 tar
docker load -i <file>              # 從 tar 匯入
docker image prune                 # 清理未使用的映像檔
docker history <image>             # 查看建構歷史
```

### 容器管理

```bash
docker run -d --name <n> <image>   # 背景啟動
docker run -it <image> sh          # 互動式啟動
docker ps                          # 列出執行中容器
docker ps -a                       # 列出所有容器
docker stop <container>            # 停止
docker start <container>           # 啟動
docker restart <container>         # 重啟
docker rm <container>              # 刪除
docker rm -f <container>           # 強制刪除
docker logs -f <container>         # 追蹤日誌
docker exec -it <container> sh     # 進入容器
docker inspect <container>         # 查看詳情
docker stats                       # 資源使用狀況
docker cp <src> <container>:<dst>  # 複製檔案
docker container prune             # 清理已停止容器
```

### 常用 run 參數

```bash
-d                                 # 背景模式
-it                                # 互動模式
--name <name>                      # 指定名稱
-p <host>:<container>              # Port mapping
-v <host>:<container>              # Volume 掛載
-e <KEY>=<VALUE>                   # 環境變數
--env-file <file>                  # 從檔案讀取環境變數
--network <network>                # 指定網路
--restart <policy>                 # 重啟策略
--memory <limit>                   # 記憶體限制
--cpus <limit>                     # CPU 限制
--rm                               # 停止後自動刪除
```

### 網路管理

```bash
docker network create <name>       # 建立網路
docker network ls                  # 列出網路
docker network inspect <name>      # 查看詳情
docker network rm <name>           # 刪除網路
docker network connect <net> <c>   # 容器連接網路
docker network disconnect <n> <c>  # 容器斷開網路
docker network prune               # 清理未使用網路
```

### Volume 管理

```bash
docker volume create <name>        # 建立 Volume
docker volume ls                   # 列出 Volume
docker volume inspect <name>       # 查看詳情
docker volume rm <name>            # 刪除 Volume
docker volume prune                # 清理未使用 Volume
```

### Docker Compose

```bash
docker compose up -d               # 背景啟動所有服務
docker compose down                # 停止並移除容器和網路
docker compose down -v             # 同上，連 Volume 一起刪
docker compose ps                  # 查看服務狀態
docker compose logs                # 查看所有服務日誌
docker compose logs -f <service>   # 追蹤特定服務日誌
docker compose exec <svc> sh       # 進入服務容器
docker compose build               # 建構所有服務
docker compose pull                # 拉取所有映像檔
docker compose restart             # 重啟所有服務
docker compose stop                # 停止所有服務
docker compose config              # 驗證並顯示設定
docker compose top                 # 顯示容器內程序
docker compose -f <file> up -d     # 使用指定檔案啟動
docker compose --profile <p> up -d # 啟動指定 profile
docker compose up -d --scale <s>=N # 擴展服務數量
```

### 系統清理

```bash
docker system df                   # 查看磁碟使用
docker system prune                # 清理未使用資源
docker system prune -a             # 清理所有（含映像檔）
docker system prune -a --volumes   # 清理所有（含 Volume）
```

---

## 九、結語

同學們，三天的 Docker 課程到這裡就全部結束了。

回想一下 Day 2 第一堂課，你們連 Docker 是什麼都不太清楚。到現在，你們可以自己寫 Dockerfile 把應用程式打包成映像檔，可以用 Docker Compose 一次部署四個服務的完整應用，還懂得網路隔離、資料持久化、環境分離這些進階技巧。

你們在三天內學到的東西，已經足夠你在公司開始使用 Docker 了。不是理論上可以用，是真的可以用——今天我們搭的那個 WordPress 部落格系統，把 WordPress 換成你們自己公司的應用，架構是一模一樣的。

最後我想說的是，Docker 只是一個工具，但它背後代表的是一種**基礎設施即程式碼（Infrastructure as Code）**的思維。你用 Dockerfile 把環境寫成程式碼，用 compose.yaml 把部署方案寫成程式碼。這些程式碼可以版本控制、可以審查、可以自動化。這種思維才是最有價值的東西。

如果接下來要繼續學習，我建議的路線是：先把 Docker 用熟（多練習、多實戰），然後學 Kubernetes（容器編排），再學 CI/CD（持續整合/持續部署）。有了這三塊，你就具備了現代 DevOps 工程師的核心技能。

好，課程到此結束。謝謝大家這三天的認真學習，辛苦了。如果有任何問題，歡迎隨時來問我。祝大家工作順利，在 Docker 的世界裡玩得開心！

---

## 板書 / PPT 建議

1. **部落格系統架構圖**：四個服務的關係和網路分層（Nginx → WordPress → MySQL + Redis），用不同顏色區分 frontend 和 backend 網路
2. **完整 compose.yaml 展示**：用語法高亮，標注 healthcheck、depends_on、networks、volumes、deploy 等關鍵設定
3. **開發 vs 生產環境**：compose.yaml + compose.override.yaml + compose.prod.yaml 的合併流程圖
4. **Docker Compose vs docker run 對比表**：左右對照，Compose 的優勢一目瞭然
5. **三天課程內容總覽表**：Day 1 / Day 2 / Day 3 各小時主題
6. **Docker 完整工作流程圖**：Dockerfile → build → Image → push/pull → Container → compose.yaml
7. **Docker 到 K8s 對應表**：左邊 Docker、右邊 K8s、中間箭頭連線
8. **Docker 指令速查表**：印成 cheat sheet 發給學生帶回去
9. **練習題除錯題答案**：標出 5 個問題及修正方式
