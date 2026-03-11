# Day 2 第四小時：Docker 基本指令（上）

---

## 一、前情提要（2 分鐘）

好，各位同學，午休完了，精神還好嗎？下午第一堂課，我知道大家可能有點想睡，但是這堂課非常重要，因為我們終於要開始真正動手操作 Docker 了。

上一堂課我們花了不少時間把 Docker 裝起來，不管你是 Windows、Mac 還是 Linux，現在大家的環境應該都準備好了。如果還沒裝好的同學，等一下趕快跟旁邊的人對一下，我們這堂課會一直敲指令，沒裝好就跟不上了。

在正式開始之前，我要先教大家三個**萬能的幫助命令**。這三個命令你一定要記住，因為 Docker 的指令非常多，沒有人能全部背下來，但你只要會查，就不怕了。

```bash
docker version          # 查看 Docker 版本資訊
docker info             # 查看 Docker 系統級別的詳細資訊（包含映像檔和容器數量）
docker 命令 --help       # 查看任何命令的用法（萬能命令）
```

來，大家先跟我打一下 `docker version`，確認你的 Docker 有活著。看到 Client 和 Server 兩塊資訊就代表正常。如果只看到 Client 沒看到 Server，那就是 Docker Desktop 沒有啟動，趕快去開。

`docker info` 會顯示比 `docker version` 更詳細的資訊，包括你目前有多少容器在跑、有多少映像檔、伺服器版本、儲存驅動程式、插件等等。這個命令你現在不需要每個欄位都看懂，但以後排查問題的時候會用到。

最重要的是第三個：`docker 命令 --help`。比如你忘了 `docker run` 有哪些參數，就打 `docker run --help`，它會列出所有可用的選項和說明。**這是萬能命令，不會就查，養成這個習慣。** 另外，Docker 的官方文檔 docs.docker.com，裡面有個 Reference > Command Line 的區塊，寫得非常完整，也建議大家收藏起來。

好，那這堂課我們要學什麼？我們今天學的是「取得和執行」這一半：

- **docker pull**：從 Docker Hub 拉取映像檔下來
- **docker images**：看看我本機有哪些映像檔
- **docker run**：用映像檔建立並啟動一個容器
- **docker ps**：查看目前有哪些容器在跑

下一堂課再學「管理和清理」——怎麼停止容器、刪除容器、看日誌、進入容器內部等等。

這堂課的節奏是這樣的：我先示範，你們跟著打。每個指令我都會讓大家動手操作，不要只是看我打，自己打一遍印象才深。好，那我們開始。

---

## 二、docker pull - 拉取映像檔（10 分鐘）

### 2.1 基本用法

好，第一個指令 `docker pull`。

大家想想看，你要跑一個容器之前，是不是得先有映像檔？就像你要開一個虛擬機之前，得先有一個 ISO 檔一樣。`docker pull` 就是幫你把映像檔從 Docker Hub 下載到本機的命令。

Docker Hub 是什麼？你可以把它想成是映像檔的 GitHub。全世界的人都可以把自己做好的映像檔上傳到 Docker Hub，然後其他人就可以用 `docker pull` 把它下載回來用。Nginx、MySQL、Redis、Ubuntu、Python... 你想得到的軟體，幾乎都有現成的映像檔可以直接拉。

那我們這堂課會一直拿 Nginx 來當範例，先花一分鐘介紹一下它是什麼。

**Nginx（唸作 "engine-x"）是一個非常流行的 Web 伺服器**。你平常上網瀏覽網頁，背後就有一個 Web 伺服器負責把網頁內容傳給你的瀏覽器。Nginx 就是在做這件事的軟體，而且它做得特別好——速度快、佔用資源少、能同時處理非常多人的連線。

簡單來說，Nginx 的三個主要用途：

1. **靜態網頁伺服器**：把 HTML、CSS、JavaScript、圖片這些檔案提供給瀏覽器。你做好一個網站，丟進 Nginx，別人就能透過網址訪問。
2. **反向代理（Reverse Proxy）**：站在你的應用程式前面，幫你分配流量。比如你有三台伺服器跑同一個服務，Nginx 可以把使用者的請求平均分配給這三台，這叫**負載均衡（Load Balancing）**。
3. **API 閘道**：在微服務架構中，所有外部請求先經過 Nginx，再轉發到對應的後端服務。

為什麼我們用 Nginx 來練習？因為它是 Docker Hub 上下載量最高的映像檔之一，輕量、啟動快，而且一跑起來就能在瀏覽器看到效果——你馬上就知道你的容器有沒有成功。比拿 Ubuntu 來練習有成就感多了。

好，來，大家跟我打：

```bash
docker pull nginx
```

打完按 Enter，你會看到它開始下載。等它跑完，你就有一個 nginx 的映像檔在本機了。

我們等它下載... 大家注意看輸出的內容，等一下我會詳細解釋每一行的意思。

### 2.2 指定版本

剛剛我們打 `docker pull nginx`，沒有指定版本，Docker 預設就會幫你拉 `latest` 這個標籤。但在實際工作中，**我們幾乎不用 latest**。為什麼？因為 `latest` 不代表「最新穩定版」，它只是一個標籤名稱而已，不同的映像檔維護者對 latest 的定義可能不一樣。而且今天拉下來的 latest 和下禮拜拉下來的 latest 可能是不同版本，這在生產環境會出大問題。

所以我們通常會指定版本：

```bash
docker pull nginx:1.25
docker pull nginx:1.25.3
docker pull nginx:alpine
docker pull nginx:1.25-alpine
```

