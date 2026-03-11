# Day 2 第六小時：Nginx 容器實戰

---

## 一、前情提要（2 分鐘）

前面幾堂課學了映像檔管理、容器的啟動停止、日誌查看、進入容器等一系列指令。指令一個一個學的時候都懂，但真正要拿來做事的時候，就需要把它們串起來用。

這堂課就是做這件事——用 Nginx 當主角，把前面學的指令全部串成一個完整的實戰流程：

- 啟動 Nginx 容器
- Port Mapping（讓外部能訪問容器內的服務）
- 瀏覽器驗證
- 自訂首頁（Volume 掛載）
- 修改 Nginx 設定檔
- 同時跑多個 Nginx 容器

為什麼用 Nginx？因為在實際工作中，Nginx 是後端工程師、DevOps 工程師幾乎每天都會碰到的東西。不管你是部署前端靜態網站、做反向代理、還是搭建微服務的 API Gateway，Nginx 都是首選方案之一。而且它啟動快、有 Web 介面可以馬上在瀏覽器看到結果，非常適合拿來當 Docker 的練習對象。

這堂課操作很多，建議跟著一起打指令。

---

## 二、認識 Nginx（5 分鐘）

### 2.1 Nginx 是什麼

前面在講 `docker pull` 的時候簡單提過 Nginx，這邊再完整介紹一下。

Nginx（唸作 "engine-x"）是一個高效能的 Web 伺服器，也常用作反向代理和負載均衡器。它是 2004 年由俄羅斯工程師 Igor Sysoev 開發的，當初就是為了解決 C10K 問題——也就是一台伺服器同時處理一萬個連線的挑戰。

Nginx 的核心特點：

- **輕量、快速**：採用事件驅動架構（event-driven），不像 Apache 那樣為每個連線開一個執行緒，所以記憶體佔用非常低
- **高併發處理能力**：單機輕鬆處理數萬個同時連線
- **設定語法簡潔**：比起 Apache 的 `.htaccess`，Nginx 的設定檔可讀性好很多
- **模組化設計**：功能都是以模組形式載入，你用不到的功能不會佔用資源

在 Docker Hub 上，Nginx 是下載量排名前幾的官方映像檔。你去看 Docker Hub 的首頁，Nginx 的下載量是數十億次級別的。

### 2.2 為什麼用 Nginx 練習

選 Nginx 來做 Docker 實戰練習有幾個原因：

- **映像檔小**：alpine 版約 40MB，下載很快。相比之下 MySQL 映像檔要 500MB 以上
- **啟動極快**：通常不到一秒就能啟動完成，不像資料庫映像檔需要初始化好幾十秒
- **有 Web 介面**：啟動後瀏覽器打開就能看到結果，比起那些只在背景跑、沒有畫面的服務，Nginx 給你即時的視覺回饋
- **實際工作常用**：你學完之後馬上就能在工作中應用，不是學完就丟的玩具範例

還有一個好處：Nginx 的設定檔結構很清晰，修改起來容易理解，非常適合用來練習 Volume 掛載和設定檔管理。

---

## 三、啟動第一個 Nginx 容器（10 分鐘）

### 3.1 拉取映像檔

```bash
docker pull nginx:alpine
```

這邊指定用 `alpine` 標籤。前面講過，Alpine Linux 是一個極度精簡的 Linux 發行版，基於它的映像檔通常只有完整版的四分之一大小。Nginx 的完整版（基於 Debian）大約 187MB，而 `nginx:alpine` 只有 40MB 左右。

在實際工作中，除非你有特殊理由需要完整版（比如需要某些 Debian 專有的套件），否則優先選 alpine 版本。映像檔越小，下載越快、佔磁碟空間越少、攻擊面也越小。

拉取完成後，用 `docker images nginx` 確認一下：

```bash
docker images nginx
```

預期輸出：

```
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
nginx        alpine    a6bd71f48f68   2 weeks ago   43.2MB
```

### 3.2 前景執行看看

先用最簡單的方式跑起來：

```bash
docker run nginx:alpine
```

你會看到類似這樣的 Nginx 啟動日誌：

