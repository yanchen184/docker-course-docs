# Day 2 第五小時：Docker 基本指令（下）

---

## 一、前情提要（2 分鐘）

上一堂課學了「取得和執行」：pull、images、run、ps。

這堂課學「管理和清理」：
- docker stop/start/restart：容器啟停
- docker rm/rmi：刪除容器和映像檔
- docker logs：查看日誌
- docker exec：進入容器
- docker cp：複製檔案

---

## 二、容器生命週期操作（15 分鐘）

### 2.1 docker stop - 停止容器

```bash
docker stop my-nginx
```

送出 SIGTERM 信號，等待容器優雅關閉（預設 10 秒）。超時後送 SIGKILL 強制終止。

> **常見的坑：後台啟動容器馬上停止**
>
> 如果用 `docker run -d centos` 後台啟動一個沒有前台進程的容器，`docker ps` 會發現它立刻停止了。原因是 Docker 容器使用後台運行時，必須要有一個前台進程在執行；如果容器發現沒有應用在前台運行或對外提供服務，就會自動停止。像 Nginx、Tomcat 這類有前台服務的容器不會有這個問題，但純 OS 映像檔（如 CentOS、Ubuntu）用 `-d` 啟動時需要搭配一個持續執行的命令。

**指定等待時間**

```bash
docker stop -t 30 my-nginx    # 等 30 秒
docker stop -t 0 my-nginx     # 立刻 SIGKILL
```

**停止多個容器**

```bash
docker stop container1 container2 container3
```

**停止所有容器**

```bash
docker stop $(docker ps -q)
```

### 2.2 docker start - 啟動已停止的容器

```bash
docker start my-nginx
```

容器之前的設定（port、volume、環境變數）都會保留。

**互動模式啟動**

```bash
docker start -ai my-ubuntu
```

- `-a`：附加到容器的輸出
- `-i`：保持 STDIN 開啟

### 2.3 docker restart - 重啟容器

```bash
docker restart my-nginx
```

等於 stop + start。

```bash
docker restart -t 5 my-nginx    # 等 5 秒後重啟
```

### 2.4 docker kill - 強制終止

```bash
docker kill my-nginx
```

直接送 SIGKILL，不等待。

用於容器沒有回應、stop 沒反應的情況。

**指定信號**

```bash
docker kill -s SIGHUP my-nginx
```

### 2.5 docker pause/unpause - 暫停/恢復

```bash
docker pause my-nginx
docker unpause my-nginx
```

暫停容器內所有程序（使用 cgroups freezer）。

程序狀態保留，不會丟失資料。和 stop 不同，stop 會終止程序。

---

## 三、刪除容器和映像檔（12 分鐘）

### 3.1 docker rm - 刪除容器

```bash
docker rm my-nginx
```

只能刪除已停止的容器。

**強制刪除執行中的容器**

```bash
docker rm -f my-nginx
```

等於先 kill 再 rm。

**刪除多個容器**

```bash
docker rm container1 container2
```

**刪除所有已停止的容器**

```bash
docker rm $(docker ps -aq -f status=exited)
```

或使用：

```bash
docker container prune
```

會詢問確認，加 `-f` 跳過確認。

### 3.2 docker rmi - 刪除映像檔

```bash
docker rmi nginx:1.25
```

可以用名稱或 IMAGE ID。

**刪除多個映像檔**

```bash
docker rmi nginx:1.25 nginx:1.24 ubuntu:22.04
```

**強制刪除**

如果映像檔被容器使用中，需要強制刪除：

```bash
docker rmi -f nginx:1.25
```

**刪除所有未使用的映像檔**

```bash
docker image prune -a
```

**刪除 dangling images**

```bash
docker image prune
```

### 3.3 docker system prune - 全面清理

```bash
docker system prune
```

清理：
- 已停止的容器
- 未被使用的網路
- Dangling images
- Build cache

加 `-a` 清理更多：

```bash
docker system prune -a
```

也會清理所有未被使用的映像檔（不只是 dangling）。

**查看磁碟使用**

```bash
docker system df
```

