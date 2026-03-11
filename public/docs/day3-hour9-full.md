# Day 3 第九小時：容器生命週期管理

---

## 一、前情提要（2 分鐘）

上堂課講了映像檔的分層結構。

這堂課講容器本身：
- 容器的完整生命週期
- 容器狀態轉換
- 資源限制
- 重啟策略
- 監控與健康檢查

---

## 二、容器生命週期（12 分鐘）

### 2.1 容器狀態

容器有以下狀態：

| 狀態 | 說明 |
|-----|------|
| created | 已建立，尚未啟動 |
| running | 執行中 |
| paused | 暫停 |
| restarting | 重啟中 |
| exited | 已停止 |
| dead | 無法移除的錯誤狀態 |

### 2.2 狀態轉換圖

```
                docker create
        ┌──────────────────────────┐
        │                          ▼
        │                      [created]
        │                          │
        │                    docker start
        │                          │
        │                          ▼
        │    ┌───────────────► [running] ◄───────────────┐
        │    │                     │                     │
        │    │        ┌────────────┼────────────┐        │
        │    │        │            │            │        │
        │    │   docker pause  docker stop  docker kill  │
        │    │        │            │            │        │
        │    │        ▼            │            │        │
        │    │    [paused]         │            │        │
        │    │        │            │            │        │
        │    │  docker unpause     │            │        │
        │    │        │            │            │        │
        │    └────────┘            ▼            │        │
        │                      [exited] ────────┘        │
        │                          │                     │
        │                    docker start                │
        │                          │                     │
        │                          └─────────────────────┘
        │
        │                    docker rm
   docker run ◄──────────────────────
   (= create + start)
```

### 2.3 各狀態的詳細說明

**created**

```bash
docker create --name my-nginx nginx
```

容器被建立，但程序沒有啟動。
- 分配了 ID
- 準備了檔案系統
- 但沒有執行任何程序

**running**

```bash
docker start my-nginx
# 或
docker run nginx
```

容器的主程序正在執行。

**paused**

```bash
docker pause my-nginx
```

所有程序被暫停（使用 cgroups freezer）。
- 程序狀態保留在記憶體
- 不消耗 CPU
- 恢復後從暫停點繼續

```bash
docker unpause my-nginx
```

**exited**

```bash
docker stop my-nginx
```

主程序已經結束。
- Exit code 0 表示正常結束
- 非 0 表示錯誤

```bash
# 查看 exit code
docker inspect -f '{{.State.ExitCode}}' my-nginx
```

**dead**

這是錯誤狀態，通常是 Docker 嘗試刪除容器但失敗。
可能原因：檔案系統忙碌、資源被鎖定。

### 2.4 docker run = create + start

```bash
docker run nginx
```

等同於：

```bash
docker create nginx
docker start <container_id>
```

用 `create` 的場景：
- 想先建立，之後再啟動
- 需要在啟動前修改設定

---

## 三、docker inspect 詳解（10 分鐘）

### 3.1 基本用法

```bash
docker inspect my-nginx
```

輸出 JSON 格式的完整資訊，非常長。

### 3.2 常用資訊提取

**容器狀態**

```bash
docker inspect -f '{{.State.Status}}' my-nginx
docker inspect -f '{{.State.Running}}' my-nginx
docker inspect -f '{{.State.StartedAt}}' my-nginx
docker inspect -f '{{.State.FinishedAt}}' my-nginx
docker inspect -f '{{.State.ExitCode}}' my-nginx
```

**網路資訊**

```bash
docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' my-nginx
docker inspect -f '{{.NetworkSettings.Ports}}' my-nginx
docker inspect -f '{{.NetworkSettings.Gateway}}' my-nginx
```

**掛載資訊**

```bash
docker inspect -f '{{.Mounts}}' my-nginx
docker inspect -f '{{json .Mounts}}' my-nginx | jq
```

**環境變數**

```bash
docker inspect -f '{{.Config.Env}}' my-nginx
```

**啟動命令**

```bash
docker inspect -f '{{.Config.Cmd}}' my-nginx
docker inspect -f '{{.Config.Entrypoint}}' my-nginx
```

### 3.3 格式化輸出

用 Go template 語法：

```bash
# 多個欄位
docker inspect -f 'Name: {{.Name}}, Status: {{.State.Status}}' my-nginx

# 迴圈
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my-nginx

# JSON 輸出
docker inspect -f '{{json .Config}}' my-nginx | jq
```

### 3.4 比較多個容器

```bash
docker inspect container1 container2
```

---

## 四、資源限制（15 分鐘）

### 4.1 為什麼要限制資源

- 防止單一容器吃光所有資源
- 多容器環境的公平分配
- 避免 OOM（Out of Memory）影響系統

### 4.2 記憶體限制

```bash
docker run -d --name limited-app \
  --memory 512m \
  --memory-swap 1g \
  nginx
```