大家注意看，冒號後面的就是 Tag（標籤）。有幾種常見的 Tag 命名方式，我整理成一個表給大家看：

**常見 Tag 含義**

| Tag | 含義 |
|-----|-----|
| latest | 預設標籤（不一定是最新） |
| 1.25 | 主版本號 |
| 1.25.3 | 精確版本號 |
| alpine | 基於 Alpine Linux（超小，通常只有幾 MB） |
| slim | 精簡版（比完整版小，但比 alpine 大） |
| bullseye/bookworm | Debian 版本代號（完整版） |

這裡特別講一下 alpine。Alpine Linux 是一個極度精簡的 Linux 發行版，整個系統才幾 MB。所以帶 alpine 標籤的映像檔通常非常小。比如 nginx 的完整版大約 187MB，但 nginx:alpine 可能只有 40MB 左右。在生產環境中，越小的映像檔越好——下載快、佔空間少、攻擊面也小。

**但有一個很重要的提醒**：你指定的版本號，**必須是 Docker Hub 上確實存在的**，不能自己隨便編一個。比如你打 `docker pull nginx:9.99`，Docker Hub 上根本沒有這個版本，就會報錯。怎麼知道有哪些版本？去 Docker Hub 網站搜尋 nginx，點進去就能看到所有可用的 Tag。

### 2.3 從其他 Registry 拉取

剛剛都是從 Docker Hub 拉的。但有時候你公司可能有自己的私有 Registry，或者你要從 Google、AWS 的 Registry 拉映像檔：

```bash
# Google Container Registry
docker pull gcr.io/google-containers/nginx

# 私有 Registry
docker pull 192.168.1.100:5000/myapp:v1
```

看到了嗎？只要在映像檔名稱前面加上 Registry 的地址就行了。這個現在知道就好，後面的課程會再詳細講。

### 2.4 完整地址與省略寫法

這邊要跟大家講一個很重要的觀念。我們平常打 `docker pull nginx`，覺得很簡單對不對？但其實這是一個省略寫法，完整的地址長這樣：

```bash
docker pull docker.io/library/nginx:latest
```

拆解一下：
- `docker.io` 是 Registry 的地址（Docker Hub 的官方地址）
- `library` 是官方映像檔的命名空間（如果是某個使用者上傳的，這裡會是使用者名稱）
- `nginx` 是映像檔名稱
- `latest` 是 Tag

所以 `docker pull nginx` 等於 `docker pull docker.io/library/nginx:latest`，Docker 幫你把前面的 Registry 地址、命名空間和後面的 Tag 都自動補上了。

知道這個有什麼用？以後你看到別人寫 `docker pull docker.io/library/mysql:latest`，你就知道其實就是 `docker pull mysql` 而已，不用被嚇到。

### 2.5 拉取過程解析

好，重頭戲來了。我們來仔細看一下 `docker pull` 的輸出到底在講什麼。大家應該剛剛已經拉過 nginx 了，現在我們來拉一個 MySQL 看看：

```bash
docker pull mysql
```

輸出大概長這樣：

```bash
$ docker pull mysql

Using default tag: latest
latest: Pulling from library/mysql
a2abf6c4d29d: Pull complete      # Layer 1：基礎作業系統層
a9edb18cadd1: Pull complete      # Layer 2
589b7251471a: Pull complete      # Layer 3
186b1aaa4aa6: Pull complete      # Layer 4
b4df32aa5a72: Pull complete      # Layer 5
a0bcbecc962e: Pull complete      # Layer 6
Digest: sha256:abc123def456...    # 映像檔的數位簽章（防偽標誌）
Status: Downloaded newer image for mysql:latest
docker.io/library/mysql:latest
```

注意看，第一行它會告訴你 `Using default tag: latest`，提醒你用的是預設標籤。

然後你看到好幾行 `Pull complete`，每一行就是一個 **Layer（層）**。這是 Docker 映像檔最核心的設計之一——**分層下載**。一個映像檔不是一整坨下載的，而是一層一層地下載。

這有什麼好處呢？好處太大了。我來示範給你看。現在我們已經有 MySQL latest（假設是 8.0）了，我再拉一個 MySQL 5.7：

```bash
docker pull mysql:5.7
```

你注意看輸出，會發現有些層顯示的是 `Already exists`，而不是 `Pull complete`：

```bash
$ docker pull mysql:5.7

5.7: Pulling from library/mysql
a2abf6c4d29d: Already exists     # 這層跟 8.0 共用，不需要重新下載！
a9edb18cadd1: Already exists     # 這層也一樣！
589b7251471a: Already exists     # 同上！
新的layer1: Pull complete         # 只有不同的層才需要下載
新的layer2: Pull complete
Digest: sha256:xyz789...
Status: Downloaded newer image for mysql:5.7
```

看到了嗎？因為 MySQL 8.0 和 5.7 的底層作業系統是一樣的，那些共用的 Layer 就不用重複下載了，Docker 直接跟你說 `Already exists`，只下載差異的部分。**這就是分層下載的威力——不同映像檔之間可以共用相同的 Layer，大幅節省磁碟空間和下載時間。**

這個設計背後用的是聯合檔案系統（UnionFS）的技術，後面會再詳細講原理。現在你只要記住：Docker 映像檔是分層的，共用的層不會重複下載，這是它比傳統虛擬機映像檔高效的重要原因之一。

最後那一行 `Digest: sha256:abc123...` 是映像檔的數位簽章，可以把它想成是這個映像檔的指紋。它的作用是防偽——確保你下載到的映像檔跟發布者發布的完全一致，沒有被中途竄改過。

