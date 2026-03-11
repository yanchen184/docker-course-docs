# Day 3 第九小時：容器生命週期管理

---

## 一、前情提要（2 分鐘）

上堂課：映像檔分層結構。

本堂課：容器生命週期管理
- 容器狀態轉換
- 資源限制
- 重啟策略
- 監控與健康檢查

---

## 二、容器生命週期（12 分鐘）

### 容器狀態

| 狀態 | 說明 |
|-----|------|
| created | 已建立，尚未啟動 |
| running | 執行中 |
| paused | 暫停 |
| exited | 已停止 |
| dead | 錯誤狀態 |

### 狀態轉換

```
docker create → [created]
        ↓ docker start
      [running] ←→ [paused] (pause/unpause)
        ↓ docker stop
      [exited]
        ↓ docker start
      [running]
```

### docker run = create + start

```bash
docker create --name my-nginx nginx
docker start my-nginx
```

---

## 三、docker inspect（10 分鐘）

### 常用資訊提取

```bash
# 狀態
docker inspect -f '{{.State.Status}}' my-nginx
docker inspect -f '{{.State.ExitCode}}' my-nginx

# 網路
docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' my-nginx

# 掛載
docker inspect -f '{{json .Mounts}}' my-nginx | jq

# 環境變數
docker inspect -f '{{.Config.Env}}' my-nginx
```

---

## 四、資源限制（15 分鐘）

### 記憶體限制

```bash
docker run -d --name limited-app \
  --memory 512m \
  --memory-swap 1g \
  nginx
```

| 參數 | 說明 |
|-----|------|
| --memory, -m | 最大記憶體 |
| --memory-swap | 記憶體+swap 總和 |

### CPU 限制

```bash
docker run -d --cpus 1.5 nginx        # 最多 1.5 核心
docker run -d --cpu-shares 512 nginx  # 相對權重
docker run -d --cpuset-cpus 0,1 nginx # 指定核心
```

### 動態調整

```bash
docker update --memory 1g --cpus 2 my-nginx
```

---

## 五、重啟策略（10 分鐘）

### 四種策略

| 策略 | 說明 |
|-----|------|
| no | 不重啟（預設） |
| on-failure[:N] | 錯誤時重啟，最多 N 次 |
| always | 總是重啟 |
| unless-stopped | 除非手動停止 |

### 使用範例

```bash
docker run -d --restart unless-stopped nginx
docker run -d --restart on-failure:3 my-app
```

### always vs unless-stopped

| 場景 | always | unless-stopped |
|-----|--------|----------------|
| 容器 crash | 重啟 | 重啟 |
| 手動 stop 後 Docker 重啟 | 重啟 | **不重啟** |

---

## 六、監控（5 分鐘）

### docker stats

```bash
docker stats
docker stats --no-stream  # 單次輸出
```

```
CONTAINER   CPU %   MEM USAGE / LIMIT   NET I/O   BLOCK I/O
my-nginx    0.00%   8MiB / 512MiB       1kB/0B    0B/0B
```

---

## 七、健康檢查（5 分鐘）

```bash
docker run -d \
  --name web \
  --health-cmd "curl -f http://localhost/ || exit 1" \
  --health-interval 30s \
  --health-timeout 10s \
  --health-retries 3 \
  nginx
```

| 參數 | 說明 |
|-----|------|
| --health-cmd | 檢查命令 |
| --health-interval | 檢查間隔 |
| --health-retries | 失敗幾次算不健康 |

```bash
docker inspect -f '{{.State.Health.Status}}' web
```

---

## 八、小結（1 分鐘）

| 主題 | 重點 |
|-----|------|
| 狀態 | created → running → exited |
| 資源 | --memory, --cpus |
| 重啟 | unless-stopped（推薦） |
| 監控 | docker stats |
| 健康 | --health-cmd |

下一堂：容器網路基礎。

---

## 板書 / PPT 建議

1. 容器狀態轉換圖
2. 資源限制參數表
3. 重啟策略比較表
4. docker stats 輸出範例
