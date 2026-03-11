# Day 2 第五小時：Docker 基本指令（下）

---

## 一、前情提要（2 分鐘）

上一堂課學了「取得和執行」：pull、images、run、ps。

本堂課學「管理和清理」：
- docker stop/start/restart：容器啟停
- docker rm/rmi：刪除容器和映像檔
- docker logs：查看日誌
- docker exec：進入容器
- docker cp：複製檔案

---

## 二、容器生命週期操作（15 分鐘）

### 啟停容器

- **docker stop**：送 SIGTERM 信號，等 10 秒後 SIGKILL 強制終止
- **docker start**：啟動已停止的容器，之前的設定（port/volume/env）都保留
- **docker restart**：等於 stop + start
- **docker kill**：直接 SIGKILL，不等待，用於容器沒有回應的情況

```bash
docker stop my-nginx       # 優雅關閉
docker start my-nginx      # 啟動已停止的容器
docker restart my-nginx    # 重啟
docker kill my-nginx       # 強制終止
```

### 暫停/恢復

- **docker pause**：使用 cgroups freezer 凍結程序，狀態完整保留
- **docker unpause**：解凍恢復執行

```bash
docker pause my-nginx
docker unpause my-nginx
```

### 批次操作

- 可搭配 `docker ps -q` 對所有容器執行操作

```bash
docker stop $(docker ps -q)    # 停止所有容器
```

### 常見的坑：背景啟動的容器馬上停止

- `docker run -d centos` 會立刻停止，因為容器內沒有前台進程
- Nginx、MySQL 這類有服務的容器不會有此問題
- 純 OS 映像檔需要搭配持續執行的命令

---

## 三、刪除容器和映像檔（12 分鐘）

### 刪除容器（docker rm）

- 只能刪除已停止的容器，執行中的要加 `-f` 強制刪除
- `docker container prune` 一次清理所有已停止的容器

```bash
docker rm my-nginx             # 刪除已停止的容器
docker rm -f my-nginx          # 強制刪除執行中容器
docker container prune         # 清理所有已停止容器
```

### 刪除映像檔（docker rmi）

- 被容器使用中的映像檔需要 `-f` 強制刪除
- `docker image prune` 清理無 Tag 的 dangling images
- `docker image prune -a` 清理所有未被使用的映像檔

```bash
docker rmi nginx:1.25          # 刪除映像檔
docker rmi -f nginx:1.25       # 強制刪除
docker image prune -a          # 清理所有未使用映像檔
```

### 全面清理（docker system prune）

- 一次清理：已停止容器 + 未使用網路 + dangling images + build cache
- 加 `-a` 連未使用的映像檔也清掉
- `docker system df` 可查看磁碟使用量

```bash
docker system prune            # 全面清理
docker system prune -a         # 更徹底
docker system df               # 查看磁碟使用
```

---

## 四、docker logs - 查看日誌（10 分鐘）

### 基本用法

- 顯示容器的 stdout 和 stderr 輸出
- `-f` 即時追蹤（類似 tail -f），`-t` 加上時間戳
- `--tail N` 只看最後 N 行，`--since` 根據時間篩選

```bash
docker logs my-nginx           # 顯示所有日誌
docker logs -tf my-nginx       # 即時追蹤 + 時間戳
docker logs --tail 100 my-nginx  # 最後 100 行
docker logs --since 1h my-nginx  # 最近 1 小時
```

### 日誌儲存與輪替

- 預設存在 `/var/lib/docker/containers/<id>/<id>-json.log`
- **不設限制的話會無限增長，塞爆硬碟**
- 在 daemon.json 或 docker run 時設定 max-size 和 max-file

