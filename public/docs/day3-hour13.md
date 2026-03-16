# Day 3 第十三小時：Docker Compose 基礎與進階

---

## 一、為什麼需要 Docker Compose（10 分鐘）

### 痛點：用 docker run 管理多容器

一個典型電商系統的容器組成：

```
Nginx（前端 / 反向代理）
  └─▶ Node.js API（後端）
        ├─▶ MySQL（資料庫）
        └─▶ Redis（快取）
```

四個服務就需要打六道指令（建網路、建 Volume、依序啟動每個容器），且：
- 容易打錯參數
- 啟動順序要手動記住
- 新人加入難以重現環境
- 停止時需逐一清理

### Docker Compose 解法

```bash
docker compose up -d    # 全部啟動
docker compose down     # 全部停止並清理
```

- 所有設定寫進一個 `compose.yaml`，放進 Git 版本控制
- 新同事 `git clone` → `docker compose up -d`，開發環境立即就緒

### v1 vs v2 比較

| 比較項目 | Compose v1（舊版） | Compose v2（新版） |
|---------|-------------------|-------------------|
| 指令寫法 | `docker-compose`（有 dash） | `docker compose`（空格） |
| 安裝方式 | 獨立 Python 程式 | Docker CLI 外掛 |
| 效能 | 較慢 | 較快（Go 重寫） |
| 維護狀態 | 已停止維護 | 官方推薦 |

**本課程統一使用 v2**：`docker compose`（空格）。

```bash
docker compose version
# Docker Compose version v2.24.5
```

---

## 二、compose.yaml 基本結構（15 分鐘）

### 檔案命名優先順序

1. `compose.yaml`（官方推薦）
2. `compose.yml`
3. `docker-compose.yaml`
4. `docker-compose.yml`

### 最簡範例

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
```

等同於：`docker run -d --name web -p 8080:80 nginx:alpine`

### 完整範例（帶說明）

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

### 三大頂層區塊

```yaml
services:    # 定義服務（容器），必填
  ...
volumes:     # 定義具名 Volume
  ...
networks:    # 定義自訂網路（可選）
  ...
```

### compose.yaml vs docker run 對照表

| compose.yaml 設定 | docker run 參數 | 說明 |
|-------------------|----------------|------|
| `image: nginx` | `docker run nginx` | 映像檔 |
| `ports: ["8080:80"]` | `-p 8080:80` | Port mapping |
| `volumes: [./html:/app]` | `-v ./html:/app` | 掛載資料卷 |
| `environment: {KEY: val}` | `-e KEY=val` | 環境變數 |
| `container_name: my-web` | `--name my-web` | 容器名稱 |
| `restart: always` | `--restart always` | 重啟策略 |
| `networks: [my-net]` | `--network my-net` | 加入網路 |
| `command: ["node", "app.js"]` | 映像檔後接的指令 | 覆蓋 CMD |

### YAML 常見陷阱

| 陷阱 | 說明 |
|------|------|
| 縮排只能用空格 | Tab 會導致解析錯誤，肉眼難以分辨 |
| 冒號後要有空格 | `image:nginx` 是錯的，應為 `image: nginx` |
| port 要加引號 | YAML 會把 `8080:80` 誤解為六十進位數值 |

---

## 三、docker compose 指令（10 分鐘）

### 常用指令

```bash
# 背景啟動所有服務（最常用）
docker compose up -d

# 停止並刪除容器和網路（Volume 保留）
docker compose down

# 連 Volume 一起刪（⚠️ 資料不可恢復！）
docker compose down -v

# 查看服務狀態
docker compose ps

# 追蹤所有服務日誌
docker compose logs -f

# 追蹤特定服務日誌
docker compose logs -f db

# 進入容器執行指令
docker compose exec web bash
docker compose exec db mysql -uroot -psecret

# 停止（不刪除容器）
docker compose stop

# 啟動已停止的容器
docker compose start

