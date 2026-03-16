# Day 3 第八小時：Volume 資料持久化

---

## 一、Day3 開場回顧（5 分鐘）

Day2 複習：Image / Container 概念、基礎指令、Port Mapping、Nginx Bind Mount 實戰。

**今天 Day3 規劃：**

| 時段 | 主題 | 重點 |
|------|------|------|
| 第八小時（現在） | **Volume 資料持久化** | 資料不跟著容器消失 |
| 第九小時 | Docker 網路 | 容器之間怎麼溝通 |
| 第十～十二小時 | Dockerfile（3 小時） | 把應用打包成 Image |
| 第十三～十四小時 | Docker Compose（2 小時） | 一次管理多個容器 |

---

## 二、為什麼需要 Volume（10 分鐘）

### 核心問題：容器的讀寫層

- Image 是唯讀分層結構，容器會在上面加一個 **R/W Layer**
- **R/W Layer 會隨著 `docker rm` 一起被刪除**
- 所有寫入的資料（新增檔案、資料庫記錄等）都存在 R/W Layer

### 實際演示：資料消失

```bash
# 啟動 MySQL（故意不用 Volume）
docker run -d --name mysql-no-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=myapp \
  mysql:8.0

# 進入寫資料
docker exec -it mysql-no-volume mysql -uroot -ptest123
```

```sql
USE myapp;
CREATE TABLE employees (...);
INSERT INTO employees VALUES ('張三','工程部'), ...;
SELECT * FROM employees;   -- 看到三筆資料
```

```bash
# 刪容器再重建
docker stop mysql-no-volume && docker rm mysql-no-volume
docker run -d --name mysql-no-volume ...

# 查資料
docker exec -it mysql-no-volume mysql -uroot -ptest123 \
  -e "SELECT * FROM myapp.employees;"
# ERROR 1146: Table 'myapp.employees' doesn't exist
```

**結論：資料全部消失。**

### 比喻

| 比喻 | 說明 |
|------|------|
| 容器 = 便利貼 | 用完就丟，上面寫的東西一起消失 |
| Volume = 筆記本 | 獨立存在，換多少個便利貼都沒影響 |

---

## 三、三種掛載方式（15 分鐘）

### 3.1 概覽

```
┌──────────────────────────────────────────────┐
│              Docker Host（主機）               │
│  ┌──────────┐  ┌──────────────┐  ┌────────┐  │
│  │  Volume  │  │  Bind Mount  │  │ tmpfs  │  │
│  │ (Docker) │  │ (你指定目錄)  │  │ (記憶體)│  │
│  └────┬─────┘  └──────┬───────┘  └───┬────┘  │
│       └───────────────┴──────────────┘        │
│              Container 容器                    │
└──────────────────────────────────────────────┘
```

### 3.2 Volume（Docker 管理的卷）

Docker 官方**最推薦**的方式。Docker 在 `/var/lib/docker/volumes/` 自動管理儲存空間。

**優點：**
1. 跨平台一致，不受路徑格式影響
2. 生命週期獨立於容器
3. 可被多個容器同時掛載
4. 完整的 CLI 管理（create / ls / inspect / rm / prune）
5. Docker Desktop 下 I/O 效能較 Bind Mount 好

```bash
docker volume create my-data
docker run -d --name app -v my-data:/data nginx:alpine
```

### 3.3 Bind Mount（指定主機目錄）

把主機上的具體目錄或檔案直接映射到容器。

```bash
docker run -d --name web \
  -v $(pwd)/html:/usr/share/nginx/html \
  nginx:alpine
```

**特點：** 主機修改立即反映到容器，是開發環境的利器。

**缺點：**
- 路徑與主機綁定，可攜性差
- 安全性疑慮（容器可存取主機檔案系統）
- Docker Desktop 下 I/O 效能較慢

**原則：開發環境用 Bind Mount，生產環境用 Volume。**

### 3.4 tmpfs Mount（記憶體掛載）

資料存在記憶體，不寫磁碟，容器停止即消失。

```bash
docker run -d --name secure-app \
  --tmpfs /tmp:rw,size=100m \
  nginx:alpine
```

**適用場景：** 敏感資料（金鑰、Session Token）、高效能暫存。

### 3.5 三種方式比較

| 比較項目 | Volume | Bind Mount | tmpfs |
|---------|--------|------------|-------|
| **管理者** | Docker | 使用者 | 作業系統 |
| **資料位置** | `/var/lib/docker/volumes/` | 主機任意目錄 | 記憶體 |
| **生命週期** | 獨立於容器 | 跟主機目錄一樣 | 容器停止即消失 |
| **跨平台** | 一致 | 路徑不同 | Linux 限定 |
| **效能（Desktop）** | 好 | 較慢 | 最快 |
| **適用場景** | 生產環境持久化 | 開發環境、設定檔 | 敏感資料、暫存 |
| **多容器共用** | 支援 | 支援 | 不支援 |
| **推薦程度** | 最推薦 | 開發推薦 | 特殊用途 |