**參數說明**

| 參數 | 說明 |
|-----|------|
| --memory, -m | 最大記憶體 |
| --memory-swap | 記憶體+swap 總和（-1 表示無限制） |
| --memory-reservation | 軟限制（優先被回收） |
| --oom-kill-disable | 禁止 OOM killer（危險，不建議） |

**單位**

- b, k, m, g（bytes, kilobytes, megabytes, gigabytes）

**查看容器記憶體使用**

```bash
docker stats my-nginx
```

### 4.3 CPU 限制

**方法一：CPU 份額（相對權重）**

```bash
docker run -d --cpu-shares 512 nginx
```

預設值是 1024。512 表示只有預設的一半權重。

只在 CPU 競爭時生效。如果系統不忙，還是可以用到更多 CPU。

**方法二：CPU 核心數**

```bash
docker run -d --cpus 1.5 nginx
```

最多使用 1.5 個 CPU 核心。

**方法三：指定 CPU 核心**

```bash
docker run -d --cpuset-cpus 0,1 nginx
```

只在 CPU 0 和 1 上執行。

適用於 NUMA 架構優化。

### 4.4 磁碟 I/O 限制

```bash
docker run -d \
  --device-read-bps /dev/sda:10mb \
  --device-write-bps /dev/sda:10mb \
  nginx
```

限制每秒讀寫 10MB。

### 4.5 修改執行中容器的資源限制

```bash
docker update --memory 1g --cpus 2 my-nginx
```

不需要重啟容器。

### 4.6 查看資源限制

```bash
docker inspect -f '{{.HostConfig.Memory}}' my-nginx
docker inspect -f '{{.HostConfig.NanoCpus}}' my-nginx
```

---

## 五、重啟策略（10 分鐘）

### 5.1 什麼是重啟策略

當容器停止時，Docker 該怎麼處理？

- 什麼都不做
- 自動重啟
- 只在錯誤時重啟

### 5.2 四種重啟策略

| 策略 | 說明 |
|-----|------|
| no | 不重啟（預設） |
| on-failure[:max-retries] | 只在非 0 exit code 時重啟 |
| always | 總是重啟，包括 Docker daemon 重啟後 |
| unless-stopped | 總是重啟，除非手動停止 |

### 5.3 使用範例

```bash
# 總是重啟
docker run -d --restart always nginx

# 失敗時重啟，最多 3 次
docker run -d --restart on-failure:3 my-app

# 除非手動停止，否則重啟
docker run -d --restart unless-stopped nginx
```

### 5.4 always vs unless-stopped

兩者的差別在手動停止後 Docker daemon 重啟的行為：

| 場景 | always | unless-stopped |
|-----|--------|----------------|
| 容器 crash | 重啟 | 重啟 |
| Docker daemon 重啟 | 重啟 | 重啟 |
| 手動 stop 後 Docker 重啟 | **重啟** | **不重啟** |

`unless-stopped` 比較合理——你手動停的容器，重開機後應該保持停止。

### 5.5 修改執行中容器的重啟策略

```bash
docker update --restart unless-stopped my-nginx
```

### 5.6 查看重啟策略

```bash
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' my-nginx
```

---

## 六、docker stats 監控（5 分鐘）

### 6.1 即時監控

```bash
docker stats
```

輸出：

```
CONTAINER ID   NAME       CPU %     MEM USAGE / LIMIT   MEM %   NET I/O          BLOCK I/O   PIDS
abc123def456   my-nginx   0.00%     7.934MiB / 512MiB   1.55%   1.45kB / 0B      0B / 0B     5
```

**欄位說明**

| 欄位 | 說明 |
|-----|------|
| CPU % | CPU 使用率 |
| MEM USAGE / LIMIT | 記憶體使用 / 限制 |
| MEM % | 記憶體使用率 |
| NET I/O | 網路輸入/輸出 |
| BLOCK I/O | 磁碟讀/寫 |
| PIDS | 程序數 |

### 6.2 監控特定容器

```bash
docker stats my-nginx
docker stats my-nginx my-mysql
```

### 6.3 單次輸出（不持續更新）

```bash
docker stats --no-stream
```

適合寫腳本收集數據。

### 6.4 自訂格式

```bash
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

---

## 七、健康檢查（5 分鐘）

### 7.1 什麼是健康檢查

容器在跑不代表服務正常。

健康檢查讓 Docker 定期測試容器內的服務是否正常。

### 7.2 docker run 設定健康檢查

```bash
docker run -d \
  --name web \
  --health-cmd "curl -f http://localhost/ || exit 1" \
  --health-interval 30s \
  --health-timeout 10s \
  --health-retries 3 \
  --health-start-period 40s \
  nginx