### 2.6 搜尋映像檔

剛剛我們都是已經知道映像檔名稱才去拉的。但如果你不確定映像檔叫什麼名字呢？有兩種方式可以搜尋。

第一種是直接去 Docker Hub 網站（hub.docker.com）搜尋，就跟你上 GitHub 搜專案一樣，有圖形介面，看得比較清楚。

第二種是用命令列搜尋：

```bash
# 搜尋映像檔
docker search mysql
```

大家打打看，你會看到一個列表，有映像檔名稱、描述、Stars 數量、是否是官方映像檔等等。Stars 就像 GitHub 上的星星數，越多代表越多人使用和認可。

如果結果太多，可以用 `--filter` 過濾：

```bash
# 篩選 Stars 數量大於 3000 的映像檔
docker search mysql --filter=STARS=3000

# 篩選 Stars 數量大於 5000 的
docker search mysql --filter=STARS=5000
```

這樣就只會顯示比較熱門的映像檔。通常 Stars 很多的映像檔比較可靠，就像 GitHub 上星星多的專案通常品質比較好。但這個搜尋功能有個限制——它只能搜到映像檔的名稱和描述，看不到有哪些版本（Tag）。要看版本的話，還是去 Docker Hub 網站最方便。

### 2.7 查看可用版本

所以我的建議是：**搜尋映像檔用 Docker Hub 網站，拉取映像檔用命令列**。網站上搜尋到映像檔之後，點進去就能看到所有可用的 Tag，選好版本號再回來用 `docker pull` 拉取。

如果你真的很想用命令列查版本，有一些第三方工具可以做到，比如 skopeo：

```bash
# 使用 skopeo（需另外安裝）
skopeo list-tags docker://nginx
```

但這不是必要的，知道就好。

好，docker pull 的部分就講到這裡。大家有沒有問題？沒有的話我們往下走。

---

## 三、docker images - 列出映像檔（8 分鐘）

### 3.1 基本用法

好，剛剛我們拉了 nginx、mysql，那我怎麼知道我本機現在到底有哪些映像檔？用 `docker images` 就可以了。

大家跟我打：

```bash
docker images
```

你應該會看到類似這樣的輸出：

```
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
nginx        latest    a6bd71f48f68   2 weeks ago   187MB
mysql        latest    3218b38490ce   3 weeks ago   516MB
mysql        5.7       c20987f18b13   3 weeks ago   448MB
```

好，我們一個欄位一個欄位來看，這很重要，每個欄位都要搞懂：

**欄位說明**

| 欄位 | 說明 |
|-----|-----|
| REPOSITORY | 映像檔名稱（倉庫名稱） |
| TAG | 版本標籤，同一個映像檔可以有多個 Tag |
| IMAGE ID | 映像檔的唯一識別碼，顯示的是前 12 碼（實際是完整的 SHA256） |
| CREATED | 這個映像檔**被建立**的時間，注意不是你下載的時間 |
| SIZE | 映像檔的大小 |

特別要注意 CREATED 那一欄，很多同學會誤以為這是「我什麼時候下載的」，不是的。這是映像檔本身被製作出來的時間。比如 nginx 可能兩週前被官方重新建置過，你今天才下載，CREATED 顯示的是兩週前。

還有 SIZE 那一欄，這是映像檔壓縮前的大小。看到 MySQL 要 516MB，是不是覺得很大？但因為有分層共用的機制，實際佔用的磁碟空間比你把所有映像檔的 SIZE 加起來要小很多。

### 3.2 篩選映像檔

如果你的映像檔越來越多，全部列出來太雜了，可以只看某一個：

```bash
# 只看 nginx 相關的映像檔
docker images nginx

# 只看特定版本
docker images nginx:1.25
```

### 3.3 格式化輸出

接下來這個參數非常實用，大家一定要記住：

```bash
# 只顯示 IMAGE ID
docker images -q
```

`-q` 是 quiet 的意思，只輸出映像檔的 ID，一行一個。你現在可能覺得：「只看 ID 有什麼用？」嘿，用處大了！它最常用在配合其他命令做批次操作。比如你想一次刪除所有映像檔，就可以用 `docker rmi $(docker images -q)` —— 先用 `-q` 撈出所有 ID，再傳給 `rmi` 去刪除。這個技巧後面會再講到。

還有一些格式化的進階用法，了解就好：

```bash
# 自訂格式
docker images --format "{{.Repository}}:{{.Tag}} - {{.Size}}"

# 輸出成 JSON
docker images --format json
```

### 3.4 查看所有映像檔（包含中間層）

```bash
docker images -a
```

加了 `-a` 會把建構過程中產生的中間映像檔也顯示出來。這些中間層通常你不需要管它，但有時候排查問題會用到。現在先跳過。

### 3.5 Dangling Images

有時候你會看到一些奇怪的映像檔，名稱和標籤都是 `<none>`：

```
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
<none>       <none>    d1234567890a   1 hour ago    150MB
```

這種叫做 **Dangling Images（懸空映像檔）**。它們通常是怎麼產生的呢？比如你重新 build 了一個映像檔，新的映像檔搶走了原本的名稱和 Tag，舊的那個就變成 `<none>` 了——它還在，但沒有名字了，像個沒人認領的孤兒。

查看這些孤兒映像檔：

```bash
docker images -f dangling=true
```

清理它們（釋放磁碟空間）：

```bash
docker image prune
```

這個命令很安全，只會刪除沒有被任何容器使用的 dangling images。如果你的磁碟空間不夠了，這是第一個可以嘗試的清理命令。

