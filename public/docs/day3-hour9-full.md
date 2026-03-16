# Day 3 第九小時：容器網路 + Port Mapping 進階

---

## 一、為什麼需要學網路（5 分鐘）

好，同學們，上一堂課我們把 Volume 資料持久化搞定了。你們現在已經知道怎麼讓容器的資料不會因為容器被刪掉就消失。這堂課我們要來處理另一個非常關鍵的問題——**網路**。

在開始之前，我想先問大家一個問題。

假設你現在要用 Docker 部署一個完整的 Web 應用，這個應用有三個部分：前端用 Nginx 提供靜態頁面、後端用 Node.js 寫的 API、資料庫用 MySQL。

按照 Docker 的最佳實踐，這三個東西應該分別跑在三個不同的容器裡。對吧？一個容器只做一件事，這是我們之前提過的原則。

好，問題來了：**這三個容器，它們怎麼互相溝通？**

Nginx 收到使用者的 HTTP 請求，要轉發給 Node.js 的 API。Node.js 處理完商業邏輯，要去 MySQL 撈資料。這些通訊是怎麼發生的？

有同學可能會說：欸，老師，用 Port Mapping 啊！每個容器都 -p 映射一個 port 出來，不就可以互相連了嗎？

這個想法技術上可以，但有兩個嚴重的問題。

**第一個問題，安全性。**

你想想看，你的 MySQL 資料庫需要對外暴露 port 嗎？絕對不需要！你的 MySQL 只需要被後端 API 存取就好了，完全不應該讓外面的人能連到你的資料庫。如果你把 MySQL 的 3306 port 映射出去，等於是把資料庫的大門打開，讓全世界都能來敲門。這在生產環境是非常嚴重的安全問題。

**第二個問題，複雜度。**

如果你有十個、二十個微服務，每個都要映射一個 port 出來，你要管理一大堆 port 號碼。哪個服務用哪個 port？會不會衝突？這個管理成本非常高，而且很容易出錯。

所以正確的做法是：**只有需要對外提供服務的容器才做 Port Mapping，容器之間的內部通訊應該走 Docker 的內部網路。**

這就是我們這堂課要學的東西。

這堂課教完之後，你就能做到這些事情：

- 理解 Docker 的網路架構
- 讓容器之間透過名稱互相溝通（不需要記 IP）
- 設計安全的容器網路拓撲（誰能連誰、誰不能連誰）
- 掌握 Port Mapping 的進階用法

好，我們開始。

---

## 二、Docker 網路驅動（15 分鐘）

### 2.1 Docker 網路的全貌

在深入之前，我們先來看看 Docker 目前有哪些網路。

```bash
docker network ls
```

你會看到類似這樣的輸出：

```
NETWORK ID     NAME      DRIVER    SCOPE
a1b2c3d4e5f6   bridge    bridge    local
f6e5d4c3b2a1   host      host      local
1a2b3c4d5e6f   none      null      local
```

Docker 安裝完之後，預設就會幫你建好三個網路：`bridge`、`host`、`none`。每個網路用不同的驅動（Driver），代表不同的網路模式。

我們一個一個來看。

### 2.2 Bridge 網路（預設）

昨天最後一堂課我們簡單預覽了 Docker 的網路架構，知道了 docker0 虛擬橋接器和 veth-pair 的運作方式。今天我們要深入了解，重點是搞懂什麼時候該用哪種網路模式。

**Bridge 是 Docker 的預設網路模式。** 如果你在 `docker run` 的時候沒有指定 `--network`，容器就會被自動放進這個預設的 bridge 網路。同一個 bridge 網路裡的容器可以用 IP 互相溝通，但外部要連進來就需要 Port Mapping。

但預設 bridge 網路有一個**致命限制**：**不支援 DNS 解析，容器之間只能用 IP 互連，不能用名稱。**

問題很大！因為容器的 IP 是動態分配的。今天某個容器的 IP 是 `172.17.0.3`，你把它刪掉重建，IP 可能就變了。如果你在程式碼裡寫死 IP，那每次容器重建你都要改程式碼，這完全不現實。

用一句話總結預設 bridge 的問題：**IP 會變，名稱不會。但預設 bridge 偏偏不支援用名稱連線。**

這個問題要怎麼解決？等一下第三節會告訴你。先把其他兩種網路模式也看完。

### 2.3 Host 網路

第二種網路模式叫 host。

如果 bridge 是「住在大樓裡的房間」，那 host 模式就是「不住大樓了，直接住在馬路邊」。

什麼意思呢？host 模式讓容器**直接使用主機的網路**，不建立任何隔離。容器看到的網路介面、IP 位址、port，全部和主機一模一樣。

```bash
# 用 host 網路模式啟動 Nginx
docker run -d --name web-host --network host nginx:alpine
```

注意看，我沒有寫 `-p` 做 Port Mapping。因為用 host 模式根本不需要！容器直接用主機的 port 80，你打開瀏覽器訪問 `http://localhost` 就能看到 Nginx 的歡迎頁面了。

我們來驗證一下容器的網路設定：

```bash
docker inspect web-host --format '{{.NetworkSettings.IPAddress}}'
```

```
（空的，沒有分配 IP）
```

看到了嗎？host 模式下，容器沒有被分配自己的 IP，因為它直接用主機的 IP。

**Host 模式的優點：效能最好。** 因為沒有經過 Docker 的網路抽象層（NAT、bridge），網路封包直接走主機的網路堆疊，延遲最低、吞吐量最高。如果你的應用對網路效能非常敏感，host 模式是一個選擇。

**Host 模式的缺點：沒有網路隔離。** 容器和主機共用網路，這意味著：

