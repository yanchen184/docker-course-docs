# Day 2 第七小時：實作練習與 Day 2 總結

---

## 一、前情提要（2 分鐘）

今天學了很多：
- 容器概念與 Docker 架構
- Docker 安裝
- 基本指令
- Nginx 實戰

這堂課：
- 綜合練習
- 常見問題排除
- Day 2 總複習
- 預告 Day 3

---

## 二、綜合練習題（30 分鐘）

### 練習一：基礎操作（5 分鐘）

**題目**

1. 拉取 `httpd:alpine` 映像檔（Apache Web Server）
2. 查看本機所有映像檔
3. 啟動一個容器，名稱 `apache`，port 9090:80
4. 用瀏覽器或 curl 驗證
5. 查看容器日誌
6. 停止並刪除容器

**參考答案**

```bash
docker pull httpd:alpine
docker images
docker run -d --name apache -p 9090:80 httpd:alpine
curl http://localhost:9090
docker logs apache
docker stop apache && docker rm apache
```

---

### 練習二：進入容器操作（5 分鐘）

**題目**

1. 啟動一個 Ubuntu 容器，互動模式
2. 在容器內執行以下操作：
   - 更新套件列表：`apt update`
   - 安裝 curl：`apt install -y curl`
   - 用 curl 存取 google.com
3. 離開容器
4. 刪除容器

**參考答案**

```bash
docker run -it --name my-ubuntu ubuntu bash
# 在容器內
apt update
apt install -y curl
curl -I https://www.google.com
exit
# 回到主機
docker rm my-ubuntu
```

---

### 練習三：Volume 掛載（10 分鐘）

**題目**

建立一個多頁靜態網站：

1. 在主機建立目錄結構：
   ```
   ~/practice-site/
   ├── index.html
   ├── about.html
   └── contact.html
   ```

2. 每個頁面包含導航連結到其他頁面

3. 啟動 Nginx 容器，掛載這個目錄

4. 瀏覽器測試所有頁面

**參考答案**

```bash
mkdir -p ~/practice-site

cat > ~/practice-site/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Home</title></head>
<body>
    <nav>
        <a href="index.html">Home</a> |
        <a href="about.html">About</a> |
        <a href="contact.html">Contact</a>
    </nav>
    <h1>Welcome to Home Page</h1>
</body>
</html>
EOF

cat > ~/practice-site/about.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>About</title></head>
<body>
    <nav>
        <a href="index.html">Home</a> |
        <a href="about.html">About</a> |
        <a href="contact.html">Contact</a>
    </nav>
    <h1>About Us</h1>
    <p>This is a Docker practice site.</p>
</body>
</html>
EOF

cat > ~/practice-site/contact.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Contact</title></head>
<body>
    <nav>
        <a href="index.html">Home</a> |
        <a href="about.html">About</a> |
        <a href="contact.html">Contact</a>
    </nav>
    <h1>Contact Us</h1>
    <p>Email: test@example.com</p>
</body>
</html>
EOF

docker run -d --name practice-web \
  -p 8888:80 \
  -v ~/practice-site:/usr/share/nginx/html:ro \
  nginx:alpine

# 測試
curl http://localhost:8888/
curl http://localhost:8888/about.html
curl http://localhost:8888/contact.html
```

---

### 練習四：多容器管理（10 分鐘）

**題目**

同時運行三個不同的 Web 伺服器：

| 名稱 | 映像檔 | 主機 Port |
|------|--------|----------|
| web-nginx | nginx:alpine | 8001 |
| web-apache | httpd:alpine | 8002 |
| web-python | python:alpine（用內建 http server）| 8003 |

Python 的啟動命令：
```bash
python -m http.server 80
```

驗證三個都能訪問後，全部停止並刪除。

**參考答案**