### 3.6 刪除映像檔（docker rmi）

好，接下來講怎麼刪除映像檔。指令是 `docker rmi`。

大家注意看這個命名：`rmi`。`rm` 是 Linux 裡面刪除檔案的命令，後面加一個 `i` 代表 Image。所以 `docker rmi` 就是「刪除映像檔」。

**這裡一定要搞清楚 `docker rm` 和 `docker rmi` 的區別：**
- `docker rm`：刪除**容器**（Container）
- `docker rmi`：刪除**映像檔**（Image）

多一個 `i` 差很多，千萬不要搞混了。這是初學者最容易犯的錯誤之一。

```bash
# 刪除指定映像檔（透過 IMAGE ID）
docker rmi -f a6bd71f48f68

# 刪除指定映像檔（透過名稱:標籤）
docker rmi -f nginx:1.25

# 刪除多個映像檔（空格分隔多個 ID）
docker rmi -f a6bd71f48f68 3218b38490ce

# 刪除所有映像檔（配合 docker images -aq 批次操作）
docker rmi -f $(docker images -aq)
```

看到最後一個了嗎？`docker images -aq` 會列出所有映像檔的 ID（`-a` 全部，`-q` 只要 ID），然後 `$()` 把結果傳給 `docker rmi -f` 去刪除。**這就是 `-q` 的威力所在——配合批次操作用的。**

`-f` 是強制刪除。什麼時候需要強制？當這個映像檔正在被某個容器使用的時候，正常刪除會失敗，加 `-f` 才能強制刪掉。

還有一個知識點：刪除映像檔的時候，如果有多個映像檔共用某些 Layer，那些共用的 Layer 不會被刪除，只有沒人用的 Layer 才會被移除。Docker 很聰明，它會自己管理這些層的引用計數。

好，映像檔相關的指令就先到這裡。我們來看最重要的——`docker run`。

---

## 四、docker run - 執行容器（25 分鐘）

好，現在進入這堂課最重要的部分了。如果 Docker 只讓你學一個指令，那就是 `docker run`。它是你使用 Docker 最常打的命令，所有的參數和組合你都要熟悉。我們慢慢來，一個一個講。

### 4.1 基本用法

最簡單的用法：

```bash
docker run nginx
```

這一行做了什麼事？它用 nginx 這個映像檔，**建立**並**啟動**了一個容器。注意，是兩個動作：先建立，再啟動。

有一個很方便的特性：如果你本機沒有 nginx 這個映像檔，Docker 會**自動幫你 pull**。所以其實你都不用先打 `docker pull`，直接 `docker run` 它就會自己去下載了。但我們上課的時候還是習慣先 pull 再 run，這樣比較清楚流程。

### 4.2 前景執行 vs 背景執行

好，我們剛剛直接打 `docker run nginx`，大家有沒有發現一個問題？你的終端機被佔住了！游標卡在那邊不動了，你打什麼字都沒有反應。這是因為容器預設是**前景執行**的，它的輸出直接佔用了你的終端。

**前景執行（預設）**

```bash
docker run nginx
```

容器的 log 直接噴在你的終端上。你能看到 nginx 的啟動日誌。按 `Ctrl+C` 可以停止容器，但同時容器也被停掉了——注意，不是放到背景，是整個停止。

這顯然不方便嘛，你的終端被佔住了，什麼事都不能做。所以在實際使用中，我們幾乎都用背景執行。

**背景執行（-d）**

```bash
docker run -d nginx
```

`-d` 是 detach 的縮寫，意思是「脫離」——讓容器脫離你的終端，在背景跑。打完這個命令，Docker 會輸出一串很長的容器 ID，然後你的終端就回來了，可以繼續做其他事。

大家來試試看，先按 `Ctrl+C` 把剛剛那個前景的 nginx 停掉，然後打 `docker run -d nginx`。看到那一串長長的 ID 了嗎？那就是你的容器 ID。容器現在正在背景安靜地跑著。

### 4.3 互動模式（-it）

好，剛剛講了前景和背景。但還有另一種情境：你想**進到容器裡面**，像操作一台遠端伺服器一樣，在裡面敲命令。這時候就要用 `-it` 參數了。

```bash
docker run -it ubuntu /bin/bash
```

來，大家跟我打這一行。如果本機沒有 ubuntu 映像檔，它會先自動下載，等一下。

好，下載完了，注意看你的命令提示符！是不是變了？從原本的 `你的電腦名:~ 你的名字$` 變成了 `root@abc123:/#` 這樣的格式。

**恭喜你，你現在已經「進到容器裡面」了。**

這個 `root@abc123` 裡的 `abc123` 就是容器的 ID 前幾碼。你現在看到的檔案系統、執行的命令，全部都是在容器這個獨立的小世界裡面。它跟你的主機**沒有半毛錢的關係**。你在裡面怎麼搞都不會影響到外面。

來試試看：

```bash
root@abc123:/# ls
root@abc123:/# cat /etc/os-release
root@abc123:/# whoami
```

你會看到這是一個超級精簡的 Ubuntu 系統。試試打 `vim`、`ifconfig`、`wget`... 你會發現很多命令都找不到。這很正常，因為 Docker 的映像檔都是**精簡版**的，只保留最必要的東西，那些常用的工具都被砍掉了，為的就是讓映像檔越小越好。如果你需要某個工具，進去之後用 `apt-get install` 安裝就行了。

好，解釋一下 `-it` 這兩個參數：

- `-i`：interactive，保持 STDIN（標準輸入）開啟。沒有它你就不能輸入命令。
- `-t`：tty，分配一個偽終端。沒有它你就沒有正常的終端介面，顯示會很奇怪。

