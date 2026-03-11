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

**補充：Docker0 網路原理**

安裝 Docker 之後，主機上會多一張虛擬網卡 `docker0`，它扮演的角色就像路由器。可以用 `ip addr` 查看：

```bash
ip addr
# lo        — 本機迴環地址
# eth0      — 主機的實體網卡
# docker0   — Docker 的虛擬網橋（預設 172.17.0.1）
```

每啟動一個容器，Docker 就透過 **veth-pair** 技術建立一對虛擬網卡：一端在容器內（eth0），一端在主機上（vethXXX），成對出現、彼此相連。容器之間的通訊並非直連，而是經由 docker0 轉發——docker0 就是所有容器共用的路由器。

```bash
# 查看容器內部的網路地址
docker exec -it my-container ip addr
```

容器刪除時，對應的 veth-pair 也會跟著消失。子網掩碼 `/16` 代表大約可分配 65535 個 IP；`/24` 則只有 255 個。

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

## 五、Docker 網路先導（5 分鐘）

在進入 Day 3 之前，先帶大家認識 Docker 網路的幾個重要概念。理解網路是後面做多容器應用、服務互連與實戰部署的基礎。

### 5.1 容器互聯：--link（已不建議）

預設情況下，容器之間透過 IP 可以互 ping，但無法透過容器名稱互連。Docker 早期提供 `--link` 解決這個問題：

```bash
docker run -d -P --name tomcat03 --link tomcat02 tomcat

# tomcat03 可以 ping 通 tomcat02
docker exec -it tomcat03 ping tomcat02
```

`--link` 的原理很簡單——它在容器的 `/etc/hosts` 裡寫死了目標容器的 IP 映射：

```bash
docker exec -it tomcat03 cat /etc/hosts
# 會看到 tomcat02 對應的 IP
```

但 `--link` 是單向的（03 能連 02，02 不能連 03），而且維護麻煩。**真實開發中已不建議使用**，應該改用自定義網路。

### 5.2 自定義網路（推薦）

Docker 有幾種網路模式：

| 模式 | 說明 |
|-----|------|
| bridge | 橋接模式（預設），容器透過虛擬網橋通訊 |
| host | 主機模式，與宿主機共享網路 |
| none | 不配置網路 |
| container | 與其他容器共享網路命名空間 |

建立自定義網路：

```bash
docker network create -d bridge --subnet 192.168.0.0/16 --gateway 192.168.0.1 mynet
docker network ls
docker network inspect mynet
```

使用自定義網路啟動容器：

```bash
docker run -d -P --name tomcat-net-01 --net mynet tomcat
docker run -d -P --name tomcat-net-02 --net mynet tomcat

# 不用 --link，直接通過容器名就能 ping 通
docker exec -it tomcat-net-01 ping tomcat-net-02
```

自定義網路會自動維護容器名稱到 IP 的 DNS 解析，這是 docker0 做不到的。實務上，不同服務群組應建立各自的網路（例如 Redis 集群一個網路、MySQL 集群一個網路），達到網路隔離。

### 5.3 跨網路連通：docker network connect

不同網路的容器預設無法互通（網段不同）。若需要跨網路連線，使用 `docker network connect`：

```bash
# 把 docker0 上的 tomcat01 連進 mynet
docker network connect mynet tomcat01

# 現在 tomcat01 可以 ping 通 mynet 上的容器了
docker exec -it tomcat01 ping tomcat-net-01
```

原理是讓容器同時擁有兩個網段的 IP（類似一台伺服器同時有公網 IP 和私網 IP）。

---

## 六、預告 Day 3（3 分鐘）

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

## 七、本堂課小結（3 分鐘）

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

3. **Docker 網路先導**
   - Docker0 與 veth-pair 原理
   - --link（已不建議）vs 自定義網路
   - docker network connect 跨網路連通

4. **Day 2 總複習**
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
