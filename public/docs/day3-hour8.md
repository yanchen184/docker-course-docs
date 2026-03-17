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

## 二、Volume 基礎與 -v 用法（10 分鐘）

### 2.1 容器的讀寫層問題

- Image 是唯讀分層結構，容器在上面加一個 **R/W Layer**
- **R/W Layer 會隨著 `docker rm` 一起被刪除**
- 所有寫入的資料都存在 R/W Layer → 容器刪了就沒了

### 2.2 三種掛載方式

| 類型 | 說明 | 適用場景 |
|------|------|---------|
| **Volume** | Docker 管理的儲存空間 | **生產環境持久化（最推薦）** |
| **Bind Mount** | 直接映射你指定的主機目錄 | 開發環境即時同步 |
| **tmpfs** | 存在記憶體，不寫磁碟 | 敏感資料暫存（特殊用途） |

### 2.3 -v 掛載語法

```bash
docker run -v /home/user/html:/data nginx         # Bind Mount（斜線開頭）
docker run -v my-data:/data nginx                  # Volume（沒有斜線開頭）
```

**判斷規則：冒號左邊有斜線開頭 = Bind Mount，沒斜線開頭 = Volume**

### 2.4 Volume 和 Bind Mount 的差異

| | Bind Mount | Volume |
|--|-----------|--------|
| 資料存在哪 | 你指定的主機路徑 | Docker 管理的路徑 |
| 誰管理 | 你自己管 | Docker 管（`docker volume` 指令） |
| 可攜性 | 綁死主機路徑 | 哪台機器都能用 |

**Bind Mount = 你來管，Volume = Docker 幫你管**

### 2.5 開發用 Bind Mount，生產用 Volume

- Bind Mount：檔案在你的專案目錄，IDE 直接改、git 直接管
- Volume：Docker 統一管理，不依賴主機目錄結構，適合生產環境

---

## 三、MySQL 實戰對比（20 分鐘）

### 3.1 不用 Volume 啟動 MySQL（重現問題）

```bash
docker run -d --name mysql-no-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=school \
  mysql:8.0
```

寫入資料 → 刪容器 → 重建 → `ERROR 1146: Table doesn't exist`。**資料全部消失。**

### 3.2 用 Named Volume 啟動 MySQL（正確做法）

```bash
docker volume create mysql-school-data

docker run -d --name mysql-with-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=school \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0
```

### 3.3 刪容器、重建、驗證資料

刪容器 → `docker volume ls` 確認 Volume 還在 → 重建容器掛同一個 Volume → **資料完整保留！**

### 3.4 用 inspect 查看掛載狀態

```bash
docker inspect mysql-with-volume --format '{{json .Mounts}}'
docker volume inspect mysql-school-data
```

重點欄位：Type、Name、Source、Destination、RW、Mountpoint

### 3.5 升級 MySQL 版本但保留資料

```bash
docker run -d --name mysql-with-volume \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.4   # 只改版本，Volume 不變
```

### 3.6 常見錯誤處理

| 錯誤 | 原因 | 解決 |
|------|------|------|
| 容器啟動失敗 | 未設 `MYSQL_ROOT_PASSWORD` | 加 `-e MYSQL_ROOT_PASSWORD=xxx` |
| 連線被拒絕 | MySQL 初始化未完成 | `docker logs -f` 等 `ready for connections` |
| Port 被佔用 | 主機 3306 已被使用 | 改用 `-p 3307:3306` |
| 密碼含特殊字元 | Shell 跳脫問題 | 用單引號包密碼 |

---

## 四、具名掛載 vs 匿名掛載 + Volume 管理（10 分鐘）

### 4.1 Named Volume vs Anonymous Volume

```bash
docker run -v mysql-data:/var/lib/mysql mysql:8.0   # 具名（推薦）
docker run -v /var/lib/mysql mysql:8.0               # 匿名（避免）
```

匿名 Volume 得到隨機 hash 名稱，三個月後你不知道是什麼。**永遠用 Named Volume。**

### 4.2 用 inspect 對比具名和匿名

具名：`/var/lib/docker/volumes/mysql-data/_data`（清楚好找）
匿名：`/var/lib/docker/volumes/a3b4c5d6e7f8.../_data`（一串亂碼）

### 4.3 命名慣例

格式：`<服務>-<環境>-<用途>`，例如 `mysql-prod-data`、`redis-dev-cache`

### 4.4 Volume 管理指令