```
/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration
/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/
...
2024/01/15 08:30:00 [notice] 1#1: using the "epoll" event method
2024/01/15 08:30:00 [notice] 1#1: nginx/1.25.3
2024/01/15 08:30:00 [notice] 1#1: built by gcc 12.2.1 ...
2024/01/15 08:30:00 [notice] 1#1: OS: Linux 5.15.49-linuxkit
2024/01/15 08:30:00 [notice] 1#1: start worker processes
2024/01/15 08:30:00 [notice] 1#1: start worker process 29
```

Nginx 啟動了，日誌顯示它在容器內部監聽 80 port。但現在有一個問題：你從主機去訪問 `http://localhost:80`，是訪問不到的。為什麼？因為容器是隔離的，容器內部的網路和主機的網路是兩個獨立的空間。你沒有做 Port Mapping，主機根本不知道怎麼把請求轉發進容器。

按 `Ctrl+C` 停止容器。注意，前景執行時按 `Ctrl+C` 會直接停止容器，不只是退出。

### 3.3 背景執行 + Port Mapping

```bash
docker run -d --name web -p 8080:80 nginx:alpine
```

拆解一下這個命令：

- `-d`：背景執行（detach），不佔住你的終端
- `--name web`：把容器命名為 `web`，方便後續操作
- `-p 8080:80`：主機的 8080 port 映射到容器的 80 port。冒號左邊是主機，右邊是容器
- `nginx:alpine`：使用的映像檔

執行後 Docker 會輸出一串容器 ID，然後終端就回來了。

**為什麼選 8080 而不是 80？** 在 Linux/Mac 上，1024 以下的 port 是特權 port，需要 root 權限才能綁定。雖然 Docker 通常以 root 身分運行所以不會報錯，但 8080 是 Web 開發最常用的替代 port，而且不容易跟主機上已有的 Web 伺服器（如果你本機裝了 Apache 或 Nginx）衝突。

### 3.4 驗證

先確認容器在跑：

```bash
docker ps
```

預期輸出：

```
CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS          PORTS                  NAMES
a1b2c3d4e5f6   nginx:alpine   "/docker-entrypoint.…"   10 seconds ago   Up 9 seconds    0.0.0.0:8080->80/tcp   web
```

重點看 PORTS 欄位：`0.0.0.0:8080->80/tcp`，這代表主機所有介面（`0.0.0.0`）的 8080 port 被映射到了容器的 80 port，協定是 TCP。

用 curl 測試：

```bash
curl http://localhost:8080
```

你會看到一大段 HTML 回來，裡面包含 `Welcome to nginx!` 的字樣。如果你打開瀏覽器訪問 `http://localhost:8080`，會看到 Nginx 的預設歡迎頁面——一個白底黑字的頁面，標題寫著 "Welcome to nginx!"。

看到這個頁面，就代表整個鏈路是通的：瀏覽器請求 → 主機 8080 port → Docker 轉發 → 容器 80 port → Nginx 回應。

### 3.5 查看日誌

```bash
docker logs web
```

這會顯示 Nginx 的啟動日誌。如果你剛剛用 curl 或瀏覽器訪問過，還會看到 access log。

持續追蹤日誌：

```bash
docker logs -f web
```

`-f` 是 follow 的意思，類似 `tail -f`。加了這個參數後，終端會一直等著，只要有新的日誌就會即時顯示出來。

現在打開瀏覽器多訪問幾次 `http://localhost:8080`，回到終端看看，你會看到每次訪問都產生一行 access log：

```
172.17.0.1 - - [15/Jan/2024:08:35:22 +0000] "GET / HTTP/1.1" 200 615 "-" "Mozilla/5.0..."
```

這行日誌告訴你：從 `172.17.0.1`（Docker bridge 網路的閘道位址，也就是主機）來了一個 GET 請求，訪問 `/`，回應狀態碼是 200，回傳了 615 bytes。

按 `Ctrl+C` 退出日誌追蹤（不會停止容器，只是退出 `docker logs -f`）。

### 3.6 進入 Nginx 容器看看

在實際工作中，你經常需要進到容器裡面排查問題——看看設定檔對不對、檔案有沒有在正確的位置、權限是否正確等。

```bash
docker exec -it web sh
```

**注意這裡用的是 `sh` 而不是 `/bin/bash`。** 這是一個非常常見的踩坑點。Alpine 映像檔為了極度精簡，沒有安裝 bash，只有最基本的 sh（BusyBox 提供的）。如果你打 `docker exec -it web /bin/bash`，會得到這個錯誤：

```
OCI runtime exec failed: exec failed: unable to start container process:
exec: "/bin/bash": stat /bin/bash: no such file or directory
```

