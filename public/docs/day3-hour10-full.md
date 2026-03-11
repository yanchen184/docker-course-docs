# Day 3 第十小時：容器網路基礎

---

## 一、前情提要（2 分鐘）

上堂課講了容器生命週期管理。

這堂課講容器網路：
- Docker 網路模式
- 容器之間的通訊
- 自訂網路
- DNS 與服務發現

---

## 二、Docker 網路概述（8 分鐘）

### 2.1 為什麼需要理解容器網路

- 容器之間要能互相通訊（如 Web 連資料庫）
- 外部要能存取容器內的服務
- 需要隔離不同應用的網路

### 2.2 查看現有網路

```bash
docker network ls
```

輸出：

```
NETWORK ID     NAME      DRIVER    SCOPE
abc123def456   bridge    bridge    local
def456abc123   host      host      local
789xyz123abc   none      null      local
```

Docker 預設建立三個網路：bridge、host、none。

### 2.3 三種網路驅動

| 驅動 | 說明 |
|-----|------|
| bridge | 預設，容器透過虛擬橋接器連接 |
| host | 容器直接使用主機網路 |
| none | 沒有網路 |
| overlay | 跨主機網路（用於 Swarm） |
| macvlan | 給容器分配 MAC 位址 |

---

## 三、Bridge 網路（15 分鐘）

### 3.1 Bridge 網路原理

Bridge 是預設的網路模式。

```
┌─────────────────────────────────────────────┐
│                    Host                      │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │Container│  │Container│  │Container│     │
│  │   A     │  │   B     │  │   C     │     │
│  │172.17.  │  │172.17.  │  │172.17.  │     │
│  │  0.2    │  │  0.3    │  │  0.4    │     │
│  └────┬────┘  └────┬────┘  └────┬────┘     │
│       │            │            │          │
│       └────────────┼────────────┘          │
│                    │                        │
│            ┌───────┴───────┐                │
│            │  docker0      │                │
│            │  172.17.0.1   │                │
│            └───────┬───────┘                │
│                    │                        │
│            ┌───────┴───────┐                │
│            │    eth0       │──────► 外部網路
│            │  192.168.1.x  │                │
│            └───────────────┘                │
└─────────────────────────────────────────────┘
```

- Docker 建立虛擬橋接器 `docker0`
- 每個容器連接到這個橋接器
- 容器取得 172.17.0.x 的 IP
- 容器之間可以互相通訊
- 外部存取需要 Port Mapping

### 3.2 查看 docker0 介面

```bash
ip addr show docker0
```

或在 Mac/Windows：

```bash
docker network inspect bridge
```

### 3.3 查看容器 IP

```bash
# 方法一
docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' my-nginx

# 方法二：進入容器
docker exec my-nginx ip addr
docker exec my-nginx cat /etc/hosts
```

### 3.4 容器之間通訊（預設 bridge）

```bash
# 啟動兩個容器
docker run -d --name web nginx:alpine
docker run -d --name app alpine sleep 3600

# 取得 web 的 IP
docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' web
# 假設是 172.17.0.2

# 從 app 連接 web
docker exec app ping 172.17.0.2
docker exec app wget -qO- 172.17.0.2
```

用 IP 可以通，但有問題：
- IP 是動態分配的，重啟可能改變
- 不好維護

### 3.5 預設 bridge 的限制

預設的 bridge 網路：
- **沒有 DNS 解析**：不能用容器名稱互連
- 需要用 `--link`（已廢棄）

所以我們需要自訂網路。

---

## 四、自訂 Bridge 網路（15 分鐘）

### 4.1 建立自訂網路

```bash
docker network create my-network
```

### 4.2 查看網路詳情

```bash
docker network inspect my-network
```

輸出包含：
- 子網路範圍
- 閘道
- 連接的容器

### 4.3 容器加入自訂網路

**方法一：啟動時指定**

```bash
docker run -d --name web --network my-network nginx:alpine
docker run -d --name app --network my-network alpine sleep 3600
```

**方法二：動態連接**

```bash
docker network connect my-network my-container
docker network disconnect my-network my-container
```

### 4.4 自訂網路的 DNS

**這是重點：自訂網路有內建 DNS！**

```bash
# 用容器名稱連接
docker exec app ping web
docker exec app wget -qO- http://web
```

不需要知道 IP，直接用容器名稱。

這就是為什麼要用自訂網路。

### 4.5 網路別名

```bash
docker run -d --name web-server \
  --network my-network \
  --network-alias web \
  --network-alias nginx \
  nginx:alpine
```

現在可以用 `web-server`、`web`、`nginx` 三個名稱連接這個容器。

### 4.6 實作：Web + Database