```bash
# 建立三個 Web 伺服器
docker run -d --name web-nginx -p 8001:80 nginx:alpine
docker run -d --name web-apache -p 8002:80 httpd:alpine

# Python 需要建立一個簡單的頁面
mkdir -p ~/python-web
echo '<h1>Python HTTP Server</h1>' > ~/python-web/index.html

docker run -d --name web-python -p 8003:80 \
  -v ~/python-web:/app \
  -w /app \
  python:alpine \
  python -m http.server 80

# 驗證
curl http://localhost:8001
curl http://localhost:8002
curl http://localhost:8003

# 查看所有
docker ps

# 停止並刪除
docker stop web-nginx web-apache web-python
docker rm web-nginx web-apache web-python
```

---

## 三、常見問題排除（10 分鐘）

### 3.1 容器無法啟動

**症狀**：docker run 後容器立刻退出

**排查步驟**

```bash
# 查看退出狀態
docker ps -a

# 查看日誌
docker logs <container>

# 常見原因
# Exit Code 0：正常結束（可能是命令執行完畢）
# Exit Code 1：一般錯誤
# Exit Code 137：被 kill（OOM 或手動）
# Exit Code 139：Segmentation fault
```

**常見原因**

1. 命令執行完就結束了
   - 解法：用 `-it` 互動模式，或加 `tail -f /dev/null` 保持運行

2. 設定錯誤
   - 查看日誌找錯誤訊息

3. 記憶體不足
   - 增加 Docker 可用記憶體

### 3.2 Port 被佔用

**症狀**：Error: Bind for 0.0.0.0:8080 failed: port is already allocated

**解法**

```bash
# 查看是什麼佔用了 port
lsof -i :8080
# 或
netstat -tulpn | grep 8080

# 停止那個程序，或換一個 port
docker run -d -p 8081:80 nginx
```

### 3.3 映像檔拉取失敗

**症狀**：Error response from daemon: pull access denied

**可能原因**

1. 映像檔名稱打錯
2. 私有映像檔，需要登入
3. 網路問題

**解法**

```bash
# 確認名稱正確
docker search nginx

# 登入
docker login

# 使用映像加速
# 編輯 /etc/docker/daemon.json
```

### 3.4 磁碟空間不足

**症狀**：no space left on device

**解法**

```bash
# 查看 Docker 磁碟使用
docker system df

# 清理
docker system prune -a

# 如果還不夠，查看大的映像檔
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -hr | head -20
```

### 3.5 容器內無法連網

**排查步驟**

```bash
# 進入容器
docker exec -it <container> sh

# 測試 DNS
ping google.com
nslookup google.com

# 測試 IP 連線
ping 8.8.8.8
```

**常見原因**

1. Docker 網路問題：重啟 Docker
2. 防火牆擋住：檢查 iptables
3. DNS 問題：在 daemon.json 設定 DNS

### 3.6 Permission Denied

**症狀**：掛載的 Volume 內檔案無法存取

**原因**：容器內的使用者 UID 和主機不同

**解法**

```bash
# 方法一：調整主機目錄權限
chmod -R 777 ~/my-data

# 方法二：指定容器使用者
docker run -u $(id -u):$(id -g) ...

# 方法三：了解映像檔內的使用者
docker exec <container> id
```

---

## 四、Day 2 總複習（12 分鐘）

### 4.1 容器基本概念

| 概念 | 說明 |
|-----|------|
| 容器 | 輕量虛擬化，共用主機核心 |
| Image | 唯讀模板，包含應用程式和環境 |
| Container | Image 的執行實例 |
| Registry | 存放 Image 的倉庫 |

### 4.2 Docker 架構

```
Docker Client
     ↓ (REST API)
Docker Daemon (dockerd)
     ↓
containerd → runc
     ↓
Container
```

### 4.3 核心指令總覽

**映像檔操作**

| 指令 | 功能 |
|-----|------|
| docker pull | 拉取映像檔 |
| docker images | 列出映像檔 |
| docker rmi | 刪除映像檔 |
| docker image prune | 清理未使用的映像檔 |

**容器操作**

