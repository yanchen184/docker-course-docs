# Day 2 第六小時：Nginx 容器實戰

---

## 一、前情提要（2 分鐘）

前面學了一堆指令，現在來實戰。

這堂課用 Nginx 做一個完整的練習：
- 啟動 Nginx 容器
- Port Mapping
- 瀏覽器驗證
- 自訂首頁
- 設定檔修改
- 多個 Nginx 容器

---

## 二、認識 Nginx（5 分鐘）

### 2.1 Nginx 是什麼

Nginx 是一個高效能的 Web 伺服器，也常用作反向代理、負載均衡。

特點：
- 輕量、快速
- 高併發處理能力
- 設定簡單

Docker 官方映像檔是最常被下載的映像檔之一。

### 2.2 為什麼用 Nginx 練習

- 映像檔小（alpine 版約 40MB）
- 啟動快
- 有 Web 介面，方便驗證
- 實際工作常用

---

## 三、啟動第一個 Nginx 容器（10 分鐘）

### 3.1 拉取映像檔

```bash
docker pull nginx:alpine
```

alpine 版本比較小。

### 3.2 前景執行看看

```bash
docker run nginx:alpine
```

會看到 Nginx 的啟動日誌。

但這樣沒辦法訪問——沒有做 Port Mapping。

Ctrl+C 停止。

### 3.3 背景執行 + Port Mapping

```bash
docker run -d --name web -p 8080:80 nginx:alpine
```

- `-d`：背景執行
- `--name web`：容器名稱
- `-p 8080:80`：主機 8080 對應容器 80

### 3.4 驗證

```bash
# 確認容器在跑
docker ps

# 命令列測試
curl http://localhost:8080
```

或打開瀏覽器訪問 http://localhost:8080

會看到 Nginx 的歡迎頁面。

### 3.5 查看日誌

```bash
docker logs web
docker logs -f web    # 持續追蹤
```

用瀏覽器訪問幾次，可以看到 access log。

### 3.6 進入 Nginx 容器看看

```bash
docker exec -it web /bin/bash
```

進入後可以查看 Nginx 的目錄結構：
- 設定檔：`/etc/nginx/nginx.conf`、`/etc/nginx/conf.d/default.conf`
- 網頁目錄：`/usr/share/nginx/html/`

在容器內可以直接修改設定或網頁內容，但每次都要進入容器修改很麻煩。後面會學習 Volume 掛載技術，讓我們在容器外部修改檔案，容器內部自動同步。

---

## 四、Port Mapping 深入（10 分鐘）

### 4.1 格式解析

```
-p [主機IP:]主機Port:容器Port[/協定]
```

**常見寫法**

```bash
-p 8080:80              # 主機 8080 → 容器 80
-p 127.0.0.1:8080:80    # 只綁定 localhost
-p 8080:80/tcp          # 指定 TCP（預設）
-p 8080:80/udp          # 指定 UDP
-p 80:80 -p 443:443     # 多個 port
```

### 4.2 綁定所有介面 vs 只綁定 localhost

```bash
# 所有介面（預設），外部可存取
docker run -d -p 8080:80 nginx

# 只綁定 localhost，外部無法存取
docker run -d -p 127.0.0.1:8080:80 nginx
```

生產環境考慮安全性，不要隨便開放所有介面。

> **理解 Port 暴露的完整鏈路**
>
> 以雲端伺服器為例，完整的訪問鏈路是：
> 1. 外網請求 → 雲端安全組（需開放對應 port）
> 2. → Linux 防火牆（需開放對應 port）
> 3. → Docker `-p` 映射（宿主機 port → 容器 port）
> 4. → 容器內的應用（如 Nginx 監聽 80）
>
> 每一層都必須打通，少了任何一層都無法從外部訪問。

### 4.3 使用隨機 Port

```bash
docker run -d -P nginx
```

大寫 `-P` 會把映像檔 EXPOSE 的所有 port 對應到隨機的高位 port。

查看對應：

```bash
docker port web
# 輸出：80/tcp -> 0.0.0.0:49153
```

### 4.4 查看 Port 使用

```bash
docker port web
docker ps --format "{{.Names}}: {{.Ports}}"
```

---

## 五、自訂網頁內容（15 分鐘）

### 5.1 Nginx 預設網頁目錄

Nginx 官方映像檔的網頁目錄：

```
/usr/share/nginx/html/
```