看到 `no such file or directory` 指向 `/bin/bash`，就知道是這個容器沒有 bash。換成 `sh` 就好了。**記住：Alpine 映像檔用 `sh`，Debian/Ubuntu 映像檔用 `bash`。**

進入容器後，查看 Nginx 的目錄結構：

```bash
# 設定檔位置
ls /etc/nginx/
# 你會看到：nginx.conf  conf.d/  mime.types  ...

# 主要設定檔
cat /etc/nginx/nginx.conf

# 預設站點設定
cat /etc/nginx/conf.d/default.conf

# 網頁目錄
ls /usr/share/nginx/html/
# 你會看到：50x.html  index.html
```

這三個路徑要記住，後面會反覆用到：

| 路徑 | 用途 |
|------|------|
| `/etc/nginx/nginx.conf` | Nginx 主設定檔（全域設定） |
| `/etc/nginx/conf.d/default.conf` | 預設站點設定（server block） |
| `/usr/share/nginx/html/` | 預設網頁根目錄 |

你可以直接在容器內修改 `index.html`，但這樣做有兩個問題：第一，每次要改東西都得 `docker exec` 進去，很不方便；第二，容器刪掉重建之後，你改的東西就全部消失了。

所以實際工作中我們不會在容器內部直接改檔案，而是用 Volume 掛載，把主機上的檔案映射進容器。這樣你在主機上用你熟悉的編輯器（VS Code、Vim 等）修改檔案，容器內部就自動同步了。

打 `exit` 離開容器。

---

## 四、Port Mapping 深入（10 分鐘）

### 4.1 格式解析

Port Mapping 的完整格式：

```
-p [主機IP:]主機Port:容器Port[/協定]
```

方括號裡的是可選參數。

**常見寫法**

```bash
-p 8080:80              # 主機 8080 → 容器 80（最常用）
-p 127.0.0.1:8080:80    # 只綁定 localhost
-p 8080:80/tcp          # 指定 TCP（預設就是 TCP，通常省略）
-p 8080:80/udp          # 指定 UDP（DNS、DHCP 等服務才需要）
-p 80:80 -p 443:443     # 多個 port 映射
```

**底層原理**

Docker 的 Port Mapping 底層是透過 Linux 核心的 iptables 實現的。當你用 `-p 8080:80` 啟動容器時，Docker 會自動幫你加一條 iptables 的 DNAT（Destination NAT）規則，大意是：「凡是目標是主機 8080 port 的封包，都把目標地址改成容器的 IP 和 80 port，然後轉發過去。」

你不需要自己去操作 iptables，Docker 全部幫你搞定。但知道這個原理有個好處——當你遇到 Port Mapping 不通的問題時，可以用 `iptables -t nat -L -n` 去檢查規則有沒有正確建立，這在 Linux 伺服器上排查問題很有用。

在 Mac 和 Windows 上，Docker Desktop 的實現方式不完全一樣（因為底層跑了一個 Linux 虛擬機），但概念是相同的。

### 4.2 綁定所有介面 vs 只綁定 localhost

```bash
# 所有介面（預設），外部可存取
docker run -d -p 8080:80 nginx

# 只綁定 localhost，外部無法存取
docker run -d -p 127.0.0.1:8080:80 nginx
```

這兩個寫法的差別在於：不加 IP 的話，Docker 預設綁定 `0.0.0.0`，意思是主機的所有網路介面都會監聽這個 port。如果你的電腦連上了公司網路，同事知道你的 IP 就可以直接訪問你的 `http://你的IP:8080`。

加了 `127.0.0.1` 之後，只有你自己的電腦才能訪問 `http://localhost:8080`，外部完全連不進來。

**什麼時候需要限制？** 在開發環境中無所謂，但在伺服器上，如果你跑了一個內部用的管理後台（比如資料庫管理工具、監控面板），不想讓外網直接訪問，就應該加 `127.0.0.1`，然後透過 SSH Tunnel 或 VPN 來連接。

> **理解 Port 暴露的完整鏈路**
>
> 以雲端伺服器為例，完整的訪問鏈路是：
> 1. 外網請求 → 雲端安全組（需開放對應 port）
> 2. → Linux 防火牆（需開放對應 port）
> 3. → Docker `-p` 映射（宿主機 port → 容器 port）
> 4. → 容器內的應用（如 Nginx 監聽 80）
>
> 每一層都必須打通，少了任何一層都無法從外部訪問。這是初學者最容易忽略的——只做了 Docker 的 Port Mapping，但忘了開雲端安全組或防火牆，然後怎麼都連不上，卡很久。

