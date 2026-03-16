# Day 3 第十四小時：Docker Compose 實戰與課程總結

---

## 一、開場（3 分鐘）

上堂課：Docker Compose 基礎與進階（自訂網路、環境變數、depends_on + healthcheck、build 整合）。

本堂課：實戰與總結
- WordPress 部落格系統四服務實戰
- Docker Compose 實用技巧（環境分離、設定驗證）
- 兩天完整課程回顧
- 銜接 Kubernetes

---

## 二、實戰：完整的部落格系統（25 分鐘）

### 2.1 四層架構說明

```
          使用者（瀏覽器）
                │
                ▼
       ┌─────────────────┐
       │      Nginx      │  ← 反向代理，對外 Port 80
       └────────┬────────┘
                │
       ┌────────▼────────┐
       │    WordPress    │  ← PHP 應用程式
       └────┬───────┬────┘
            │       │
     ┌──────▼──┐ ┌──▼──────┐
     │  MySQL  │ │  Redis  │
     │ (資料庫) │ │ (快取)  │
     └─────────┘ └─────────┘
```

| 服務 | 角色 | 說明 |
|------|------|------|
| Nginx | 反向代理 | 接收請求，轉發給 WordPress；處理靜態檔案、SSL |
| WordPress | 應用程式 | PHP 應用，處理業務邏輯 |
| MySQL | 資料庫 | 儲存文章、帳號、設定 |
| Redis | 快取 | 快取資料庫查詢結果，加速回應 |

### 2.2 網路隔離設計

```
┌────────────────────────────────────┐
│  frontend 網路                      │
│  Nginx  ──►  WordPress             │
└─────────────────┬──────────────────┘
                  │
┌─────────────────┼──────────────────┐
│  backend 網路   │                  │
│           WordPress                │
│           ┌──┴──┐                  │
│         MySQL  Redis               │
└────────────────────────────────────┘
```

**最小權限原則**：Nginx 不需連資料庫，只加入 frontend；MySQL/Redis 只在 backend；WordPress 同時加入兩個網路作為橋樑。

### 2.3 專案目錄結構

```bash
wordpress-blog/
├── .env                 # 環境變數（密碼，不推 Git）
├── .env.example         # 範本（推 Git）
├── compose.yaml         # 服務定義
└── nginx/
    └── default.conf     # Nginx 設定
```

### 2.4 .env 環境變數

```bash
MYSQL_ROOT_PASSWORD=my-secret-root-pw
MYSQL_DATABASE=wordpress
MYSQL_USER=wp_user
MYSQL_PASSWORD=wp_password_123

WORDPRESS_DB_HOST=mysql:3306   # 服務名稱即 DNS
WORDPRESS_DB_USER=wp_user
WORDPRESS_DB_PASSWORD=wp_password_123
WORDPRESS_DB_NAME=wordpress
```

### 2.5 Nginx 設定

```nginx
# nginx/default.conf
server {
    listen 80;
    client_max_body_size 64M;    # WordPress 圖片上傳

    location / {
        proxy_pass http://wordpress:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2.6 完整 compose.yaml

```yaml
services:
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

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge

volumes:
  mysql-data:
  wordpress-data:
  redis-data:
```

### 2.7 啟動與驗證

```bash
# 啟動
docker compose up -d

# 查看狀態
docker compose ps
# NAME           IMAGE                       STATUS
# blog-mysql     mysql:8.0                   Up (healthy)
# blog-nginx     nginx:alpine                Up   0.0.0.0:80->80/tcp
# blog-redis     redis:7-alpine              Up (healthy)
# blog-wordpress wordpress:6-php8.2-apache   Up (healthy)

# 查看日誌（觀察啟動順序）
docker compose logs --tail=20
```

### 2.8 Volume 持久化驗證

```bash
# 刪除所有容器（Volume 保留）
docker compose down

# 重新啟動
docker compose up -d
# → WordPress 文章和帳號全部還在！
```

### 2.9 清理指令

```bash
docker compose down              # 停止容器，保留 Volume
docker compose down -v           # ⚠️ 連 Volume 一起刪（資料不可恢復）
docker compose down -v --rmi all # 連映像檔也刪
```

---

## 三、Docker Compose 實用技巧（10 分鐘）

### 3.1 環境分離（多檔案合併）

```
compose.yaml           → 所有環境共用的基礎設定
compose.override.yaml  → 開發環境專用（自動載入）
compose.prod.yaml      → 生產環境專用（手動指定）
```

**compose.yaml（基礎）**

```yaml
services:
  web:
    image: myapp:latest
    ports:
      - "80:3000"
    environment:
      NODE_ENV: production
```

**compose.override.yaml（開發，自動合併）**

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

**compose.prod.yaml（生產）**

```yaml
services:
  web:
    restart: always
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

| 環境 | 指令 |
|------|------|
| 開發（自動套用 override） | `docker compose up` |
| 生產 | `docker compose -f compose.yaml -f compose.prod.yaml up -d` |

### 3.2 驗證設定