| 指令 | 功能 |
|-----|------|
| docker run | 建立並執行容器 |
| docker ps | 列出容器 |
| docker stop/start | 停止/啟動 |
| docker rm | 刪除容器 |
| docker logs | 查看日誌 |
| docker exec | 進入容器 |
| docker cp | 複製檔案 |

**docker run 重要參數**

| 參數 | 功能 | 範例 |
|-----|------|------|
| -d | 背景執行 | docker run -d nginx |
| -it | 互動模式 | docker run -it ubuntu bash |
| --name | 指定名稱 | --name my-app |
| -p | Port Mapping | -p 8080:80 |
| -v | Volume 掛載 | -v ~/data:/app/data |
| -e | 環境變數 | -e DB_HOST=localhost |
| --rm | 自動刪除 | docker run --rm nginx |

### 4.4 重要路徑

| 路徑 | 說明 |
|-----|------|
| /var/run/docker.sock | Docker socket |
| /var/lib/docker | Docker 資料目錄 |
| /etc/docker/daemon.json | Daemon 設定檔 |
| ~/.docker/config.json | Client 設定（登入資訊） |

### 4.5 今日重點

1. **環境一致性**：容器打包應用程式和環境，解決「在我電腦上可以跑」

2. **輕量高效**：比 VM 更快、更小、更省資源

3. **基本工作流程**：
   - pull 映像檔
   - run 容器
   - 用 logs、exec 除錯
   - stop、rm 清理

4. **Port Mapping**：`-p 主機:容器` 讓外部可以存取容器服務

5. **Volume 掛載**：`-v 主機:容器` 讓容器可以存取主機檔案

---

## 五、預告 Day 3（3 分鐘）

下週我們繼續深入：

**上午（3 小時）**
- 映像檔的分層結構
- 容器完整生命週期
- 容器網路

**下午（4 小時）**
- Port Mapping 進階
- Volume 深入
- **Dockerfile**：自己建立映像檔

學完 Dockerfile，你就能把自己的應用程式容器化了。

有問題嗎？下週見！

---

## 六、本堂課小結（3 分鐘）

這堂課做了：

1. **四道練習題**
   - 基礎操作
   - 進入容器
   - Volume 掛載
   - 多容器管理

2. **常見問題排除**
   - 容器無法啟動 → 看 logs
   - Port 被佔用 → 換 port 或找出佔用者
   - 拉取失敗 → 檢查名稱、登入、網路
   - 磁碟滿 → docker system prune

3. **Day 2 總複習**
   - 核心概念
   - 重要指令
   - 常用參數

---

## 課後作業（自選）

1. 在自己的電腦安裝 Docker
2. 用 Docker 啟動一個 MySQL 容器（提示：需要設定 MYSQL_ROOT_PASSWORD）
3. 用另一個容器連線到 MySQL（提示：需要了解容器網路，下週會教）

```bash
# MySQL 啟動範例
docker run -d \
  --name my-mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -p 3306:3306 \
  mysql:8.0
```

---

## 板書 / PPT 建議

1. 指令速查表
2. 常見錯誤對照表
3. Docker 工作流程圖
4. Day 2 知識點心智圖

---

## 📺 補充教材：狂神說 Docker

> 以下內容來自【狂神說Java】Docker 教程系列，作為本節的補充參考資料。

### P34：Docker0 網路詳解

<sub>[00:00-02:03]</sub>
OK，那我們來休息了一會兒繼續講，我們來把這個 Docker 網路今天給他錄完。錄完了之後的話，剩下的話這就是企業真正實戰用的了，比如說容器編排、集群部署、流水線。你要理解了 Docker 網路，才能去學下面的所有東西，否則你根本看不懂這裡面是怎麼跑的。

<sub>[02:03-04:07]</sub>
首先我們第一個理解，就是理解我們的網路。大家肯定都學過一個科目叫做計算機網路原理，我們這個地方的理解網路，主要是理解 Docker 的網路。而 Docker 裡面的網路核心就有一個 Docker0，所以我們來理解 Docker0。首先我們把所有東西先清空一下，`docker rm -f $(docker ps -aq)`，把所有的容器先全部移了，然後我們再把鏡像也都移除，就是我們什麼都不要了，乾乾淨淨的來學網路。