1. **Port 衝突**：如果主機的 80 port 已經被佔用了，容器的 Nginx 就啟動不了。你不能同時跑兩個 Nginx 在 host 模式，因為它們都想用 port 80。
2. **安全風險**：容器可以看到主機的所有網路介面、所有 port，沒有隔離。

**還有一個重要的限制：** host 模式在 Linux 上是完整支援的，但在 Mac 和 Windows 上有限制。因為 Mac 和 Windows 的 Docker 其實是跑在一個 Linux 虛擬機器裡的，所以 host 模式連接的是那個虛擬機器的網路，不是你真正的主機網路。所以如果你在 Mac 上用 host 模式，可能會發現行為跟你預期的不一樣。

我們實驗一下效果然後清掉：

```bash
docker rm -f web-host
```

### 2.4 None 網路

第三種是 none，完全沒有網路。

如果 bridge 是「住在大樓裡」、host 是「住在馬路邊」，那 none 就是「住在無人島上」。

```bash
docker run -d --name isolated --network none alpine sleep 3600
```

我們進去看看：

```bash
docker exec isolated ip addr
```

```
1: lo: <LOOPBACK,UP,LOWER_UP>
    inet 127.0.0.1/8 scope host lo
```

看到了嗎？只有 loopback（127.0.0.1），連一個對外的網路介面都沒有。這個容器完全與世隔絕。

你可能會問：那這有什麼用？完全沒網路的容器能幹嘛？

其實有幾個使用場景：

1. **處理敏感資料**：比如你要在容器裡解密一些機密文件、處理密鑰，你不希望容器有任何對外通訊的能力，避免資料被竊取或外洩。
2. **純計算任務**：有些批次運算不需要網路，像是影片轉碼、資料壓縮、跑機器學習的推論。把網路關掉可以減少攻擊面。
3. **安全測試**：在測試惡意軟體的行為時，你肯定不希望它能連上網路。

好，清掉：

```bash
docker rm -f isolated
```

### 2.5 三種模式比較

我幫大家做一個整理表格，方便記憶：

| 特性 | bridge（預設） | host | none |
|------|---------------|------|------|
| **隔離性** | 有（獨立 IP） | 無（共用主機網路） | 完全隔離 |
| **效能** | 中等（經過 NAT） | 最好（直接用主機網路） | 不適用 |
| **Port Mapping** | 需要 -p | 不需要 | 不適用 |
| **容器間通訊** | 同網段可通 | 透過主機網路 | 不行 |
| **DNS 支援** | 預設 bridge 不支援 | 用主機 DNS | 不適用 |
| **適用場景** | 一般容器部署 | 高效能需求 | 敏感資料處理 |
| **Mac/Win 支援** | 完整 | 有限制 | 完整 |

在實際工作中，90% 以上的情況你用的都是 bridge 模式。但不是預設的 bridge，而是**自訂的 bridge 網路**——因為自訂 bridge 解決了我們剛才說的 DNS 問題。

這就是下一節的重點。

> **📝 練習題 1：網路模式辨識**
>
> 請判斷以下情境應該使用哪種網路模式？
>
> 1. 一個普通的 Web 服務，需要對外提供 HTTP 服務
> 2. 一個高頻交易系統的行情接收模組，對延遲極度敏感（且在 Linux 上）
> 3. 一個離線批次處理工具，讀取本機檔案做資料轉換，不需要任何網路
> 4. 一個公司內部的 API 服務，只需要被同一台主機上的其他容器存取
>
> **參考答案：**
> 1. bridge + Port Mapping（最常見）
> 2. host（最低延遲，但要注意 port 衝突）
> 3. none（不需要網路，減少攻擊面）
> 4. bridge 自訂網路（不需對外，容器間內部通訊即可）

---

## 三、自訂 Bridge 網路（15 分鐘）— 本堂課重點！

### 3.1 為什麼要自訂網路

好，到目前為止我們知道了一件事：**預設的 bridge 網路不支援 DNS，只能用 IP 互連，而 IP 會變。** 這在實際使用中非常不方便。

那怎麼辦？答案是：**自己建一個 bridge 網路。**

Docker 的自訂 bridge 網路，和預設 bridge 相比，有一個關鍵的差異——**內建 DNS 服務**。在自訂 bridge 網路裡，容器之間可以直接用**容器名稱**互相連線，Docker 會自動幫你做 DNS 解析。

回到我們的大樓比喻：預設 bridge 是一棟老舊大樓，住戶之間只知道彼此的門牌號碼（IP），如果有人搬家換了房間，其他人就找不到了。而自訂 bridge 是一棟現代化大樓，有一個大廳服務台（DNS），你只要報住戶的名字，服務台就會告訴你他住哪個房間，即使他搬了房間也沒關係。

這個差異看似小，但在實際應用中是非常巨大的。因為你的應用程式設定檔裡面寫的資料庫連線地址，不可能寫一個會變的 IP。你要寫一個穩定的名稱，像是 `mysql` 或 `db`，然後讓 Docker 的 DNS 去解析它。

### 3.2 建立自訂網路

建立自訂網路非常簡單：

```bash
docker network create my-network
```

就這一行！我們來看看它建了什麼：

```bash
docker network ls
```

```
NETWORK ID     NAME         DRIVER    SCOPE
a1b2c3d4e5f6   bridge       bridge    local
f6e5d4c3b2a1   host         host      local
7a8b9c0d1e2f   my-network   bridge    local
1a2b3c4d5e6f   none         null      local
```

看到了嗎？`my-network` 出現了，Driver 是 `bridge`。沒錯，自訂網路的預設驅動也是 bridge，但它比預設的 bridge 多了 DNS 功能。

我們再用 `inspect` 看看詳細資訊：

```bash
docker network inspect my-network
```

