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

---

## 七、其他常用指令（3 分鐘）

### 7.1 docker inspect - 查看詳細資訊

```bash
docker inspect my-nginx
```

輸出 JSON 格式的完整資訊：網路、掛載、設定、狀態...

**取得特定欄位**

```bash
# 取得 IP
docker inspect -f '{{.NetworkSettings.IPAddress}}' my-nginx

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

類似在容器內執行 ps。

---

## 八、本堂課小結（2 分鐘）

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
| docker inspect | 查看詳細資訊 |
| docker stats | 即時監控 |

**清理指令**

| 指令 | 清理對象 |
|-----|---------|
| docker container prune | 已停止的容器 |
| docker image prune | Dangling images |
| docker system prune | 全面清理 |

下一堂課：Nginx 容器實戰。

---

## 板書 / PPT 建議

1. 容器生命週期狀態圖
2. stop vs kill 比較
3. docker logs 參數表
4. docker exec vs docker attach 比較
5. 清理指令對照表

---

## 📺 補充教材：狂神說 Docker

> 以下內容來自【狂神說Java】Docker 教程系列，作為本節的補充參考資料。

### P11：日誌、元數據、進程的查看

<sub>[00:00-00:35]</sub>
我們來繼續，來看一下常用的其他命令。比如說首先我們剛才說過後台啟動，對，後台啟動咱們的容器。那現在我們來後台啟動一下，我直接就後台啟動我不進去。那現在的話我們剛才說過 `docker run -d` 是不是我們後台啟動，那現在我們要通過後台來啟動 CentOS。你看現在就啟動了，它會返回一個容器的 ID。

<sub>[00:23-01:07]</sub>
讓我們來 `docker ps` 看一下，來 `docker ps -a`，然後這個地方發現一個問題——老師為什麼我啟動了這個 CentOS 給我停掉了？這個停掉的原因就是因為我們沒有前台應用，它認為我們結束了。就是你們以後經常會遇到這種坑。通過 `docker run -d` 的方式加咱們的一個鏡像名，通過鏡像來啟動容器，然後啟動完之後 `docker ps` 的時候發現我們這個 CentOS 停止了。

<sub>[01:04-02:34]</sub>
那這個停止了是什麼原因導致的？我們來說一下這個地方一個常見的坑。就是我們這個 Docker 容器使用後台運行，如果是後台運行的話它就必須要有一個前台進程。就是現在我們沒有運行任何一個前台進程對不對，那現在我們運行了這個 CentOS 然後我們就把這個關掉了，因為你也沒有往這個裡面進去。你一般的話用 `-it` 可以進去執行對不對，這個就是前台了，但是我們沒有往這個容器裡面走。那這個時候就會出現一個問題——容器發現沒有應用了，就是沒有這個前台的應用，就是沒有掛起的應用或者對外提供服務的應用，它就會自動停止。

<sub>[01:51-02:36]</sub>
那就好比有的人說我要去安裝個 Nginx，老師我 Docker 就安裝個 Nginx，它啟動起來之後 Nginx 沒有項目對不對。那這時候就會有個問題，它會發現前台沒有——容器啟動後發現自己沒有提供服務，就會立刻停止，也就是自殺了。所以說最好的一種情況是我們啟動後台的情況下一般是這個有前台應用，比如說跑 Tomcat 的時候我們可以這麼去玩是沒有問題的。

#### 查看日誌命令

<sub>[02:36-03:10]</sub>
還有一個經常用的是咱們的一個查看日誌命令。查看日誌命令的話也比較簡單，這個地方有一個 `docker logs`，就是查看日誌嘛對不對。那我們可以在這裡面去看一下日誌的信息。`docker logs --help`，從公網上看也是一樣的。那在這邊的話就可以看到 logs 的一些基本的配置——`-f` 可以顯示所有的一些日誌的信息，包括日誌的時間戳。

<sub>[03:09-05:00]</sub>
那我們來試一下，`docker logs -f -t`，然後你要顯示的具體的信息你可以用一個 `--tail`，它就會以字符串的形式來顯示所有的日誌。那我們先把容器啟動一下吧，`docker run -it` 我們去啟動我們這個 CentOS，你也可以通過鏡像名這樣去啟動，沒有任何問題。進來之後 Ctrl+P+Q 退出來之後 `docker ps` 裡面是有鏡像的對不對。

<sub>[05:00-07:10]</sub>
那現在我們來寫一段 shell 腳本讓它能產生日誌。比如說 `while true; do echo kuangshen; sleep 1; done`，就是一個 while 循環，Linux 裡面通過 echo 來進行輸出，每隔一秒鐘輸出一次。然後我們來 `docker run -d centos /bin/sh -c "while true; do echo kuangshen; sleep 1; done"`，現在通過後台方式啟動但是讓這個 CentOS 有作用，它就不停的去循環執行。

<sub>[08:00-09:15]</sub>
然後通過 `docker ps` 就可以看到我們這邊的一個容器的 ID，我們來查看一下它的日誌。`docker logs -tf --tail 10 容器ID`，你可以看到這是不是就有 10 條了，然後它每隔一秒鐘還在打印最新的日誌它就會一直打印。然後如果你不要這個 `--tail` 就是不通過這個來限制行數的話，應該是 `-t -f` 就可以看全部的，你看這個全部的日誌就長得要死了，然後它每一秒鐘還在不停的打印。

**日誌命令總結：**

```bash
# 顯示日誌（帶時間戳）
docker logs -tf 容器ID