裡面有 index.html（歡迎頁）和 50x.html（錯誤頁）。

### 5.2 方法一：docker cp 複製檔案

先建立一個 HTML 檔案：

```bash
echo '<h1>Hello Docker!</h1>' > index.html
```

複製到容器：

```bash
docker cp index.html web:/usr/share/nginx/html/index.html
```

重新整理瀏覽器，看到變化。

### 5.3 方法二：Volume 掛載（推薦）

**為什麼需要 Volume？**

容器內的檔案系統是隔離的。如果資料只存在容器內，一旦容器被刪除，資料就跟著消失。Volume（數據卷）技術就是把容器內的目錄「掛載」到宿主機或 Docker 管理的持久化儲存：
- 容器讀寫掛載目錄時，實際上是在操作同一份掛載資料
- 即使容器停止、重建，只要掛載仍在，資料就會保留
- Named volume 會持續存在，直到明確執行 `docker volume rm` 或 `docker volume prune`

這對於需要持久化的資料（如資料庫、設定檔、網頁內容）非常重要。

先準備一個目錄和檔案：

```bash
mkdir -p ~/docker-demo/html
echo '<h1>Hello from Volume!</h1>' > ~/docker-demo/html/index.html
```

啟動容器時掛載：

```bash
# 先刪除舊容器
docker rm -f web

# 用 volume 掛載
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/html:/usr/share/nginx/html:ro \
  nginx:alpine
```

`:ro` 表示唯讀（read-only），容器不能修改這個目錄。

驗證：

```bash
curl http://localhost:8080
```

**修改主機上的檔案**

```bash
echo '<h1>Updated!</h1>' > ~/docker-demo/html/index.html
```

刷新瀏覽器，立刻看到變化。不需要重啟容器。

這就是 Volume 的好處——主機和容器共用檔案。

**用 docker inspect 驗證掛載**

```bash
docker inspect web
```

在輸出的 JSON 中找到 `Mounts` 區段，可以看到：
- `Source`：宿主機上的路徑
- `Destination`：容器內的路徑
- `RW`：是否可讀寫（如果加了 `:ro` 則為 false）

### 5.4 建立完整的靜態網站

```bash
mkdir -p ~/docker-demo/website
cat > ~/docker-demo/website/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My Docker Website</title>
    <style>
        body { font-family: Arial; margin: 40px; }
        h1 { color: #0066cc; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to My Docker Website!</h1>
        <p>This website is running in a Docker container.</p>
        <ul>
            <li>Web Server: Nginx</li>
            <li>Container Engine: Docker</li>
        </ul>
    </div>
</body>
</html>
EOF
```

重新建立容器：

```bash
docker rm -f web
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/website:/usr/share/nginx/html:ro \
  nginx:alpine
```

瀏覽器訪問看效果。

---

## 六、修改 Nginx 設定（10 分鐘）

### 6.1 查看預設設定

```bash
docker exec web cat /etc/nginx/nginx.conf
docker exec web cat /etc/nginx/conf.d/default.conf
```

### 6.2 提取設定檔

```bash
mkdir -p ~/docker-demo/nginx
docker cp web:/etc/nginx/conf.d/default.conf ~/docker-demo/nginx/
```

### 6.3 修改設定

編輯 ~/docker-demo/nginx/default.conf：

```nginx
server {
    listen       80;
    server_name  localhost;

    # 自訂 access log 格式
    access_log  /var/log/nginx/access.log;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    # 新增 /api 路徑
    location /api {
        return 200 '{"status": "ok", "message": "Hello from Docker Nginx!"}';
        add_header Content-Type application/json;
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

### 6.4 套用新設定

重新建立容器，掛載設定檔：

```bash
docker rm -f web
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/website:/usr/share/nginx/html:ro \
  -v ~/docker-demo/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
```

驗證：

```bash
curl http://localhost:8080
curl http://localhost:8080/api
```

### 6.5 熱重載設定（不重啟容器）

如果只是改設定，不需要重建容器：

```bash
# 修改主機上的設定檔後
docker exec web nginx -s reload
```

Nginx 會重新載入設定。

---

## 七、運行多個 Nginx 容器（5 分鐘）

### 7.1 同時運行多個

```bash
# 網站 A
docker run -d --name site-a -p 8081:80 \
  -v ~/docker-demo/site-a:/usr/share/nginx/html:ro \
  nginx:alpine