### 4.3 使用隨機 Port

```bash
docker run -d -P nginx:alpine
```

大寫 `-P`（注意和小寫 `-p` 的差別）會把映像檔裡 `EXPOSE` 指令宣告的所有 port，自動映射到主機上的隨機高位 port（通常是 32768 以上）。

**`-p` 和 `-P` 的差異**

| 參數 | 說明 | 使用場景 |
|------|------|----------|
| `-p 8080:80`（小寫） | 手動指定主機 port 和容器 port 的對應 | 生產環境、需要固定 port 的場合 |
| `-P`（大寫） | 自動隨機分配主機 port | 快速測試、不在乎用哪個 port 的場合 |

`-P` 的好處是你不用擔心 port 衝突，Docker 會自動選一個沒被佔用的 port。壞處是你不知道 port 是多少，要另外查。

查看對應關係：

```bash
docker port <容器名稱或ID>
```

輸出範例：

```
80/tcp -> 0.0.0.0:49153
```

這表示容器的 80 port 被映射到了主機的 49153。你就可以用 `http://localhost:49153` 來訪問了。

### 4.4 查看 Port 使用

```bash
# 查看特定容器的 port 映射
docker port web

# 用 docker ps 的格式化輸出，一次看所有容器的 port
docker ps --format "{{.Names}}: {{.Ports}}"
```

預期輸出範例：

```
web: 0.0.0.0:8080->80/tcp
```

**常見錯誤：Port 已被佔用**

如果你嘗試啟動容器時，指定的主機 port 已經被其他程式或容器佔用，Docker 會報這個錯：

```
docker: Error response from daemon: driver failed programming external connectivity
on endpoint web2: Bind for 0.0.0.0:8080 failed: port is already allocated.
```

看到 `port is already allocated` 就知道是 port 衝突了。解決方法：

1. 換一個沒被佔用的 port，比如 `-p 8081:80`
2. 或者找出誰佔了這個 port，把它停掉：
   ```bash
   # Mac/Linux 查看 port 佔用
   lsof -i :8080

   # 如果是另一個 Docker 容器佔的
   docker ps --format "{{.Names}}: {{.Ports}}" | grep 8080
   ```

---

## 五、自訂網頁內容（15 分鐘）

### 5.1 Nginx 預設網頁目錄

Nginx 官方映像檔的網頁根目錄在：

```
/usr/share/nginx/html/
```

裡面有兩個檔案：
- `index.html`：預設歡迎頁面，就是你瀏覽器看到的 "Welcome to nginx!" 那個頁面
- `50x.html`：當 Nginx 發生 500 系列錯誤時顯示的錯誤頁面

實際工作中，你當然不會用預設歡迎頁，而是要放上你自己的網頁內容。接下來介紹兩種方式。

### 5.2 方法一：docker cp 複製檔案

`docker cp` 可以在主機和容器之間複製檔案，前面的課程已經學過。

先在主機上建立一個簡單的 HTML 檔案：

```bash
echo '<h1>Hello Docker!</h1>' > index.html
```

把它複製到容器裡，覆蓋預設的 index.html：

```bash
docker cp index.html web:/usr/share/nginx/html/index.html
```

現在用 curl 驗證：

```bash
curl http://localhost:8080
```

預期輸出：

```html
<h1>Hello Docker!</h1>
```

或者在瀏覽器刷新 `http://localhost:8080`，會看到頁面從 Nginx 歡迎頁變成了大字 "Hello Docker!"。

`docker cp` 的問題是：它是一次性的操作。你每改一個檔案就要複製一次，而且容器刪掉重建後，複製進去的檔案就沒了。如果你只是臨時改一個東西、快速測試，`docker cp` 很方便。但如果你要長期維護一個網站，就需要用 Volume 掛載。

### 5.3 方法二：Volume 掛載（推薦）

**為什麼需要 Volume？**

容器的檔案系統是隔離的，而且是臨時性的——容器一刪，裡面所有的資料就消失了。在實際工作中，你的網頁內容、設定檔這些東西肯定不能跟著容器一起消失。用 `-v`（volume）參數可以把主機的目錄掛載進容器，讓主機和容器共用同一份檔案。