```json
[
    {
        "Name": "my-network",
        "Id": "7a8b9c0d1e2f...",
        "Driver": "bridge",
        "IPAM": {
            "Config": [
                {
                    "Subnet": "172.18.0.0/16",
                    "Gateway": "172.18.0.1"
                }
            ]
        },
        "Containers": {}
    }
]
```

注意看，它的子網段（Subnet）是 `172.18.0.0/16`，和預設 bridge 的 `172.17.0.0/16` 不同。每個自訂網路都會有自己的子網段，互不干擾。

你也可以在建立時指定子網段和閘道：

```bash
docker network create \
  --subnet 192.168.100.0/24 \
  --gateway 192.168.100.1 \
  my-custom-network
```

但通常讓 Docker 自動分配就夠了，除非你有特殊的網段規劃需求。

### 3.3 實作演示：容器名稱互連

好，重頭戲來了。我們來親眼驗證自訂網路的 DNS 功能。

**步驟一：建立自訂網路**（剛才已經建了 my-network）

**步驟二：啟動 MySQL 容器，加入自訂網路**

```bash
docker run -d \
  --name mysql-server \
  --network my-network \
  -e MYSQL_ROOT_PASSWORD=my-secret-pw \
  mysql:8.0
```

注意幾個參數：
- `--name mysql-server`：給容器取名字，這個名字等一下會被當成 DNS 名稱
- `--network my-network`：加入我們剛才建的自訂網路
- `-e MYSQL_ROOT_PASSWORD=my-secret-pw`：MySQL 必須設定 root 密碼

**步驟三：啟動另一個容器，用名稱 ping MySQL**

```bash
docker run -it --rm \
  --network my-network \
  alpine ping -c 3 mysql-server
```

來看輸出：

```
PING mysql-server (172.18.0.2): 56 data bytes
64 bytes from 172.18.0.2: seq=0 ttl=64 time=0.156 ms
64 bytes from 172.18.0.2: seq=1 ttl=64 time=0.112 ms
64 bytes from 172.18.0.2: seq=2 ttl=64 time=0.098 ms
```

**成功了！** 我們用 `mysql-server` 這個名稱就 ping 到了 MySQL 容器，Docker 自動把它解析成 `172.18.0.2`。

**步驟四：對比——在預設 bridge 上用名稱 ping**

為了讓大家看清楚差異，我們在預設 bridge 上做同樣的事：

```bash
# 在預設 bridge 上啟動一個容器
docker run -d --name test-container alpine sleep 3600

# 嘗試用名稱 ping（在預設 bridge 上）
docker run -it --rm alpine ping -c 3 test-container
```

```
ping: bad address 'test-container'
```

**失敗！** 同樣是 bridge 網路，預設的就不支援 DNS，自訂的就支援。

**這就是為什麼在實際工作中，我們幾乎永遠不用預設的 bridge 網路，而是自己建一個。**

清掉測試容器：

```bash
docker rm -f test-container
```

### 3.4 DNS 解析的原理

你可能會好奇：Docker 是怎麼做到 DNS 解析的？

其實很簡單。Docker 在自訂 bridge 網路中，會跑一個內建的 DNS 伺服器（位於 `127.0.0.11`）。每個加入這個網路的容器，Docker 都會自動把它的容器名稱和 IP 的對應關係註冊到這個 DNS 伺服器上。

當容器 A 要連容器 B 的時候，Docker 的 DNS 伺服器就會回應容器 B 的 IP 位址。即使容器 B 被刪掉重建了，拿到了新的 IP，DNS 伺服器也會自動更新。

我們可以驗證一下：

```bash
# 進入一個在 my-network 上的容器，看 DNS 設定
docker run -it --rm --network my-network alpine cat /etc/resolv.conf
```

```
nameserver 127.0.0.11
options ndots:0
```

看到了嗎？`nameserver 127.0.0.11`，這就是 Docker 的內建 DNS。

### 3.5 網路別名（--network-alias）

有時候你可能想要給容器一個額外的 DNS 名稱，不只是容器名稱。比如說，你有一個 MySQL 容器叫 `mysql-prod-v8`，但你的應用程式設定檔裡寫的是 `db`。你不想改應用程式的設定，怎麼辦？

這時候可以用 `--network-alias`：

```bash
docker run -d \
  --name mysql-prod-v8 \
  --network my-network \
  --network-alias db \
  -e MYSQL_ROOT_PASSWORD=my-secret-pw \
  mysql:8.0
```

現在這個容器可以用兩個名稱來連：`mysql-prod-v8` 和 `db` 都可以。

```bash
# 兩個名稱都能解析
docker run -it --rm --network my-network alpine ping -c 1 mysql-prod-v8
docker run -it --rm --network my-network alpine ping -c 1 db
```

兩個都可以 ping 通！

更厲害的是，你可以讓多個容器共用同一個別名。Docker 會做簡單的輪詢（Round Robin）負載均衡。比如：

```bash
# 啟動三個 Web 容器，共用 "web" 這個別名
docker run -d --name web1 --network my-network --network-alias web nginx:alpine
docker run -d --name web2 --network my-network --network-alias web nginx:alpine
docker run -d --name web3 --network my-network --network-alias web nginx:alpine
```

現在 `web` 這個名稱會輪流解析到三個容器的 IP：

```bash
# 多次解析，看到不同 IP
docker run -it --rm --network my-network alpine nslookup web
```

```
Name:      web
Address 1: 172.18.0.4
Address 2: 172.18.0.5
Address 3: 172.18.0.6
```

這就是簡單的 DNS 負載均衡！當然，真正的生產環境我們會用更專業的負載均衡方案（像是 Nginx 反向代理或 Kubernetes 的 Service），但這個功能對於開發和測試環境已經很好用了。