# 網站 B
docker run -d --name site-b -p 8082:80 \
  -v ~/docker-demo/site-b:/usr/share/nginx/html:ro \
  nginx:alpine
```

準備不同的內容：

```bash
mkdir -p ~/docker-demo/site-a ~/docker-demo/site-b
echo '<h1>Site A</h1>' > ~/docker-demo/site-a/index.html
echo '<h1>Site B</h1>' > ~/docker-demo/site-b/index.html
```

驗證：

```bash
curl http://localhost:8081    # Site A
curl http://localhost:8082    # Site B
```

### 7.2 查看所有 Nginx 容器

```bash
docker ps -f ancestor=nginx:alpine
```

### 7.3 統一管理

```bash
# 停止所有
docker stop site-a site-b web

# 啟動所有
docker start site-a site-b web

# 刪除所有
docker rm -f site-a site-b web
```

---

## 八、深入理解數據卷（15 分鐘）

### 8.1 實戰：MySQL 數據持久化

MySQL 的數據絕對不應該只放在容器內——容器刪除就等於刪庫。用 Volume 把資料掛載到宿主機是必備操作。

```bash
# 拉取 MySQL
docker pull mysql:8.0

# 啟動 MySQL，掛載設定檔和資料目錄
docker run -d \
  -p 3310:3306 \
  -v ~/mysql/conf:/etc/mysql/conf.d \
  -v ~/mysql/data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=123456 \
  --name mysql01 \
  mysql:8.0
```

參數說明：
- `-v ~/mysql/conf:/etc/mysql/conf.d`：掛載設定檔目錄，方便在宿主機上修改 MySQL 配置
- `-v ~/mysql/data:/var/lib/mysql`：掛載資料目錄，所有資料庫檔案同步到宿主機
- `-e MYSQL_ROOT_PASSWORD=123456`：設定 root 密碼（必填，可在 Docker Hub 查看支援的環境變數）
- 可以用多個 `-v` 同時掛載多個目錄

啟動後，用任何 MySQL 客戶端（如 DBeaver、MySQL Workbench）連接 `localhost:3310`，建立資料庫和表。然後到宿主機的 `~/mysql/data` 目錄查看，可以看到資料庫檔案已經同步過來。

**驗證：刪除容器後資料不丟失**

```bash
# 強制刪除 MySQL 容器
docker rm -f mysql01

# 檢查宿主機上的資料
ls ~/mysql/data
```

資料依然存在。重新用相同的 `-v` 參數啟動一個新容器，資料就能恢復。

### 8.2 三種掛載方式

| 方式 | 寫法 | 說明 |
|------|------|------|
| 匿名掛載 | `-v 容器內路徑` | 不指定宿主機路徑，Docker 自動在 `/var/lib/docker/volumes/` 下生成隨機目錄 |
| 具名掛載 | `-v 卷名:容器內路徑` | 指定一個名稱（不帶 `/`），存放在 `/var/lib/docker/volumes/卷名/_data/` |
| 指定路徑掛載 | `-v /宿主機路徑:容器內路徑` | 完整指定宿主機目錄（以 `/` 開頭） |

**匿名掛載**

```bash
docker run -d -P -v /etc/nginx nginx
```

只寫了容器內路徑，Docker 會自動分配一個隨機名稱的卷。用 `docker volume ls` 可以看到一堆長亂碼名稱的卷。

**具名掛載（推薦）**

```bash
docker run -d -P --name nginx02 -v my-nginx-conf:/etc/nginx nginx
```

卷名是 `my-nginx-conf`（注意不帶 `/`），方便辨識和管理。

```bash
# 查看所有卷
docker volume ls

# 查看具名卷的詳細資訊（包含實際存放路徑）
docker volume inspect my-nginx-conf
```

所有沒有指定宿主機目錄的卷，實際都存放在 `/var/lib/docker/volumes/` 下。

**讀寫權限**

```bash
-v 卷名:容器內路徑:ro    # 唯讀，容器內無法修改，只能從宿主機修改
-v 卷名:容器內路徑:rw    # 可讀可寫（預設）
```

### 8.3 在 Dockerfile 中定義數據卷

除了在 `docker run` 時用 `-v` 掛載，也可以在 Dockerfile 中用 `VOLUME` 指令預設掛載點：

```dockerfile
FROM centos
VOLUME ["volume01", "volume02"]
CMD /bin/bash
```

用 `docker build` 構建映像檔：

```bash
docker build -f Dockerfile -t my-centos:1.0 .
```

啟動這個映像檔後，容器內會自動產生 `volume01` 和 `volume02` 目錄，並以匿名掛載的方式對應到宿主機的 `/var/lib/docker/volumes/` 下。可以用 `docker inspect` 查看 Mounts 確認掛載位置。

如果構建映像檔時沒有用 `VOLUME`，啟動時就需要手動用 `-v` 掛載。

### 8.4 數據卷容器（容器間共享數據）

多個容器之間如何共享數據？使用 `--volumes-from` 讓一個容器繼承另一個容器的數據卷。

```bash
# 啟動第一個容器
docker run -it --name docker01 my-centos:1.0

