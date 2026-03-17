# Day 3 第九小時：容器網路與 Port Mapping 進階

---

## 一、為什麼需要學網路（5 分鐘）

上堂課：容器生命週期管理（資源限制、重啟策略、健康檢查）。

本堂課：容器網路 + Port Mapping 進階
- Docker 三種網路驅動（bridge / host / none）
- 自訂 Bridge 網路（內建 DNS）
- 多網路隔離設計
- Port Mapping 進階語法與安全設定

**核心問題：多容器應用（Nginx + Node.js + MySQL）容器間怎麼溝通？**

用 Port Mapping 讓容器互連有兩個嚴重問題：
1. **安全性**：資料庫不應對外暴露
2. **複雜度**：大量服務時 port 管理混亂

正確做法：**只有需要對外的容器做 Port Mapping，容器間通訊走 Docker 內部網路。**

---

## 二、Docker 網路驅動（15 分鐘）

### 查看現有網路

```bash
docker network ls
```

```
NETWORK ID     NAME      DRIVER    SCOPE
a1b2c3d4e5f6   bridge    bridge    local
f6e5d4c3b2a1   host      host      local
1a2b3c4d5e6f   none      null      local
```

Docker 安裝後預設建立三個網路。

### Bridge（預設）

- 容器取得獨立 IP，經 NAT 與外部溝通
- 同網段容器可互連，外部需 Port Mapping
- **致命限制：預設 bridge 不支援 DNS，只能用 IP 互連**
- IP 是動態分配的，容器重建後 IP 可能改變

### Host

```bash
docker run -d --name web-host --network host nginx:alpine
# 不需要 -p，容器直接用主機的 port 80
```

- 容器直接使用主機網路，無隔離
- **優點**：效能最好（無 NAT）
- **缺點**：port 衝突風險、無安全隔離
- **限制**：在 Mac / Windows 上行為與 Linux 不同

### None

```bash
docker run -d --name isolated --network none alpine sleep 3600
docker exec isolated ip addr
# 只有 loopback (127.0.0.1)，無任何對外介面
```

**用途**：敏感資料處理、純計算任務、安全測試。

### 三種模式比較

| 特性 | bridge（預設） | host | none |
|------|--------------|------|------|
| **隔離性** | 有（獨立 IP） | 無（共用主機網路） | 完全隔離 |
| **效能** | 中等（經過 NAT） | 最好 | 不適用 |
| **Port Mapping** | 需要 -p | 不需要 | 不適用 |
| **DNS 支援** | 預設不支援 | 用主機 DNS | 不適用 |
| **Mac/Win 支援** | 完整 | 有限制 | 完整 |
| **適用場景** | 一般容器部署 | 高效能需求 | 敏感資料處理 |

> **練習題 1**：以下情境用哪種網路模式？
> 1. 普通 Web 服務，需對外提供 HTTP → bridge + Port Mapping
> 2. 高頻交易行情接收，對延遲極敏感（Linux）→ host
> 3. 離線批次處理，不需要任何網路 → none
> 4. 只需被同主機其他容器存取的 API → 自訂 bridge

---

## 三、自訂 Bridge 網路（15 分鐘）— 本堂課重點！

### 為什麼要自訂網路

| | 預設 bridge | 自訂 bridge |
|--|------------|------------|
| DNS 支援 | ✗ 不支援 | ✓ 內建 DNS |
| 容器間互連 | 只能用 IP | 可用容器名稱 |
| IP 變動問題 | 容器重建後 IP 會變 | 用名稱，不受 IP 影響 |

**結論：永遠用自訂網路，不要用預設 bridge。**

### 建立自訂網路

```bash
docker network create my-network

# 指定子網段（選用）
docker network create \
  --subnet 192.168.100.0/24 \
  --gateway 192.168.100.1 \
  my-custom-network
```

### 實作：容器名稱互連驗證

```bash
# 啟動 MySQL，加入自訂網路
docker run -d \
  --name mysql-server \
  --network my-network \
  -e MYSQL_ROOT_PASSWORD=my-secret-pw \
  mysql:8.0

# 用名稱 ping MySQL → 成功！
docker run -it --rm --network my-network alpine ping -c 3 mysql-server
# PING mysql-server (172.18.0.2): 56 data bytes ...

# 對比：在預設 bridge 上用名稱 ping → 失敗！
docker run -d --name test-container alpine sleep 3600
docker run -it --rm alpine ping -c 3 test-container
# ping: bad address 'test-container'
```

### DNS 原理