<sub>[04:07-06:01]</sub>
在 Linux 裡面獲取當前 IP 地址的命令叫 `ip addr`，大家可以看到我們當前有三個網卡。第一個 `lo` 是我們本機迴環地址；`eth0` 就是我們的阿里雲內網地址；Docker0 就是 Docker 幫我們生成的一個網卡，就是一個路由器。OK 那現在的話，我們通過 `ip addr` 看到了這三個網卡，分別代表了三種不同的環境。

<sub>[06:01-08:09]</sub>
那我們就要思考一個問題，Docker 是如何處理容器的網路訪問的？比如說我現在有一個 Tomcat，那這 Tomcat 裡面跑了一個 Web 項目，它要去訪問 MySQL，那這個怎麼連接呢？應該寫 127.0.0.1 嗎？還是寫阿里雲內網地址？或者是寫 Docker 的地址？那我們研究 Docker 網路就是來研究這一塊的內容。

我們來做一個測試，啟動一個 Tomcat 容器。查看容器的內部網路地址，在後面加一個 `ip addr` 就可以了：

```bash
docker exec -it tomcat01 ip addr
```

<sub>[08:09-11:00]</sub>
你會發現容器啟動的時候會得到一個 eth0 這種 IP 地址，這個就是 Docker 給它分配的。每一個容器都會有這麼一個地址。那我們來測試一下，Linux 服務器能不能 ping 通容器內部？我告訴你，肯定可以。我是一個服務器，我自己生產的東西，難道我 ping 不通嗎？所以結論就是，Linux 可以 ping 通 Docker 容器內部。

<sub>[11:00-13:00]</sub>
那現在我們知道 Docker 會給容器分配一個網卡，這個網卡非常有意思。Docker0 是 172.18.0.1，這個 0.1 什麼意思？你們經常在家裡訪問 WiFi，比如說 192.168.0.1，這個就是你們路由器的地址。每啟動一個 Docker 容器，Docker 就會給容器分配一個 IP，而且只要安裝了 Docker 就會有一個網卡叫 Docker0，它是橋接模式，使用的技術是 veth-pair 技術。

<sub>[13:00-16:00]</sub>
什麼是 veth-pair 呢？我們發現這些容器帶來的網卡都是一對一對的。veth-pair 是 Linux 下的虛擬設備接口，它們都是成對出現的。一端連著協議，一端彼此相連，這樣就可以通信。只要通過 veth-pair 連接的就可以進行通信了。Docker 容器之間的連接都是使用的 veth-pair 技術，這網卡都是成對出現的。

<sub>[16:00-20:00]</sub>
我們啟動了兩個項目，如果它能互相 ping 通就是最好的。現在 Tomcat01 和 Tomcat02 是共用的一個路由器，也就是 Docker0。所有的容器不指定網路的情況下都是 Docker0 路由的，Docker 會給容器分配一個默認的可用 IP。

網卡序號是一對一對往上加的，261-262，然後 263-264。比如說 Tomcat01 要去請求 Tomcat02，它並不是直連的，它要通過 veth-pair 技術發送到 Docker0，Docker0 就是個路由器，所有請求都要經過路由器來轉發。

<sub>[20:00-24:00]</sub>
結論就是：Docker 使用的是 Linux 的橋接，所有東西是一個橋接過來的網卡。容器內和 Docker0 各自創建了一個虛拟網卡，通過 veth-pair 來進行連接。Docker 中的所有網路接口都是虛擬的，虛擬的轉發效率高。

那子網掩碼 /16 代表什麼呢？代表後面有兩位可以變化，能存放的 IP 大約是 255×255 ≈ 65535 個。如果是 /24，代表只有最後面的 255 個在這個網路範圍內。