# 啟動第二個容器，繼承 docker01 的數據卷
docker run -it --name docker02 --volumes-from docker01 my-centos:1.0

# 啟動第三個容器，也繼承 docker01
docker run -it --name docker03 --volumes-from docker01 my-centos:1.0
```

三個容器看到的是同一份掛載資料：
- 在 docker01 中建立檔案 → docker02、docker03 都能看到
- 在 docker03 中建立檔案 → docker01、docker02 也能看到

**刪除父容器後資料還在嗎？**

即使把 docker01 刪除，docker02 和 docker03 的資料也不會因為刪掉父容器而消失。這不是容器之間互相拷貝，而是多個容器共同掛載同一份 volume。若使用 named volume，資料會一直保留到你明確刪除該 volume。

**典型應用場景**

```bash
# 備份容器共用同一個資料卷（安全）
docker run -d --name mysql01 -v mysql-data:/var/lib/mysql mysql:8.0
docker run --rm --volumes-from mysql01 alpine tar czf /backup/mysql-data.tar.gz /var/lib/mysql
```

適用於備份、資料檢查、匯出等場景。如果第一個容器已經用 `-v` 或 named volume 把資料持久化，刪除容器本身不會自動刪掉宿主機資料；但若要清理 named volume，仍需手動刪除。

---

## 九、練習題（3 分鐘）

**題目**

1. 啟動一個 Nginx 容器
   - 名稱：my-web
   - Port：本機 80 → 容器 80
   - 掛載本機目錄到 /usr/share/nginx/html
2. 在掛載的目錄中建立一個 about.html
3. 瀏覽器訪問 http://localhost/about.html

**參考答案**

```bash
mkdir -p ~/my-web
echo '<h1>About Page</h1>' > ~/my-web/about.html
echo '<h1>Home</h1><a href="about.html">About</a>' > ~/my-web/index.html

docker run -d --name my-web \
  -p 80:80 \
  -v ~/my-web:/usr/share/nginx/html:ro \
  nginx:alpine

curl http://localhost/
curl http://localhost/about.html
```

---

## 十、本堂課小結（2 分鐘）

這堂課用 Nginx 實戰練習了：

**核心技能**
- Port Mapping：`-p 主機Port:容器Port`
- Volume 掛載：`-v 主機路徑:容器路徑`
- 查看日誌：`docker logs`
- 進入容器：`docker exec`
- 複製檔案：`docker cp`

**數據卷要點**
- 數據卷是容器持久化和同步操作的核心技術
- 三種掛載方式：匿名掛載、具名掛載（推薦）、指定路徑掛載
- `:ro` 唯讀 / `:rw` 可讀可寫（預設）
- Dockerfile 中可用 `VOLUME` 預設掛載點
- `--volumes-from` 實現容器間數據共享
- Anonymous volume 與 named volume 都不會因容器刪除就自動消失；named volume 需要手動清理
- 已持久化到宿主機的資料，即使容器刪除也不會丟失

**學到的技巧**
- 掛載網頁目錄，主機修改立即生效
- 掛載設定檔，自訂 Nginx 行為
- 多容器運行在不同 port
- 熱重載設定：`nginx -s reload`
- MySQL 資料持久化掛載
- 用 `docker volume ls` / `docker volume inspect` 管理卷

Day 2 的內容到這邊。下一堂是練習和複習。

---

## 板書 / PPT 建議

1. Nginx 容器目錄結構（/usr/share/nginx/html, /etc/nginx）
2. Port Mapping 示意圖（外網 → 安全組 → 防火牆 → Docker -p → 容器）
3. Volume 掛載示意圖（共享掛載）
4. 完整的 docker run 命令解析
5. 三種掛載方式對照表
6. 數據卷容器 --volumes-from 示意圖