先清掉這些容器：

```bash
docker rm -f web1 web2 web3 mysql-prod-v8
```

### 3.6 多網路隔離：前端與後端分離

好，接下來我要講一個非常實用的架構設計模式：**多網路隔離**。

回到我們最開始的例子：Nginx 前端、Node.js API、MySQL 資料庫。

如果三個容器都放在同一個網路裡，那 Nginx 可以直接連到 MySQL。但 Nginx 根本不需要連 MySQL 啊！前端只要跟 API 溝通就好了。

更好的做法是：

```
建立兩個網路：
- frontend-net：前端網路
- backend-net：後端網路

前端 Nginx  →  加入 frontend-net
API 伺服器  →  同時加入 frontend-net 和 backend-net
MySQL 資料庫 →  加入 backend-net
```

這樣的效果是：

- Nginx 在 frontend-net，可以連到 API（因為 API 也在 frontend-net）
- API 在兩個網路裡，可以連到 Nginx，也可以連到 MySQL
- MySQL 只在 backend-net 裡，**Nginx 完全連不到 MySQL**！

我畫一個架構圖給大家看：

```
┌──────────── frontend-net ────────────┐
│                                      │
│   ┌─────────┐      ┌─────────────┐  │
│   │  Nginx  │──────│  API Server │  │
│   │ (前端)   │      │  (Node.js)  │  │
│   └─────────┘      └──────┬──────┘  │
│                            │         │
└────────────────────────────┼─────────┘
                             │
┌────────────────────────────┼─────────┐
│                            │         │
│   ┌─────────────┐  ┌──────┴──────┐  │
│   │   MySQL     │──│  API Server │  │
│   │  (資料庫)    │  │  (Node.js)  │  │
│   └─────────────┘  └─────────────┘  │
│                                      │
└──────────── backend-net ─────────────┘
```

這就是所謂的**網路分段（Network Segmentation）**，是微服務架構中非常標準的做法。

我們來實際操作一遍：

```bash
# 1. 建立兩個網路
docker network create frontend-net
docker network create backend-net

# 2. 啟動 MySQL，加入 backend-net
docker run -d \
  --name db \
  --network backend-net \
  -e MYSQL_ROOT_PASSWORD=secret \
  mysql:8.0

# 3. 啟動 API 伺服器（用 alpine 模擬），加入 backend-net
docker run -d \
  --name api \
  --network backend-net \
  alpine sleep 3600

# 4. 把 API 伺服器也加入 frontend-net
docker network connect frontend-net api

# 5. 啟動 Nginx，加入 frontend-net
docker run -d \
  --name nginx \
  --network frontend-net \
  nginx:alpine
```

注意第四步：`docker network connect` 可以把一個已經在運行的容器加入另一個網路。一個容器可以同時加入多個網路！

現在我們來驗證：

```bash
# 測試 1: API → MySQL（同在 backend-net）→ 應該成功
docker exec api ping -c 2 db
```

```
PING db (172.19.0.2): 56 data bytes
64 bytes from 172.19.0.2: seq=0 ttl=64 time=0.145 ms
64 bytes from 172.19.0.2: seq=1 ttl=64 time=0.098 ms
```

成功！

```bash
# 測試 2: Nginx → API（同在 frontend-net）→ 應該成功
docker exec nginx ping -c 2 api
```

```
PING api (172.20.0.3): 56 data bytes
64 bytes from 172.20.0.3: seq=0 ttl=64 time=0.132 ms
64 bytes from 172.20.0.3: seq=1 ttl=64 time=0.091 ms
```

成功！

```bash
# 測試 3: Nginx → MySQL（不在同一個網路）→ 應該失敗！
docker exec nginx ping -c 2 db
```

```
ping: bad address 'db'
```

**失敗了！這就是我們要的效果！** Nginx 根本解析不了 `db` 這個名稱，因為它們不在同一個網路裡。MySQL 對前端來說是完全不可見的、不可達的。

這就是 Docker 網路隔離的威力。

> **📝 練習題 2：網路隔離設計**
>
> 假設你有以下四個服務：
> - 前端 React 應用（需要對外訪問）
> - 後端 Spring Boot API
> - Redis 快取
> - PostgreSQL 資料庫
>
> 請設計網路架構：
> 1. 需要建立幾個自訂網路？
> 2. 每個服務分別加入哪個網路？
> 3. 哪些服務需要做 Port Mapping？
>
> **參考答案：**
> 1. 兩個：frontend-net、backend-net
> 2. React → frontend-net；API → frontend-net + backend-net；Redis → backend-net；PostgreSQL → backend-net
> 3. 只有 React 需要 -p 80:80（因為只有前端需要被外部使用者訪問）

好，把實驗環境清掉：

```bash
docker rm -f nginx api db
docker network rm frontend-net backend-net
```

---

## 四、網路管理指令（5 分鐘）

### 4.1 常用指令一覽

讓我幫大家整理一下 Docker 網路相關的管理指令。這些指令你不需要死背，知道有就好，要用的時候回來查就行：

```bash
# 列出所有網路
docker network ls

# 查看網路詳細資訊（包含有哪些容器在裡面）
docker network inspect my-network

# 建立網路
docker network create my-network

# 建立網路（指定子網段）
docker network create --subnet 10.0.0.0/24 my-network

# 刪除網路
docker network rm my-network

# 刪除所有未使用的網路
docker network prune

# 把容器加入網路（容器可以在執行中！）
docker network connect my-network my-container

# 把容器從網路中移除
docker network disconnect my-network my-container
```

### 4.2 connect / disconnect 的實用場景

我特別要說一下 `connect` 和 `disconnect`，因為這兩個指令很實用。

**場景一：臨時除錯**