```

**參數說明**

| 參數 | 說明 | 預設 |
|-----|------|-----|
| --health-cmd | 健康檢查命令 | - |
| --health-interval | 檢查間隔 | 30s |
| --health-timeout | 超時時間 | 30s |
| --health-retries | 連續失敗幾次算不健康 | 3 |
| --health-start-period | 啟動緩衝時間 | 0s |

### 7.3 查看健康狀態

```bash
docker ps
```

STATUS 欄會顯示：`Up 5 minutes (healthy)` 或 `(unhealthy)`

```bash
docker inspect -f '{{.State.Health.Status}}' web
```

### 7.4 查看健康檢查日誌

```bash
docker inspect -f '{{json .State.Health}}' web | jq
```

會顯示最近幾次檢查的結果。

---

## 八、實戰練習：部署常見服務（10 分鐘）

### 8.1 部署 Tomcat

Tomcat 是常見的 Java Web 伺服器，用 Docker 部署非常快速：

```bash
docker pull tomcat
docker run -d -p 3355:8080 --name tomcat01 tomcat
```

部署後訪問 `http://localhost:3355` 可能會看到 404，這是因為官方映像檔為了保持最小化，`webapps` 目錄是空的。解決方法：

```bash
docker exec -it tomcat01 bash
# 把 webapps.dist 的內容複製到 webapps
cp -r webapps.dist/* webapps/
```

刷新頁面就能看到 Tomcat 預設首頁了。

注意：官方映像檔是**最小可運行環境**，很多 Linux 命令（如 `ll`）都被移除了。這是正常的，不影響服務運行。

`docker run --rm` 參數可以在容器停止後自動刪除容器，適合臨時測試：

```bash
docker run --rm -it tomcat:9.0
# 退出後容器自動刪除
```

思考：每次進入容器修改很麻煩，若能在容器外部提供映射路徑、自動同步到內部就好了——這就是後面要學的 Volume 掛載。

### 8.2 部署 Elasticsearch

Elasticsearch 暴露的端口多（9200、9300），而且非常耗記憶體。直接啟動可能會讓小規格的伺服器卡死：

```bash
# 不加限制的啟動（危險！）
docker run -d --name elasticsearch -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" elasticsearch:7.6.2

# 用 docker stats 查看資源消耗
docker stats
# Elasticsearch 可能佔用 1.2GB+ 記憶體
```

在 1 核 2G 的伺服器上，不加限制啟動 ES 會直接把整台機器卡死，連 `docker ps` 都跑不動。解決方案是**透過 `-e` 限制 JVM 記憶體**：

```bash
docker run -d --name elasticsearch02 \
  -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e ES_JAVA_OPTS="-Xms64m -Xmx512m" \
  elasticsearch:7.6.2

# 驗證
curl localhost:9200
# 應該看到 "You Know, for Search"
```

透過 `docker stats` 可以看到記憶體消耗大幅下降。這個案例說明了資源限制的重要性——**部署服務時一定要謹慎評估資源需求**。

如果要搭配 Kibana 使用，兩個容器之間需要透過 Docker 網路通訊。注意：容器之間是隔離的，不能用 `localhost` 互連。正確做法是把 Elasticsearch 和 Kibana 放到同一個自定義 Docker 網路；如果只是讓主機瀏覽器存取，再額外用 `-p` 暴露必要的 port。

### 8.3 Portainer 可視化管理面板

Portainer 是 Docker 的圖形化管理工具，可以透過瀏覽器管理容器、映像檔、網路等：

```bash
docker run -d -p 8088:9000 \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --name portainer \
  portainer/portainer
```

訪問 `http://localhost:8088`，首次登入需要設定管理員密碼。進入面板後可以看到：
- 正在運行的容器數量
- 映像檔清單
- 網路配置
- Volume 掛載資訊

Portainer 主要用於學習和開發環境的可視化管理。**在生產環境中，建議以命令列操作為主**，熟練掌握 CLI 比依賴圖形介面更可靠。

---

## 九、本堂課小結（1 分鐘）

這堂課學了容器生命週期管理：

**容器狀態**
- created → running → paused/exited → dead
- docker run = create + start

**docker inspect**
- 取得容器完整資訊
- 用 Go template 格式化輸出

**資源限制**
- 記憶體：--memory
- CPU：--cpus, --cpu-shares
- 可用 docker update 動態調整

**重啟策略**
- no / on-failure / always / unless-stopped
- 生產環境建議 unless-stopped

**監控**
- docker stats：即時監控
- 健康檢查：--health-cmd

**實戰**
- Tomcat 部署與 webapps 目錄問題
- Elasticsearch 資源限制（ES_JAVA_OPTS）
- Portainer 可視化管理面板

下一堂：容器網路基礎。

---

## 板書 / PPT 建議

1. 容器狀態轉換圖
2. 資源限制參數表
3. 重啟策略比較表
4. docker stats 輸出範例
5. Tomcat webapps 目錄問題圖解
6. ES 記憶體限制前後對比