### 3.6 `-v` vs `--mount` 語法比較

**`-v` 語法（傳統）：**

```bash
docker run -v my-data:/data nginx:alpine           # Volume
docker run -v /host/path:/container/path nginx     # Bind Mount
docker run -v my-data:/data:ro nginx:alpine        # 唯讀
```

格式：`來源:目標:選項`，Docker 以**是否有斜線**判斷是 Volume 或 Bind Mount：

```bash
# Volume（無斜線開頭）
docker run -v my-data:/data nginx

# Bind Mount（絕對路徑，斜線開頭）
docker run -v /home/user/data:/data nginx
docker run -v $(pwd)/html:/data nginx
```

**`--mount` 語法（推薦）：**

```bash
docker run --mount type=volume,source=my-data,target=/data nginx
docker run --mount type=bind,source=/host/path,target=/app nginx
docker run --mount type=volume,source=my-data,target=/data,readonly nginx
docker run --mount type=tmpfs,target=/tmp,tmpfs-size=100m nginx
```

**關鍵差異：**

| 比較項目 | `-v` | `--mount` |
|---------|------|-----------|
| **語法風格** | 簡短，冒號分隔 | key=value，明確 |
| **來源不存在時** | 自動建立空目錄 | **直接報錯** |
| **支援 tmpfs** | 有限 | 完整支援 |
| **官方推薦** | 可用 | **推薦** |

**建議：平常練習用 `-v`，正式生產用 `--mount`。**

---

## 四、Volume 管理指令實作（10 分鐘）

### 常用指令

```bash
# 建立
docker volume create mydata

# 列出
docker volume ls
# DRIVER    VOLUME NAME
# local     mydata

# 查看詳情（含 Mountpoint）
docker volume inspect mydata

# 刪除（容器正在使用時會失敗）
docker volume rm mydata

# 清理未使用 Volume（危險！）
docker volume prune
```

### inspect 輸出重點

```json
{
    "Mountpoint": "/var/lib/docker/volumes/mydata/_data",
    "Name": "mydata",
    "Driver": "local"
}
```

> 注意：Docker Desktop（Mac/Windows）的 Mountpoint 在虛擬機內，主機無法直接存取。

### Named Volume vs Anonymous Volume

**Named Volume（建議）：**

```bash
docker volume create mysql-data
docker run -v mysql-data:/var/lib/mysql mysql:8.0
```

**Anonymous Volume（避免）：**

```bash
# 只給容器路徑，不給名稱 → 產生隨機 hash 名稱
docker run -v /var/lib/mysql mysql:8.0
```

**命名慣例：`<服務>-<環境>-<用途>`**

| 好的命名 | 不好的命名 |
|---------|-----------|
| `mysql-prod-data` | `data1` |
| `redis-dev-cache` | `myvolume` |
| `webapp-uploads` | `volume123` |

### `docker volume prune` 警告

**生產環境禁止使用！**

「沒有被容器使用」不等於「不重要」——容器停掉升級期間，Volume 可能暫時無容器掛載，此時 prune 會永久刪除資料。

---

## 五、實作練習：MySQL 資料持久化（15 分鐘）

### 步驟一：不用 Volume（重現問題）

```bash
docker run -d --name mysql-no-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=school \
  mysql:8.0
```

寫入資料後刪除容器，再重建 → `ERROR 1146: Table doesn't exist`。

### 步驟二：用 Named Volume（正確做法）

```bash
docker volume create mysql-school-data

docker run -d --name mysql-with-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=school \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0
```

```sql
USE school;
CREATE TABLE students (id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100), grade INT);
INSERT INTO students VALUES (NULL,'小明',85),(NULL,'小華',92),
  (NULL,'小美',78),(NULL,'大雄',60),(NULL,'靜香',95);
SELECT * FROM students;  -- 5 筆資料
```

**刪容器再重建，資料完整保留！**

```bash
docker stop mysql-with-volume && docker rm mysql-with-volume
docker volume ls  # mysql-school-data 還在

docker run -d --name mysql-with-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0

docker exec mysql-with-volume mysql -uroot -ptest123 \
  -e "SELECT * FROM school.students;"
# 5 筆資料全部在！
```

### 步驟三：升級 MySQL 版本

```bash
docker stop mysql-with-volume && docker rm mysql-with-volume

# 只改 Image 版本，Volume 不變
docker run -d --name mysql-with-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.4   # 只有這裡改變
```

MySQL 8.4 啟動時自動偵測到舊版資料並升級，資料完整保留。