```bash
docker volume create <name>     # 建立
docker volume ls                # 列出
docker volume inspect <name>    # 查看詳情
docker volume rm <name>         # 刪除（安全）
docker volume prune             # 清理（危險！生產禁用）
```

### 4.5 Dockerfile 裡的 VOLUME 陷阱

MySQL Dockerfile 有 `VOLUME /var/lib/mysql` → 不指定 `-v` 也會建匿名 Volume → 難管理 → **不要依賴，永遠自己指定 Named Volume**

### 4.6 掛載權限：ro 和 rw

```bash
docker run -v my-data:/data:ro nginx:alpine    # 唯讀
docker run -v my-data:/data:rw nginx:alpine    # 可讀可寫（預設）
```

---

## 五、`--mount` 語法 vs `-v` 語法（5 分鐘）

### 5.1 兩種語法對比

```bash
# -v 語法
docker run -v my-data:/data nginx:alpine

# --mount 語法（官方推薦）
docker run --mount type=volume,source=my-data,target=/data nginx:alpine
```

### 5.2 關鍵差異

| 比較項目 | `-v` | `--mount` |
|---------|------|-----------|
| **語法風格** | 簡短，冒號分隔 | key=value，明確 |
| **來源不存在時** | 自動建立空目錄 | **直接報錯** |
| **官方推薦** | 可用 | **推薦** |

**建議：練習用 `-v`，正式環境用 `--mount`。**

---

## 六、多容器共用 Volume（5 分鐘）

### 6.1 實作：兩個容器共享同一個 Volume

```bash
docker volume create shared-data

# Writer：每秒寫一行日誌
docker run -d --name writer \
  -v shared-data:/data \
  busybox sh -c 'while true; do date >> /data/log.txt; sleep 1; done'

# Reader：即時讀取（唯讀掛載）
docker run -it --rm --name reader \
  -v shared-data:/data:ro \
  busybox tail -f /data/log.txt
```

**兩個獨立容器透過同一個 Volume 共享資料。** Docker Compose 會大量用到這個模式。

---

## 七、Volume 備份與還原（5 分鐘）

### 7.1 資料庫專用備份（推薦）

```bash
# MySQL 備份
docker exec mysql-with-volume \
  mysqldump -uroot -ptest123 school > school-backup.sql

# MySQL 還原
docker exec -i mysql-with-volume \
  mysql -uroot -ptest123 school < school-backup.sql
```

### 7.2 通用方法：臨時容器 + tar

```bash
# 備份
docker run --rm \
  -v mysql-school-data:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/mysql-school-data-backup.tar.gz -C /source .

# 還原
docker run --rm \
  -v mysql-school-data:/target \
  -v $(pwd):/backup \
  alpine sh -c "cd /target && tar xzf /backup/mysql-school-data-backup.tar.gz"
```

### 7.3 備份原則

1. 自動化排程（cron job）
2. 異地儲存（S3 / GCS / 另一台伺服器）
3. 定期測試還原
4. 檔名加日期

---

## 八、本堂課小結（5 分鐘）

### 三種掛載方式

| 類型 | 何時使用 | 一句話記憶 |
|------|---------|-----------|
| **Volume** | 生產環境持久化 | Docker 幫你管的倉庫 |
| **Bind Mount** | 開發環境即時同步 | 你家目錄直連容器 |
| **tmpfs** | 敏感資料暫存 | 便條紙，關機就沒 |

### 關鍵指令

```bash
docker volume create / ls / inspect / rm / prune
docker run -v <volume>:<path>[:ro]
docker run --mount type=volume,source=X,target=Y
docker inspect <container> --format '{{json .Mounts}}'
```

### 三件必記

1. **永遠用 Named Volume，不要用匿名 Volume**
2. **開發用 Bind Mount，生產用 Volume**
3. **接手別人的容器，先 `docker inspect` 看 Mounts**

---

## 板書 / PPT 建議

1. 容器儲存結構圖：R/W Layer + Image Layers，Volume 從外部連接
2. 三種掛載方式對比表
3. MySQL 對比實驗流程圖：無 Volume（紅叉）vs 有 Volume（綠勾）
4. docker inspect 輸出重點標記
5. Named vs Anonymous Volume 對比
6. `-v` vs `--mount` 語法對照表
7. 多容器共用 Volume 示意圖
8. 備份策略流程圖
9. 危險指令警告：`docker volume prune`