這兩個通常一起用，所以你會看到大家都寫 `-it` 而不是分開寫。後面的 `/bin/bash` 是告訴容器「啟動之後執行 bash shell」，這樣你才有一個 shell 可以打命令。

**現在來講退出容器的兩種方式，這非常重要：**

| 方式 | 效果 |
|------|------|
| `exit` | 停止容器並退出（容器整個關掉了） |
| `Ctrl + P + Q` | 退出但容器繼續在背景執行（人走了，容器還在跑） |

大家注意聽清楚這兩個的差別。如果你打 `exit`，不只是退出來而已，容器會被**停止**。你之後用 `docker ps` 看不到它了。

但如果你按 `Ctrl + P + Q`（先按住 Ctrl，然後依序按 P 和 Q），你只是「離開」了容器，容器本身還在背景繼續運行。之後你可以再用 `docker exec` 回到這個容器裡面，這個下堂課會教。

**所以記住：想暫時離開容器但不想關掉它，用 `Ctrl + P + Q`。想直接結束容器，用 `exit`。**

大家現在先用 `exit` 離開就好，等一下我們還會再操作。

### 4.4 指定容器名稱（--name）

回到外面了。剛剛我們 `docker run -d nginx`，Docker 會自動幫容器取一個隨機名稱，像是 `admiring_newton`、`boring_einstein` 之類的。挺幽默的名字，但在實際工作中你根本不知道哪個容器是做什麼的。

所以我們通常會自己取名：

```bash
docker run -d --name my-nginx nginx
```

這樣就把容器命名為 `my-nginx`，以後查看、停止、刪除都可以用名稱來操作，比用 ID 方便多了。

**但注意，名稱必須是唯一的。** 如果你再打一次一樣的命令：

```bash
docker run -d --name my-nginx nginx
```

它會報錯：

```
docker: Error response from daemon: Conflict. The container name "/my-nginx" is already in use.
```

看到了嗎？`Conflict`，名稱衝突。你必須先把舊的 `my-nginx` 容器刪除，或者取一個不同的名字。這是初學者很常遇到的錯誤，現在遇到你就知道為什麼了。

### 4.5 自動刪除（--rm）

有時候你只是想試個東西，跑一下就好，不需要容器一直留著佔資源。這時候可以加 `--rm`：

```bash
docker run --rm nginx
```

容器一旦停止，就會自動被刪除，不會留下殘骸。這在測試和除錯的時候非常好用。比如你只是想確認一下某個映像檔能不能正常啟動，用完就丟，加 `--rm` 就不用事後手動清理了。

### 4.6 環境變數（-e）

很多映像檔在啟動的時候需要你傳入一些設定值。比如 MySQL，你至少要告訴它 root 密碼是什麼：

```bash
docker run -e MYSQL_ROOT_PASSWORD=secret mysql
```

`-e` 就是設定環境變數。這個環境變數會被注入到容器內部，容器裡面的程式就可以讀到它。

如果有多個環境變數，就多寫幾個 `-e`：

```bash
docker run -e VAR1=value1 -e VAR2=value2 myapp
```

如果環境變數很多，寫在命令列太長了，可以用一個檔案來管理：

```bash
docker run --env-file ./env.list myapp
```

`env.list` 檔案裡面每一行就是一個 `KEY=VALUE`。

環境變數是 Docker 容器化應用非常重要的配置方式，後面講到 Docker Compose 的時候會更常用到。

### 4.7 Port Mapping（-p / -P）

好，接下來這個參數可能是 `docker run` 裡面最常用的——Port Mapping（連接埠對應）。

你想想看，我在容器裡面跑了一個 nginx，它在容器內部監聽的是 80 port。但容器是隔離的啊，你從外面（你的電腦）去訪問 localhost:80，是訪問不到容器裡面的 nginx 的。怎麼辦？你需要把主機的某個 port **映射**到容器的 port：

```bash
docker run -d -p 8080:80 nginx
```

`-p 8080:80` 的意思是：把主機的 8080 port 對應到容器的 80 port。冒號左邊是主機，右邊是容器。記住這個順序：**主機在左，容器在右**。

現在打開瀏覽器，訪問 `http://localhost:8080`，你就能看到 Nginx 的歡迎頁面了！大家試試看。

看到了嗎？Welcome to nginx！恭喜你，這是你用 Docker 跑起來的第一個 Web 服務。

**`-p`（小寫）有幾種寫法：**

| 格式 | 說明 |
|------|------|
| `-p 8080:80` | 最常用：主機 8080 → 容器 80 |
| `-p 80` | 只指定容器 port，主機 port 由 Docker 隨機分配 |
| `-p 127.0.0.1:8080:80` | 綁定特定 IP（只允許本機訪問） |
| `-P`（大寫） | 隨機分配主機 port 到容器所有暴露的 port |

最常用的就是第一種，指定主機 port 和容器 port 的對應。

**常見錯誤：Port 衝突。** 如果你的主機 8080 port 已經被其他程式佔用了（比如另一個容器、或者你本機的某個服務），Docker 會報錯：

```
Bind for 0.0.0.0:8080 failed: port is already allocated
```

解決方法很簡單：換一個主機 port 就好。比如 8081、8082、9090 都行。

如果需要多個 port，就多寫幾個 `-p`：

```bash
docker run -d -p 8080:80 -p 8443:443 nginx
```

### 4.8 Volume 掛載（-v）

```bash
docker run -d -v /host/path:/container/path nginx
```