<sub>[24:00-30:15]</sub>
容器刪除的時候，對應的網橋（也就是 veth-pair 這一對）就沒了。這就是 Docker 的核心網路機制。

那思考一個場景：我們編寫了一個微服務，要去連接 database URL，每一次啟動 MySQL 用 Docker 去啟動，它就會分配一個新的 IP，這個 IP 就會變。那能不能通過名字來訪問服務？如果能做到這一點，我們就能實現高可用了。Docker 裡面給我們提供了一個 `--link` 的方式來解決，接下來我們就來看看。

---

### P35：容器互聯 --link

<sub>[00:00-02:04]</sub>
剛才提出了一個設想，我們現在就來解決。Docker 提供了一個 `--link` 來幫我們解決容器之間不用通過 IP 地址直接互通的問題。我們啟動一個 Tomcat01，再啟動一個 Tomcat02，然後嘗試通過服務名去 ping。

```bash
docker exec -it tomcat02 ping tomcat01
```

你會發現 ping 不通！但是我們可以解決這個問題。

<sub>[02:04-03:06]</sub>
我們再啟動一個 Tomcat03，在啟動的時候加上 `--link` 參數，把 03 跟 02 連接起來：

```bash
docker run -d -P --name tomcat03 --link tomcat02 tomcat
```

現在我們用 Tomcat03 來 ping 02，回車，是不是 ping 通了！完全沒有任何問題。通過 `--link` 就可以解決這個問題，我們就可以通過服務名來 ping，以後傳東西可以寫服務名了，不用寫 IP 了。

<sub>[03:06-05:00]</sub>
但是反向能 ping 通嗎？我用 02 ping 03，肯定是不行的，因為沒有配置。如果你想讓 02 連 03，你要在 02 裡面也配一下 03。

我們可以用 `docker network` 命令來查看網路資訊。`docker network ls` 可以看到有個默認的 bridge，這個 bridge 就是 Docker0。用 `docker network inspect bridge` 可以查看網卡裡面的所有東西。

<sub>[05:00-09:00]</sub>
在 inspect 的結果裡面可以看到預設的網關是 0.1，也就是 Docker0。下面還有三個容器，每個容器不指定 IP 的時候，Docker 會隨機分配一個 IP。

那 `--link` 的原理到底是什麼呢？我們進入 Tomcat03 的容器，查看 `/etc/hosts` 文件：

```bash
docker exec -it tomcat03 cat /etc/hosts
```

驚喜的發現，在 Tomcat03 的 hosts 配置文件裡面直接把 Tomcat02 寫死在這了！就是只要請求 Tomcat02，它直接轉發到對應的 IP。所以 `--link` 的本質就是在 hosts 配置中增加了一個映射。

<sub>[09:00-12:03]</sub>
但是真實開發中已經不建議使用 `--link` 了，因為這種方式太笨了。我們需要更高級的網路——自定義網路。Docker0 是一個官方的網橋，它的功能是有限的，比如 Docker0 不支持通過容器名進行連接訪問。我們自己去定義一個 Docker 網路，讓它支持容器名訪問就可以了。自定義網路才是高手的玩法，而 `--link` 就是給新手用的。

---

### P36：自定義網路

<sub>[00:00-02:36]</sub>
我們來看一下自定義網路怎麼做。這些技術都叫容器互聯，通過 `--link` 可以互聯，通過自定義網路也能互聯。用 `docker network ls` 查看所有的 Docker 網路。

Docker 裡面有幾種網路模式：
- **bridge**：橋接模式，就是在 Docker 上面搭橋，所有請求都通過這個橋來轉發
- **none**：不配置網路，一般不用
- **host**：主機模式，和宿主機共享網路
- **container**：容器內網路聯通，局限性很大，用的少

我們自己創建的網路也使用 bridge 橋接模式。

<sub>[02:36-07:00]</sub>
`docker network create --help` 可以看到創建方式。`-d` 就是 driver，默認是 bridge。`--subnet` 是子網，`--gateway` 是網關。我們來自己創建一個：