假設你的 API 容器連不上資料庫了，你想啟動一個除錯用的容器去檢查網路狀況。你可以啟動一個工具容器，動態加入那個網路：

```bash
# 啟動一個除錯容器
docker run -d --name debug alpine sleep 3600

# 把它加入後端網路
docker network connect backend-net debug

# 進去做各種測試
docker exec -it debug sh
# ping db
# nslookup api
# wget http://api:8080/health

# 測試完畢，移除網路連線
docker network disconnect backend-net debug
docker rm -f debug
```

**場景二：滾動更新**

當你要升級一個服務的時候，可以先啟動新版容器、加入網路、測試通過後，再把舊版容器從網路移除。

```bash
# 啟動新版 API
docker run -d --name api-v2 --network backend-net api:v2

# 測試通過後，把舊版從網路移除
docker network disconnect backend-net api-v1
docker rm -f api-v1
```

### 4.3 prune 清理

跟容器和映像檔一樣，網路也有 `prune` 指令可以清理不用的：

```bash
docker network prune
```

```
WARNING! This will remove all custom networks not used by at least one container.
Are you sure you want to continue? [y/N] y
Deleted Networks:
my-network
my-custom-network
```

它只會刪除**沒有任何容器在使用的自訂網路**，預設的三個（bridge、host、none）不會被刪掉，所以放心用。

> **📝 練習題 3：網路管理操作**
>
> 請按順序完成以下操作：
> 1. 建立一個名為 `test-net` 的網路
> 2. 啟動一個 alpine 容器，名為 `box1`，加入 `test-net`
> 3. 啟動另一個 alpine 容器，名為 `box2`，**不加入** `test-net`（用預設網路）
> 4. 用 `docker network connect` 把 `box2` 也加入 `test-net`
> 5. 驗證 `box1` 可以用名稱 ping 到 `box2`
> 6. 把 `box2` 從 `test-net` 斷開
> 7. 驗證 `box1` 無法再用名稱 ping 到 `box2`
> 8. 清理：刪除兩個容器和網路
>
> ```bash
> # 參考指令：
> docker network create test-net
> docker run -d --name box1 --network test-net alpine sleep 3600
> docker run -d --name box2 alpine sleep 3600
> docker network connect test-net box2
> docker exec box1 ping -c 2 box2      # 應該成功
> docker network disconnect test-net box2
> docker exec box1 ping -c 2 box2      # 應該失敗
> docker rm -f box1 box2
> docker network rm test-net
> ```

---

## 五、Port Mapping 進階（15 分鐘）

### 5.1 回顧基礎

好，接下來我們來講 Port Mapping 的進階用法。

在 Day 2 第六小時，我們已經用過 `-p 8080:80` 來把 Nginx 容器的 80 port 映射到主機的 8080 port。這個基礎大家已經會了，我就不再重複。

但實際工作中，Port Mapping 遠不止 `-p 主機port:容器port` 這麼簡單。今天我們要把完整的語法和進階用法都搞清楚。

### 5.2 完整語法

Day 2 我們用過 `-p 8080:80` 的基本寫法，但完整語法其實是 `-p [host_ip:]host_port:container_port[/protocol]`。也就是說 `-p 8080:80` 其實是 `-p 0.0.0.0:8080:80/tcp` 的簡寫。今天我們要把 `host_ip` 綁定和 `protocol` 這些進階用法搞清楚。

### 5.3 綁定策略：host_ip 的重要性

這是 Port Mapping 最容易被忽略但又非常重要的部分。

**情況一：`-p 8080:80`（預設，等同 `-p 0.0.0.0:8080:80`）**

綁定到 `0.0.0.0`，意思是「所有網路介面」。也就是說，不管是從本機連、從區域網路連、還是從網際網路連（如果伺服器有公開 IP），都可以連到這個 port。

```bash
docker run -d -p 8080:80 --name web nginx:alpine
```

```
# 本機可以連
curl http://localhost:8080         ✅
curl http://127.0.0.1:8080         ✅

# 區域網路其他電腦也可以連（假設你的 IP 是 192.168.1.100）
curl http://192.168.1.100:8080     ✅

# 如果有公開 IP，外部也可以連
curl http://203.0.113.50:8080      ✅
```

**情況二：`-p 127.0.0.1:8080:80`**

綁定到 `127.0.0.1`，意思是「只有本機才能連」。區域網路的其他電腦連不上，外部更連不上。

```bash
docker run -d -p 127.0.0.1:8080:80 --name web-local nginx:alpine
```

```
# 本機可以連
curl http://localhost:8080         ✅
curl http://127.0.0.1:8080         ✅

# 區域網路其他電腦連不到！
curl http://192.168.1.100:8080     ❌ 連線被拒絕
```

**什麼時候用 127.0.0.1？** 當你的服務只是給本機使用的時候。比如說：

- 你在伺服器上跑一個管理後台（像 phpMyAdmin），只希望透過 SSH tunnel 存取，不想讓外部直接連
- 開發環境的資料庫，只需要本機的應用程式連
- 任何不應該對外暴露的服務

**情況三：`-p 192.168.1.100:8080:80`**

綁定到特定的 IP。如果你的主機有多個網路介面（多張網卡），你可以選擇只讓某個介面上的流量能連到這個 port。

這在有多個網卡的伺服器上很有用。比如一台伺服器有兩張網卡，一張接內網（192.168.1.100）、一張接外網（203.0.113.50），你可以讓某些服務只在內網可達：

```bash
# 只有內網能連
docker run -d -p 192.168.1.100:8080:80 --name internal-web nginx:alpine
```

我幫大家做個比較表：