Volume 掛載是把主機的目錄「接」到容器裡面。比如你想把自己的網頁檔案放到 nginx 裡面，就可以用 `-v` 把你的 html 目錄掛進去。

但這個主題比較複雜，牽涉到資料持久化、權限管理等問題，我們留到 Day 3 再詳細講。現在你只要知道有這個參數就好。

### 4.9 組合範例

好，剛剛講了一堆參數，最後我們來看一個實際工作中會打的完整命令，把所有參數組合在一起：

```bash
docker run -d \
  --name web \
  -p 8080:80 \
  -e NGINX_HOST=example.com \
  -v /data/html:/usr/share/nginx/html \
  --restart unless-stopped \
  nginx:1.25
```

我來一行一行解釋：
- `-d`：背景執行，不佔住終端
- `--name web`：容器名稱叫 web，方便辨識
- `-p 8080:80`：主機 8080 port 對應到容器的 80 port
- `-e NGINX_HOST=example.com`：設定環境變數
- `-v /data/html:/usr/share/nginx/html`：把主機的 /data/html 掛載到容器的 nginx 網頁目錄
- `--restart unless-stopped`：除非手動停止，否則容器掛了就自動重啟（生產環境很實用）
- `nginx:1.25`：使用 nginx 1.25 版的映像檔

大家看到這個命令不要害怕，拆開來看每一個部分你都學過了。以後你寫 `docker run` 就是像積木一樣，需要什麼參數就加什麼參數。

順便提一下那個反斜線 `\`，它在 Linux/Mac 的終端裡面是「換行繼續」的意思，讓你可以把一個很長的命令分成多行寫，看起來比較清楚。實際上它就是一行命令。Windows 的 CMD 用 `^` 代替，PowerShell 用 `` ` ``（反引號）代替。

### 4.10 docker run 完整流程

好，最後我要幫大家整理一下，當你執行 `docker run nginx` 的時候，Docker 背後到底做了哪些事情。這個流程你一定要搞懂，因為以後排查問題全靠這個。

```
docker run nginx
     │
     ▼
Docker Client 送請求給 Daemon
     │
     ▼
本機有 nginx Image 嗎？
     │
     ├── 有 ──────────────────────────┐
     │                               │
     └── 沒有                         │
          │                          │
          ▼                          │
     去 Docker Hub 找這個 Image       │
          │                          │
          ├── 找到了                   │
          │    │                      │
          │    ▼                      │
          │   下載 Image 到本機        │
          │    │                      │
          │    └──────────────────────┤
          │                          │
          └── 找不到                   │
               │                     │
               ▼                     ▼
          返回錯誤訊息          用 Image 建立 Container
          （流程結束）                │
                                     ▼
                                分配網路、準備檔案系統
                                     │
                                     ▼
                                啟動 Container 內的程序
                                     │
                                     ▼
                                連接終端（如果是前景執行）
```

大家看這個流程圖。重點就是那個判斷邏輯：**先找本機 → 再找 Docker Hub → 都沒有就報錯。**

如果映像檔名稱打錯了，比如你打了 `docker run hello123456`（一個根本不存在的映像檔），錯誤訊息長這樣：

```bash
$ docker run hello123456
Unable to find image 'hello123456:latest' locally
docker: Error response from daemon: pull access denied for hello123456,
repository does not exist or may require 'docker login' to access.
```

Docker 會先告訴你 `Unable to find image ... locally`（本機找不到），然後去 Docker Hub 也找不到，最後報錯：`repository does not exist or may require 'docker login'`。

看到這個錯誤，十之八九就是**映像檔名稱打錯了**。去 Docker Hub 確認一下正確的名稱再重來就好。少數情況是這個映像檔是私有的，需要先 `docker login` 登入才能拉取。

---

## 五、docker ps - 查看容器（10 分鐘）

### 5.1 查看執行中的容器

好，我們已經用 `docker run` 啟動了好幾個容器了。但現在到底有幾個容器在跑？跑的是什麼？用的是哪個 port？用 `docker ps` 就能一目了然。

`ps` 這個名字從哪來的？學過 Linux 的同學應該很熟悉，Linux 裡面 `ps` 就是查看程序（process）的命令。Docker 借用了同樣的名稱。

大家跟我打：

```bash
docker ps
```

輸出大概長這樣：

```
CONTAINER ID   IMAGE   COMMAND                  CREATED         STATUS         PORTS                  NAMES
abc123def456   nginx   "/docker-entrypoint.…"   5 minutes ago   Up 5 minutes   0.0.0.0:8080->80/tcp   my-nginx
```

好，我們一個一個看每個欄位是什麼意思：

**欄位說明**

| 欄位 | 說明 |
|-----|-----|
| CONTAINER ID | 容器的唯一 ID，顯示前 12 碼 |
| IMAGE | 這個容器是用哪個映像檔建立的 |
| COMMAND | 容器啟動時執行的命令 |
| CREATED | 容器的建立時間 |
| STATUS | 目前狀態（Up = 執行中，Exited = 已停止） |
| PORTS | Port 對應關係（`0.0.0.0:8080->80/tcp` 表示主機 8080 對應到容器 80） |
| NAMES | 容器名稱（你取的或 Docker 隨機生成的） |

**注意：裸的 `docker ps` 只會顯示正在運行的容器。** 那些已經停止的、退出的，你看不到。

### 5.2 查看所有容器（包含已停止）

如果要看全部的容器，包括已經停止的，加 `-a` 參數：

```bash
docker ps -a
```