```bash
# 建立網路
docker network create app-network

# 啟動 MySQL
docker run -d \
  --name db \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  mysql:8.0

# 等待 MySQL 啟動
sleep 30

# 啟動應用（用 db 作為資料庫主機名）
docker run -d \
  --name web \
  --network app-network \
  -e DATABASE_HOST=db \
  -e DATABASE_PORT=3306 \
  -p 8080:80 \
  my-web-app
```

Web 容器可以用 `db` 這個名稱連接 MySQL。

---

## 五、Host 網路（5 分鐘）

### 5.1 什麼是 Host 網路

容器直接使用主機的網路 stack，沒有隔離。

```bash
docker run -d --network host nginx
```

### 5.2 特點

- 沒有 Port Mapping，容器直接監聽主機 port
- 效能最好（沒有 NAT 轉換）
- 沒有網路隔離

### 5.3 使用場景

- 需要最高網路效能
- 需要存取主機網路功能
- 在 Linux 上運行（Mac/Windows 的 Docker Desktop 不完全支援）

### 5.4 注意事項

- 容器的 port 和主機 port 可能衝突
- 安全性較低
- Mac/Windows 上 host 模式行為不同

---

## 六、None 網路（3 分鐘）

### 6.1 什麼是 None 網路

容器完全沒有網路連接。

```bash
docker run -d --network none alpine sleep 3600
```

### 6.2 使用場景

- 處理敏感資料，不想讓容器連網
- 批次處理任務，不需要網路
- 自己手動設定網路

---

## 七、網路管理命令（5 分鐘）

### 7.1 完整命令列表

```bash
# 列出網路
docker network ls

# 建立網路
docker network create my-network
docker network create --driver bridge --subnet 172.20.0.0/16 my-network

# 查看網路詳情
docker network inspect my-network

# 連接/斷開容器
docker network connect my-network my-container
docker network disconnect my-network my-container

# 刪除網路
docker network rm my-network

# 清理未使用的網路
docker network prune
```

### 7.2 建立自訂子網路

```bash
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  my-custom-network
```

### 7.3 查看容器連接的網路

```bash
docker inspect -f '{{json .NetworkSettings.Networks}}' my-container | jq
```

### 7.4 一個容器多個網路

```bash
docker run -d --name multi-net --network network1 nginx
docker network connect network2 multi-net
```

現在這個容器同時在兩個網路上。

---

## 八、容器通訊總結（5 分鐘）

### 8.1 同一台主機上的容器

| 情況 | 方法 |
|-----|------|
| 同一個自訂網路 | 用容器名稱或別名 |
| 預設 bridge 網路 | 用 IP（不推薦） |
| 不同網路 | 無法通訊，除非容器加入多個網路 |

### 8.2 最佳實踐

1. **不要用預設的 bridge 網路**
   - 沒有 DNS
   - 所有容器混在一起

2. **為每個應用/專案建立獨立網路**
   - 網路隔離
   - 方便管理

3. **用容器名稱通訊，不要用 IP**
   - IP 會變
   - 名稱容易理解

4. **敏感服務不要暴露 port**
   - MySQL 不需要 `-p 3306:3306`
   - 只讓同網路的容器存取

### 8.3 範例架構

```
┌─────────────────────────────────────────┐
│            frontend-network             │
│  ┌─────────┐                           │
│  │  nginx  │ ◄─────── Port 80 ─────► 外部
│  │(reverse │                           │
│  │ proxy)  │                           │
│  └────┬────┘                           │
└───────┼─────────────────────────────────┘
        │
┌───────┼─────────────────────────────────┐
│       │       backend-network           │
│  ┌────┴────┐  ┌─────────┐  ┌─────────┐ │
│  │   api   │  │   db    │  │  redis  │ │
│  │ server  │──│  mysql  │  │         │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                  不暴露 port            │
└─────────────────────────────────────────┘
```

nginx 同時在兩個網路，可以連到 api。
db 和 redis 只在 backend-network，外部無法存取。

---

## 九、本堂課小結（2 分鐘）

這堂課學了容器網路：

**三種網路模式**
- bridge：預設，透過虛擬橋接器
- host：直接用主機網路
- none：無網路

**自訂網路的優點**
- 內建 DNS（用容器名稱通訊）
- 網路隔離
- 容易管理

**網路管理命令**
- docker network create/ls/inspect/rm
- docker network connect/disconnect

**最佳實踐**
- 為每個應用建立獨立網路
- 用容器名稱通訊
- 只暴露必要的 port

下一堂：Port Mapping 進階。

---

## 板書 / PPT 建議

1. Bridge 網路架構圖
2. 預設 bridge vs 自訂 bridge 比較
3. 三種網路模式比較表
4. 多網路架構範例圖