```bash
docker network create -d bridge --subnet 192.168.0.0/16 --gateway 192.168.0.1 mynet
```

這個 `/16` 代表它可以創建 65535 個子網。gateway 192.168.0.1 就是你們家 WiFi 的原理，就是網關。用 `docker network ls` 可以看到我們剛才創建的 bridge 網路了。用 `docker network inspect mynet` 可以看到我們配的 subnet 以及 gateway。

<sub>[07:00-10:00]</sub>
之前啟動容器默認有個參數 `--net bridge`，走的就是 Docker0。現在我們可以改這個網路，甚至自定義網路。Docker0 的特點：它是默認的，但域名是不能訪問的，`--link` 可以打通連接但比較麻煩。

我們現在啟動兩個容器，使用自定義網路：

```bash
docker run -d -P --name tomcat-net-01 --net mynet tomcat
docker run -d -P --name tomcat-net-02 --net mynet tomcat
```

用 `docker network inspect mynet` 可以看到兩個容器分配的 IP 是 192.168.0.2 和 192.168.0.3。

<sub>[10:00-13:01]</sub>
現在我們來測試自定義網路的好處：

```bash
# ping IP 能通
docker exec -it tomcat-net-01 ping 192.168.0.3

# 不用 --link，直接通過名字 ping 也能通！
docker exec -it tomcat-net-01 ping tomcat-net-02
```

也是能夠 ping 通的！這說明自定義的網路修復了 Docker0 的缺點，全部都支持了。不使用 `--link`，也可以 ping 通容器名字。

結論：我們自定義的網路 Docker 都已經幫我們維護好了對應的關係，而 Docker0 是沒有這個功能的，所以推薦平時這樣使用網路。

好處：以後比如說有一堆集群，Redis 是一個集群搭建一個 Redis 的網路，MySQL 是一個集群搭建一個 MySQL 的網路，網路之間是互相隔離的，各有自己的子網，保證集群安全和健康。不同的集群使用不同的網路。

---

### P37：網路連通

<sub>[00:00-03:08]</sub>
我們來看一下網路聯通的問題。畫一下當前的模型圖：我們現在有兩個網路，第一個是 Docker0，第二個是我們自己創建的 mynet。mynet 上有 tomcat-net-01 和 tomcat-net-02，Docker0 上也有 tomcat01 和 tomcat02。

Docker0 預設的網段是 172.18.0.x，mynet 的網段是 192.168.0.x，網段不通，是不可能 ping 通的。網路最核心的就是網段。

```bash
# 這個是不可能的
docker exec -it tomcat01 ping tomcat-net-01
```

直接連是不可能的。這個時候我們需要讓容器連接到 mynet 網路，注意是容器跟網路打通，不是網卡跟網卡打通。

<sub>[03:08-05:00]</sub>
`docker network --help` 裡面有個命令叫 `connect`——連接一個容器到一個網路，這就是網路聯通的核心。

```bash
docker network connect mynet tomcat01
```

聯通之後，`docker network inspect mynet` 會發現它的操作是把 tomcat01 直接加到 mynet 網路裡面來了！這在官方叫做一個容器兩個 IP 地址，就好比阿里雲服務器有公網 IP 和私網 IP。它的打通方式就是這麼暴力——直接給容器再分配一個新網段的 IP。

<sub>[05:00-08:13]</sub>
我們來測試一下現在能不能 ping 通：

```bash
# tomcat01 已經聯通，可以 ping 通
docker exec -it tomcat01 ping tomcat-net-01
# 大功告成！

# 但是 tomcat02 沒有聯通，依舊打不通
docker exec -it tomcat02 ping tomcat-net-01
# 要讓 02 也聯通的話，再 connect 就可以了
```

結論：假設要跨網路操作別人，就需要使用 `docker network connect` 來進行聯通。關於 Docker 網路的東西其實就這麼多並不難，接下來我們會來一個實戰，部署一個 Redis 集群。
