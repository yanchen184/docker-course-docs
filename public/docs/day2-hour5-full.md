# Day 2 第五小時：Docker 基本指令（下）

---

## 一、前情提要（2 分鐘）

上一堂課學了「取得和執行」：pull、images、run、ps。你現在已經會拉映像檔、跑容器、查看容器狀態了。

這堂課進入「管理和清理」，也就是容器跑起來之後的日常維運操作：

- docker stop/start/restart：容器啟停
- docker rm/rmi：刪除容器和映像檔
- docker logs：查看日誌
- docker exec：進入容器
- docker cp：複製檔案
- docker commit：提交容器為新映像檔

上一堂課跑起來的那些容器，這堂課全部都會用到。如果你已經刪掉了，先跑一個起來：

```bash
docker run -d --name my-nginx -p 8080:80 nginx
```

確認 `docker ps` 有看到它在跑，我們就開始。

---

## 二、容器生命週期操作（15 分鐘）

### 2.1 docker stop - 停止容器

什麼時候需要停止容器？最常見的情境是：你要更新應用程式的設定、升級映像檔版本，或者這個容器暫時不需要了但之後還可能再啟動。

```bash
docker stop my-nginx
```

執行後你會看到 Docker 輸出容器的名稱，表示停止成功：

```
my-nginx
```

這時候再打 `docker ps`，就看不到 my-nginx 了。但打 `docker ps -a` 還是能看到它，STATUS 會顯示 `Exited (0)`。

**stop 背後的兩階段機制**

`docker stop` 不是直接把容器殺掉的。它的背後分兩個階段：

1. **第一階段**：送出 SIGTERM 信號。SIGTERM 是 Linux 中「請你結束」的禮貌請求。容器內的主程序收到這個信號後，有機會做收尾工作——比如關閉資料庫連線、把記憶體中的快取寫入磁碟、完成正在處理的 HTTP 請求等等。
2. **第二階段**：如果在預設的 10 秒等待時間內，容器還沒有自己停下來，Docker 就會送出 SIGKILL 信號，強制終止。SIGKILL 是沒有商量餘地的，程序無法捕捉也無法忽略這個信號。

為什麼要分兩階段？因為直接殺掉程序可能造成資料損壞。想像一個資料庫正在寫入資料的過程中被強制終止，寫了一半的資料就會損壞。SIGTERM 給了程序一個優雅關閉（graceful shutdown）的機會，這在生產環境中非常重要。

> **常見的坑：後台啟動容器馬上停止**
>
> 如果用 `docker run -d centos` 後台啟動一個沒有前台進程的容器，`docker ps` 會發現它立刻停止了。原因是 Docker 容器使用後台運行時，必須要有一個前台進程在執行；如果容器發現沒有應用在前台運行或對外提供服務，就會自動停止。像 Nginx、Tomcat 這類有前台服務的容器不會有這個問題，但純 OS 映像檔（如 CentOS、Ubuntu）用 `-d` 啟動時需要搭配一個持續執行的命令。

**指定等待時間**

有些應用程式的關閉時間比較長，比如 Java 應用可能需要 30 秒甚至更久來完成 graceful shutdown。這時候預設的 10 秒不夠用，可以用 `-t` 調整：

```bash
docker stop -t 30 my-nginx    # 等 30 秒再強制終止
docker stop -t 0 my-nginx     # 直接送 SIGKILL，不等待
```

`-t 0` 等於跳過 SIGTERM 階段，效果跟 `docker kill` 幾乎一樣。但平常不建議這樣用，除非你確定容器不需要做任何收尾。

**停止多個容器**

```bash
docker stop container1 container2 container3
```

**停止所有容器**

這是一個非常實用的批次操作。還記得上堂課教的 `-q` 參數嗎？它在這裡派上用場了：

```bash
docker stop $(docker ps -q)
```

`docker ps -q` 列出所有執行中容器的 ID，然後傳給 `docker stop` 一次停掉。開發環境收工的時候可以用這個一次停掉所有容器。

### 2.2 docker start - 啟動已停止的容器

什麼時候會用到 start？最常見的情境是：昨天下班前把容器 stop 了，今天早上來要繼續開發，用 start 把容器叫醒。

```bash
docker start my-nginx
```

輸出：

```
my-nginx
```

再用 `docker ps` 確認，STATUS 會顯示 `Up X seconds`，PORTS 欄位也會重新出現 port 對應。

**重要觀念：容器之前的所有設定（port mapping、volume 掛載、環境變數）都會保留。** 你不需要重新指定 `-p 8080:80` 這些參數，Docker 會記住上次 run 時的配置。這也是為什麼 stop + start 跟重新 run 一個新容器是不同的操作。

