# Day 3 第十二小時：Volume 資料持久化

---

## 一、前情提要（2 分鐘）

上堂課講了 Port Mapping。

這堂課講 Volume：
- 為什麼需要 Volume
- 三種資料掛載方式
- Volume 管理
- 備份與還原

---

## 二、為什麼需要 Volume（8 分鐘）

### 2.1 容器的檔案系統是暫時的

還記得容器的分層結構嗎？

```
┌─────────────────────────┐
│   Container Layer       │  ← 可寫，但容器刪除就沒了
├─────────────────────────┤
│   Image Layers          │  ← 唯讀
└─────────────────────────┘
```

容器內的所有寫入都在 Container Layer。
**容器刪除後，這些資料就消失了。**

### 2.2 實驗：資料會消失

```bash
# 建立容器，寫入資料
docker run -it --name test alpine sh
# 在容器內
echo "important data" > /data.txt
exit

# 查看資料
docker start test
docker exec test cat /data.txt
# important data（還在）

# 刪除容器
docker rm -f test

# 重新建立
docker run -it --name test alpine sh
cat /data.txt
# cat: can't open '/data.txt': No such file or directory（不見了）
```

### 2.3 Volume 解決這個問題

Volume 把資料存在容器外部：

```
主機檔案系統
      │
      ▼
┌─────────────────────────┐
│      Volume             │  ← 持久化，容器刪除資料還在
└─────────────────────────┘
      │
      ▼
┌─────────────────────────┐
│   Container             │
└─────────────────────────┘
```

容器來來去去，Volume 裡的資料不受影響。

### 2.4 Volume 的用途

- 資料庫檔案（MySQL、PostgreSQL）
- 上傳的檔案
- 日誌
- 設定檔
- 多容器共享資料

---

## 三、三種掛載方式（15 分鐘）

### 3.1 概覽

| 類型 | 說明 | 適用場景 |
|-----|------|---------|
| Volumes | Docker 管理的儲存區域 | 生產環境資料 |
| Bind Mounts | 掛載主機目錄 | 開發環境、設定檔 |
| tmpfs | 記憶體中的暫存 | 敏感資料、暫存 |

### 3.2 Volumes（Docker 管理）

**建立 Volume**

```bash
docker volume create my-data
```

**使用 Volume**

```bash
docker run -d --name db \
  -v my-data:/var/lib/mysql \
  mysql:8.0
```

**特點**

- 儲存在 `/var/lib/docker/volumes/`
- Docker 完全管理
- 可以跨容器共享
- 容易備份
- 支援 Volume Driver（存到遠端）

**查看 Volume 資訊**

```bash
docker volume inspect my-data
```

輸出：

```json
[
    {
        "Name": "my-data",
        "Mountpoint": "/var/lib/docker/volumes/my-data/_data",
        ...
    }
]
```

### 3.3 Bind Mounts（掛載主機目錄）

**語法**

```bash
docker run -d \
  -v /host/path:/container/path \
  nginx
```

**範例**

```bash
docker run -d --name web \
  -v ~/website:/usr/share/nginx/html \
  -p 8080:80 \
  nginx
```

**特點**

- 直接使用主機檔案系統
- 路徑必須是絕對路徑
- 修改立即生效
- 適合開發環境

**和 Volumes 的差異**

| 方面 | Volumes | Bind Mounts |
|-----|---------|-------------|
| 儲存位置 | Docker 管理的目錄 | 任意主機目錄 |
| 可攜性 | 高（Volume 名稱） | 低（依賴主機路徑） |
| 權限 | Docker 管理 | 依主機設定 |
| 適用場景 | 生產環境 | 開發環境 |

### 3.4 tmpfs（記憶體掛載）

```bash
docker run -d \
  --tmpfs /tmp \
  nginx
```

或：

```bash
docker run -d \
  --mount type=tmpfs,destination=/tmp,tmpfs-size=100m \
  nginx
```

**特點**

- 資料存在記憶體
- 容器停止就消失
- 不會寫入硬碟
- 速度快

**使用場景**

- 敏感資料（不想留在硬碟）
- 需要高速讀寫的暫存檔
- Session 資料

---

## 四、-v 與 --mount 語法（8 分鐘）

### 4.1 兩種語法

Docker 支援兩種掛載語法：

**傳統 -v 語法**

```bash
docker run -v my-vol:/app/data nginx
docker run -v /host/path:/container/path nginx
```

**新 --mount 語法（推薦）**

```bash
docker run --mount type=volume,source=my-vol,target=/app/data nginx
docker run --mount type=bind,source=/host/path,target=/container/path nginx
```

### 4.2 --mount 參數說明

| 參數 | 說明 |
|-----|------|
| type | volume / bind / tmpfs |
| source / src | Volume 名稱或主機路徑 |
| target / dst | 容器內路徑 |
| readonly / ro | 唯讀 |
| volume-opt | Volume 選項 |

### 4.3 範例對照

**Volumes**

```bash
# -v 語法
docker run -v my-data:/app/data nginx

# --mount 語法
docker run --mount type=volume,source=my-data,target=/app/data nginx
```

**Bind Mounts**

```bash
# -v 語法
docker run -v /home/user/data:/app/data nginx

# --mount 語法
docker run --mount type=bind,source=/home/user/data,target=/app/data nginx
```