| 綁定方式 | 本機可連 | 區域網路可連 | 外部可連 | 安全性 |
|---------|---------|------------|---------|--------|
| `-p 8080:80` | ✅ | ✅ | ✅ | 低 |
| `-p 0.0.0.0:8080:80` | ✅ | ✅ | ✅ | 低（和上面一樣） |
| `-p 127.0.0.1:8080:80` | ✅ | ❌ | ❌ | 高 |
| `-p 192.168.1.100:8080:80` | 視情況 | 視情況 | ❌ | 中 |

**⚠️ 安全建議：** 在生產環境中，不需要對外的服務，一定要綁定 `127.0.0.1`。我見過很多資安事件就是因為 Redis、MongoDB、Elasticsearch 這些服務被綁在 `0.0.0.0` 上，結果被外部掃描到直接入侵。

```bash
docker rm -f web web-local 2>/dev/null
```

### 5.4 大寫 -P：隨機分配 Port

Day 2 提過大寫 `-P` 會隨機分配主機 port（範圍 32768-65535），用 `docker port` 可以查看分配結果。這個功能最常用在 CI/CD pipeline 裡，避免多個測試容器搶同一個 port。

### 5.5 Port 範圍映射

如果你需要一次映射多個 port，可以用範圍：

```bash
# 映射一個範圍的 port
docker run -d -p 8080-8085:80-85 --name range-test alpine sleep 3600
```

這樣 8080→80、8081→81、8082→82...依此類推。

也可以分別指定多個 `-p`：

```bash
# 映射多個不同的 port
docker run -d \
  -p 8080:80 \
  -p 8443:443 \
  --name multi-port \
  nginx:alpine
```

這在 Nginx 同時監聽 HTTP（80）和 HTTPS（443）的時候很常用。

```bash
docker rm -f range-test multi-port 2>/dev/null
```

### 5.6 指定協定

預設是 TCP，但如果你的服務用的是 UDP（像 DNS 伺服器），要明確指定：

```bash
# 映射 UDP port
docker run -d -p 5353:53/udp --name dns-server alpine sleep 3600

# 同時映射 TCP 和 UDP
docker run -d -p 5353:53/tcp -p 5353:53/udp --name dns-server-both alpine sleep 3600
```

```bash
docker rm -f dns-server dns-server-both 2>/dev/null
```

### 5.7 docker port 指令

`docker port` 可以快速查看容器的 port 映射：

```bash
docker run -d -p 8080:80 -p 8443:443 --name web nginx:alpine

docker port web
```

```
80/tcp -> 0.0.0.0:8080
443/tcp -> 0.0.0.0:8443
```

也可以只查某個 port：

```bash
docker port web 80
```

```
0.0.0.0:8080
```

```bash
docker rm -f web
```

### 5.8 Port Mapping 的底層原理（簡單了解）

Port Mapping 在 Linux 上是透過 **iptables 的 DNAT** 規則實現的——Docker 會自動加規則把流向主機 port 的封包轉發到容器 IP。你不需要記住細節，但知道這個原理有助於理解接下來要說的一個重要問題。

### 5.9 Docker 與防火牆的坑（重要！）

**這是很多人在生產環境會踩到的一個大坑，我一定要提醒大家。**

在 Linux 伺服器上，很多人會用 `ufw`（Ubuntu）或 `firewalld`（CentOS）來管理防火牆。比如你設定了只開放 22（SSH）和 80（HTTP），其他 port 全部封掉。

但是！Docker 的 Port Mapping 會直接操作 iptables，**繞過 ufw/firewalld 的規則**。

什麼意思呢？你明明用 ufw 封掉了 3306 port，但如果你用 `-p 3306:3306` 跑了一個 MySQL 容器，外部居然還是連得上！

因為 Docker 在 iptables 裡插入的 DNAT 規則，優先順序比 ufw/firewalld 的規則更高。

**這個問題造成了無數的資安事件。** 管理員以為防火牆擋住了，結果 Docker 把門打開了。

**解決方案有幾個：**

**方法一：綁定 127.0.0.1**（最簡單，推薦）

```bash
# 不要這樣做
docker run -d -p 3306:3306 mysql:8.0

# 要這樣做
docker run -d -p 127.0.0.1:3306:3306 mysql:8.0
```

**方法二：用 Docker 網路替代 Port Mapping**

根本不做 Port Mapping，只用內部網路通訊。這就是我們第三節教的。

**方法三：設定 Docker daemon 不要操作 iptables**

在 `/etc/docker/daemon.json` 裡加上：

```json
{
  "iptables": false
}
```

但這樣你就需要自己手動設定 iptables 規則，比較麻煩，適合有經驗的系統管理員。

**我的建議是：方法一和方法二結合使用。** 只有真的需要對外的服務才做 Port Mapping，而且盡量綁定 127.0.0.1，再透過 Nginx 反向代理轉發。不需要對外的服務，完全不做 Port Mapping，只走內部網路。

### 5.10 常見問題排除

最後講兩個 Port Mapping 最常見的錯誤。

**問題一：port already allocated**

```bash
docker run -d -p 8080:80 --name web1 nginx:alpine
docker run -d -p 8080:80 --name web2 nginx:alpine
```

第二個會報錯：

```
Error: driver failed programming external connectivity:
Bind for 0.0.0.0:8080 failed: port is already allocated
```

原因很簡單：主機的 8080 port 已經被第一個容器佔了。一個 port 只能被一個程序佔用。

**解決方法：** 換一個 port。

```bash
docker run -d -p 8081:80 --name web2 nginx:alpine
```

注意，也可能不是 Docker 容器佔的。你的主機上可能有其他程式（比如本機的 Nginx、Apache、或其他服務）已經在用那個 port 了。可以用以下指令檢查：