```bash
# 驗證並顯示合併後的完整設定（展開環境變數）
docker compose config

# 驗證指定組合
docker compose -f compose.yaml -f compose.prod.yaml config

# 只驗證語法
docker compose config --quiet
```

### 3.3 更新映像檔

```bash
# 拉取最新映像檔後重新啟動（只重建有變化的服務）
docker compose pull
docker compose up -d
```

---

## 四、Docker Compose vs 手動 docker run 對比（5 分鐘）

### 對比表

| 面向 | docker run（手動） | Docker Compose |
|------|-------------------|----------------|
| 啟動多服務 | 一個一個打 docker run | `docker compose up` 一個指令 |
| 網路管理 | 手動 create、手動 connect | YAML 宣告，自動建立 |
| Volume 管理 | 手動 create、手動 -v | YAML 宣告，自動建立 |
| 環境變數 | 每個容器 -e 一個一個打 | .env 統一管理 |
| 啟動順序 | 自己等、自己記 | depends_on + healthcheck |
| 查看日誌 | docker logs 一個一個 | `docker compose logs` 全部 |
| 清理資源 | stop、rm、network rm 逐一 | `docker compose down` |
| 團隊協作 | 腳本或文件 | 共享 compose.yaml |
| 版本控制 | 腳本難管理 | 純文字 YAML，放 Git |

**原則：超過一個容器就用 Compose。**

---

## 五、Day 3 完整課程回顧（10 分鐘）

### Day 3 七堂課

| 小時 | 主題 | 一句話總結 |
|------|------|-----------|
| Hour 8 | Volume 資料持久化 | 容器的資料不怕丟 |
| Hour 9 | 容器網路 + Port Mapping | 讓容器互通，讓外面連進來 |
| Hour 10 | Dockerfile 基礎 | 能寫出可以用的 Dockerfile |
| Hour 11 | Dockerfile 進階與最佳化 | 能寫出又小又安全的 Dockerfile |
| Hour 12 | Dockerfile 實戰 + 除錯 | 能打包真實專案並解決問題 |
| Hour 13 | Docker Compose 基礎與進階 | 能用 YAML 管理多容器應用 |
| Hour 14 | Compose 實戰 + 課程總結 | 能部署完整的應用 |

### 兩天完整回顧

| 天數 | 小時 | 主題 | 你學會了什麼 |
|------|------|------|-------------|
| Day 2 | Hour 1 | 環境一致性問題 | 為什麼需要 Docker |
| Day 2 | Hour 2 | Docker 架構 | Client-Daemon-Registry |
| Day 2 | Hour 3 | Docker 安裝 | 在各種系統上裝 Docker |
| Day 2 | Hour 4 | 基本指令（上） | pull、images、run、ps |
| Day 2 | Hour 5 | 基本指令（下） | stop、rm、logs、exec |
| Day 2 | Hour 6 | Nginx 實戰 | Port mapping、Volume 初體驗 |
| Day 2 | Hour 7 | 實作練習 | 綜合應用 |
| Day 3 | Hour 8 | Volume 持久化 | 三種掛載、備份還原 |
| Day 3 | Hour 9 | 容器網路 | Bridge、Host、自訂網路 |
| Day 3 | Hour 10 | Dockerfile 基礎 | 指令詳解、建構映像檔 |
| Day 3 | Hour 11 | Dockerfile 進階 | Multi-stage、快取、安全 |
| Day 3 | Hour 12 | Dockerfile 實戰 | 多語言打包、除錯 |
| Day 3 | Hour 13 | Docker Compose | 多容器編排、網路隔離 |
| Day 3 | Hour 14 | Compose 實戰 + 總結 | 部署完整應用、後續學習 |

### Docker 完整工作流程

```
Dockerfile ─── docker build ──► Image ─── docker push ──► Registry
                                  │                            │
                                  │ docker run          docker pull
                                  ▼                            ▼
                              Container                     Image

compose.yaml ─── docker compose up ──► Container + Network + Volume
```

### 核心概念速查

| 概念 | 一句話說明 |
|------|-----------|
| 容器 vs 虛擬機 | 容器共享核心，輕量快速；虛擬機有完整 OS，隔離更好但更重 |
| 映像檔分層 | 一層一層疊，每層唯讀，多映像可共享底層 |
| Volume | 容器是暫時的，Volume 才是永久的，重要資料一定用 Volume |
| 自訂網路 | 有 DNS 功能，容器用名稱互通，安全隔離 |
| Dockerfile | Multi-stage 減小體積、利用快取加速、不用 root |
| Docker Compose | 多容器標準管理工具，一個 YAML 定義一切 |

### 最佳實踐速查

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

### Docker 的限制

| 限制 | 說明 |
|------|------|
| 單機限制 | 所有容器在同一台機器，機器掛了全部掛 |
| 無自動擴縮 | 流量暴增需手動增加容器 |
| 無跨機故障恢復 | 整台機器掛了服務不會自動遷移 |
| 無滾動更新 | 更新版本有停機時間 |
| 無智能負載均衡 | 無內建機制分配多容器流量 |