**唯讀掛載**

```bash
# -v 語法
docker run -v /config:/app/config:ro nginx

# --mount 語法
docker run --mount type=bind,source=/config,target=/app/config,readonly nginx
```

### 4.4 差異與建議

| 方面 | -v | --mount |
|-----|-----|---------|
| 語法 | 簡潔 | 明確 |
| 路徑不存在 | -v 會自動建立 | bind mount 會報錯 |
| 可讀性 | 較差 | 較好 |
| 推薦 | 簡單場景 | 複雜場景 |

官方建議用 `--mount`，因為更明確、不容易出錯。

---

## 五、Volume 管理命令（10 分鐘）

### 5.1 完整命令列表

```bash
# 建立 Volume
docker volume create my-vol

# 列出所有 Volume
docker volume ls

# 查看詳情
docker volume inspect my-vol

# 刪除 Volume
docker volume rm my-vol

# 清理未使用的 Volume
docker volume prune
```

### 5.2 建立 Volume 的選項

```bash
# 使用特定的 driver
docker volume create --driver local my-vol

# 設定選項
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.1,rw \
  --opt device=:/path/to/dir \
  nfs-vol
```

### 5.3 查看 Volume 使用情況

```bash
# 哪些容器使用這個 Volume
docker ps -a --filter volume=my-vol

# Volume 大小（需要進入實際目錄）
sudo du -sh /var/lib/docker/volumes/my-vol/_data
```

### 5.4 匿名 Volume

```bash
docker run -v /app/data nginx
```

沒有指定 Volume 名稱，Docker 會自動建立匿名 Volume（隨機名稱）。

```bash
docker volume ls
# DRIVER    VOLUME NAME
# local     a3b2c1d4e5f6...  ← 匿名 Volume
```

匿名 Volume 難以管理，建議永遠給名稱。

### 5.5 清理 Volume

```bash
# 刪除未被使用的 Volume（危險！）
docker volume prune

# 強制刪除，不詢問
docker volume prune -f
```

**注意**：刪除 Volume 資料就沒了，要謹慎。

---

## 六、資料備份與還原（10 分鐘）

### 6.1 備份 Volume 資料

**方法一：直接複製**

```bash
# 找到 Volume 路徑
docker volume inspect my-data --format '{{.Mountpoint}}'
# /var/lib/docker/volumes/my-data/_data

# 複製資料
sudo cp -r /var/lib/docker/volumes/my-data/_data /backup/
```

**方法二：用容器備份（推薦）**

```bash
docker run --rm \
  -v my-data:/data \
  -v $(pwd):/backup \
  alpine \
  tar cvf /backup/my-data-backup.tar /data
```

這個命令：
1. 建立一個臨時容器
2. 掛載要備份的 Volume 到 /data
3. 掛載主機當前目錄到 /backup
4. 用 tar 打包資料
5. 完成後自動刪除容器

### 6.2 還原 Volume 資料

```bash
docker run --rm \
  -v my-data:/data \
  -v $(pwd):/backup \
  alpine \
  sh -c "cd /data && tar xvf /backup/my-data-backup.tar --strip 1"
```

### 6.3 備份資料庫容器

**MySQL 範例**

```bash
# 備份
docker exec my-mysql mysqldump -u root -p'secret' mydb > backup.sql

# 還原
docker exec -i my-mysql mysql -u root -p'secret' mydb < backup.sql
```

**PostgreSQL 範例**

```bash
# 備份
docker exec my-postgres pg_dump -U postgres mydb > backup.sql

# 還原
docker exec -i my-postgres psql -U postgres mydb < backup.sql
```

---

## 七、實戰：MySQL 資料持久化（5 分鐘）

### 7.1 啟動 MySQL

```bash
# 建立 Volume
docker volume create mysql-data

# 啟動 MySQL
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  -v mysql-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0
```

### 7.2 驗證持久化

```bash
# 建立資料
docker exec -it mysql mysql -uroot -psecret -e "
  USE myapp;
  CREATE TABLE users (id INT, name VARCHAR(50));
  INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');
  SELECT * FROM users;
"

# 刪除容器
docker rm -f mysql

# 重新建立容器（使用同一個 Volume）
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -v mysql-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0

# 資料還在！
docker exec mysql mysql -uroot -psecret -e "SELECT * FROM myapp.users"
```

---

## 八、本堂課小結（2 分鐘）

這堂課學了 Volume：

**為什麼需要 Volume**
- 容器刪除資料就消失
- Volume 讓資料持久化

**三種掛載方式**

| 類型 | 命令 | 用途 |
|-----|------|------|
| Volumes | -v vol-name:/path | 生產環境 |
| Bind Mounts | -v /host:/container | 開發環境 |
| tmpfs | --tmpfs /path | 暫存、敏感資料 |

**Volume 管理**
- docker volume create/ls/inspect/rm
- docker volume prune（清理）

**備份還原**
- 用容器 + tar 備份 Volume
- 資料庫用 mysqldump/pg_dump

下一堂：Dockerfile 入門。

---

## 板書 / PPT 建議

1. 容器檔案系統 vs Volume 示意圖
2. 三種掛載方式比較表
3. -v vs --mount 語法對照
4. 備份指令範例