### 常見錯誤

| 錯誤 | 原因 | 解決 |
|------|------|------|
| 容器啟動失敗 | 未設 `MYSQL_ROOT_PASSWORD` | 加 `-e MYSQL_ROOT_PASSWORD=xxx` |
| 連線被拒絕 | MySQL 初始化未完成（需 15~30 秒） | 等待或 `docker logs -f` 確認 `ready for connections` |
| Port 被佔用 | 主機 3306 已被使用 | 改用 `-p 3307:3306` |
| 密碼含特殊字元 | Shell 跳脫問題 | 用單引號：`-e MYSQL_ROOT_PASSWORD='pass$word'` |

---

## 六、Volume 備份與還原（5 分鐘）

### 通用方法：臨時容器 + tar

**備份：**

```bash
docker run --rm \
  -v mysql-school-data:/source:ro \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/mysql-school-data-backup.tar.gz -C /source .
```

指令說明：
- `--rm`：容器用完自動刪除
- `/source:ro`：Volume 唯讀掛載，避免意外修改
- `alpine`：最小的 Linux Image，只需 `tar`

**還原：**

```bash
docker run --rm \
  -v mysql-school-data:/target \
  -v $(pwd):/backup \
  alpine \
  sh -c "cd /target && tar xzf /backup/mysql-school-data-backup.tar.gz"
```

### 資料庫專用備份（推薦）

```bash
# MySQL 備份
docker exec mysql-with-volume \
  mysqldump -uroot -ptest123 school > school-backup.sql

# MySQL 還原
docker exec -i mysql-with-volume \
  mysql -uroot -ptest123 < school-backup.sql

# PostgreSQL 備份
docker exec my-postgres pg_dump -U postgres mydb > mydb-backup.sql
```

**資料庫工具備份的優點：**

| 優點 | 說明 |
|------|------|
| 資料一致性 | 正確處理交易，不會有中途截斷的問題 |
| 人類可讀 | 產生 SQL 文字檔，可用編輯器打開 |
| 跨版本還原 | 5.7 的 dump 可還原到 8.0 |
| 選擇性還原 | 可只還原特定資料表 |
| 壓縮效率高 | 文字格式壓縮率佳 |

### 備份最佳實踐

1. **自動化排程**：用 cron job 定期執行，不依賴手動
2. **異地備份**：傳到 S3 / GCS / 另一台伺服器
3. **定期測試還原**：備份有效性需定期驗證
4. **檔名含日期**：例如 `mysql-school-data-2026-03-16-1030.tar.gz`

---

## 七、本堂課小結（5 分鐘）

### 三種掛載方式速記

| 類型 | 何時使用 | 一句話記憶 |
|------|---------|-----------|
| **Volume** | 生產環境持久化 | Docker 管的倉庫置物櫃 |
| **Bind Mount** | 開發環境即時同步 | 把你家抽屜直連容器 |
| **tmpfs** | 敏感資料暫存 | 便條紙，關機就消失 |

### 關鍵指令彙整

```bash
# Volume 生命週期
docker volume create <name>     # 建立
docker volume ls                # 列出
docker volume inspect <name>    # 查看詳情
docker volume rm <name>         # 刪除（安全）
docker volume prune             # 清理未使用（危險！）

# 掛載語法
docker run -v <volume>:<path>                            # 簡短版
docker run --mount type=volume,source=X,target=Y        # 明確版（推薦）
```

### 三件必記原則

1. **永遠用 Named Volume，不要用匿名 Volume**
2. **開發用 Bind Mount，生產用 Volume**
3. **有 Volume 不代表不需要備份！**

---

## 板書 / PPT 建議

1. **容器儲存結構圖**：R/W Layer + Image Layers 堆疊圖，紅色標注「R/W Layer 隨容器刪除消失」，Volume 用綠色箭頭從外部連接容器
2. **三種掛載方式對比圖**：左邊 Docker Host，右邊 Container，三色線條連接（Volume 藍、Bind Mount 橙、tmpfs 灰）
3. **便利貼 vs 筆記本插圖**：「容器 = 便利貼（用完就丟）」vs「Volume = 筆記本（永久保存）」
4. **`-v` vs `--mount` 語法對照表**：重點標記「來源不存在時的行為差異」
5. **MySQL 持久化流程動畫**：建立 Volume → 啟動容器 → 寫入資料 → 刪除容器 → Volume 還在 → 重建容器 → 資料完整
6. **Named vs Anonymous Volume 對比**：`mysql-prod-data`（打勾）vs 一串亂碼（打叉）
7. **備份策略圖**：mysqldump 和 tar 兩種備份流程
8. **危險指令警告板**：紅色大字顯示 `docker volume prune` 和 `docker system prune --volumes`，加警告三角形