```bash
# Linux / Mac
lsof -i :8080

# 或
netstat -tlnp | grep 8080
```

**問題二：外部連不到**

你在伺服器上跑了 `docker run -d -p 8080:80 nginx:alpine`，但從外部瀏覽器打不開 `http://伺服器IP:8080`。

排查步驟：

1. **先確認容器有沒有在跑：** `docker ps`
2. **確認 port 映射有沒有生效：** `docker port 容器名`
3. **在伺服器本機測試：** `curl http://localhost:8080`，如果本機可以，那問題在防火牆或安全組
4. **檢查雲端安全組：** 如果是 AWS / GCP / Azure，要去安全組（Security Group）開放對應的 port
5. **檢查防火牆：** `ufw status` 或 `firewall-cmd --list-all`

90% 的「外部連不到」問題都是雲端安全組沒開，或是防火牆擋住了。

```bash
docker rm -f web1 web2 2>/dev/null
```

> **📝 練習題 4：Port Mapping 安全配置**
>
> 你要在 Linux 伺服器上部署以下服務，請寫出正確的 `-p` 參數：
>
> 1. Nginx Web 伺服器：需要讓外部訪問 HTTP (80) 和 HTTPS (443)
> 2. MySQL 資料庫：只給本機的應用程式連
> 3. Redis 快取：只給本機的應用程式連
> 4. Grafana 監控面板：只給公司內網 (192.168.1.0/24) 的人看
>
> **參考答案：**
> 1. `-p 80:80 -p 443:443`（需要對外，用預設的 0.0.0.0）
> 2. `-p 127.0.0.1:3306:3306`（只有本機能連）
> 3. `-p 127.0.0.1:6379:6379`（只有本機能連）
> 4. `-p 192.168.1.100:3000:3000`（綁定在內網 IP 上，假設內網 IP 是 192.168.1.100）

---

## 六、實作練習：Web + MySQL 容器通訊（5 分鐘）

好，前面講了這麼多概念和零散的指令，現在我們來做一個完整的實作，把所有東西串起來。

### 6.1 目標

我們要建立一個簡單的架構：

- **MySQL 容器**：存放資料，不對外暴露
- **Adminer 容器**：一個輕量的資料庫管理工具（類似 phpMyAdmin），對外暴露 port 8080
- 兩者透過自訂網路通訊，Adminer 用容器名稱連接 MySQL

架構圖：

```
                     瀏覽器
                       │
                   Port 8080
                       │
┌──────────── app-network ────────────┐
│                                      │
│   ┌──────────┐    ┌──────────────┐  │
│   │  MySQL   │────│   Adminer    │  │
│   │ (不對外)  │    │ (port 8080)  │  │
│   └──────────┘    └──────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

### 6.2 動手做

```bash
# 步驟一：建立自訂網路
docker network create app-network
```

```bash
# 步驟二：啟動 MySQL，加入自訂網路，不做 Port Mapping！
docker run -d \
  --name mysql-db \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=myapp \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppass \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0
```

注意幾個重點：

- `--network app-network`：加入自訂網路
- **沒有 `-p`**：MySQL 不需要對外暴露！
- `-v mysql-data:/var/lib/mysql`：上一堂課學的 Volume，讓資料持久化
- 環境變數設定了 root 密碼、預設資料庫、應用程式使用者

```bash
# 步驟三：啟動 Adminer，加入同一個網路，做 Port Mapping
docker run -d \
  --name adminer \
  --network app-network \
  -p 8080:8080 \
  adminer
```

Adminer 是一個很輕量的資料庫管理工具，只有一個 PHP 檔案，Docker 映像檔也很小。

```bash
# 步驟四：驗證
docker ps
```

你應該看到兩個容器都在跑：

```
CONTAINER ID  IMAGE      PORTS                   NAMES
a1b2c3d4e5f6  mysql:8.0                          mysql-db
f6e5d4c3b2a1  adminer    0.0.0.0:8080->8080/tcp  adminer
```

注意看 PORTS 欄位：mysql-db 那一行是空的（沒有 Port Mapping），adminer 有 `0.0.0.0:8080->8080/tcp`。

現在打開瀏覽器，訪問 `http://localhost:8080`，你會看到 Adminer 的登入頁面。

在登入頁面填入：

- **系統**：MySQL
- **伺服器**：`mysql-db`（注意！這裡填的是容器名稱，不是 IP！）
- **使用者名稱**：`appuser`
- **密碼**：`apppass`
- **資料庫**：`myapp`

點擊登入——應該可以成功登入，看到 myapp 資料庫！

**這就是完整的容器間通訊！** Adminer 用 `mysql-db` 這個名稱，透過 Docker 的 DNS 解析到 MySQL 容器的 IP，完成了資料庫連線。而 MySQL 完全沒有對外暴露，只有在同一個自訂網路裡的容器才能連到它。

### 6.3 重點回顧

這個簡短的實作包含了這堂課的所有核心知識：

1. **自訂網路**：`docker network create` 建立自訂 bridge 網路
2. **DNS 解析**：容器間用名稱互連（`mysql-db`）
3. **Port Mapping 策略**：只有需要對外的 Adminer 做了 -p，MySQL 不做
4. **Volume 持久化**：MySQL 資料用 Volume 保存（上堂課學的）

清理環境：

```bash
docker rm -f mysql-db adminer
docker network rm app-network
docker volume rm mysql-data
```