**互動模式啟動**

如果容器是用互動模式（`-it`）建立的，start 的時候也要加對應的參數才能重新進入互動介面：

```bash
docker start -ai my-ubuntu
```

- `-a`：附加到容器的 STDOUT/STDERR 輸出
- `-i`：保持 STDIN 開啟，讓你可以輸入命令

如果只打 `docker start my-ubuntu`，容器會在背景啟動，但你看不到也操作不了它的 shell。

### 2.3 docker restart - 重啟容器

什麼時候需要 restart？最典型的場景是修改了容器內的設定檔，需要重啟程序才能生效。比如改了 nginx 的 `nginx.conf`，最快的方式就是 restart 整個容器。

```bash
docker restart my-nginx
```

restart 等於先 stop 再 start，中間會經歷完整的 SIGTERM → 等待 → SIGKILL（如果超時的話）→ start 流程。

```bash
docker restart -t 5 my-nginx    # stop 階段只等 5 秒
```

restart 之後容器的 Uptime 會歸零。如果你用 `docker ps` 看，STATUS 會顯示 `Up X seconds`，從重啟的那一刻開始計算。

### 2.4 docker kill - 強制終止

```bash
docker kill my-nginx
```

直接送 SIGKILL，不等待，不給容器收尾的機會。

什麼時候用 kill 而不是 stop？當容器卡死了、沒有回應、stop 等了很久都沒有停下來的時候。這就像電腦當機了你長按電源鍵強制關機一樣——不得已才用。

**踩坑經驗**：某些有 bug 的應用程式會忽略 SIGTERM 信號（比如信號處理程式碼寫錯了），導致 `docker stop` 每次都要等完整的 10 秒超時才能停掉。如果你發現 stop 總是特別慢，可能就是這個原因。這時候可以用 `docker stop -t 2` 縮短等待時間，或者直接用 `docker kill`。

**指定信號**

kill 預設送 SIGKILL，但你也可以指定其他信號：

```bash
docker kill -s SIGHUP my-nginx
```

SIGHUP 在 Nginx 中的效果是重新載入設定檔，而不是終止程序。不同的應用對不同的信號有不同的行為，這個比較進階，知道有這個功能就好。

### 2.5 docker pause/unpause - 暫停/恢復

```bash
docker pause my-nginx
docker unpause my-nginx
```

pause 和 stop 有什麼不同？stop 是終止程序，pause 是凍結程序。

用生活化的比喻：stop 就像把電腦關機，pause 就像把電腦休眠。休眠的時候所有東西都還在記憶體裡，一喚醒就能從暫停的地方繼續。

技術上，pause 是利用 Linux cgroups 的 freezer 功能來凍結容器內所有程序。程序的狀態完整保留在記憶體中，CPU 完全不消耗，但記憶體還是被佔用的。

pause 之後用 `docker ps` 看，STATUS 欄位會顯示 `Up X minutes (Paused)`。這時候如果你去訪問容器提供的服務（比如 `curl localhost:8080`），請求會被掛住，不會得到回應，直到你 unpause。

什麼時候用 pause？比較少見，但有一個場景是：你需要對容器做某些診斷（比如查看記憶體快照），但不希望容器繼續運行產生新的狀態變化。

---

## 三、刪除容器和映像檔（12 分鐘）

### 3.1 docker rm - 刪除容器

容器停止之後不會自動消失，它還佔著磁碟空間。時間一久，停止的容器會越積越多。用 `docker ps -a` 可以看到一大堆 `Exited` 狀態的容器。這時候就需要 rm 來清理。

```bash
docker rm my-nginx
```

輸出容器名稱表示刪除成功：

```
my-nginx
```

**注意：只能刪除已停止的容器。** 如果容器還在跑，直接 rm 會報錯：

```
Error response from daemon: You cannot remove a running container abc123...
Stop the container before attempting removal or force remove.
```

這是初學者非常常遇到的錯誤。Docker 故意這樣設計，是為了避免你不小心把正在服務的容器刪掉。

**強制刪除執行中的容器**

如果你確定要刪，加 `-f`（force）：

```bash
docker rm -f my-nginx
```

`-f` 的效果等於先 kill 再 rm。在開發環境中直接用 `-f` 很方便，但生產環境建議先 stop 再 rm，給程序一個 graceful shutdown 的機會。

**踩坑：忘記加 -f 刪不掉執行中容器**

很多初學者一直打 `docker rm xxx` 一直報錯，搞不懂為什麼。看到錯誤訊息就知道了——容器還在跑。要嘛先 stop，要嘛加 `-f`。

**刪除多個容器**

```bash
docker rm container1 container2
```