這裡用的是「指定路徑掛載」（bind mount），原理很直觀：你告訴 Docker「把主機的 A 目錄映射到容器的 B 目錄」，之後在主機的 A 目錄裡做任何修改，容器裡的 B 目錄會即時看到變化，反之亦然。它不是檔案複製，而是直接映射——主機和容器看的是同一個目錄、同一份檔案。

> Volume 的完整概念（匿名掛載、具名掛載、數據卷容器等）會在後面的課程深入講解。這堂課只用最基本的「指定路徑掛載」，也就是 `-v 主機路徑:容器路徑` 這種形式。

先準備一個目錄和檔案：

```bash
mkdir -p ~/docker-demo/html
echo '<h1>Hello from Volume!</h1>' > ~/docker-demo/html/index.html
```

刪除舊容器，用 Volume 掛載啟動新容器：

```bash
# 先刪除舊容器
docker rm -f web

# 用 volume 掛載
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/html:/usr/share/nginx/html:ro \
  nginx:alpine
```

這個命令的 `-v` 參數拆解：

- `~/docker-demo/html`：主機上的目錄（冒號左邊）
- `/usr/share/nginx/html`：容器內的目錄（冒號右邊）
- `:ro`：read-only，唯讀模式

**`:ro` 的安全意義**

加了 `:ro` 之後，容器內的程式只能讀取這個目錄，不能寫入或修改。為什麼要這樣做？因為 Nginx 只需要「讀」網頁檔案，不需要「寫」。加上 `:ro` 可以防止容器內的程式（不管是 Nginx 本身還是可能的入侵者）意外修改或刪除你的原始檔案。

這是一個很好的安全實踐：**只給容器它需要的最小權限。** 如果容器只需要讀，就給唯讀權限；如果容器需要寫（比如 log 目錄、上傳目錄），才給讀寫權限。

如果你不加 `:ro`，預設是 `:rw`（read-write），容器可以讀也可以寫。

驗證：

```bash
curl http://localhost:8080
```

預期輸出：

```html
<h1>Hello from Volume!</h1>
```

**修改主機上的檔案，容器即時生效**

```bash
echo '<h1>Updated!</h1>' > ~/docker-demo/html/index.html
```

刷新瀏覽器或再次 curl，立刻看到變化：

```bash
curl http://localhost:8080
```

預期輸出：

```html
<h1>Updated!</h1>
```

不需要重啟容器，不需要 `docker cp`，不需要任何額外操作。你在主機上改了檔案，容器內即時就是新的內容。這就是 bind mount 的好處——因為根本就是同一份檔案。

**踩坑提醒：掛載路徑寫錯導致空目錄**

如果你把主機路徑寫錯了，指向了一個不存在的目錄，Docker 不會報錯，而是會自動建立一個**空目錄**掛載進去。結果就是容器內的原始檔案（比如 Nginx 的預設 index.html）全部被「覆蓋」成空的，你訪問網站會看到 403 Forbidden 錯誤。

比如你不小心把路徑打錯：

```bash
# 注意：html 打成了 htm，這個目錄不存在
docker run -d --name wrong -p 8081:80 \
  -v ~/docker-demo/htm:/usr/share/nginx/html:ro \
  nginx:alpine
```

訪問 `http://localhost:8081` 會得到 `403 Forbidden`，因為掛進去的是一個空目錄，Nginx 找不到 index.html。

遇到這種情況，先檢查主機上的目錄路徑是否正確、目錄裡面有沒有檔案。

**用 docker inspect 驗證掛載**

如果你不確定掛載是否正確，可以用 `docker inspect` 查看：

```bash
docker inspect web --format '{{json .Mounts}}' | python3 -m json.tool
```

輸出會包含：

```json
[
    {
        "Type": "bind",
        "Source": "/Users/你的名字/docker-demo/html",
        "Destination": "/usr/share/nginx/html",
        "Mode": "ro",
        "RW": false,
        "Propagation": "rprivate"
    }
]
```

重點看：
- `Source`：主機上的實際路徑（`~` 會被展開成完整路徑）
- `Destination`：容器內的路徑
- `RW`：是否可讀寫。加了 `:ro` 所以這裡是 `false`

### 5.4 建立完整的靜態網站

剛剛只是一行 HTML 比較簡陋。來做一個像樣一點的靜態網站：

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