> **📝 練習題 5：進階架構挑戰**
>
> 請自己動手建立以下架構：
>
> 1. 建立兩個網路：`frontend` 和 `backend`
> 2. 啟動一個 Redis 容器（`--name redis`），加入 `backend` 網路
> 3. 啟動一個 MySQL 容器（`--name db`），加入 `backend` 網路
> 4. 啟動一個 Alpine 容器當作 API 伺服器（`--name api`），同時加入 `frontend` 和 `backend`
> 5. 啟動一個 Nginx 容器（`--name web`），加入 `frontend` 網路，映射 port 80
> 6. 驗證：
>    - `api` 能 ping 到 `redis` 和 `db`（通過 backend 網路）
>    - `web` 能 ping 到 `api`（通過 frontend 網路）
>    - `web` **不能** ping 到 `redis` 和 `db`（不同網路，隔離！）
>
> 提示：用 `docker network connect` 把 api 加入第二個網路。
>
> ```bash
> # 你來寫指令！
> # ...
> # 完成後記得清理：
> # docker rm -f web api db redis
> # docker network rm frontend backend
> ```

---

## 七、本堂課小結

好，我們來做個總結。

這堂課我們學了四大塊內容：

### 7.1 Docker 網路三種模式

| 模式 | 特點 | 何時使用 |
|------|------|---------|
| **bridge** | 虛擬橋接網路，有隔離 | 絕大多數情況（預設） |
| **host** | 直接用主機網路，無隔離 | 對效能極度敏感（Linux） |
| **none** | 完全沒有網路 | 安全敏感的離線任務 |

### 7.2 自訂 Bridge 網路（最重要！）

- **預設 bridge 不支援 DNS**，只能用 IP，IP 還會變
- **自訂 bridge 內建 DNS**，容器間用名稱互連
- **結論：永遠用自訂網路，不要用預設 bridge**

關鍵指令：

```bash
docker network create my-network                    # 建立
docker run --network my-network --name xxx ...      # 容器加入
docker network connect my-network container-name    # 動態加入
docker network disconnect my-network container-name # 動態移除
```

### 7.3 多網路隔離

- 用多個網路實現網路分段（Network Segmentation）
- 前端網路 + 後端網路，API 伺服器橋接兩者
- MySQL、Redis 等只在後端網路，前端完全不可達

### 7.4 Port Mapping 進階

完整語法：`-p [host_ip:]host_port:container_port[/protocol]`

| 參數 | 說明 |
|------|------|
| `-p 8080:80` | 所有介面可連（預設） |
| `-p 127.0.0.1:8080:80` | 只有本機可連（安全！） |
| `-p 192.168.1.100:8080:80` | 只有指定介面可連 |
| `-P` | 隨機分配 port |
| `-p 8080-8085:80-85` | 範圍映射 |
| `-p 53:53/udp` | 指定 UDP 協定 |

**安全原則：**

1. 不需要對外的服務→不做 Port Mapping，走內部網路
2. 必須做 Port Mapping 但不需要外部訪問→綁 `127.0.0.1`
3. Docker 會繞過 ufw/firewalld，務必注意！

### 7.5 板書 / PPT 建議

**投影片一：課堂地圖**

```
容器網路 + Port Mapping 進階
├── 網路三模式：bridge / host / none
├── ★ 自訂 Bridge 網路（內建 DNS）
├── 多網路隔離設計
├── Port Mapping 完整語法
└── 安全性：綁定 IP + 防火牆
```

**投影片二：預設 bridge vs 自訂 bridge**

```
┌─────────────────────────────────────┐
│         預設 bridge                  │
│  ✗ 不支援 DNS                       │
│  ✗ 只能用 IP 互連                   │
│  ✗ IP 會變動                        │
│  → 不建議在生產環境使用              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         自訂 bridge                  │
│  ✓ 內建 DNS                         │
│  ✓ 用名稱互連                       │
│  ✓ 支援網路別名                     │
│  ✓ 支援多網路隔離                   │
│  → 永遠用這個！                      │
└─────────────────────────────────────┘
```

**投影片三：安全架構圖**

```
           Internet
              │
          ┌───┴───┐
          │ Nginx │  -p 80:80
          └───┬───┘
              │ frontend-net（用名稱連）
          ┌───┴───┐
          │  API  │  不做 -p
          └───┬───┘
              │ backend-net（用名稱連）
        ┌─────┼─────┐
    ┌───┴───┐   ┌───┴───┐
    │ MySQL │   │ Redis │  都不做 -p
    └───────┘   └───────┘
```

**投影片四：Port Mapping 綁定策略**

```
-p 8080:80            → 全世界都能連 ⚠️
-p 127.0.0.1:8080:80  → 只有本機能連 🔒
-p 10.0.0.1:8080:80   → 只有指定網路能連 🔐
不做 -p               → 只有同網路容器能連 🔒🔒
```

好，這堂課的內容就到這裡。下一堂課我們要進入 **Dockerfile**，學習如何把自己的應用程式打包成 Docker 映像檔。容器網路和 Volume 都搞定之後，Dockerfile 學起來就會順暢很多，因為你已經知道容器的資料怎麼存、網路怎麼通了。

大家有問題嗎？沒有的話我們休息五分鐘，下堂課見！

---

**指令速查表：**

```bash
# 網路管理
docker network ls                              # 列出所有網路
docker network create <name>                   # 建立網路
docker network inspect <name>                  # 查看網路詳情
docker network rm <name>                       # 刪除網路
docker network prune                           # 清理未使用的網路
docker network connect <network> <container>   # 容器加入網路
docker network disconnect <network> <container> # 容器離開網路

# 啟動容器時指定網路
docker run --network <name> --name <container> <image>

# 網路別名
docker run --network <name> --network-alias <alias> <image>

# Port Mapping
docker run -p <host_port>:<container_port> <image>
docker run -p 127.0.0.1:<host_port>:<container_port> <image>
docker run -p <host_port>:<container_port>/udp <image>
docker run -P <image>                          # 隨機分配 port
docker port <container>                        # 查看 port 映射
```