**刪除所有已停止的容器**

```bash
docker rm $(docker ps -aq -f status=exited)
```

或者用更簡潔的命令：

```bash
docker container prune
```

執行後 Docker 會問你確認：

```
WARNING! This will remove all stopped containers.
Are you sure you want to continue? [y/N]
```

輸入 `y` 確認。加 `-f` 可以跳過確認：

```bash
docker container prune -f
```

### 3.2 docker rmi - 刪除映像檔

映像檔不用了也要刪，否則佔磁碟空間。特別是拉了很多不同版本的映像檔之後，隨便就幾個 GB。

```bash
docker rmi nginx:1.25
```

可以用名稱加 Tag，也可以用 IMAGE ID：

```bash
docker rmi a6bd71f48f68
```

**刪除多個映像檔**

```bash
docker rmi nginx:1.25 nginx:1.24 ubuntu:22.04
```

**強制刪除**

如果映像檔被某個容器使用中（即使容器已經停止），正常刪除會報錯：

```
Error response from daemon: conflict: unable to remove repository reference "nginx:1.25"
(must force) - container abc123 is using its referenced image def456
```

這時候加 `-f` 強制刪除：

```bash
docker rmi -f nginx:1.25
```

**踩坑：映像檔刪不掉的排查順序**

1. 先用 `docker ps -a` 看看有沒有容器（包括已停止的）在使用這個映像檔
2. 如果有，先用 `docker rm` 刪掉那些容器，再刪映像檔
3. 實在搞不定，加 `-f` 強制刪除

**刪除所有未使用的映像檔**

```bash
docker image prune -a
```

`-a` 會刪除所有沒有被任何容器使用的映像檔，不只是 dangling images。執行前想清楚，因為下次用到這些映像檔的時候需要重新 pull。

**刪除 dangling images**

```bash
docker image prune
```

不加 `-a`，只刪除那些 `<none>:<none>` 的懸空映像檔。這是最安全的清理操作，可以放心執行。

### 3.3 docker system prune - 全面清理

當你的開發機用了一段時間，各種殘留的容器、映像檔、網路、快取越來越多，磁碟空間越來越少。`docker system prune` 是一鍵大掃除的工具。

```bash
docker system prune
```

它會清理以下四類東西：
- 已停止的容器
- 未被使用的網路
- Dangling images（`<none>` 映像檔）
- Build cache（建構快取）

執行後 Docker 會顯示清理了多少空間，比如：

```
Total reclaimed space: 2.3GB
```

加 `-a` 清理更多：

```bash
docker system prune -a
```

除了上述四類，還會清理所有未被任何容器使用的映像檔（不只是 dangling 的）。這個殺傷力比較大，建議執行前先看看會清掉什麼。

**查看磁碟使用情況**

在清理之前，先用這個命令看看 Docker 佔了多少空間：

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

RECLAIMABLE 欄位告訴你可以回收多少空間。如果 Images 那行可以回收 4.1GB，那就值得跑一下 prune。

**建議養成的習慣**：每隔一兩週跑一次 `docker system df` 看看空間使用情況。如果 RECLAIMABLE 很大，就跑 `docker system prune` 清理一下。特別是在筆電上開發，SSD 空間本來就不多，Docker 積累的垃圾很容易就吃掉幾十 GB。

---

## 四、docker logs - 查看日誌（10 分鐘）

容器跑在背景，你看不到它的輸出。出了問題怎麼 debug？答案就是 `docker logs`。這是排查容器問題的第一個工具，甚至可以說是最重要的工具。

### 4.1 基本用法

```bash
docker logs my-nginx
```

顯示容器的標準輸出（stdout）和標準錯誤（stderr）。對 Nginx 來說，就是 access log 和 error log。

執行後你會看到類似這樣的輸出：

```
/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration
/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/
...
2024-01-15 10:30:45 [notice] 1#1: nginx/1.25.3
2024-01-15 10:30:45 [notice] 1#1: built by gcc 12.2.0
...
```

如果你之前有訪問過 `localhost:8080`，還會看到 access log：

```
172.17.0.1 - - [15/Jan/2024:10:35:22 +0000] "GET / HTTP/1.1" 200 615 "-" "Mozilla/5.0..."
```

### 4.2 即時追蹤

```bash
docker logs -f my-nginx
```

`-f` 是 follow 的意思，類似 Linux 的 `tail -f`。命令不會結束，而是持續顯示新產生的日誌。這時候你開另一個終端或瀏覽器去訪問 Nginx，就能即時看到新的 access log 出現。用 `Ctrl+C` 退出追蹤。