Docker 在自訂 bridge 網路中跑內建 DNS 伺服器（`127.0.0.11`），自動把容器名稱和 IP 的對應關係進行維護，容器重建後自動更新。

```bash
docker run -it --rm --network my-network alpine cat /etc/resolv.conf
# nameserver 127.0.0.11
```

### 網路別名（--network-alias）

```bash
# 給容器額外的 DNS 名稱
docker run -d \
  --name mysql-prod-v8 \
  --network my-network \
  --network-alias db \
  -e MYSQL_ROOT_PASSWORD=my-secret-pw \
  mysql:8.0

# mysql-prod-v8 和 db 兩個名稱都可以連
```

多個容器共用同一別名時，Docker 做**輪詢（Round Robin）負載均衡**：

```bash
docker run -d --name web1 --network my-network --network-alias web nginx:alpine
docker run -d --name web2 --network my-network --network-alias web nginx:alpine
docker run -d --name web3 --network my-network --network-alias web nginx:alpine

docker run -it --rm --network my-network alpine nslookup web
# Address 1: 172.18.0.4 / Address 2: 172.18.0.5 / Address 3: 172.18.0.6
```

### 多網路隔離：前端與後端分離

架構圖：

```
┌──────────── frontend-net ────────────┐
│                                      │
│   ┌─────────┐      ┌─────────────┐  │
│   │  Nginx  │──────│  API Server │  │
│   └─────────┘      └──────┬──────┘  │
└────────────────────────────┼─────────┘
                             │
┌────────────────────────────┼─────────┐
│                            │         │
│   ┌─────────────┐  ┌───────┴─────┐  │
│   │   MySQL     │──│  API Server │  │
│   └─────────────┘  └─────────────┘  │
└──────────── backend-net ─────────────┘
```

```bash
docker network create frontend-net
docker network create backend-net

docker run -d --name db --network backend-net \
  -e MYSQL_ROOT_PASSWORD=secret mysql:8.0

docker run -d --name api --network backend-net alpine sleep 3600
docker network connect frontend-net api        # 一個容器可同時加入多個網路！

docker run -d --name nginx --network frontend-net nginx:alpine
```

驗證隔離效果：

```bash
docker exec api ping -c 2 db       # ✅ 成功（同在 backend-net）
docker exec nginx ping -c 2 api    # ✅ 成功（同在 frontend-net）
docker exec nginx ping -c 2 db     # ❌ 失敗！（不同網路，隔離）
# ping: bad address 'db'
```

> **練習題 2**：四服務（React / Spring Boot API / Redis / PostgreSQL）的網路設計：
> - 建立 frontend-net、backend-net 兩個網路
> - React → frontend-net；API → frontend-net + backend-net；Redis / PostgreSQL → backend-net
> - 只有 React 需要做 Port Mapping（-p 80:80）

---

## 四、網路管理指令（5 分鐘）

### 常用指令

```bash
docker network ls                              # 列出所有網路
docker network inspect my-network             # 查看詳細資訊
docker network create my-network              # 建立網路
docker network create --subnet 10.0.0.0/24 my-network
docker network rm my-network                  # 刪除網路
docker network prune                          # 清理未使用的網路

docker network connect my-network my-container     # 容器加入網路（可執行中）
docker network disconnect my-network my-container  # 容器離開網路
```

### connect / disconnect 實用場景

**場景一：臨時除錯**

```bash
docker run -d --name debug alpine sleep 3600
docker network connect backend-net debug
docker exec -it debug sh
# ping db / nslookup api / wget http://api:8080/health
docker network disconnect backend-net debug
docker rm -f debug
```

**場景二：滾動更新（Nginx 1.24 → 1.25）**

```bash
docker run -d --name web-v1 --network my-network nginx:1.24-alpine
docker run -d --name web-v2 --network my-network nginx:1.25-alpine
# 測試新版沒問題後，移除舊版
docker network disconnect my-network web-v1
docker rm -f web-v1
```

### prune 清理

```bash
docker network prune
# 只刪除沒有容器使用的自訂網路，預設三個網路不受影響
```

> **練習題 3**：完整操作練習
> ```bash
> docker network create test-net
> docker run -d --name box1 --network test-net alpine sleep 3600
> docker run -d --name box2 alpine sleep 3600
> docker network connect test-net box2
> docker exec box1 ping -c 2 box2      # 應該成功
> docker network disconnect test-net box2
> docker exec box1 ping -c 2 box2      # 應該失敗
> docker rm -f box1 box2 && docker network rm test-net
> ```

---

## 五、Port Mapping 進階（15 分鐘）

### 完整語法

