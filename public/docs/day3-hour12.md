# Day 3 第十二小時：Volume 資料持久化

---

## 一、前情提要（2 分鐘）

上堂課：Port Mapping 進階。

本堂課：Volume 資料持久化
- 為什麼需要 Volume
- 三種掛載方式
- Volume 管理
- 備份與還原

---

## 二、為什麼需要 Volume（8 分鐘）

### 容器檔案系統是暫時的

```
┌─────────────────────┐
│  Container Layer    │  ← 可寫，容器刪除就消失
├─────────────────────┤
│  Image Layers       │  ← 唯讀
└─────────────────────┘
```

### 實驗

```bash
docker run -it --name test alpine sh
echo "data" > /data.txt
exit
docker rm -f test
docker run -it --name test alpine sh
cat /data.txt  # 不見了！
```

### Volume 解決這問題

資料存在容器外部，容器來來去去，資料不受影響。

---

## 三、三種掛載方式（15 分鐘）

| 類型 | 說明 | 適用場景 |
|-----|------|---------|
| Volumes | Docker 管理 | 生產環境 |
| Bind Mounts | 掛載主機目錄 | 開發環境 |
| tmpfs | 記憶體暫存 | 敏感資料 |

### Volumes

```bash
docker volume create my-data
docker run -d -v my-data:/var/lib/mysql mysql
```

- 儲存在 `/var/lib/docker/volumes/`
- 容易備份、可跨容器共享

### Bind Mounts

```bash
docker run -d -v ~/website:/usr/share/nginx/html nginx
```

- 直接使用主機目錄
- 修改立即生效

### tmpfs

```bash
docker run -d --tmpfs /tmp nginx
```

- 存在記憶體，容器停止就消失

---

## 四、-v 與 --mount 語法（8 分鐘）

### -v 語法

```bash
docker run -v my-vol:/app/data nginx
docker run -v /host/path:/container/path nginx
docker run -v /config:/app/config:ro nginx  # 唯讀
```

### --mount 語法（推薦）

```bash
docker run --mount type=volume,source=my-vol,target=/app/data nginx
docker run --mount type=bind,source=/host,target=/container,readonly nginx
```

| 差異 | -v | --mount |
|-----|-----|---------|
| 路徑不存在 | 自動建立 | 報錯 |
| 可讀性 | 較差 | 較好 |

---

## 五、Volume 管理命令（10 分鐘）

```bash
docker volume create my-vol
docker volume ls
docker volume inspect my-vol
docker volume rm my-vol
docker volume prune  # 清理未使用（危險！）
```

### 查看使用情況

```bash
docker ps -a --filter volume=my-vol
```

---

## 六、備份與還原（10 分鐘）

### 備份 Volume

```bash
docker run --rm \
  -v my-data:/data \
  -v $(pwd):/backup \
  alpine \
  tar cvf /backup/backup.tar /data
```

### 還原 Volume

```bash
docker run --rm \
  -v my-data:/data \
  -v $(pwd):/backup \
  alpine \
  sh -c "cd /data && tar xvf /backup/backup.tar --strip 1"
```

### 資料庫備份

```bash
# MySQL
docker exec mysql mysqldump -uroot -psecret mydb > backup.sql

# PostgreSQL
docker exec postgres pg_dump -U postgres mydb > backup.sql
```

---

## 七、實戰：MySQL 持久化（5 分鐘）

```bash
docker volume create mysql-data

docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0

# 建立資料 → 刪除容器 → 重建 → 資料還在！
```

---

## 八、小結（2 分鐘）

| 類型 | 命令 | 用途 |
|-----|------|------|
| Volumes | -v vol:/path | 生產環境 |
| Bind Mounts | -v /host:/container | 開發環境 |
| tmpfs | --tmpfs /path | 暫存、敏感 |

**管理**：create/ls/inspect/rm/prune

**備份**：用容器 + tar，資料庫用 dump

下一堂：Dockerfile 入門。

---

## 板書 / PPT 建議

1. 容器檔案系統 vs Volume 示意圖
2. 三種掛載方式比較表
3. -v vs --mount 語法對照
4. 備份指令範例