# 顯示指定行數的日誌
docker logs -tf --tail 10 容器ID
```

- `-t`：顯示時間戳
- `-f`：持續輸出（follow）
- `--tail N`：顯示最後 N 條日誌

#### 查看容器內進程

<sub>[10:22-11:00]</sub>
那除了這個之外我們還有很多經常要用的，比如說我們的查看容器中的進程信息。進程信息我們在 Linux 裡面就經常去看進程，比如說通過 `ps` 命令來看咱們 Linux 的進程對不對。但容器裡面我們也可以看，通過 `docker top` 命令，在 Linux 裡面也有 `top` 命令所以說差不多的。

<sub>[10:58-11:43]</sub>
我們來 `docker top 容器ID`，來看一下它裡面的一些進程信息。你看看裡面的 UID、PID 這是不是就是我們的基本信息。UID 就是咱們當前的用戶 ID，PID 就是父進程 ID，然後這邊是進程 ID。那這個的話以後我們要殺進程的話可以通過這樣的方式來殺。

```bash
docker top 容器ID
```

#### 查看容器元數據 (docker inspect)

<sub>[11:48-13:00]</sub>
我們還要查看一些鏡像的元數據，就是我們想徹底的去了解一下這個鏡像裡面到底有哪些數據。這個命令非常重要，叫做 `docker inspect`。我們來查看一下我們當前容器的一些信息。`docker inspect 容器ID`，你可以看到這邊顯示容器的所有信息。

<sub>[12:42-13:55]</sub>
首先可以看到一個容器的 ID，你會神奇的發現我們這個容器 ID 只是這個全路徑的一個縮寫，其實就是個 ID 的前幾位就可以了。然後這個鏡像創建的時間、默認的控制台、這邊是給它傳遞的參數比如說我們這邊寫了一個循環的腳本你在這可以看到。然後它當前的一些 status 狀態是 running 運行。

<sub>[13:10-14:00]</sub>
然後再往下走它的一些 PID 就是父進程的 ID，然後它是從哪個鏡像過來的這邊也寫得非常清楚。然後再往下走就是它的一些主機的配置，然後再往下的話就是一些其他的配置，比如說 mount 掛載我們現在沒有掛載所以說沒有。然後這是它的一些基本配置比如說配的 hostname 就是默認的一個容器名字。然後這個地方還對應了一堆基本的環境變量，然後這些 cmd 的一些命令。下面這是關於網絡的一些命令，比如說現在用的是一個橋接的網卡 bridge。

```bash
docker inspect 容器ID
```

這個命令會顯示容器的所有詳細信息，包括：
- 容器 ID（完整版）
- 創建時間
- 狀態（Running/Stopped）
- 進程 ID
- 網絡配置（Bridge 等）
- 掛載信息（Mounts）
- 環境變量

---

### P12：進入容器的命令和拷貝命令

#### 進入正在運行的容器

<sub>[00:00-00:30]</sub>
我們來繼續，來怎麼樣進入當前正在運行的容器呢？這個非常非常重要。我們通常容器都是使用後台方式運行的對不對，那這個時候我們需要進入容器比如說修改一些配置，那這個時候我們肯定要進這個裡面對不對。

**方式一：docker exec（推薦）**

<sub>[00:26-01:30]</sub>
所以說我們要學習一個命令，那這個就是大家非常常見的叫 `docker exec`，執行對不對。然後 `-it` 我們要執行 `-it` 代表以交互模式執行，你要跟誰執行呢？容器的一個 ID 對不對，後面就是我們的一個 `/bin/bash` 就是我們要默認的一個命令行。

<sub>[00:50-01:30]</sub>
我們來看一下 `docker ps` 可以看到當前正在運行的容器，我們要進入這個容器怎麼進入呢？`docker exec -it 容器ID /bin/bash`，以交互模式運行。進入這個容器之後你可以看到進到容器裡面了，你想在這裡面幹什麼就幹什麼對不對。而且你在這裡面比如說要去執行 `ps -ef` 當然也是可以的。

```bash
docker exec -it 容器ID /bin/bash
```

**方式二：docker attach**

<sub>[01:41-03:30]</sub>
除了這種方式我們還可以通過第二個方式：`docker attach 容器ID`。我們來看一下這個跟上面這個有什麼區別呢？它就相當於是打開了一個新的——就是一個是打開新的終端，attach 是進入容器正在執行的終端也就是當前打開的這個終端。

```bash
docker attach 容器ID
```

**兩者區別：**

<sub>[04:05-05:10]</sub>
- `docker exec`：進入容器後**開啟一個新的終端**，可以在裡面操作，所以說這個是我們常用的
- `docker attach`：進入容器**正在執行的終端**，不會啟動新的進程。所以說剛才我們看到裡面寫了一個死循環它就在裡面瘋狂的轉

這兩種方法一定要記住。

#### 從容器內拷貝文件到主機

<sub>[05:10-06:05]</sub>
除了這個之外我們還要幹嘛？還有一些東西，我們要從容器內拷貝文件到我們的一個主機上面，這個也是我們經常用的。就是我們這個容器跟容器、容器內跟容器外我們之前說了它是一個互相隔離的狀態對不對。我們之前畫了一個圖，就是容器內它是一個小虛擬機那我們外面是個大的虛擬機，我想把這裡面的文件給它拷貝出來怎麼樣做呢？Docker 也給我們提供了一個命令叫 `docker cp` 拷貝就可以了。

```bash
docker cp 容器ID:容器內路徑 目的主機路徑
```

<sub>[06:01-08:40]</sub>
比如說我們來測試一下。`docker run -it centos /bin/bash` 啟動一個容器進去，然後 Ctrl+P+Q 退出。我在容器內部的 home 目錄下新建一個文件 `touch test.java`。然後退出來之後，容器雖然停止了但是數據還在。

<sub>[08:05-09:00]</sub>
`docker cp 容器ID:/home/test.java /home`——把容器裡面的 home 下面的一個文件叫做 test.java 給它拷出來，拷貝到我當前目錄下的 home 目錄。然後 `ls` 看一下，看到這個 test.java 過來了，是不是就過來了完全沒有任何問題。

<sub>[09:26-10:05]</sub>
這個拷貝是一個手動過程。未來我們使用 Volume 也就是數據卷的技術，可以實現自動同步，比如說我可以把容器內的 home 目錄跟咱們的主機 home 目錄連通打通，那這就有意思了這個是我們後面通過卷可以做的。

---

### P20：Commit 鏡像

<sub>[00:00-01:10]</sub>
我們來看一下，剛才給大家說完這個原理之後我們來做個實踐，大家一下就明白了。還是一樣的這個命令我們剛才說的叫做 `docker commit` 命令對不對，我們可以提交容器成為一個新的副本。跟 Git 裡面的 `git commit` 是一樣的，你要通過 `-m` 來告訴你當前這個版本提交的一些描述信息，然後 `-a` 就是作者這個是誰寫的誰提交的。

```bash
docker commit -m="提交的描述信息" -a="作者" 容器ID 目標鏡像名:[TAG]
```

命令和 Git 原理類似。

#### 實戰測試

<sub>[01:15-04:10]</sub>
我們當前這裡面有一個 Tomcat 的，我們把它啟動一下。`docker run -it -p 8080:8080 tomcat`。進入 Tomcat 控制台之後，我們 `cd webapps`，這裡面現在是空的——這就是官方 Tomcat 鏡像的坑，官方鏡像默認的 webapps 下面是沒有文件的。

<sub>[04:00-05:05]</sub>
我們要從 `webapps.dist` 裡面把東西拷過來：`cp -r webapps.dist/* webapps/`。拷貝完之後 `cd webapps` 看一下，項目就進來了。這個就是我們自己操作過的——相當於我現在拿到了這個 Tomcat，我在上面的所有操作是不是加了一層對不對，這一層就是我改的所有東西。

#### 提交自訂鏡像

<sub>[05:40-06:50]</sub>
我把它提交上去，`docker commit -a="kuangshen" -m="add webapps application" 容器ID tomcat02:1.0`。回車，現在它就告訴你已經生成好了。現在我們再來 `docker images` 看一下——看到了嗎，這邊是不是就成功了！我們通過 `docker commit` 提上來的鏡像，它生成了一個新的版本。這個版本你可以發現是不是比起原來大了一點，這個就是我們自己操作的東西，而以後我們就可以直接去啟動它了。

<sub>[07:50-09:00]</sub>
下載過的鏡像就是原來的鏡像層，現在我們上面再加一層，我們的所有操作是不是在這一層。最終的話我們通過 commit 把它打包成一個大的，然後 commit 成為一個新的鏡像。

**重點理解：**
- 如果你想要保存當前容器的狀態，就可以通過 commit 來提交獲得一個鏡像
- 就好比我們以前學習虛擬機的時候講過一個功能叫做快照，就是給當前狀態拍攝一個快照，那麼它這個當前狀態就能被記錄下來了
- 這個 Tag 版本就是我們每次提交的，你可以從 1.0 到 6.0，每一步都是一個版本

<sub>[09:50-11:10]</sub>
到了目前為止我們就算是真真正正的入門 Docker 了。但是接下來這些東西才是重要的——容器數據卷就是我們這個卷怎麼掛載非常重要；最後我們自己怎麼去製作一個鏡像 Dockerfile 非常重要；Docker 的網絡是怎麼搞的。你把這三個東西搞定了那個才算什麼——你會玩 Docker 了。這三個是 Docker 的精髓。

**Docker 學習路線總結：**

| 階段 | 內容 |
|------|------|
| 入門 | 基本指令、鏡像、容器、commit |
| 精髓 | 數據卷、Dockerfile、Docker 網絡 |
| 企業實戰 | Docker Compose、Docker Swarm、CI/CD（Jenkins） |