這是 debug 最常用的模式：一邊操作應用程式，一邊即時看日誌，哪裡出了問題一目了然。

**組合使用 -t 和 -f**

```bash
docker logs -tf 容器ID
```

`-t` 顯示時間戳，`-f` 持續輸出，兩個常一起用。加了 `-t` 之後每行前面會多一個精確到奈秒的時間戳，方便判斷事件發生的順序。

**實測技巧：用腳本產生日誌**

如果你想練習 `docker logs`，但容器沒有什麼日誌輸出，可以自己造一個持續產生日誌的容器：

```bash
docker run -d --name log-test centos /bin/sh -c "while true; do echo hello; sleep 1; done"
```

這個容器每秒會輸出一行 `hello`。然後用 `docker logs -f log-test` 就能看到持續不斷的輸出。同時也解決了純 OS 映像檔用 `-d` 啟動會立刻停止的問題——因為 shell 腳本是一個持續執行的前台進程。

### 4.3 顯示時間戳

```bash
docker logs -t my-nginx
```

每行前面加上 ISO 8601 格式的時間戳：

```
2024-01-15T10:30:45.123456789Z 172.17.0.1 - - [15/Jan/2024...
```

`Z` 表示 UTC 時間。如果你在台灣，要加 8 小時才是本地時間。

### 4.4 限制輸出行數

如果容器已經跑了好幾天，日誌可能有幾萬行。全部輸出的話終端會被淹沒。用 `--tail` 限制只看最後幾行：

```bash
docker logs --tail 100 my-nginx    # 最後 100 行
docker logs --tail 20 my-nginx     # 最後 20 行
```

一個非常實用的組合——不看舊的日誌，只追蹤新產生的：

```bash
docker logs --tail 0 -f my-nginx
```

`--tail 0` 表示不顯示任何舊日誌，`-f` 表示從現在開始追蹤。這樣你不會被歷史日誌淹沒，只看到操作之後新產生的日誌。在 debug 的時候非常好用。

### 4.5 根據時間篩選

如果你知道問題大概發生在什麼時間，可以用 `--since` 和 `--until` 篩選：

```bash
docker logs --since 2024-01-15 my-nginx
docker logs --since 1h my-nginx       # 最近 1 小時
docker logs --since 30m my-nginx      # 最近 30 分鐘
docker logs --until 2024-01-14 my-nginx
```

可以組合使用，查看某個時間區間的日誌：

```bash
docker logs --since 1h --until 30m my-nginx
```

這表示「一小時前到三十分鐘前」這段時間的日誌。

### 4.6 日誌的儲存位置與磁碟爆滿問題

Docker 預設把容器的日誌存在主機的檔案系統中：

```
/var/lib/docker/containers/<container-id>/<container-id>-json.log
```

**這裡有一個非常嚴重的坑：這個檔案預設沒有大小限制，會一直增長。** 如果你的容器不斷產生日誌（比如一個高流量的 Web 伺服器），這個檔案可能在幾天或幾週內長到幾十 GB，最終把磁碟塞爆。磁碟一滿，不只 Docker，整台主機上的所有服務都可能出問題。

這是生產環境中非常常見的事故。有些團隊部署完容器就不管了，過了幾個月突然發現伺服器掛了，一查才發現是 Docker 日誌把磁碟吃光了。

**解決方案：設定日誌輪替（Log Rotation）**

全域設定，修改 `/etc/docker/daemon.json`：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

- `max-size`：每個日誌檔最大 10MB
- `max-file`：最多保留 3 個檔案

所以每個容器最多佔用 30MB 的日誌空間。超過之後舊的日誌會被自動輪替刪除。修改 `daemon.json` 後需要重啟 Docker daemon 才會生效，而且只對之後新建的容器有效，已經在跑的容器不受影響。

也可以在 docker run 時針對單一容器設定：

```bash
docker run -d --log-opt max-size=10m --log-opt max-file=3 nginx
```

**強烈建議**：不管是開發環境還是生產環境，一定要設定日誌輪替。這是 Docker 運維的基本功。

---

## 五、docker exec - 進入容器（10 分鐘）

容器跑在背景，有時候你需要進去看看裡面的情況——查看設定檔、檢查程序狀態、測試網路連線、安裝除錯工具等等。`docker exec` 就是讓你「走進容器裡面」的命令。

### 5.1 基本用法

```bash
docker exec -it my-nginx bash
```

執行後命令提示符會變成類似 `root@abc123:/#` 的格式，表示你已經進到容器內部了。這跟 SSH 進入一台遠端伺服器的體驗很像，但比 SSH 方便多了——不需要設定密碼、不需要網路設定、不需要安裝 SSH server。