輸出：

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          15        3         5.2GB     4.1GB (79%)
Containers      5         2         120MB     80MB (66%)
Local Volumes   8         4         2.3GB     1.2GB (52%)
Build Cache     0         0         0B        0B
```

---

## 四、docker logs - 查看日誌（10 分鐘）

### 4.1 基本用法

```bash
docker logs my-nginx
```

顯示容器的標準輸出（stdout）和標準錯誤（stderr）。

### 4.2 即時追蹤

```bash
docker logs -f my-nginx
```

類似 `tail -f`，持續顯示新的日誌。Ctrl+C 退出。

**組合使用 -t 和 -f**

```bash
docker logs -tf 容器ID
```

`-t` 顯示時間戳，`-f` 持續輸出，兩個常一起用。

**實測技巧：用腳本產生日誌**

如果容器沒有自己的日誌輸出，可以啟動時搭配 shell 腳本：

```bash
docker run -d centos /bin/sh -c "while true; do echo hello; sleep 1; done"
```

這樣容器不會因為沒有前台進程而停止，且每秒會產生一行日誌，方便練習 `docker logs`。

### 4.3 顯示時間戳

```bash
docker logs -t my-nginx
```

每行前面加上時間：

```
2024-01-15T10:30:45.123456789Z 172.17.0.1 - - [15/Jan/2024...
```

### 4.4 限制輸出行數

```bash
docker logs --tail 100 my-nginx    # 最後 100 行
docker logs --tail 0 -f my-nginx   # 不顯示舊的，只追蹤新的
```

### 4.5 根據時間篩選

```bash
docker logs --since 2024-01-15 my-nginx
docker logs --since 1h my-nginx       # 最近 1 小時
docker logs --since 30m my-nginx      # 最近 30 分鐘
docker logs --until 2024-01-14 my-nginx
```

可以組合：

```bash
docker logs --since 1h --until 30m my-nginx
```

### 4.6 日誌的儲存位置

預設，日誌存在：

```
/var/lib/docker/containers/<container-id>/<container-id>-json.log
```

這個檔案會一直增長，可能把磁碟塞爆。

**設定日誌輪替**

在 /etc/docker/daemon.json：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

每個日誌檔最大 10MB，最多保留 3 個檔案。

或在 docker run 時指定：

```bash
docker run -d --log-opt max-size=10m --log-opt max-file=3 nginx
```

---

## 五、docker exec - 進入容器（10 分鐘）

### 5.1 基本用法

```bash
docker exec -it my-nginx bash
```

在執行中的容器內執行命令。

`-it` 是互動模式，通常用來開 shell。

### 5.2 執行單一命令

```bash
docker exec my-nginx ls /etc/nginx
docker exec my-nginx cat /etc/nginx/nginx.conf
docker exec my-nginx nginx -v
```

不需要 `-it`，執行完就回來。

### 5.3 以不同使用者執行

```bash
docker exec -u root my-nginx whoami
docker exec -u 1000 my-nginx whoami
docker exec -u www-data my-nginx whoami
```

### 5.4 設定環境變數

```bash
docker exec -e MY_VAR=hello my-nginx env
```

### 5.5 指定工作目錄

```bash
docker exec -w /etc/nginx my-nginx ls
```

### 5.6 常用場景

**檢查設定檔**

```bash
docker exec my-nginx cat /etc/nginx/nginx.conf
```

**查看程序**

```bash
docker exec my-nginx ps aux
```

**測試網路連線**

```bash
docker exec my-nginx curl localhost
docker exec my-nginx ping google.com
```

**進入 shell 除錯**

```bash
docker exec -it my-nginx /bin/sh
# 或
docker exec -it my-nginx bash
```

有些映像檔沒有 bash（如 Alpine），用 sh。

### 5.7 exec vs attach

`docker attach` 也能連到容器，但不同：

| | docker exec | docker attach |
|--|-------------|---------------|
| 作用 | 在容器內開新程序 | 連到容器的主程序 |
| 離開 | exit 只結束這個 shell | exit 可能停止整個容器 |
| 適用 | 除錯、檢查 | 查看主程序輸出 |

通常用 exec，很少用 attach。

> **提示**：`docker exec` 進入容器後開啟的是一個新的終端，用 `exit` 離開只會結束這個 shell，不影響容器；而 `docker attach` 連接的是容器的主進程終端，如果按 `exit` 或 Ctrl+C，可能會導致容器停止。因此日常操作建議一律使用 `exec`。

---

## 六、docker cp - 複製檔案（8 分鐘）

### 6.1 從主機複製到容器

```bash
docker cp ./index.html my-nginx:/usr/share/nginx/html/
```

### 6.2 從容器複製到主機

```bash
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf
```

### 6.3 複製目錄

```bash
docker cp ./website/ my-nginx:/usr/share/nginx/html/
docker cp my-nginx:/var/log/nginx/ ./logs/
```

### 6.4 注意事項

- 容器不需要執行中也可以 cp
- 會覆蓋目標檔案
- 保留檔案權限和時間戳（加 `-a`）

```bash
docker cp -a ./files my-nginx:/data/
```

### 6.5 使用場景

**快速修改設定測試**

```bash
# 備份原設定
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf.bak

# 修改後放回去
docker cp ./nginx.conf my-nginx:/etc/nginx/nginx.conf

# 重載設定
docker exec my-nginx nginx -s reload
```

**提取日誌或資料**

```bash
docker cp my-app:/app/logs/ ./debug-logs/
```

> **docker cp 的局限**：`docker cp` 是手動的一次性操作。如果需要讓容器內的目錄與主機目錄自動雙向同步，應使用 Volume（數據卷）技術，後續課程會詳細介紹。

---

## 七、其他常用指令（3 分鐘）

### 7.1 docker inspect - 查看詳細資訊（元數據）

```bash
docker inspect my-nginx
```

輸出 JSON 格式的完整資訊，包含：

- **容器 ID**：`docker ps` 顯示的是縮寫，inspect 可以看到完整 ID
- **創建時間**、**狀態**（Running / Stopped）
- **PID**：容器主進程的進程 ID
- **Args / Cmd**：啟動時傳入的參數和命令
- **Mounts**：掛載資訊（目前沒有掛載則為空）
- **Env**：環境變數清單
- **NetworkSettings**：網路模式（預設 bridge）、IP 位址、Port 對應

**取得特定欄位**

```bash
# 取得 IP
docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' my-nginx

# 取得 Port Mapping
docker inspect -f '{{.NetworkSettings.Ports}}' my-nginx
```

### 7.2 docker stats - 即時監控

```bash
docker stats
```

顯示所有容器的 CPU、記憶體、網路、I/O 使用率。

```bash
docker stats my-nginx    # 只看特定容器
```

### 7.3 docker top - 查看容器內程序

```bash
docker top my-nginx
```

類似在容器內執行 `ps`。輸出會顯示 UID（使用者 ID）、PID（進程 ID）、PPID（父進程 ID）等資訊。如果需要殺掉容器內的某個進程，可以透過這裡查到 PID。

---

## 八、docker commit - 提交自訂映像檔（5 分鐘）

### 8.1 基本用法

```bash
docker commit -m="提交的描述信息" -a="作者" 容器ID 目標映像檔名:[TAG]
```

和 `git commit` 類似：`-m` 寫描述，`-a` 寫作者。

### 8.2 實戰：修改 Tomcat 並提交

官方 Tomcat 映像檔的 `webapps` 目錄預設是空的（內容在 `webapps.dist`），需要手動複製：

```bash
# 啟動 Tomcat
docker run -it -p 8080:8080 tomcat

# 在容器內複製預設應用
cp -r webapps.dist/* webapps/
```

現在 Tomcat 首頁可以正常顯示了。把這個修改過的容器提交為新映像檔：

```bash
docker commit -a="yourname" -m="add webapps application" 容器ID my-tomcat:1.0
```

用 `docker images` 可以看到新的映像檔 `my-tomcat:1.0`，大小會比原始映像檔略大，因為多了一層我們的修改。

### 8.3 理解分層

- 下載的映像檔是原始的映像層
- 我們在容器內的所有操作形成新的一層
- `docker commit` 把這些層打包成一個新的映像檔
- 就像虛擬機的「快照」功能，記錄當前狀態

以後想保存容器的當前狀態，就用 `docker commit`。每次提交可以用不同的 TAG（如 1.0、1.1、2.0），形成版本歷史。

---

## 九、本堂課小結（2 分鐘）

這堂課學了管理容器的指令：

| 指令 | 功能 |
|-----|-----|
| docker stop/start/restart | 啟停容器 |
| docker kill | 強制終止 |
| docker rm | 刪除容器 |
| docker rmi | 刪除映像檔 |
| docker logs | 查看日誌 |
| docker exec | 進入容器執行命令 |
| docker cp | 複製檔案 |
| docker inspect | 查看詳細資訊（元數據） |
| docker stats | 即時監控 |
| docker top | 查看容器內程序 |
| docker commit | 提交容器為新映像檔 |

**清理指令**

| 指令 | 清理對象 |
|-----|---------|
| docker container prune | 已停止的容器 |
| docker image prune | Dangling images |
| docker system prune | 全面清理 |

下一堂課：Nginx 容器實戰。

**Docker 學習路線**

| 階段 | 內容 |
|------|------|
| 入門 | 基本指令、映像檔、容器、commit |
| 精髓 | 數據卷、Dockerfile、Docker 網路 |
| 企業實戰 | Docker Compose、Docker Swarm、CI/CD |

---

## 板書 / PPT 建議

1. 容器生命週期狀態圖
2. stop vs kill 比較
3. docker logs 參數表
4. docker exec vs docker attach 比較
5. 清理指令對照表
6. docker commit 分層示意圖