```
-p [host_ip:]host_port:container_port[/protocol]
```

`-p 8080:80` 是 `-p 0.0.0.0:8080:80/tcp` 的簡寫。

### 綁定策略：host_ip 的重要性

| 綁定方式 | 本機可連 | 區域網路可連 | 外部可連 | 安全性 |
|---------|---------|------------|---------|--------|
| `-p 8080:80` | ✅ | ✅ | ✅ | 低 |
| `-p 0.0.0.0:8080:80` | ✅ | ✅ | ✅ | 低（同上） |
| `-p 127.0.0.1:8080:80` | ✅ | ❌ | ❌ | 高 |
| `-p 192.168.1.100:8080:80` | 視情況 | 視情況 | ❌ | 中 |

**何時用 127.0.0.1？** 管理後台、開發用資料庫、任何不應對外暴露的服務。

**安全警告：** 生產環境中不需對外的服務，一定要綁定 `127.0.0.1`。Redis、MongoDB、Elasticsearch 等服務因綁在 `0.0.0.0` 被入侵的案例非常多。

### 大寫 -P：隨機分配 Port

`-P` 會隨機分配主機 port（範圍 32768–65535），常用於 CI/CD pipeline 避免多個測試容器搶 port，用 `docker port` 查看結果。

### 其他進階用法

```bash
# Port 範圍映射
docker run -d -p 8080-8085:80-85 --name range-test alpine sleep 3600

# 多個 port 映射（HTTP + HTTPS）
docker run -d -p 8080:80 -p 8443:443 --name multi-port nginx:alpine

# UDP 協定
docker run -d -p 5353:53/udp --name dns-server alpine sleep 3600

# 同時映射 TCP 和 UDP
docker run -d -p 5353:53/tcp -p 5353:53/udp --name dns-both alpine sleep 3600
```

### docker port 指令

```bash
docker run -d -p 8080:80 -p 8443:443 --name web nginx:alpine
docker port web
# 80/tcp -> 0.0.0.0:8080
# 443/tcp -> 0.0.0.0:8443

docker port web 80
# 0.0.0.0:8080
```

### Docker 與防火牆的坑（重要！）

**Docker 的 Port Mapping 透過 iptables DNAT 實現，會直接繞過 ufw / firewalld 的規則。**

你用 ufw 封掉了 3306，但用 `-p 3306:3306` 跑 MySQL，外部還是能連！因為 Docker 插入的 iptables 規則優先順序更高。

**解決方案（建議方法一 + 二結合）：**

```bash
# 方法一：綁定 127.0.0.1（最簡單，推薦）
docker run -d -p 127.0.0.1:3306:3306 mysql:8.0

# 方法二：不做 Port Mapping，走內部網路（最安全）
# 參考第三節的自訂 bridge 方案

# 方法三：設定 Docker 不操作 iptables（進階）
# /etc/docker/daemon.json → {"iptables": false}
```

### 常見問題排除

**問題一：port already allocated**

```
Error: driver failed programming external connectivity:
Bind for 0.0.0.0:8080 failed: port is already allocated
```

換 port，或先檢查誰佔用了：

```bash
lsof -i :8080
netstat -tlnp | grep 8080
```

**問題二：外部連不到**

排查步驟：
1. `docker ps` — 確認容器在跑
2. `docker port 容器名` — 確認 port 映射生效
3. `curl http://localhost:8080` — 本機能連才往下查
4. 雲端安全組是否開放該 port（AWS / GCP / Azure）
5. `ufw status` 或 `firewall-cmd --list-all`

90% 的「外部連不到」是雲端安全組沒開，或防火牆擋住。

> **練習題 4**：寫出正確的 `-p` 參數：
> 1. Nginx：需讓外部訪問 80 和 443 → `-p 80:80 -p 443:443`
> 2. MySQL：只給本機連 → `-p 127.0.0.1:3306:3306`
> 3. Redis：只給本機連 → `-p 127.0.0.1:6379:6379`
> 4. Grafana：只給公司內網看（內網 IP 192.168.1.100） → `-p 192.168.1.100:3000:3000`

---

## 六、實作練習：Web + MySQL 容器通訊（5 分鐘）

### 目標架構

```
           瀏覽器
              │
          Port 8080
              │
┌──────── app-network ─────────┐
│                               │
│  ┌──────────┐  ┌───────────┐ │
│  │  MySQL   │──│  Adminer  │ │
│  │（不對外）  │  │(port 8080)│ │
│  └──────────┘  └───────────┘ │
└───────────────────────────────┘
```

### 操作步驟