`-it` 是互動模式，`-i`（interactive）保持標準輸入開啟讓你能打字，`-t`（tty）分配一個偽終端讓畫面顯示正常。兩個通常一起用。

**踩坑：進去之後發現沒有 bash**

很多精簡版映像檔（特別是 Alpine-based 的映像檔）根本沒有安裝 bash。你打 `docker exec -it xxx bash` 會看到：

```
OCI runtime exec failed: exec failed: unable to start container process:
exec: "bash": executable file not found in $PATH: unknown
```

解決方法：改用 `sh`，幾乎所有映像檔都有 sh：

```bash
docker exec -it my-nginx /bin/sh
```

**判斷映像檔有沒有 bash 的快速方法**：

- 基於 Debian/Ubuntu 的映像檔通常有 bash
- 基於 Alpine 的映像檔通常只有 sh
- `distroless` 映像檔連 sh 都沒有，根本無法 exec 進入

如果映像檔的 Tag 裡帶有 `alpine` 字樣（比如 `nginx:alpine`、`node:20-alpine`），優先用 sh。

### 5.2 執行單一命令

不一定要開 shell 進去。如果你只是想看某個檔案或執行某個命令，可以直接指定：

```bash
docker exec my-nginx ls /etc/nginx
docker exec my-nginx cat /etc/nginx/nginx.conf
docker exec my-nginx nginx -v
```

不需要 `-it`，命令執行完就回到你的主機終端。輸出會直接印在你的終端上。

比如 `docker exec my-nginx nginx -v` 的輸出：

```
nginx version: nginx/1.25.3
```

這種方式很適合快速查看某個資訊，不需要開一整個 shell session。

### 5.3 以不同使用者執行

預設進入容器的身份是映像檔定義的預設使用者（通常是 root）。但有時候你需要以其他身份執行命令：

```bash
docker exec -u root my-nginx whoami       # 以 root 身份
docker exec -u 1000 my-nginx whoami       # 以 UID 1000 的使用者
docker exec -u www-data my-nginx whoami   # 以 www-data 使用者
```

什麼時候用？比如某些容器為了安全，預設不是 root。你需要 root 權限來安裝除錯工具（`apt-get install`），就可以用 `-u root` 臨時提權。

### 5.4 設定環境變數

```bash
docker exec -e MY_VAR=hello my-nginx env
```

`-e` 可以在 exec 時注入臨時的環境變數。這個環境變數只存在於這次 exec 的程序中，不會影響容器內其他正在運行的程序。

### 5.5 指定工作目錄

```bash
docker exec -w /etc/nginx my-nginx ls
```

`-w` 指定命令的工作目錄，等於你先 `cd /etc/nginx` 再執行 `ls`。不加 `-w` 的話，預設的工作目錄是映像檔定義的 WORKDIR。

### 5.6 常用場景

以下是日常工作中最常用 exec 的幾個場景：

**場景一：檢查設定檔——確認容器內的設定是否正確**

```bash
docker exec my-nginx cat /etc/nginx/nginx.conf
```

**場景二：查看程序——確認服務是否正常運行**

```bash
docker exec my-nginx ps aux
```

如果看到 nginx 的 master process 和 worker process 都在，就表示服務正常。如果 ps 命令不存在（精簡映像檔常見），可以從主機端用 `docker top my-nginx` 替代。

**場景三：測試網路連線——確認容器能不能訪問外部**

```bash
docker exec my-nginx curl localhost
docker exec my-nginx ping google.com
```

**踩坑**：很多映像檔沒有安裝 curl、ping、wget 這些工具。你會看到 `command not found`。解決方法是先進入容器，用套件管理工具安裝：

```bash
# Debian/Ubuntu 系列
docker exec -it my-nginx bash
apt-get update && apt-get install -y curl iputils-ping

# Alpine 系列
docker exec -it my-nginx sh
apk add --no-cache curl
```

**場景四：進入 shell 做深度除錯**

```bash
docker exec -it my-nginx /bin/sh
# 或
docker exec -it my-nginx bash
```

進去之後你就像操作一台遠端伺服器一樣，可以自由查看檔案、修改設定、安裝工具。用 `exit` 離開，不會影響容器的主程序。

### 5.7 exec vs attach

Docker 還有一個 `docker attach` 命令也能連到容器，但它跟 exec 有本質的區別：

| | docker exec | docker attach |
|--|-------------|---------------|
| 作用 | 在容器內**開一個新程序** | 連到容器的**主程序** |
| 離開 | exit 只結束這個 shell，容器不受影響 | exit 或 Ctrl+C 可能停止整個容器 |
| 適用場景 | 除錯、檢查、安裝工具 | 查看主程序的即時輸出 |
| 多人使用 | 多個人可以同時 exec 進同一個容器 | 只能有一個 attach session |