# 重啟（可指定單一服務）
docker compose restart web
```

### stop vs down 的差異

| 指令 | 容器狀態 | Volume | 網路 | 適用時機 |
|------|---------|--------|------|---------|
| `stop` | 保留 | 保留 | 保留 | 暫停省資源，稍後還要用 |
| `down` | 刪除 | 保留 | 刪除 | 清理環境、重新來過 |

### 啟動時的自動命名規則

Compose 用**資料夾名稱**當前綴，例如 `myproject/` 資料夾中的服務：
- 容器：`myproject-web-1`、`myproject-db-1`
- 網路：`myproject_default`

---

## 四、進階功能（20 分鐘）

### 4.1 Networks：自訂網路隔離

**預設行為**：所有服務都在同一個 `資料夾_default` bridge network，可互相連線，service name 就是 hostname。

```bash
docker compose exec web ping db
# PING db (172.18.0.3): 56 data bytes
```

**為何需要隔離**：三層架構中，前端 Nginx 不該直接連到資料庫（縱深防禦）。

```yaml
services:
  nginx:
    image: nginx:alpine
    networks:
      - frontend-net

  api:
    image: node:20-slim
    networks:
      - frontend-net   # 能連 nginx
      - backend-net    # 能連 db

  db:
    image: mysql:8.0
    networks:
      - backend-net    # nginx 連不到！

networks:
  frontend-net:
  backend-net:
```

**關鍵觀念**：Service name = hostname。程式碼裡連資料庫要寫 service name，不是 `localhost`：

```javascript
const connection = mysql.createConnection({
  host: 'db',   // ✅ service name
  // host: 'localhost'  ← ❌ 連不到
});
```

### 4.2 Environment 與 .env 檔案

**問題**：密碼寫在 `compose.yaml` 裡，隨 Git 推送，安全性低，且無法因環境不同而切換。

**三種設定方式：**

```yaml
# 方式一：直接寫（適合非敏感設定）
environment:
  MYSQL_ROOT_PASSWORD: my-secret-pw

# 方式二：引用外部 .env 檔案
env_file:
  - .env

# 方式三：${} 變數替換（含預設值語法）
environment:
  MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
ports:
  - "${DB_PORT:-3306}:3306"   # 未設定時預設 3306
```

**環境變數優先順序：**

| 優先順序 | 來源 | 說明 |
|---------|------|------|
| 1（最高）| Shell 環境變數 | `export KEY=val` |
| 2 | .env 檔案 | compose.yaml 同目錄下 |
| 3（最低）| compose.yaml 預設值 | `${VAR:-default}` |

**安全最佳實踐：**

```bash
# .gitignore
.env

# 提供範本供團隊參考（可 commit）
cp .env.example .env
```

### 4.3 depends_on + healthcheck

**問題**：MySQL 容器啟動 ≠ MySQL 服務已就緒（初始化需 10～20 秒）。

```
0s  → db 容器啟動
1s  → api 容器啟動（depends_on 條件滿足）
2s  → api 嘗試連線 db → 失敗！MySQL 還在初始化
15s → MySQL 就緒，但 api 已掛掉
```

**正確解法：healthcheck + condition: service_healthy**

```yaml
services:
  api:
    depends_on:
      db:
        condition: service_healthy   # 等 healthcheck 通過才啟動

  db:
    image: mysql:8.0
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-psecret"]
      interval: 5s        # 每 5 秒檢查一次
      timeout: 3s         # 超時視為失敗
      retries: 10         # 連續 10 次失敗才判定 unhealthy
      start_period: 30s   # 啟動後 30 秒內失敗不計入 retries
```

**常見服務的 healthcheck 指令：**

| 服務 | Healthcheck 指令 |
|------|-----------------|
| MySQL | `mysqladmin ping -h localhost` |
| PostgreSQL | `pg_isready -U postgres` |
| Redis | `redis-cli ping` |
| MongoDB | `mongosh --eval "db.runCommand('ping')"` |
| Nginx | `curl -f http://localhost/` |

### 4.4 Build 整合

**直接在 Compose 裡 build 自己的 Dockerfile：**

```yaml
services:
  api:
    build:
      context: ./backend          # Dockerfile 所在目錄
      dockerfile: Dockerfile      # 可省略，預設 Dockerfile
    ports:
      - "3000:3000"
```

**Build 相關指令：**

```bash
docker compose build              # 只 build，不啟動
docker compose up -d              # build 並啟動（已有映像檔時不重 build）
docker compose up -d --build      # 強制重新 build（改程式碼必用）
docker compose build api          # 只 build 特定服務
```

> 改了程式碼但沒加 `--build`，Compose 會用舊映像檔，改動不會生效。

**開發模式（Volume 掛載 + hot reload）：**

```yaml
services:
  api:
    build:
      context: ./backend
    volumes:
      - ./backend/src:/app/src   # 本機改動即時同步到容器
```

**進階 build 選項：**

```yaml
build:
  context: ./backend
  dockerfile: Dockerfile.dev
  args:
    NODE_VERSION: "20"
  target: development            # 指定 multi-stage 的 target stage
```

### 4.5 其他實用設定

**restart 重啟策略：**