你會看到更多容器出現了！那些 STATUS 顯示 `Exited (0) 2 hours ago` 的就是已經停止的容器。`Exited` 後面括號裡的數字是退出碼，`0` 表示正常退出，其他數字表示異常退出。

記得我們剛剛 `docker run -it ubuntu /bin/bash` 然後打 `exit` 離開的那個 ubuntu 容器嗎？它現在應該就是 `Exited` 狀態了。如果你用 `Ctrl+P+Q` 離開的那個，應該還是 `Up` 狀態。

**這是一個很好的方式來驗證 `exit` 和 `Ctrl+P+Q` 的區別。** 大家可以自己試試看。

### 5.3 只顯示容器 ID

跟 `docker images -q` 一樣的道理：

```bash
docker ps -q      # 只顯示執行中容器的 ID
docker ps -aq     # 顯示全部容器的 ID
```

一行一個 ID，主要用來配合批次操作：

```bash
# 停止所有容器
docker stop $(docker ps -q)

# 刪除所有已停止的容器
docker rm $(docker ps -aq -f status=exited)
```

大家看到這裡是不是發現一個規律？Docker 的很多命令都支援 `-q` 參數，功能都是「只輸出 ID」，目的都是配合其他命令做批次操作。`docker images -q` 配 `docker rmi`，`docker ps -q` 配 `docker stop` 和 `docker rm`。**記住 `-q` 就是批次操作的好朋友。**

### 5.4 篩選容器

當你的容器越來越多，全部列出來太雜了，可以用 `-f`（filter）來篩選：

```bash
# 根據名稱篩選
docker ps -f name=my-nginx

# 根據狀態篩選
docker ps -f status=running
docker ps -f status=exited

# 根據映像檔篩選
docker ps -f ancestor=nginx
```

### 5.5 格式化輸出

跟 `docker images` 一樣，也可以自訂輸出格式：

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

這樣輸出就只有名稱、狀態和 Port 三欄，看起來清爽多了。常用的模板變數有：

- `.ID`：容器 ID
- `.Image`：映像檔
- `.Names`：名稱
- `.Status`：狀態
- `.Ports`：Port 對應
- `.CreatedAt`：建立時間

### 5.6 查看最後建立的容器

有時候你只想看最近建立的幾個容器：

```bash
docker ps -l    # 最後一個
docker ps -n 5  # 最後五個
docker ps -n 1  # 只顯示最近一個（等同 -l）
```

`-l` 是 latest 的意思，`-n` 可以指定數量。在你建立了一大堆容器、只想看最近操作的那幾個的時候很實用。

### 5.7 刪除容器（docker rm）

好，學了怎麼看容器，接下來學怎麼刪容器。

再強調一次：**`docker rm` 刪容器，`docker rmi` 刪映像檔**。多一個 `i` 差很多。

```bash
# 刪除指定容器（透過 ID 或名稱）
docker rm abc123def456
docker rm my-nginx

# 強制刪除（包含正在執行中的容器）
docker rm -f abc123def456

# 刪除所有容器
docker rm -f $(docker ps -aq)

# 用管道符刪除所有容器（效果一樣，只是寫法不同）
docker ps -aq | xargs docker rm
```

**重點來了：正在執行的容器不能直接刪除。** 如果你試著刪一個正在跑的容器：

```bash
$ docker rm my-nginx
Error response from daemon: You cannot remove a running container.
Stop the container before attempting removal or force remove.
```

Docker 會告訴你：「嘿，這個容器還在跑呢，你確定要刪嗎？」你有兩個選擇：

1. 先 `docker stop my-nginx` 停止它，再 `docker rm my-nginx` 刪除
2. 直接 `docker rm -f my-nginx` 強制刪除（`-f` = force）

在開發環境中用 `-f` 很方便，反正都是測試用的，直接強制刪就好。但在生產環境中，建議還是先 stop 再 rm，讓容器有機會做優雅關閉。

最後再教大家一個暴力清理大法：

```bash
docker rm -f $(docker ps -aq)
```

這一行會**刪除你所有的容器**，不管在跑的還是停止的，全部清掉。很適合在開發環境中一鍵清理。但生產環境千萬不要這樣搞，你會被同事追著打。

### 5.8 啟動和停止容器

最後來講容器的啟動和停止。這四個命令跟 Linux 管理服務一模一樣：

```bash
docker start <CONTAINER_ID>      # 啟動已停止的容器
docker restart <CONTAINER_ID>    # 重啟容器（先 stop 再 start）
docker stop <CONTAINER_ID>       # 優雅停止容器
docker kill <CONTAINER_ID>       # 強制停止容器
```

**`stop` 和 `kill` 的區別很重要：**

- `docker stop`：發送 SIGTERM 信號，給容器一個收尾的機會。容器裡面的應用程式收到這個信號後，可以做一些清理工作（比如關閉資料庫連線、寫入快取到磁碟等），然後自己優雅地退出。如果 10 秒內沒有退出，Docker 才會強制殺掉它。
- `docker kill`：直接發送 SIGKILL 信號，相當於拔電源，立即終止，不給容器任何反應時間。

一般情況下用 `stop` 就好。只有在容器卡死、`stop` 等很久都沒反應的時候，才用 `kill` 強制終止。

當然，你也可以用容器名稱來操作，不一定要用 ID：

```bash
docker stop my-nginx
docker start my-nginx
docker restart my-nginx
```

名稱比 ID 好記多了，這也是為什麼我一直強調用 `--name` 給容器取名的重要性。

---

## 六、實作練習（3 分鐘）

好，理論講了這麼多，現在是動手時間。大家跟著我做，我會一步一步帶。如果前面有些命令沒跟上的，趁現在補起來。