**為什麼 exec 比 attach 好？** 因為 attach 連的是容器的主程序（PID 1），你對主程序做的任何操作都直接影響容器本身。最危險的是——如果你在 attach 狀態下按了 `Ctrl+C`，發送的 SIGINT 信號會直接打到主程序上，可能導致整個容器停止。而 exec 開的是一個獨立的新程序，你怎麼操作都不會影響容器的主程序。

所以日常操作一律使用 exec，基本上不需要用 attach。唯一可能用到 attach 的場景是：你想看容器主程序的即時輸出，而且不想用 `docker logs -f`。但這種情況極少。

> **提示**：`docker exec` 進入容器後開啟的是一個新的終端，用 `exit` 離開只會結束這個 shell，不影響容器；而 `docker attach` 連接的是容器的主進程終端，如果按 `exit` 或 Ctrl+C，可能會導致容器停止。因此日常操作建議一律使用 `exec`。

---

## 六、docker cp - 複製檔案（8 分鐘）

有時候你需要在主機和容器之間傳遞檔案。比如你在主機上改好了一個設定檔，要放進容器裡；或者你想把容器裡的日誌檔拷出來分析。`docker cp` 就是做這件事的。

### 6.1 從主機複製到容器

```bash
docker cp ./index.html my-nginx:/usr/share/nginx/html/
```

格式是 `docker cp 來源 目標`。容器的路徑用 `容器名:路徑` 的格式。

執行後沒有輸出表示成功。你可以立刻在瀏覽器刷新頁面，看到你自己的 `index.html` 取代了 Nginx 預設的歡迎頁面。

### 6.2 從容器複製到主機

```bash
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf
```

把容器內的 nginx.conf 拷貝到你當前目錄。拷出來之後你就可以在主機上用你喜歡的編輯器（VS Code、Vim 等）打開查看和修改。

### 6.3 複製目錄

cp 不只能複製單一檔案，也能複製整個目錄：

```bash
docker cp ./website/ my-nginx:/usr/share/nginx/html/
docker cp my-nginx:/var/log/nginx/ ./logs/
```

目錄會被遞迴複製，包含裡面所有的子目錄和檔案。

### 6.4 注意事項

- **容器不需要執行中也可以 cp**：這一點很多人不知道。即使容器是 Exited 狀態，你照樣可以從裡面拷檔案出來，也可以往裡面放檔案。這在容器掛掉之後需要提取日誌來分析的時候非常有用。
- **會覆蓋目標檔案**：如果目標位置已經有同名檔案，會被直接覆蓋，不會有確認提示。
- **保留檔案權限和時間戳**：加 `-a`（archive）會保留原始的檔案權限、擁有者和時間戳。

```bash
docker cp -a ./files my-nginx:/data/
```

### 6.5 使用場景

**場景一：快速修改設定檔測試**

這是最常用的場景。你想改 Nginx 的設定，但不想重新 build 整個映像檔：

```bash
# 步驟 1：備份原設定
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf.bak

# 步驟 2：在主機上修改設定檔（用你喜歡的編輯器）
# vim nginx.conf  或 code nginx.conf

# 步驟 3：修改後放回容器
docker cp ./nginx.conf my-nginx:/etc/nginx/nginx.conf

# 步驟 4：重載設定（不用重啟容器）
docker exec my-nginx nginx -s reload
```

這個流程比進入容器內用 vi 編輯方便多了，因為容器內通常沒有安裝好用的編輯器。

**場景二：提取日誌或資料做離線分析**

```bash
docker cp my-app:/app/logs/ ./debug-logs/
```

把日誌拷出來之後，你可以用主機上的各種工具來分析——grep、awk、甚至丟進 Excel 做統計。

> **docker cp 的局限**：`docker cp` 是手動的一次性操作。每次修改都要重新 cp 一次。如果需要讓容器內的目錄與主機目錄自動雙向同步，應使用 Volume（數據卷）技術，後續課程會詳細介紹。Volume 是更正式、更推薦的做法，cp 只適合臨時的、一次性的檔案傳輸。

---

## 七、其他常用指令（3 分鐘）

### 7.1 docker inspect - 查看詳細資訊（元數據）

想知道一個容器的所有配置細節——IP 地址、掛載了什麼 Volume、環境變數有哪些、Port Mapping 怎麼設的——inspect 會全部告訴你。

```bash
docker inspect my-nginx
```

輸出是一大段 JSON 格式的完整資訊。第一次看會覺得資訊量太大，不知道重點在哪。慢慢來，重點關注這幾個部分：