```bash
# 1. 建立自訂網路
docker network create app-network

# 2. 啟動 MySQL，不做 Port Mapping
docker run -d \
  --name mysql-db \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=myapp \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppass \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0

# 3. 啟動 Adminer，做 Port Mapping 對外提供 UI
docker run -d \
  --name adminer \
  --network app-network \
  -p 8080:8080 \
  adminer
```

### 驗證

```bash
docker ps
# mysql-db  → PORTS 欄位空白（沒有對外暴露！）
# adminer   → 0.0.0.0:8080->8080/tcp
```

開啟瀏覽器 `http://localhost:8080`，在 Adminer 登入頁填入：
- 系統：MySQL
- 伺服器：`mysql-db`（填容器名稱，不是 IP！）
- 使用者名稱：`appuser`
- 密碼：`apppass`
- 資料庫：`myapp`

### 重點整理

此實作涵蓋本堂課所有核心知識：

| 知識點 | 對應操作 |
|-------|---------|
| 自訂網路 | `docker network create app-network` |
| DNS 解析 | Adminer 用 `mysql-db` 名稱連接 MySQL |
| Port Mapping 策略 | 只有 Adminer 做 -p，MySQL 不做 |
| Volume 持久化 | `-v mysql-data:/var/lib/mysql` |

```bash
# 清理環境
docker rm -f mysql-db adminer
docker network rm app-network
docker volume rm mysql-data
```

> **練習題 5**：進階架構挑戰
>
> 建立 frontend / backend 兩個網路，部署 Redis、MySQL（加入 backend）、API（加入兩個網路）、Nginx（加入 frontend，映射 port 80），並驗證：
> - api 能 ping 到 redis 和 db
> - web 能 ping 到 api
> - web **不能** ping 到 redis 和 db（隔離！）

---

## 七、本堂課小結（1 分鐘）

| 主題 | 重點 |
|-----|------|
| 網路三模式 | bridge（最常用）/ host（高效能）/ none（離線） |
| 自訂 bridge | 內建 DNS，容器間用名稱互連，永遠用這個 |
| 多網路隔離 | 前後端分離，資料庫只在後端網路 |
| Port Mapping | 完整語法含 host_ip 綁定，綁 127.0.0.1 更安全 |
| 防火牆坑 | Docker 繞過 ufw/firewalld，務必注意 |

下一堂：Dockerfile 基礎，學習把自己的應用程式打包成映像檔。

---

## 板書 / PPT 建議

**投影片一：課堂地圖**

```
容器網路 + Port Mapping 進階
├── 網路三模式：bridge / host / none
├── ★ 自訂 Bridge 網路（內建 DNS）
├── 多網路隔離設計
├── Port Mapping 完整語法
└── 安全性：綁定 IP + 防火牆坑
```

**投影片二：預設 bridge vs 自訂 bridge**

```
預設 bridge             自訂 bridge
✗ 不支援 DNS            ✓ 內建 DNS
✗ 只能用 IP             ✓ 用名稱互連
✗ IP 會變動             ✓ 支援網路別名
→ 不建議使用             ✓ 支援多網路隔離
                         → 永遠用這個！
```

**投影片三：安全架構圖**

```
        Internet
           │
       ┌───┴───┐
       │ Nginx │  -p 80:80
       └───┬───┘
           │ frontend-net
       ┌───┴───┐
       │  API  │  不做 -p
       └───┬───┘
           │ backend-net
     ┌─────┼─────┐
 ┌───┴───┐ ┌───┴───┐
 │ MySQL │ │ Redis │  都不做 -p
 └───────┘ └───────┘
```

**投影片四：Port Mapping 綁定策略**

```
-p 8080:80            → 全世界都能連 ⚠️
-p 127.0.0.1:8080:80  → 只有本機能連 🔒
-p 10.0.0.1:8080:80   → 只有指定網路能連 🔐
不做 -p               → 只有同網路容器能連 🔒🔒
```

---

**指令速查表：**

```bash
# 網路管理
docker network ls
docker network create <name>
docker network inspect <name>
docker network rm <name>
docker network prune
docker network connect <network> <container>
docker network disconnect <network> <container>

# 啟動容器時指定網路 / 別名
docker run --network <name> --name <container> <image>
docker run --network <name> --network-alias <alias> <image>

# Port Mapping
docker run -p <host_port>:<container_port> <image>
docker run -p 127.0.0.1:<host_port>:<container_port> <image>
docker run -p <host_port>:<container_port>/udp <image>
docker run -P <image>                    # 隨機分配 port
docker port <container>                  # 查看 port 映射
```