### Docker → Kubernetes 概念對應

| Docker 概念 | Kubernetes 對應 | 說明 |
|------------|-----------------|------|
| Container | Pod | Pod 是最小調度單位，可包含多個 Container |
| `docker run` | `kubectl apply` | 用 YAML 描述期望狀態 |
| compose.yaml | K8s manifest YAML | 格式不同，概念相同 |
| 手動擴縮 | HPA（自動擴縮器） | 根據 CPU/記憶體自動擴縮 |
| `restart: always` | Deployment + ReplicaSet | 自動維持指定數量的 Pod |
| docker network | Service + Ingress | 服務發現和外部存取 |
| docker volume | PersistentVolume + PVC | 更完善的儲存管理 |
| .env 檔案 | ConfigMap + Secret | 設定和敏感資訊的標準管理 |

### 一個比喻

| 工具 | 比喻 |
|------|------|
| Docker | 會開車——從 A 到 B |
| Docker Compose | 管理車隊——同時調度好幾台車 |
| Kubernetes | 交通管理局——管理整個城市的交通，自動路線規劃、故障應變、流量控制 |

**Docker 是基礎，K8s 是進階。Docker 的容器化思維、Dockerfile、映像檔管理在 K8s 全部用得到。**

---

## 七、學生綜合練習題

| 題號 | 難度 | 題目 |
|------|------|------|
| 1 | 基礎 | 用 Compose 搭建 Nginx + PHP-FPM，Nginx 對外 8080，PHP-FPM 只在內部網路 |
| 2 | 進階 | Node.js Express + MongoDB：寫 Dockerfile（Multi-stage + non-root）+ compose.yaml（healthcheck + .env） |
| 3 | 進階 | 基於題 2 建立環境分離：compose.yaml / compose.override.yaml / compose.prod.yaml |
| 4 | 除錯 | 找出並修正以下 compose.yaml 的 5 個問題（安全性、可靠性、最佳實踐） |
| 5 | 設計 | 微服務系統：API Gateway + 使用者服務 + 訂單服務 + PostgreSQL + Redis + RabbitMQ，設計網路拓撲、Volume 規劃、啟動順序 |

---

## 八、附錄：Docker 常用指令速查表

| 分類 | 常用指令 |
|------|---------|
| 映像檔管理 | `pull` / `images` / `rmi` / `build` / `tag` / `push` / `save` / `load` / `image prune` / `history` |
| 容器管理 | `run -d` / `run -it` / `ps` / `ps -a` / `stop` / `start` / `restart` / `rm` / `rm -f` / `logs -f` / `exec -it` / `inspect` / `stats` / `cp` / `container prune` |
| 常用 run 參數 | `-d` / `-it` / `--name` / `-p` / `-v` / `-e` / `--env-file` / `--network` / `--restart` / `--memory` / `--cpus` / `--rm` |
| 網路管理 | `network create` / `ls` / `inspect` / `rm` / `connect` / `disconnect` / `prune` |
| Volume 管理 | `volume create` / `ls` / `inspect` / `rm` / `prune` |
| Docker Compose | `up -d` / `down` / `down -v` / `ps` / `logs` / `logs -f` / `exec` / `build` / `pull` / `restart` / `stop` / `config` / `top` / `-f <file> up -d` / `up -d --scale` |
| 系統清理 | `system df` / `system prune` / `system prune -a` / `system prune -a --volumes` |

---

## 九、結語

| 項目 | 說明 |
|------|------|
| 實戰架構 | Nginx + WordPress + MySQL + Redis 四層架構，兩個隔離網路，三個 named volume |
| 環境分離 | compose.yaml（基礎）+ override（開發自動合併）+ prod（手動指定） |
| 設定驗證 | `docker compose config` 展開所有變數、合併所有檔案後輸出結果 |
| 核心原則 | 敏感資訊用 .env；depends_on + healthcheck 保證啟動順序；資源限制保護系統穩定 |
| 後續方向 | Docker 熟練 → Kubernetes → CI/CD |

---

## 板書 / PPT 建議

1. **部落格系統架構圖**：四服務關係與網路分層（Nginx → WordPress → MySQL + Redis），用不同顏色區分 frontend / backend 網路
2. **完整 compose.yaml 展示**：語法高亮，標注 healthcheck、depends_on、networks、volumes、deploy 等關鍵設定
3. **開發 vs 生產環境**：compose.yaml + compose.override.yaml + compose.prod.yaml 的合併流程圖
4. **Docker Compose vs docker run 對比表**：左右對照，Compose 優勢一目瞭然
5. **兩天課程總覽表**：Day 2 / Day 3 各小時主題與一句話總結
6. **Docker 完整工作流程圖**：Dockerfile → build → Image → push/pull → Container → compose.yaml
7. **Docker 到 K8s 對應表**：左邊 Docker、右邊 K8s、中間連線說明
8. **Docker 指令速查表**：印成 cheat sheet 發給學生帶回去