```json
{
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### 實測技巧

- 用腳本產生持續日誌，方便練習 logs 指令

```bash
docker run -d centos /bin/sh -c "while true; do echo hello; sleep 1; done"
```

---

## 五、docker exec - 進入容器（10 分鐘）

### 基本用法

- 在執行中的容器內開啟新程序（不影響原有程序）
- `-it` 互動模式，通常用來開 shell 除錯

```bash
docker exec -it my-nginx bash      # 進入 shell
docker exec -it my-nginx /bin/sh   # Alpine 用 sh（沒有 bash）
docker exec my-nginx ls /etc/nginx # 執行單一命令（不需要 -it）
```

### 進階選項

- `-u` 指定使用者，`-e` 設定環境變數，`-w` 指定工作目錄

```bash
docker exec -u root my-nginx whoami
docker exec -e MY_VAR=hello my-nginx env
docker exec -w /etc/nginx my-nginx ls
```

### exec vs attach

| | docker exec | docker attach |
|--|-------------|---------------|
| 作用 | 開新程序 | 連到主程序 |
| 離開 | exit 只結束 shell | exit 可能停止容器 |
| 適用 | 除錯、檢查 | 查看主程序輸出 |

- 日常操作一律用 exec，很少用 attach

---

## 六、docker cp - 複製檔案（8 分鐘）

### 雙向複製

- 主機和容器之間可以雙向複製檔案或目錄
- 容器不需要在執行中也可以 cp

```bash
# 主機 → 容器
docker cp ./index.html my-nginx:/usr/share/nginx/html/

# 容器 → 主機
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf
```

### 使用場景

- 快速修改設定測試：複製出來 → 修改 → 放回去 → reload
- 提取日誌或資料進行分析

```bash
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf.bak
docker cp ./nginx.conf my-nginx:/etc/nginx/nginx.conf
docker exec my-nginx nginx -s reload
```

### docker cp 的局限

- cp 是手動一次性操作，不會自動同步
- 需要自動同步的場景應該使用 Volume（後續課程）

---

## 七、其他常用指令（3 分鐘）

### docker inspect

- 查看容器完整資訊（JSON 格式）：IP、Port、掛載、環境變數等
- 用 `-f` 提取特定欄位

```bash
docker inspect my-nginx
docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' my-nginx
```

### docker stats / docker top

- `docker stats`：即時監控所有容器的 CPU、記憶體、網路使用率
- `docker top`：查看容器內的程序清單

```bash
docker stats
docker top my-nginx
```

---

## 八、docker commit - 提交自訂映像檔（5 分鐘）

### 基本用法

- 把容器當前狀態打包成新的映像檔（類似虛擬機快照）
- `-m` 寫描述，`-a` 寫作者（和 git commit 類似）

```bash
docker commit -m="描述信息" -a="作者" 容器ID 映像檔名:TAG
```

### 實戰：修改 Tomcat 並提交

- 官方 Tomcat 的 webapps 目錄預設是空的，需手動複製
- 修改完後 commit 成新映像檔，下次直接用

### 理解分層

- 下載的映像檔 = 原始唯讀層
- 容器內的操作 = 新的可寫層
- docker commit = 把所有層打包成新映像檔
- 生產環境應用 Dockerfile 而非 commit（可追蹤、可重現）

---

## 九、本堂課小結（2 分鐘）

| 指令 | 功能 |
|-----|-----|
| docker stop/start/restart | 啟停容器 |
| docker kill | 強制終止 |
| docker rm | 刪除容器 |
| docker rmi | 刪除映像檔 |
| docker logs | 查看日誌（-tf 即時追蹤） |
| docker exec | 進入容器執行命令 |
| docker cp | 主機與容器間複製檔案 |
| docker inspect/stats/top | 查看容器資訊與監控 |
| docker commit | 提交容器為新映像檔 |

**清理指令**

| 指令 | 清理對象 |
|-----|---------|
| docker container prune | 已停止容器 |
| docker image prune | Dangling images |
| docker system prune | 全面清理 |

**Docker 學習路線**

| 階段 | 內容 |
|------|------|
| 入門 | 基本指令、映像檔、容器、commit |
| 精髓 | 數據卷、Dockerfile、Docker 網路 |
| 企業實戰 | Docker Compose、Docker Swarm、CI/CD |

下一堂課：Nginx 容器實戰。

---

## 板書 / PPT 建議

1. 容器生命週期狀態圖（created → running → paused → stopped → deleted）
2. stop vs kill 比較（SIGTERM vs SIGKILL）
3. docker logs 參數表
4. docker exec vs docker attach 比較
5. 清理指令對照表
6. docker commit 分層示意圖