**練習目標：用 Docker 跑起一個 Nginx Web 伺服器，然後在瀏覽器上看到它。**

我先把步驟列出來，大家自己試：

1. 拉取 nginx:alpine 映像檔（alpine 版比較小，下載快）
2. 用這個映像檔啟動一個容器：名稱叫 test-nginx，背景執行，主機 8080 port 對應容器 80 port
3. 用 `docker ps` 確認容器有在跑
4. 打開瀏覽器訪問 http://localhost:8080

給大家兩分鐘自己試，遇到問題先看錯誤訊息，嘗試自己解決。如果真的卡住了再問我。

（等待兩分鐘）

好，時間到了。大家有看到 Nginx 的歡迎頁面嗎？如果有，恭喜你成功了！如果沒有，看看是不是遇到了以下問題：

**常見問題排查：**

- **8080 port 被佔用了**：換一個 port，比如 `-p 9090:80`
- **容器名稱衝突**：表示之前已經有一個叫 test-nginx 的容器了，先 `docker rm -f test-nginx` 刪掉再重來
- **瀏覽器訪問不到**：確認 `docker ps` 有看到容器在跑，PORTS 欄位顯示的是 `0.0.0.0:8080->80/tcp`

參考答案在這裡：

```bash
# 1. 拉取映像檔
docker pull nginx:alpine

# 2. 啟動容器
docker run -d --name test-nginx -p 8080:80 nginx:alpine

# 3. 確認容器在跑
docker ps

# 4. 開瀏覽器訪問 http://localhost:8080
```

看到「Welcome to nginx!」那個頁面了嗎？很好。你剛剛做的事情，放在以前要裝作業系統、裝 nginx、設定 config 一堆有的沒的，現在就兩行命令搞定。這就是 Docker 的威力。

---

## 七、本堂課小結（2 分鐘）

好，我們來做一個快速的總結。這堂課的內容不少，但核心其實就是圍繞著兩個東西：**映像檔（Image）和容器（Container）**。

記住我們之前講的比喻：映像檔就像是一個「模板」或「藍圖」，容器就是根據這個模板跑起來的一個「實例」。一個映像檔可以跑出很多個容器，就像一個餅乾模具可以壓出很多塊餅乾。

**映像檔相關指令**

| 指令 | 功能 | 記憶口訣 |
|-----|-----|---------|
| docker pull | 從 Docker Hub 拉取映像檔 | 拉 |
| docker images | 列出本機有哪些映像檔 | 看 |
| docker search | 搜尋 Docker Hub 上的映像檔 | 找 |
| docker rmi | 刪除映像檔（rm + i = Image） | 刪 |

**容器相關指令**

| 指令 | 功能 |
|-----|-----|
| docker run | 建立並執行容器（最重要！） |
| docker ps | 查看容器狀態 |
| docker start / stop | 啟動 / 停止容器 |
| docker restart | 重啟容器 |
| docker kill | 強制停止容器 |
| docker rm | 刪除容器（注意跟 rmi 的區別！） |

**docker run 重要參數（一定要記住）**

| 參數 | 功能 | 範例 |
|-----|-----|------|
| -d | 背景執行 | `docker run -d nginx` |
| -it | 互動模式 | `docker run -it ubuntu /bin/bash` |
| --name | 指定名稱 | `docker run --name web nginx` |
| --rm | 容器停止後自動刪除 | `docker run --rm nginx` |
| -e | 設定環境變數 | `docker run -e KEY=VALUE nginx` |
| -p | Port Mapping | `docker run -p 8080:80 nginx` |
| -v | Volume 掛載 | 留到 Day 3 講 |

**今天一定要帶走的幾個重點：**

1. **不會就查 `--help`**，養成這個習慣
2. **映像檔是分層下載的**，共用的 Layer 不會重複下載
3. **`docker rm` 刪容器，`docker rmi` 刪映像檔**，別搞混
4. **退出容器：`exit` 會停止容器，`Ctrl+P+Q` 不會**
5. **`-q` 是批次操作的好朋友**，配合 `$()` 使用

**後續會學到的常用指令預覽**

下一堂課我們會學這些：

| 指令 | 功能 |
|-----|-----|
| docker logs | 查看容器日誌（debug 必備） |
| docker exec | 進入容器（開啟新的命令行終端） |
| docker attach | 進入容器（直接進入正在執行的終端） |
| docker inspect | 查看容器或映像檔的詳細元數據 |
| docker top | 查看容器內的程序資訊 |
| docker cp | 從容器內複製檔案到主機 |
| docker pause | 暫停容器 |

其中 `exec` 和 `attach` 的區別很重要：`exec` 會開一個新的終端進去，不影響容器原本在跑的程序；`attach` 則是直接連上容器正在執行的終端，如果你不小心按了 `Ctrl+C` 可能會把容器停掉。所以大多數情況我們都用 `exec`，這個下一堂課會詳細講。

好，今天下午第一堂就到這裡。大家休息一下，十分鐘後我們繼續學容器管理的指令。記得現在先不要把剛剛跑的那些容器刪掉，下一堂課還會用到。

---

## 板書 / PPT 建議

1. docker pull 流程圖（包含 Layer 下載與 Already exists 示意）
2. docker run 參數表（-d、-it、--name、-p、-e、-v、--rm）
3. docker run 執行流程圖（本機找 Image → Docker Hub 找 → 報錯）
4. docker ps 輸出欄位說明
5. docker rm vs docker rmi 比較表
6. exit vs Ctrl+P+Q 比較表