- **容器 ID**：`docker ps` 顯示的是縮寫，inspect 可以看到完整的 64 字元 ID
- **State**：容器的詳細狀態（Running / Paused / Restarting / Exited），包含啟動時間、退出碼
- **PID**：容器主進程在主機上的進程 ID
- **Mounts**：掛載資訊（Volume 和 Bind Mount）
- **Env**：完整的環境變數清單
- **NetworkSettings**：網路模式（預設 bridge）、容器的 IP 位址、Port 對應關係

**取得特定欄位**

inspect 輸出的 JSON 太多看不過來，可以用 `-f`（format）搭配 Go Template 語法取出你要的欄位：

```bash
# 取得容器的 IP 位址
docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' my-nginx

# 取得 Port Mapping
docker inspect -f '{{.NetworkSettings.Ports}}' my-nginx
```

第一個命令的輸出可能是 `172.17.0.2`，這是容器在 Docker bridge 網路中的 IP。容器之間可以透過這個 IP 互相通訊。

### 7.2 docker stats - 即時監控

```bash
docker stats
```

顯示所有執行中容器的資源使用情況，而且是即時更新的（每秒刷新），類似 Linux 的 `top` 命令。你會看到 CPU 使用率、記憶體使用量、網路流量、磁碟 I/O 等指標。

```
CONTAINER ID   NAME       CPU %   MEM USAGE / LIMIT     MEM %   NET I/O          BLOCK I/O
abc123def456   my-nginx   0.00%   3.5MiB / 7.77GiB      0.04%   1.2kB / 648B     0B / 0B
```

只看特定容器：

```bash
docker stats my-nginx
```

按 `Ctrl+C` 退出。如果你懷疑某個容器吃了太多資源，docker stats 是第一個要看的工具。

### 7.3 docker top - 查看容器內程序

```bash
docker top my-nginx
```

類似在容器內執行 `ps`，但不需要進入容器。輸出會顯示 UID（使用者 ID）、PID（進程 ID）、PPID（父進程 ID）等資訊：

```
UID     PID    PPID   C   STIME   TTY   TIME      CMD
root    12345  12300  0   10:30   ?     00:00:00  nginx: master process nginx -g daemon off;
systemd 12400  12345  0   10:30   ?     00:00:00  nginx: worker process
```

注意這裡的 PID 是主機上的 PID，不是容器內部的 PID。如果需要從主機端殺掉容器內的某個失控進程，可以透過這個 PID 來操作。

---

## 八、docker commit - 提交自訂映像檔（5 分鐘）

### 8.1 基本用法

你在容器裡面做了一些修改——安裝了新軟體、改了設定檔、加了資料——想把這些修改保存下來，做成一個新的映像檔。`docker commit` 就是做這件事的。

```bash
docker commit -m="提交的描述信息" -a="作者" 容器ID 目標映像檔名:[TAG]
```

和 `git commit` 類似：`-m` 寫描述，`-a` 寫作者。

### 8.2 實戰：修改 Tomcat 並提交

官方 Tomcat 映像檔有一個設計上的「陷阱」：`webapps` 目錄預設是空的，所有預設的應用程式（包括首頁）都放在 `webapps.dist` 裡。這代表你把 Tomcat 容器跑起來，訪問 `localhost:8080` 看到的是一個 404 頁面，而不是預期的 Tomcat 首頁。這是官方故意的——生產環境不應該暴露管理頁面。

但學習的時候我們需要看到首頁來驗證 Tomcat 有正常運作。怎麼辦？手動把 `webapps.dist` 的內容複製到 `webapps`：

```bash
# 啟動 Tomcat（互動模式，方便操作）
docker run -it -p 8080:8080 tomcat

# 在容器內複製預設應用
cp -r webapps.dist/* webapps/
```

現在訪問 `localhost:8080`，Tomcat 首頁可以正常顯示了。但問題是——如果你把這個容器刪掉重新跑一個，又要重新複製一次。很煩。

解決方法：用 `docker commit` 把修改過的容器保存為新的映像檔：

```bash
docker commit -a="yourname" -m="add webapps application" 容器ID my-tomcat:1.0
```

成功後會輸出新映像檔的 SHA256 ID：

```
sha256:abcdef1234567890...
```

用 `docker images` 確認：

```
REPOSITORY   TAG   IMAGE ID       CREATED          SIZE
my-tomcat    1.0   abcdef123456   10 seconds ago   684MB
```

注意 SIZE 比原始的 tomcat 映像檔大了一點點——那就是我們多加的 webapps 內容。以後用 `docker run my-tomcat:1.0` 啟動的容器，直接就有完整的首頁了。

### 8.3 理解分層原理