重新建立容器，掛載新的目錄：

```bash
docker rm -f web
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/website:/usr/share/nginx/html:ro \
  nginx:alpine
```

用 curl 驗證：

```bash
curl http://localhost:8080
```

你會看到完整的 HTML 回來。在瀏覽器訪問 `http://localhost:8080`，會看到一個有標題、段落、列表的簡單網頁。

這就是用 Docker 部署靜態網站的標準做法：把網頁檔案放在主機上的某個目錄，用 `-v` 掛載進 Nginx 容器的網頁根目錄。要更新網站內容？直接改主機上的檔案就好，甚至可以用 Git 管理，搭配 CI/CD 自動部署。

---

## 六、修改 Nginx 設定（10 分鐘）

### 6.1 查看預設設定

除了網頁內容，Nginx 的行為是由設定檔控制的。先看看預設的設定長什麼樣：

```bash
docker exec web cat /etc/nginx/conf.d/default.conf
```

預期輸出：

```nginx
server {
    listen       80;
    listen  [::]:80;
    server_name  localhost;

    #access_log  /var/log/nginx/host.access.log  main;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    #error_page  404              /404.html;

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

這就是一個最基本的 Nginx server block：監聽 80 port，網頁根目錄在 `/usr/share/nginx/html`，預設首頁是 `index.html`。

也可以看主設定檔：

```bash
docker exec web cat /etc/nginx/nginx.conf
```

主設定檔定義了全域的設定（worker 數量、log 格式等），然後用 `include /etc/nginx/conf.d/*.conf;` 把 `conf.d/` 目錄下所有 `.conf` 檔案都載入進來。所以你只要把站點設定放在 `conf.d/` 目錄下就好，不需要動主設定檔。

### 6.2 提取設定檔

在修改設定檔之前，先把容器裡的預設設定檔複製出來當範本：

```bash
mkdir -p ~/docker-demo/nginx
docker cp web:/etc/nginx/conf.d/default.conf ~/docker-demo/nginx/
```

為什麼要先複製出來而不是從零開始寫？因為預設設定已經是可以運行的，在它的基礎上修改比較不容易出錯。而且有些設定的語法細節你可能記不清，有個範本參考比較方便。

### 6.3 修改設定

用你喜歡的編輯器打開 `~/docker-demo/nginx/default.conf`，改成以下內容：

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

這裡新增了一個 `/api` 的 location block：當有人訪問 `/api` 路徑時，Nginx 直接回傳一個 JSON 格式的回應，狀態碼 200。這在實際工作中很常見——用 Nginx 做簡單的健康檢查端點（health check endpoint），讓負載均衡器知道這個服務還活著。

### 6.4 套用新設定

重新建立容器，同時掛載網頁目錄和設定檔：

```bash
docker rm -f web
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/website:/usr/share/nginx/html:ro \
  -v ~/docker-demo/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
```

注意這裡有兩個 `-v`：一個掛載網頁內容，一個掛載設定檔。第二個 `-v` 掛載的是單一檔案而不是整個目錄——主機上的 `default.conf` 直接映射到容器裡的 `/etc/nginx/conf.d/default.conf`。

兩個都加了 `:ro`。網頁內容和設定檔都不需要讓容器寫入，只讀就好。

驗證：

```bash
# 原本的首頁
curl http://localhost:8080

# 新增的 /api 端點
curl http://localhost:8080/api
```

`/api` 的預期輸出：

```json
{"status": "ok", "message": "Hello from Docker Nginx!"}
```

如果你看到這個 JSON 回應，就代表自訂設定已經生效了。

### 6.5 熱重載設定（不重啟容器）

剛剛的做法是刪掉容器再重建。但在某些場景下，你不想停掉容器（比如生產環境中正在服務使用者），只想讓 Nginx 重新載入設定檔。Nginx 支援熱重載（hot reload）。

**先用 nginx -t 測試設定檔語法**

在重載之前，一定要先測試設定檔有沒有語法錯誤：

```bash
docker exec web nginx -t
```

如果設定正確，會看到：

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

如果設定有語法錯誤，比如你忘了結尾的分號，會看到類似這樣的錯誤：

```
nginx: [emerg] unexpected "}" in /etc/nginx/conf.d/default.conf:15
nginx: configuration file /etc/nginx/nginx.conf test failed
```

錯誤訊息會告訴你是哪個檔案的第幾行出問題。根據提示去修正就好。

**確認沒問題後，執行重載：**

```bash
docker exec web nginx -s reload
```

`-s reload` 的意思是向 Nginx 主進程發送一個信號（signal），告訴它重新讀取設定檔。

**nginx -s reload 的原理**

Nginx 的架構是一個主進程（master process）管理多個工作進程（worker process）。當你執行 `nginx -s reload` 時，發生的事情是：

1. 主進程收到 reload 信號
2. 主進程檢查新的設定檔語法是否正確
3. 如果正確，主進程啟動新的 worker process（使用新設定）
4. 舊的 worker process 處理完當前正在進行的請求後，優雅地退出
5. 整個過程中，服務不中斷，沒有任何請求會被丟棄

這就是為什麼叫「熱重載」——服務一直在線，使用者完全感覺不到。如果新設定有語法錯誤，reload 會失敗，但舊設定繼續生效，不會影響現有服務。這個設計非常安全。

**養成習慣：先 `nginx -t` 測試，再 `nginx -s reload` 重載。** 不要直接 reload，萬一設定檔有語法錯誤，雖然 Nginx 不會掛掉，但你會在日誌裡看到錯誤訊息，debug 時容易混淆。

---

## 七、運行多個 Nginx 容器（5 分鐘）

### 7.1 同時運行多個

在實際工作中，一台伺服器上跑多個網站是非常常見的需求。傳統做法是在一個 Nginx 裡面設定多個 virtual host；用 Docker 的話，可以直接跑多個 Nginx 容器，每個容器服務一個網站，彼此完全隔離。

先準備兩個網站的內容：

```bash
mkdir -p ~/docker-demo/site-a ~/docker-demo/site-b
echo '<h1>Site A</h1>' > ~/docker-demo/site-a/index.html
echo '<h1>Site B</h1>' > ~/docker-demo/site-b/index.html
```

分別啟動兩個容器，映射到不同的主機 port：

```bash
# 網站 A - 主機 8081 port
docker run -d --name site-a -p 8081:80 \
  -v ~/docker-demo/site-a:/usr/share/nginx/html:ro \
  nginx:alpine

# 網站 B - 主機 8082 port
docker run -d --name site-b -p 8082:80 \
  -v ~/docker-demo/site-b:/usr/share/nginx/html:ro \
  nginx:alpine
```

兩個容器都是在容器內部監聽 80 port，但映射到主機的不同 port（8081 和 8082）。容器之間是完全隔離的，各自有自己的檔案系統、網路空間。

驗證：

```bash
curl http://localhost:8081
curl http://localhost:8082
```

預期輸出：

```html
<h1>Site A</h1>
```

```html
<h1>Site B</h1>
```

兩個不同的網站，跑在同一台機器上，各自獨立。如果 Site A 的容器出了問題需要重啟，完全不影響 Site B。這就是容器化的好處之一——隔離性。

### 7.2 查看所有 Nginx 容器

```bash
docker ps -f ancestor=nginx:alpine
```

`-f ancestor=nginx:alpine` 會過濾出所有使用 `nginx:alpine` 映像檔建立的容器。

預期輸出：

```
CONTAINER ID   IMAGE          ...   PORTS                  NAMES
a1b2c3d4e5f6   nginx:alpine   ...   0.0.0.0:8080->80/tcp   web
b2c3d4e5f6a7   nginx:alpine   ...   0.0.0.0:8081->80/tcp   site-a
c3d4e5f6a7b8   nginx:alpine   ...   0.0.0.0:8082->80/tcp   site-b
```

三個 Nginx 容器，分別對應 8080、8081、8082 三個 port。

用格式化輸出看得更清楚：

```bash
docker ps -f ancestor=nginx:alpine --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
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

你也可以搭配前面學過的批次操作技巧。比如停止所有 Nginx 容器：

```bash
docker stop $(docker ps -q -f ancestor=nginx:alpine)
```

`docker ps -q -f ancestor=nginx:alpine` 會列出所有 Nginx 容器的 ID，然後傳給 `docker stop` 批次停止。

---

## 八、練習題（3 分鐘）

**題目**

1. 啟動一個 Nginx 容器
   - 名稱：my-web
   - Port：本機 80 → 容器 80
   - 掛載本機目錄到 /usr/share/nginx/html，唯讀模式
2. 在掛載的目錄中建立一個 about.html
3. 瀏覽器訪問 http://localhost/about.html，確認可以看到內容
4. 修改 about.html 的內容，刷新瀏覽器確認即時生效

提示：先建立目錄和檔案，再啟動容器。如果 80 port 被佔用了，換成其他 port（比如 8888）。

**參考答案**

```bash
# 準備目錄和檔案
mkdir -p ~/my-web
echo '<h1>Home</h1><a href="about.html">About</a>' > ~/my-web/index.html
echo '<h1>About Page</h1><p>This is my Docker website.</p>' > ~/my-web/about.html

# 啟動容器
docker run -d --name my-web \
  -p 80:80 \
  -v ~/my-web:/usr/share/nginx/html:ro \
  nginx:alpine

# 驗證
curl http://localhost/
curl http://localhost/about.html

# 修改內容（不需重啟容器）
echo '<h1>About Page - Updated!</h1>' > ~/my-web/about.html
curl http://localhost/about.html
```

如果 80 port 被佔用報錯，改成：

```bash
docker run -d --name my-web \
  -p 8888:80 \
  -v ~/my-web:/usr/share/nginx/html:ro \
  nginx:alpine

curl http://localhost:8888/
curl http://localhost:8888/about.html
```

練習完記得清理：

```bash
docker rm -f my-web
```

---

## 九、本堂課小結（2 分鐘）

這堂課用 Nginx 把前面學的 Docker 指令串成了一個完整的實戰流程。

**核心技能整理**

| 技能 | 指令 / 方法 | 使用場景 |
|-----|------------|----------|
| Port Mapping | `-p 主機Port:容器Port` | 讓外部能訪問容器內的服務 |
| 指定路徑掛載 | `-v 主機路徑:容器路徑` | 讓主機和容器共用檔案 |
| 唯讀掛載 | `-v 路徑:路徑:ro` | 防止容器修改主機檔案 |
| 查看日誌 | `docker logs -f` | 即時監控容器輸出 |
| 進入容器 | `docker exec -it ... sh` | 排查容器內部問題 |
| 複製檔案 | `docker cp` | 臨時拷貝單個檔案進出容器 |
| 熱重載 | `docker exec web nginx -s reload` | 不停機更新 Nginx 設定 |
| 設定檔測試 | `docker exec web nginx -t` | 重載前先檢查語法 |

**關鍵踩坑點回顧**

- Alpine 映像檔沒有 bash，要用 `sh`
- Port 被佔用時會報 `port is already allocated`，換個 port 就好
- 掛載路徑寫錯不會報錯，但會導致空目錄覆蓋容器原有檔案
- 修改 Nginx 設定後，先 `nginx -t` 測試語法，再 `nginx -s reload` 重載
- `-p` 小寫是手動指定 port，`-P` 大寫是隨機分配

**實際工作中的應用模式**

- **掛載網頁目錄**：主機修改立即生效，不需重啟容器。搭配 Git 管理網頁檔案，推送後自動部署
- **掛載設定檔**：自訂 Nginx 行為，`:ro` 防止容器內修改。設定變更只需 reload，不需重建容器
- **多容器運行在不同 port**：一台機器跑多個網站，彼此隔離互不影響

**關於數據卷（Volume）**

這堂課用的 `-v 主機路徑:容器路徑` 是最直覺的掛載方式，叫做「指定路徑掛載」（bind mount）。但 Docker 的數據卷技術其實還有更多玩法——匿名掛載、具名掛載、數據卷容器（容器間共享資料）、以及像 MySQL 這類資料庫的持久化策略。這些會在後面的 Volume 專題課程詳細講解。現在只要記住：**容器內的資料是臨時的，重要資料一定要用 `-v` 掛載出來。**

下一堂課：實作練習與 Day 2 總結。

---

## 板書 / PPT 建議

1. Nginx 容器目錄結構（/usr/share/nginx/html, /etc/nginx）
2. Port Mapping 示意圖（外網 → 安全組 → 防火牆 → Docker -p → 容器）
3. Port Mapping 底層原理（iptables DNAT 規則轉發）
4. Volume bind mount 示意圖（主機目錄 ↔ 容器目錄，同一份檔案）
5. nginx -s reload 流程圖（master process → 新 worker → 舊 worker 優雅退出）
6. 完整的 docker run 命令解析（-d, --name, -p, -v 各參數）