| 值 | 行為 |
|----|------|
| `no` | 不自動重啟（預設） |
| `always` | 永遠重啟 |
| `on-failure` | 非正常退出才重啟 |
| `unless-stopped` | 除非手動停止，否則重啟（正式環境推薦） |

**資源限制（防止服務吃光機器資源）：**

```yaml
deploy:
  resources:
    limits:
      cpus: '0.50'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

---

## 五、綜合實作：三層架構應用

### 架構圖

```
瀏覽器
  │ Port 80
  ▼
┌─────────┐ frontend-net ┌─────────┐ backend-net ┌─────────┐
│  Nginx  │─────────────▶│ Node.js │────────────▶│  MySQL  │
│ (前端)   │              │  (API)  │             │  (DB)   │
└─────────┘              └─────────┘             └─────────┘
```

### 專案結構

```
my-app/
├── compose.yaml
├── .env
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   └── src/index.js
└── nginx/
    └── default.conf
```

### 完整 compose.yaml

```yaml
services:
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

  api:
    build:
      context: ./backend
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

### Nginx 反向代理設定重點

```nginx
location / {
    proxy_pass http://api:3000;   # service name 當 hostname
}
```

### 驗證指令

```bash
docker compose up -d --build
docker compose ps                           # 確認 db 顯示 (healthy)
docker compose logs -f
curl http://localhost

# 驗證網路隔離
docker compose exec nginx ping api          # 可以連
docker compose exec nginx ping db           # 連不到！
docker compose exec api ping db             # 可以連

docker compose down
```

---

## 六、學生練習題

| 題號 | 練習主題 | 要求 |
|------|---------|------|
| 練習 1 | 基本 Compose 操作 | 建立 compose.yaml（Nginx + Redis）；用 ps / exec / down 驗證 |
| 練習 2 | Network 隔離 | frontend / backend / database 三服務，設定兩個 network，驗證 frontend 連不到 database |
| 練習 3 | 環境變數管理 | PostgreSQL + .env + .env.example；compose.yaml 用 ${} 引用 |
| 練習 4 | Healthcheck 實作 | 在練習 3 加 healthcheck；新增 adminer 服務並設定 depends_on condition: service_healthy |
| 練習 5（挑戰） | 完整三層架構 | Nginx + 自建 API + MySQL/PostgreSQL；使用自訂 network、.env、healthcheck、build、named volume |

---

## 七、本堂課小結

### 基礎部分

| 主題 | 重點 |
|------|------|
| 為什麼需要 Compose | docker run 管理多容器痛苦，一個 YAML 搞定 |
| 版本 | 統一使用 v2（`docker compose` 空格） |
| compose.yaml 結構 | services / volumes / networks 三大區塊 |
| 核心指令 | `up -d` / `down` / `ps` / `logs -f` / `exec` |

### 進階部分

| 主題 | 重點 |
|------|------|
| Networks | 自訂 network 隔離服務；service name = hostname |
| Environment | .env 管理敏感資訊；記得加進 .gitignore |
| depends_on | 基本用法只等容器啟動；搭配 healthcheck 才等服務 ready |
| Build 整合 | compose 直接 build Dockerfile；改程式碼要加 `--build` |
| 其他設定 | restart 策略、資源限制、command 覆蓋 |

### 最重要的三個觀念

1. **Network 隔離是好習慣**——用 network 控制誰能連誰，不是所有服務都該互通。

2. **密碼不寫在 compose.yaml**——用 `.env` + `.gitignore`，這是安全底線。

3. **depends_on 不等於 service ready**——搭配 `healthcheck` + `condition: service_healthy` 才是正確做法。

---

## 板書 / PPT 建議

1. **痛點對比圖**：6 道 docker run 指令 vs 1 個 compose.yaml + 1 道指令
2. **compose.yaml 結構圖**：services / volumes / networks 三大區塊層級關係
3. **docker run ↔ compose.yaml 對照表**
4. **常用指令速查表**：up / down / ps / logs / exec
5. **Network 隔離架構圖**：frontend-net 和 backend-net，標示哪個服務在哪個 network
6. **環境變數優先順序**：Shell > .env > compose.yaml default
7. **depends_on 的坑（時序圖）**：容器啟動 ≠ 服務 ready
8. **Healthcheck 參數說明**：interval / timeout / retries / start_period
9. **常見服務 healthcheck 對照表**：MySQL / PostgreSQL / Redis
10. **三層架構完整圖**：Nginx → API → MySQL，標示 network、volume、port
11. **⚠️ 警告標示**：`docker compose down -v` 會刪除所有資料，不可逆