Docker 映像檔是由多個唯讀的層（Layer）堆疊而成的。當你用映像檔建立容器的時候，Docker 會在最上面加一個可寫層（Container Layer）。你在容器裡做的所有修改——新增檔案、刪除檔案、修改設定——全部寫在這個可寫層裡。

`docker commit` 做的事情就是把這個可寫層固化成一個新的唯讀層，然後和下面原有的層一起打包成一個新的映像檔。

```
新映像檔 (my-tomcat:1.0)
├── Layer N (新的): cp -r webapps.dist/* webapps/  ← commit 產生的
├── Layer N-1: Tomcat 原有的層
├── Layer N-2: ...
└── Layer 1: 基礎 OS 層
```

就像虛擬機的「快照」功能——記錄當前狀態。每次 commit 可以用不同的 TAG（如 1.0、1.1、2.0），形成版本歷史。

### 8.4 為什麼不建議在生產環境用 commit

`docker commit` 雖然方便，但有幾個嚴重的問題使得它不適合在生產環境使用：

1. **不可重現**：commit 生成的映像檔，別人拿到之後完全不知道裡面做了什麼修改。你在容器裡裝了什麼、改了什麼、刪了什麼，全部是黑盒子。兩個月後連你自己都記不得了。

2. **不透明**：無法做程式碼審查（Code Review）。你的同事看到一個 commit 產生的映像檔，他沒辦法 review 你到底做了什麼變更。

3. **臃腫**：你在容器裡 `apt-get install` 安裝了工具，安裝過程產生的暫存檔、快取檔全部會被一起 commit 進映像檔。即使你事後 `rm` 刪掉那些暫存檔，由於分層的特性，那些檔案在下面的層裡還是存在的，映像檔不會變小。

4. **安全隱患**：容器內可能有敏感資訊（密碼、token、私鑰），commit 的時候會一起被打包進去。

**正確做法是使用 Dockerfile。** Dockerfile 是一個文字檔，用一行行的指令描述如何從基礎映像檔開始，一步步建構出你需要的映像檔。它是可讀的、可 review 的、可版本控制的、可重現的。後面的課程會詳細教 Dockerfile。

### 8.5 commit 的適用場景

雖然不建議在生產環境用，但 commit 在以下場景還是很有用的：

- **快速原型**：你在測試階段快速嘗試各種配置，用 commit 保存每次的狀態，方便回滾。
- **除錯保存**：線上容器出了問題，你用 exec 進去做了一些診斷，想保存這個現場（包含你安裝的除錯工具和修改），用 commit 做一個快照。
- **學習階段**：你還不會寫 Dockerfile 的時候，commit 可以讓你快速體驗「自訂映像檔」的概念。

把 commit 想成是開發階段的便利工具，Dockerfile 才是生產環境的正式做法。

---

## 九、本堂課小結（2 分鐘）

這堂課學了管理容器的完整工具集：

| 指令 | 功能 |
|-----|-----|
| docker stop/start/restart | 啟停容器 |
| docker kill | 強制終止（容器卡死時使用） |
| docker rm | 刪除容器（加 -f 可刪除執行中的） |
| docker rmi | 刪除映像檔 |
| docker logs | 查看日誌（-f 即時追蹤，--tail 限制行數） |
| docker exec | 進入容器執行命令（日常一律用 exec，不用 attach） |
| docker cp | 主機和容器之間複製檔案 |
| docker inspect | 查看詳細資訊（元數據，輸出 JSON） |
| docker stats | 即時監控資源使用 |
| docker top | 查看容器內程序 |
| docker commit | 提交容器為新映像檔（學習用，生產用 Dockerfile） |

**清理指令**

| 指令 | 清理對象 |
|-----|---------|
| docker container prune | 已停止的容器 |
| docker image prune | Dangling images |
| docker system prune | 全面清理（容器 + 網路 + 映像檔 + Build cache） |

**這堂課一定要記住的幾個重點：**

1. **stop 是兩階段的**：先 SIGTERM 再 SIGKILL，給程序 graceful shutdown 的機會
2. **rm 刪不掉執行中的容器**：加 `-f` 或先 stop 再 rm
3. **日誌會塞爆磁碟**：一定要設定 log rotation（max-size + max-file）
4. **exec 比 attach 安全**：exec 開新程序不影響容器，attach 連到主程序很危險
5. **commit 適合學習，Dockerfile 適合生產**：commit 不可重現、不透明

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
2. stop vs kill 比較（SIGTERM vs SIGKILL 兩階段流程）
3. docker logs 參數表
4. docker exec vs docker attach 比較
5. 清理指令對照表
6. docker commit 分層示意圖
