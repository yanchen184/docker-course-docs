# Day 3 第八小時：Volume 資料持久化

---

## 一、Day3 開場回顧（5 分鐘）

各位同學好，歡迎來到第三天的課程！

昨天我們花了一整天的時間，把 Docker 的基礎操作紮紮實實地走了一遍。從環境一致性問題開始講起，然後學了 Docker 的核心概念——Image 和 Container，接著動手操作了 pull、run、ps、stop、rm、exec、logs 這些基本指令，還做了 Port Mapping，最後用 Nginx 做了一個完整的實戰練習，包括 Bind Mount 掛載自訂首頁。整天下來，大家應該對「怎麼用 Docker 跑一個服務」已經有感覺了。

好，那今天第三天，我們要做什麼呢？讓我先把今天一整天的規劃跟大家說一下。

| 時段 | 主題 | 重點 |
|------|------|------|
| 第八小時（現在） | **Volume 資料持久化** | 資料不跟著容器消失 |
| 第九小時 | Docker 網路 | 容器之間怎麼溝通 |
| 第十～十二小時 | Dockerfile 自製映像檔（3 小時） | 把你的應用打包成 Image |
| 第十三～十四小時 | Docker Compose（2 小時） | 一次管理多個容器 |

今天學完這些，你就具備了完整的 Docker 實戰能力——你可以自己打包應用程式、設定資料持久化、讓多個容器互相溝通、用一個設定檔編排整套微服務架構。這就是你在公司實際工作時會用到的核心技能。

好，那我們今天的第一堂課，要來講一個非常非常重要的主題——**Volume 資料持久化**。

為什麼我說它非常重要？因為等一下你學 Dockerfile、用 Docker Compose 的時候，一定會碰到「資料要存在哪裡」這個問題。如果不先把 Volume 搞懂，後面會一直卡住。而且我可以跟你說，在實際工作中，因為 Volume 設定不對而出事的案例，真的太多了。

好，我們直接開始。

---

## 二、為什麼需要 Volume（10 分鐘）

### 2.1 從一個災難故事說起

各位，在正式講 Volume 之前，我先問大家一個問題：如果你把一個 MySQL 容器刪掉，裡面的資料會怎樣？

答案是：**全部消失。**

這是 Docker 初學者最容易踩到的坑。很多人以為資料庫的資料就是存在硬碟上，容器刪了資料應該還在。但在 Docker 的世界裡，容器刪除時，裡面所有寫入的資料都會跟著一起消失。

所以今天這堂課，我要讓你們徹底搞懂 Docker 的資料儲存機制，學會用 Volume 來保護你的資料。

### 2.2 容器的讀寫層

昨天我們學過，Image 是唯讀的分層結構，容器會在上面加一個讀寫層（R/W Layer）。重點是：**這個讀寫層會隨著容器刪除而消失。**

當你執行 `docker rm` 刪除一個容器的時候，這個讀寫層就跟著一起被刪掉了。裡面所有的資料——不管是新增的檔案、修改的設定、還是資料庫寫入的資料——全部都沒了。

這就是為什麼我們今天要學 Volume。等一下的實作環節，我們會親手做一次完整的對比實驗，讓你親眼看到「沒有 Volume 資料就沒了」和「有 Volume 資料就安全了」的差別。

### 2.3 比喻時間：便利貼 vs 筆記本

我來打一個比方，幫大家記住這個概念。

**容器就像便利貼。** 你可以在上面寫東西，很方便，但它是用完就丟的。你把便利貼撕掉，上面寫的東西就沒了。

**Volume 就像筆記本。** 它是獨立存在的，不管你換了多少張便利貼，筆記本上的內容都還在。

所以正確的做法是：重要的資料不要寫在便利貼上，要寫在筆記本裡。對應到 Docker 的世界：重要的資料不要存在容器的讀寫層裡，要存在 Volume 裡。

容器可以隨時刪掉、重建，只要 Volume 還在，資料就不會丟。

好，大家消化一下。有問題嗎？

沒問題的話，我們繼續。接下來要講的是 Docker 提供的三種掛載方式。

> **📝 練習題 2.1（思考題）**
>
> 你用 Docker 跑了一個 WordPress 網站，使用者上傳了很多圖片。如果你沒有使用 Volume，哪天你升級 WordPress 版本（刪除舊容器、啟動新容器），會發生什麼事？

> **📝 練習題 2.2（選擇題）**
>
> 以下哪些資料在容器被刪除後會消失？（多選）
>
> A. 用 `apt install` 安裝的套件
> B. 用 Volume 掛載的目錄中的檔案
> C. 在容器內新建的檔案
> D. Image 裡面原本就有的檔案
>
> 答案：A 和 C。它們都存在容器的讀寫層中。B 是在 Volume 裡，不會消失。D 是在 Image Layer 裡，本來就不會因為容器刪除而改變。

---

## 三、三種掛載方式（15 分鐘）

### 3.1 概覽

Docker 提供三種方式，讓你把外部的儲存空間掛載到容器裡面。我先用一張圖讓大家有個全貌：

```
┌──────────────────────────────────────────────────────────┐
│                     Docker Host（主機）                    │
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌──────────┐       │
│  │  Volume   │    │  Bind Mount  │    │  tmpfs    │       │
│  │  (Docker  │    │  (你指定的    │    │  (記憶體)  │       │
│  │   管理)    │    │   主機目錄)   │    │           │       │
│  └─────┬────┘    └──────┬───────┘    └─────┬────┘       │
│        │                │                   │            │
│        ▼                ▼                   ▼            │
│  ┌──────────────────────────────────────────────┐       │
│  │              Container 容器                    │       │
│  │   /var/lib/mysql   /app/src    /tmp            │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

三種方式各有各的用途，我們一個一個來講。

### 3.2 Volume（Docker 管理的卷）

第一種，也是 Docker 官方**最推薦**的方式，叫做 Volume。

Volume 是什麼呢？簡單說，它是 Docker 自己管理的一塊儲存空間。當你建立一個 Volume，Docker 會在主機上的某個地方（Linux 上通常是 `/var/lib/docker/volumes/`）幫你建一個目錄，然後 Docker 全權管理這個目錄。

你不需要知道也不需要關心這個目錄在主機上的確切位置。你只要告訴 Docker：「我有一個叫做 `mysql-data` 的 Volume，請把它掛載到容器裡面的 `/var/lib/mysql`」，Docker 就會幫你搞定。

我打個比方。**Volume 就像你在 Docker 的倉庫裡租了一個置物櫃。** 你跟倉庫管理員（Docker）說：「幫我保管這些東西。」管理員把東西放到他的倉庫裡，具體放在哪個架子上你不用管。下次你需要的時候，跟管理員說一聲，他就會把東西拿給你。即使你把容器刪掉了，置物櫃裡的東西還是在的，因為置物櫃是歸倉庫管理的，不是歸容器管的。

Volume 的優點：

1. **Docker 管理，跨平台一致**：不管你是在 Mac、Linux、還是 Windows 上，操作方式都一樣。你不用擔心路徑格式的差異（Windows 用反斜線、Mac/Linux 用正斜線）
2. **生命週期獨立於容器**：容器刪了，Volume 還在
3. **可以被多個容器同時掛載**：比如你有一個 Volume 存了共享的設定檔，多個容器都可以讀取
4. **Docker CLI 完整管理**：create、ls、inspect、rm、prune，一整套管理指令
5. **效能較好**：在 Mac 和 Windows 上（Docker Desktop 環境），Volume 的 I/O 效能通常比 Bind Mount 好，因為 Bind Mount 要經過虛擬機的檔案系統轉換

```bash
# 建立一個 Volume
docker volume create my-data

# 啟動容器時掛載
docker run -d --name app -v my-data:/data nginx:alpine
```

### 3.3 Bind Mount（指定主機目錄）

第二種，Bind Mount。這個昨天在 Nginx 實戰的時候已經用過了。

Bind Mount 是把你主機上的一個**具體的目錄或檔案**，直接映射到容器裡面。

```bash
# 把主機目前目錄下的 html 資料夾掛載到容器的 Nginx 網頁根目錄
docker run -d --name web \
  -v $(pwd)/html:/usr/share/nginx/html \
  nginx:alpine
```

昨天大家做 Nginx 自訂首頁的時候，不就是這樣做的嗎？在主機上改 `index.html`，容器裡面立刻就能看到變化，不需要重啟容器、不需要重新建立 Image。

**Bind Mount 就像你直接把你家的抽屜連接到容器裡面。** 容器打開那個抽屜，看到的就是你家那個抽屜的內容。你在家裡往抽屜放東西，容器裡面就能看到；容器往抽屜放東西，你在家裡也能看到。兩邊看到的是同一個東西。

Bind Mount 最大的用途就是**開發環境**。你在 IDE 裡面改程式碼，容器裡面的應用程式立刻就能使用最新的程式碼，完全不需要重建 Image 或重啟容器。這對開發效率的提升是巨大的。

但 Bind Mount 有幾個缺點要注意：

1. **路徑跟主機綁定**：你寫的路徑在你的 Mac 上是 `/Users/yourname/project`，在 Linux 伺服器上可能是 `/home/yourname/project`，在 Windows 上又是 `C:\Users\yourname\project`。所以 Bind Mount 不太可攜
2. **安全性疑慮**：容器可以存取主機的檔案系統，如果權限沒設好，可能會有安全風險
3. **效能問題**：在 Docker Desktop（Mac/Windows）環境下，Bind Mount 的 I/O 效能可能不如 Volume

**所以簡單的原則：開發環境用 Bind Mount，生產環境用 Volume。**

### 3.4 tmpfs Mount（記憶體掛載）

第三種，tmpfs。這個比較特殊，一般情況下不太常用，但在某些場景很有價值。

tmpfs 掛載的資料完全存在記憶體裡面，**不會寫入磁碟**。當容器停止的時候，tmpfs 裡面的資料就消失了。

```bash
docker run -d --name secure-app \
  --tmpfs /tmp:rw,size=100m \
  nginx:alpine
```

**tmpfs 就像便條紙。** 你可以在上面快速寫一些東西，但用完就丟了，而且它從來不會被存到硬碟上。

什麼時候會用到 tmpfs？

1. **存放暫時性的敏感資料**：比如加密金鑰、Session Token。因為不寫磁碟，所以即使有人拿到了你的硬碟，也看不到這些敏感資料
2. **高效能暫存**：記憶體的讀寫速度比磁碟快得多，如果你的應用需要大量的暫時檔案讀寫，tmpfs 可以大幅提升效能
3. **避免容器讀寫層膨脹**：大量的暫時檔案寫在讀寫層會讓容器越來越大，用 tmpfs 就不會有這個問題

不過大部分的日常開發場景，你基本上只會用到 Volume 和 Bind Mount。tmpfs 知道有這個東西就好。

### 3.5 三種方式比較表

好，我把三種方式放在一張表裡做對比，大家可以拍照或截圖：

| 比較項目 | Volume | Bind Mount | tmpfs |
|---------|--------|------------|-------|
| **管理者** | Docker | 使用者 | 作業系統 |
| **資料位置** | `/var/lib/docker/volumes/` | 主機上任意目錄 | 記憶體 |
| **生命週期** | 獨立於容器 | 跟主機目錄一樣 | 容器停止就消失 |
| **跨平台** | 一致 | 路徑不同 | Linux 限定 |
| **效能（Desktop）** | 好 | 較慢 | 最快 |
| **適用場景** | 生產環境持久化 | 開發環境、設定檔 | 敏感資料、暫存 |
| **Docker CLI 管理** | 完整支援 | 不支援 | 不支援 |
| **多容器共用** | 支援 | 支援 | 不支援 |
| **推薦程度** | 最推薦 | 開發推薦 | 特殊用途 |

### 3.6 `-v` vs `--mount` 語法詳細比較

好，接下來這個很重要。Docker 掛載 Volume 有兩種語法，很多初學者搞不清楚差別，我來詳細說明。

**第一種：`-v` 語法（又叫 `--volume`）**

這是比較傳統的寫法，語法很簡潔：

```bash
# Volume 掛載
docker run -v my-data:/data nginx:alpine

# Bind Mount 掛載
docker run -v /host/path:/container/path nginx:alpine

# 唯讀掛載
docker run -v my-data:/data:ro nginx:alpine
```

`-v` 的格式是用冒號分隔的三段：`來源:目標:選項`

- 第一段：Volume 名稱或主機路徑
- 第二段：容器內的掛載路徑
- 第三段（可選）：選項，例如 `ro`（唯讀）

這裡有一個非常容易踩的坑——**Docker 怎麼分辨你寫的第一段是 Volume 名稱還是主機路徑？**

答案是：**看有沒有斜線。**

```bash
# 這是 Volume（因為 my-data 沒有斜線開頭）
docker run -v my-data:/data nginx:alpine

# 這是 Bind Mount（因為 /home/user/data 是絕對路徑，斜線開頭）
docker run -v /home/user/data:/data nginx:alpine

# 這也是 Bind Mount（因為 $(pwd) 會展開成絕對路徑）
docker run -v $(pwd)/html:/data nginx:alpine
```

這個規則很微妙。如果你寫了一個相對路徑，Docker 會把它當成 Volume 名稱，而不是主機目錄。這是很多人犯的錯：

```bash
# 注意！這不是 Bind Mount！
# Docker 會認為 ./html 是一個叫做 "./html" 的 Volume 名稱
# 實際上在較新版的 Docker 這樣寫會報錯
docker run -v ./html:/data nginx:alpine

# 正確的 Bind Mount 寫法：用 $(pwd) 展開成絕對路徑
docker run -v $(pwd)/html:/data nginx:alpine
```

**第二種：`--mount` 語法**

這是比較新的寫法，用 key=value 的格式，比較冗長但非常明確：

```bash
# Volume 掛載
docker run --mount type=volume,source=my-data,target=/data nginx:alpine

# Bind Mount 掛載
docker run --mount type=bind,source=/host/path,target=/container/path nginx:alpine

# 唯讀掛載
docker run --mount type=volume,source=my-data,target=/data,readonly nginx:alpine

# tmpfs 掛載
docker run --mount type=tmpfs,target=/tmp,tmpfs-size=100m nginx:alpine
```

`--mount` 的每個參數都有明確的 key，所以你一看就知道 `type=volume` 是 Volume 掛載、`type=bind` 是 Bind Mount。不會搞混。

兩種語法的關鍵差異：

| 比較項目 | `-v` / `--volume` | `--mount` |
|---------|-------------------|-----------|
| **語法風格** | 簡短，冒號分隔 | key=value，明確 |
| **可讀性** | 短但容易搞混 | 長但一目瞭然 |
| **來源不存在時** | 自動建立（可能建出空目錄） | **直接報錯** |
| **支援 tmpfs** | 有限 | 完整支援 |
| **官方推薦** | 可以用 | **推薦** |

這裡最重要的差異是第三點。**當你掛載的來源不存在時，`-v` 會默默地幫你建一個空目錄**，你的容器跑起來了但裡面的掛載目錄是空的，你可能 debug 半天才發現路徑打錯了。而 `--mount` 會直接報錯告訴你：「這個路徑不存在！」這在排查問題的時候省太多時間了。

**我的建議是：平常練習、快速操作用 `-v`，正式的生產環境用 `--mount`。** 在寫 Docker Compose 的時候兩種都能用，但 `--mount` 的語義更清楚。

OK，大家有沒有問題？這邊的語法差異蠻重要的，後面做練習的時候我們兩種都會用到。

> **📝 練習題 3.1（選擇題）**
>
> 以下哪個指令是 Bind Mount？
>
> A. `docker run -v mydata:/app nginx`
> B. `docker run -v /home/user/code:/app nginx`
> C. `docker run --mount type=volume,source=mydata,target=/app nginx`
>
> 答案：B。因為 `/home/user/code` 是以斜線開頭的絕對路徑，所以 Docker 把它當成 Bind Mount。A 是 Named Volume（mydata 不以斜線開頭），C 明確寫了 type=volume。

> **📝 練習題 3.2（情境題）**
>
> 你在生產環境部署一個 PostgreSQL 資料庫容器，應該用哪種掛載方式？為什麼？
>
> 答案：應該用 Volume。因為生產環境需要穩定性和可攜性，Volume 由 Docker 管理，不依賴主機的具體目錄結構，而且效能較好。

> **📝 練習題 3.3（實作題）**
>
> 用 `--mount` 語法啟動一個 Nginx 容器，將一個名為 `web-content` 的 Volume 掛載到容器的 `/usr/share/nginx/html`，並設定為唯讀。
>
> 答案：
> ```bash
> docker volume create web-content
> docker run -d --name web \
>   --mount type=volume,source=web-content,target=/usr/share/nginx/html,readonly \
>   nginx:alpine
> ```

---

## 四、Volume 管理指令實作（10 分鐘）

### 4.1 建立 Volume

好，理論講完了，我們來動手操作 Volume 的管理指令。

首先是建立一個 Volume：

```bash
docker volume create mydata
```

這行指令執行完之後，Docker 會在主機上建立一個叫做 `mydata` 的 Volume。輸出很簡單，就是 Volume 的名稱：

```
mydata
```

### 4.2 列出所有 Volume

```bash
docker volume ls
```

輸出：

```
DRIVER    VOLUME NAME
local     mydata
```

`DRIVER` 欄位表示這個 Volume 使用的驅動程式。`local` 就是預設的本地儲存。Docker 也支援第三方的 Volume Driver，比如把資料存到 NFS、AWS EBS、Azure Disk 等等。但一般情況下，你用 `local` 就夠了。

如果你之前做過很多練習，可能會看到一堆 Volume，有些名字是你取的，有些是一長串亂碼。那些亂碼就是「匿名 Volume」，等一下會講。

### 4.3 查看 Volume 詳細資訊

```bash
docker volume inspect mydata
```

輸出：

```json
[
    {
        "CreatedAt": "2026-03-16T10:30:00Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/mydata/_data",
        "Name": "mydata",
        "Options": {},
        "Scope": "local"
    }
]
```

這裡最重要的欄位是 **`Mountpoint`**。它告訴你這個 Volume 的資料實際上存在主機的哪個目錄。在 Linux 上，就是 `/var/lib/docker/volumes/mydata/_data`。

但是注意！如果你用的是 Docker Desktop（Mac 或 Windows），這個路徑是在 Docker 虛擬機裡面的，你在主機上直接 `cd` 到這個路徑是找不到的。這也是為什麼我說 Volume 是「Docker 管理的」——你不應該直接去碰這個目錄，應該透過 Docker 的指令來操作。

其他欄位說明：
- `CreatedAt`：建立時間
- `Driver`：儲存驅動程式
- `Labels`：標籤，你可以在建立時加上標籤方便管理
- `Scope`：範圍，`local` 表示這台機器

### 4.4 刪除 Volume

```bash
docker volume rm mydata
```

注意：如果有容器正在使用這個 Volume，這個指令會失敗並報錯。你需要先停掉並刪除使用它的容器，才能刪除 Volume。這是 Docker 的保護機制，避免你誤刪正在使用的 Volume。

```
Error response from daemon: remove mydata: volume is in use - [abc123def456]
```

如果看到這個錯誤，先用 `docker rm -f <container_id>` 刪掉使用它的容器，再來刪 Volume。

### 4.5 清理未使用的 Volume（危險指令！）

```bash
docker volume prune
```

這個指令會刪除**所有沒有被任何容器使用的 Volume**。

Docker 會先問你確認：

```
WARNING! This will remove all local volumes not used by at least one container.
Are you sure you want to continue? [y/N]
```

**這裡我要特別強調——`docker volume prune` 是一個非常危險的指令！**

為什麼危險？因為「沒有被任何容器使用」不等於「不重要」。

想像一個場景：你有一個 MySQL 容器用了 `mysql-prod-data` 這個 Volume，裡面存了重要的生產資料。有一天你把 MySQL 容器停掉了，準備升級版本。在你重建新容器之前，不小心執行了 `docker volume prune`——Volume 就被刪了，資料全部消失。

因為在那個時刻，`mysql-prod-data` 確實沒有被任何容器使用（舊容器已刪，新容器還沒建），prune 就會把它清掉。

我之前聽過一個更慘的故事。有一個團隊的運維工程師，為了清理測試環境的磁碟空間，在生產伺服器上執行了 `docker system prune -a --volumes`（這是更狠的版本，會把 Image、Container、Volume 全部清掉）。結果把正在維護中暫時停止的三個資料庫 Volume 全部刪了。

所以我的建議是：

1. **在生產環境，永遠不要用 `docker volume prune`**
2. 如果一定要清理，用 `docker volume rm <volume_name>` 一個一個刪，確認清楚再刪
3. 在執行任何 prune 指令之前，先用 `docker volume ls` 看看有哪些 Volume，確認要刪的是哪些

### 4.6 Named Volume vs Anonymous Volume

這個區別很重要。

**Named Volume（具名卷）** 就是你在建立的時候給了它一個名字的 Volume：

```bash
# 建立時取名
docker volume create mysql-data

# 或者在 docker run 時直接用名字（如果不存在會自動建立）
docker run -v mysql-data:/var/lib/mysql mysql:8.0
```

**Anonymous Volume（匿名卷）** 就是沒有給名字的 Volume：

```bash
# 只指定容器內路徑，不指定 Volume 名稱
docker run -v /var/lib/mysql mysql:8.0
```

匿名 Volume 會得到一個隨機的長雜湊字串當名字：

```bash
docker volume ls
```

```
DRIVER    VOLUME NAME
local     a3b4c5d6e7f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a1b2c3d4e5f6a7b8
local     mysql-data
```

看到了嗎？一個是一堆亂碼，一個是有意義的名字。你說你三個月後回來看，你知道那串亂碼是幹嘛的嗎？肯定不知道。

**所以永遠用 Named Volume。** 每個 Volume 都要有一個描述性的名字。

Volume 命名慣例建議：

```
# 好的命名
mysql-prod-data
redis-cache-data
webapp-uploads
nginx-config

# 不好的命名
data1
myvolume
test
volume123
```

命名格式建議：`<服務名稱>-<環境>-<用途>`，例如 `mysql-prod-data`、`redis-dev-cache`。這樣一看就知道是什麼服務、什麼環境、存的是什麼資料。

另外順便提一下，很多 Docker Image 在 Dockerfile 裡面有寫 `VOLUME` 指令。比如 MySQL 的 Dockerfile 裡面有 `VOLUME /var/lib/mysql`。這意味著就算你在 `docker run` 的時候沒有指定 `-v`，Docker 也會自動建立一個匿名 Volume 來掛載 `/var/lib/mysql`。

但匿名 Volume 很難管理，所以不要依賴這個機制。自己明確地用 Named Volume 掛載，是最安全的做法。

> **📝 練習題 4.1（實作題）**
>
> 1. 建立一個名為 `practice-vol` 的 Volume
> 2. 用 `docker volume ls` 確認它出現在列表中
> 3. 用 `docker volume inspect practice-vol` 查看它的 Mountpoint
> 4. 刪除它：`docker volume rm practice-vol`
> 5. 再用 `docker volume ls` 確認它已經不在了

> **📝 練習題 4.2（選擇題）**
>
> 以下哪個指令會建立匿名 Volume？
>
> A. `docker run -v mydata:/data nginx`
> B. `docker run -v /data nginx`
> C. `docker run -v $(pwd)/data:/data nginx`
> D. `docker run --mount type=volume,source=mydata,target=/data nginx`
>
> 答案：B。只有 B 沒有指定 Volume 名稱，只寫了容器內路徑 `/data`，所以 Docker 會建立一個匿名 Volume。

---

## 五、實作練習：MySQL 資料持久化（15 分鐘）

### 5.1 步驟一：不用 Volume 啟動 MySQL（重現問題）

好，前面講了那麼多概念，現在我們來親手做一次對比實驗。先啟動一個**沒有 Volume** 的 MySQL：

```bash
docker run -d \
  --name mysql-no-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=school \
  mysql:8.0
```

這裡解釋一下那兩個 `-e` 參數：

- `MYSQL_ROOT_PASSWORD`：MySQL root 使用者的密碼。這個是必填的，如果你不設，容器會啟動失敗。這是新手最常遇到的錯誤之一。
- `MYSQL_DATABASE`：自動建立一個資料庫。這是選填的，但設了比較方便。

等 MySQL 啟動完成（大約 15-20 秒），寫入一些資料：

```bash
docker exec -it mysql-no-volume mysql -uroot -ptest123
```

```sql
USE school;

CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  grade INT
);

INSERT INTO students (name, grade) VALUES
  ('小明', 85),
  ('小華', 92),
  ('小美', 78);

SELECT * FROM students;
```

預期輸出：

```
+----+--------+-------+
| id | name   | grade |
+----+--------+-------+
|  1 | 小明   |    85 |
|  2 | 小華   |    92 |
|  3 | 小美   |    78 |
+----+--------+-------+
3 rows in set (0.00 sec)
```

好，資料在。現在輸入 `EXIT;` 離開。

**刪掉容器：**

```bash
docker stop mysql-no-volume
docker rm mysql-no-volume
```

**重新啟動同樣的容器：**

```bash
docker run -d \
  --name mysql-no-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=school \
  mysql:8.0
```

**查資料：**

```bash
docker exec -it mysql-no-volume mysql -uroot -ptest123 -e "SELECT * FROM school.students;"
```

結果：

```
ERROR 1146 (42S02): Table 'school.students' doesn't exist
```

意料之中，資料沒了。好，現在讓我們用正確的方式來做。

先清掉這個容器：

```bash
docker stop mysql-no-volume
docker rm mysql-no-volume
```

### 5.2 步驟二：用 Named Volume 啟動 MySQL（正確做法）

**建立 Volume：**

```bash
docker volume create mysql-school-data
```

**用 Volume 啟動 MySQL：**

```bash
docker run -d \
  --name mysql-with-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=school \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0
```

注意這行多了 `-v mysql-school-data:/var/lib/mysql`。這是告訴 Docker：把 `mysql-school-data` 這個 Volume 掛載到容器裡面的 `/var/lib/mysql` 目錄。而 `/var/lib/mysql` 正好就是 MySQL 存放所有資料檔案的地方。

所以現在 MySQL 寫入的所有資料，都不是寫在容器的讀寫層了，而是寫在 Volume 裡面。

等 MySQL 啟動完成，寫入資料：

```bash
docker exec -it mysql-with-volume mysql -uroot -ptest123
```

```sql
USE school;

CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  grade INT
);

INSERT INTO students (name, grade) VALUES
  ('小明', 85),
  ('小華', 92),
  ('小美', 78),
  ('大雄', 60),
  ('靜香', 95);

SELECT * FROM students;
```

預期輸出：

```
+----+--------+-------+
| id | name   | grade |
+----+--------+-------+
|  1 | 小明   |    85 |
|  2 | 小華   |    92 |
|  3 | 小美   |    78 |
|  4 | 大雄   |    60 |
|  5 | 靜香   |    95 |
+----+--------+-------+
5 rows in set (0.00 sec)
```

好，五筆資料。輸入 `EXIT;` 離開。

現在，見證奇蹟的時刻——**刪掉容器：**

```bash
docker stop mysql-with-volume
docker rm mysql-with-volume
```

容器已經被刪了。但 Volume 還在不在呢？

```bash
docker volume ls
```

```
DRIVER    VOLUME NAME
local     mysql-school-data
```

Volume 還在！因為 Volume 的生命週期是獨立於容器的。

**用同一個 Volume 建一個新容器：**

```bash
docker run -d \
  --name mysql-with-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0
```

注意這裡我不需要再設 `-e MYSQL_DATABASE=school`，因為資料庫已經存在 Volume 裡面了。

等它啟動完成，查資料：

```bash
docker exec -it mysql-with-volume mysql -uroot -ptest123 -e "SELECT * FROM school.students;"
```

```
+----+--------+-------+
| id | name   | grade |
+----+--------+-------+
|  1 | 小明   |    85 |
|  2 | 小華   |    92 |
|  3 | 小美   |    78 |
|  4 | 大雄   |    60 |
|  5 | 靜香   |    95 |
+----+--------+-------+
5 rows in set (0.00 sec)
```

**五筆資料全部都在！** 容器刪了又重建，資料完全沒有受到影響。

大家感受到了嗎？這就是 Volume 的威力。

### 5.3 步驟三：升級 MySQL 版本但保留資料

好，接下來我們模擬一個更實際的場景——MySQL 版本升級。

假設我們現在用的是 MySQL 8.0，我們要升級到 MySQL 8.4（假設是一個小版本升級）。

步驟很簡單：

**停掉並刪除舊容器：**

```bash
docker stop mysql-with-volume
docker rm mysql-with-volume
```

**用新版本的 Image 建一個新容器，掛載同一個 Volume：**

```bash
docker run -d \
  --name mysql-with-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.4
```

唯一的差異就是 Image 從 `mysql:8.0` 變成了 `mysql:8.4`。Volume 名稱不變，掛載路徑不變。

MySQL 8.4 啟動的時候，它會偵測到 `/var/lib/mysql` 裡面有 8.0 版本的資料，然後自動執行升級程序。等它啟動完成：

```bash
docker exec -it mysql-with-volume mysql -uroot -ptest123 -e "SELECT * FROM school.students;"
```

資料還是在的！而且 MySQL 版本已經升級了：

```bash
docker exec -it mysql-with-volume mysql -uroot -ptest123 -e "SELECT VERSION();"
```

```
+-----------+
| VERSION() |
+-----------+
| 8.4.x     |
+-----------+
```

這就是 Volume 讓容器升級變得安全的原因。你的資料在 Volume 裡，容器只是一個可拋棄的執行環境。升級就是換一個新版本的容器，資料完全不受影響。

**但是要注意！** 不是所有版本升級都這麼順利。有些大版本升級（比如 MySQL 5.7 到 MySQL 8.0）可能會有不相容的問題。所以在做版本升級之前，一定要：

1. **先備份！** 用 mysqldump 做一個完整備份
2. 在測試環境先試一次
3. 確認沒問題再在生產環境操作

### 5.4 常見錯誤處理

做 MySQL 容器的時候，有幾個常見的錯誤我先提醒大家：

**錯誤一：忘記設 MYSQL_ROOT_PASSWORD**

```bash
docker run -d --name mysql mysql:8.0
```

容器會啟動失敗。用 `docker logs mysql` 查看錯誤：

```
error: database is uninitialized and password option is not specified
  You need to specify one of the following as an environment variable:
  - MYSQL_ROOT_PASSWORD
  - MYSQL_ALLOW_EMPTY_PASSWORD
  - MYSQL_RANDOM_ROOT_PASSWORD
```

解決方法：加上 `-e MYSQL_ROOT_PASSWORD=你的密碼`。

**錯誤二：容器還沒啟動完就嘗試連線**

MySQL 第一次啟動需要做初始化，可能要 15-30 秒。如果你容器剛跑起來就嘗試 `docker exec` 進去，可能會遇到連線被拒絕。

解決方法：等一下，或用 `docker logs -f mysql-with-volume` 看日誌，等看到 `ready for connections` 再操作。

**錯誤三：Port 已被佔用**

```
Error response from daemon: Ports are not available: exposing port TCP 0.0.0.0:3306 -> 0.0.0.0:0: listen tcp 0.0.0.0:3306: bind: address already in use
```

這表示主機的 3306 port 已經被其他程式佔用了（可能是本機安裝的 MySQL，或者另一個 Docker 容器）。

解決方法：換一個 port，比如 `-p 3307:3306`。

**錯誤四：密碼裡有特殊字元**

如果你的密碼包含 `$`、`!`、`&` 等特殊字元，在 bash 裡面要小心跳脫。建議密碼用單引號包起來：

```bash
docker run -d -e MYSQL_ROOT_PASSWORD='my$ecr&t!' mysql:8.0
```

> **📝 練習題 5.1（實作題）**
>
> 請自己完成一個 Redis 資料持久化的練習：
>
> 1. 建立一個名為 `redis-data` 的 Volume
> 2. 啟動一個 Redis 容器，將 Volume 掛載到 `/data`，並加上 `--appendonly yes` 參數啟用持久化
>    ```bash
>    docker run -d --name my-redis \
>      -v redis-data:/data \
>      redis:alpine redis-server --appendonly yes
>    ```
> 3. 寫入資料：`docker exec my-redis redis-cli SET greeting "Hello Docker"`
> 4. 讀取驗證：`docker exec my-redis redis-cli GET greeting`
> 5. 刪除容器：`docker stop my-redis && docker rm my-redis`
> 6. 重建容器（同樣的 `docker run` 指令）
> 7. 再次讀取：`docker exec my-redis redis-cli GET greeting`
> 8. 資料還在嗎？

> **📝 練習題 5.2（情境題）**
>
> 你的同事跑了以下指令來啟動一個 PostgreSQL 資料庫，但他擔心資料安全。你看看有什麼問題：
>
> ```bash
> docker run -d --name postgres \
>   -e POSTGRES_PASSWORD=secret \
>   postgres:16
> ```
>
> 答案：沒有掛載 Volume！PostgreSQL 的資料存在 `/var/lib/postgresql/data`，但這個容器沒有將它掛載到 Volume。雖然 PostgreSQL 的 Dockerfile 裡有 `VOLUME /var/lib/postgresql/data` 會自動建立匿名 Volume，但匿名 Volume 很難管理。正確做法是明確指定 Named Volume：
>
> ```bash
> docker run -d --name postgres \
>   -e POSTGRES_PASSWORD=secret \
>   -v postgres-data:/var/lib/postgresql/data \
>   postgres:16
> ```

> **📝 練習題 5.3（進階題）**
>
> 你有一個正在運行的 MySQL 容器，想知道它的 `/var/lib/mysql` 是掛載了 Volume 還是用容器的讀寫層。你要怎麼查？
>
> 提示：使用 `docker inspect <container_name>` 查看 `Mounts` 欄位。
>
> ```bash
> docker inspect mysql-with-volume --format '{{json .Mounts}}' | python3 -m json.tool
> ```
>
> 如果有掛載 Volume，你會看到 `"Type": "volume"` 和 Volume 的名稱。如果什麼都沒有，那就是用讀寫層了（危險！）。

---

## 六、Volume 備份與還原（5 分鐘）

### 6.1 為什麼要備份

好，我們已經知道 Volume 可以讓資料不隨容器消失。但這不代表 Volume 裡的資料就是安全的。

Volume 還是存在主機的硬碟上。如果硬碟壞了呢？如果有人不小心 `docker volume rm` 了呢？如果有人執行了 `docker volume prune`（就像我前面講的那個恐怖故事）呢？

所以，**備份是必須的。有 Volume 不代表不需要備份。**

Volume 的備份有兩種方法。

### 6.2 通用方法：臨時容器 + tar

這個方法適用於任何類型的 Volume，不管裡面存的是什麼。原理是用一個臨時的小容器，同時掛載你要備份的 Volume 和一個輸出目錄，然後在容器裡面用 `tar` 指令把 Volume 的內容打包。

**備份：**

```bash
docker run --rm \
  -v mysql-school-data:/source:ro \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/mysql-school-data-backup.tar.gz -C /source .
```

我來逐行解釋這個指令，因為它看起來有點複雜：

- `docker run --rm`：啟動一個臨時容器，用完就自動刪除
- `-v mysql-school-data:/source:ro`：把要備份的 Volume 掛載到容器的 `/source`，設成唯讀（`:ro`），避免意外修改
- `-v $(pwd):/backup`：把主機的當前目錄掛載到容器的 `/backup`，備份檔案會存在這裡
- `alpine`：用最小的 Alpine Linux Image，因為我們只需要 `tar` 指令
- `tar czf /backup/mysql-school-data-backup.tar.gz -C /source .`：把 `/source`（也就是 Volume 的內容）壓縮成 tar.gz 檔案，存到 `/backup`

執行完之後，你的當前目錄就會多一個 `mysql-school-data-backup.tar.gz` 檔案。

**還原：**

```bash
docker run --rm \
  -v mysql-school-data:/target \
  -v $(pwd):/backup \
  alpine \
  sh -c "cd /target && tar xzf /backup/mysql-school-data-backup.tar.gz"
```

反過來的操作——把壓縮檔解壓回 Volume 裡。

### 6.3 資料庫專用備份（推薦）

對於資料庫來說，直接用 tar 打包檔案其實不是最好的方式。因為如果資料庫正在寫入資料，你打包出來的檔案可能包含不完整的交易，還原的時候會出問題。

更好的方式是用資料庫自帶的備份工具，它們會處理好資料一致性的問題。

**MySQL 備份：**

```bash
# 備份整個資料庫到主機上的 SQL 檔案
docker exec mysql-with-volume \
  mysqldump -uroot -ptest123 --all-databases > full-backup.sql

# 備份特定資料庫
docker exec mysql-with-volume \
  mysqldump -uroot -ptest123 school > school-backup.sql
```

**MySQL 還原：**

```bash
docker exec -i mysql-with-volume \
  mysql -uroot -ptest123 < full-backup.sql
```

**PostgreSQL 備份：**

```bash
# 備份
docker exec my-postgres pg_dump -U postgres mydb > mydb-backup.sql

# 還原
docker exec -i my-postgres psql -U postgres mydb < mydb-backup.sql
```

資料庫專用備份的好處：

| 優點 | 說明 |
|------|------|
| 資料一致性 | 備份時會正確處理交易 |
| 人類可讀 | 產生的是 SQL 文字檔，可以用編輯器打開 |
| 跨版本還原 | MySQL 5.7 的 dump 可以還原到 8.0 |
| 選擇性還原 | 可以只還原特定的資料表 |
| 壓縮效率好 | 文字格式壓縮率很高 |

**我的建議是：定期用資料庫工具做邏輯備份（mysqldump / pg_dump），然後用 tar 方式做完整的 Volume 備份作為雙重保險。**

### 6.4 備份的最佳實踐

1. **自動化排程**：不要依賴手動備份。用 cron job 或 CI/CD 設定定期自動備份
2. **異地備份**：備份檔案不要只存在同一台機器上。傳到 S3、Google Cloud Storage、或另一台伺服器
3. **定期測試還原**：備份做了不等於能還原。定期拿備份檔案來做還原測試，確認備份是有效的
4. **備份檔案命名**：加上日期和時間，例如 `mysql-school-data-2026-03-16-1030.tar.gz`

> **📝 練習題 6.1（實作題）**
>
> 1. 用 `mysqldump` 備份你的 `school` 資料庫到主機上的 `school-backup.sql`
> 2. 進入 MySQL，刪除 `students` 表格：`DROP TABLE students;`
> 3. 確認表格已經不在了
> 4. 用備份檔案還原
> 5. 再次查詢，確認資料回來了

---

## 七、本堂課小結（5 分鐘）

好，我們來快速回顧一下這堂課學了什麼。

### 核心概念

**容器的資料是暫時的** —— R/W Layer 隨著 `docker rm` 消失。重要的資料一定要用 Volume。

### 三種掛載方式

| 類型 | 何時使用 | 一句話記憶 |
|------|---------|-----------|
| **Volume** | 生產環境持久化 | Docker 幫你管的倉庫 |
| **Bind Mount** | 開發環境即時同步 | 你家抽屜直連容器 |
| **tmpfs** | 敏感資料暫存 | 便條紙，關機就沒 |

### 關鍵指令

```bash
# Volume 生命週期管理
docker volume create <name>     # 建立
docker volume ls                # 列出
docker volume inspect <name>    # 查看詳情
docker volume rm <name>         # 刪除（安全）
docker volume prune             # 清理（危險！）

# 掛載語法
docker run -v <volume>:<path>                    # 簡短版
docker run --mount type=volume,source=X,target=Y # 明確版
```

### 三件事一定要記住

1. **永遠用 Named Volume，不要用匿名 Volume**
2. **開發用 Bind Mount，生產用 Volume**
3. **有 Volume 不代表不需要備份！定期備份是必須的**

### Volume 是 Docker 數據安全的基石

今天這堂課的內容，看起來好像只是幾個指令，但它背後的概念——資料的生命週期管理——是你在實際工作中每天都會面對的問題。

你以後寫 Dockerfile、寫 Docker Compose，每次遇到「這個服務會產生需要保留的資料」的情況，第一個反應就應該是：Volume 要掛在哪裡？備份策略是什麼？

好的，這堂課就到這裡。下一堂課我們要講 Docker 網路——容器之間怎麼互相溝通。今天學的 Volume 在後面講 Docker Compose 的時候還會大量用到，所以要確保你真的搞懂了。

大家休息十分鐘，有問題的趕快問，十分鐘後繼續！

---

## 板書 / PPT 建議

1. **容器儲存結構圖**：R/W Layer + Image Layers 堆疊圖，用紅色標注「R/W Layer 隨容器刪除而消失」，Volume 用綠色箭頭從外部連接到容器
2. **三種掛載方式對比圖**：左邊 Docker Host，右邊 Container，中間用三種不同顏色的線連接，分別標注 Volume（藍色）、Bind Mount（橙色）、tmpfs（灰色）
3. **便利貼 vs 筆記本插圖**：用簡單的圖示表達「容器 = 便利貼（用完就丟）」「Volume = 筆記本（永久保存）」
4. **`-v` vs `--mount` 語法對照表**：左右對照，重點用紅色標記「來源不存在時的行為差異」
5. **MySQL 持久化流程動畫**：分步驟展示 → 建立 Volume → 啟動容器 → 寫入資料 → 刪除容器 → Volume 還在 → 重建容器 → 資料完整
6. **Named Volume vs Anonymous Volume 對比**：左邊是有意義名稱 `mysql-prod-data`（打勾），右邊是一串亂碼（打叉）
7. **備份策略圖**：展示 mysqldump 和 tar 兩種備份方式的流程
8. **危險指令警告板**：用紅色大字顯示 `docker volume prune` 和 `docker system prune --volumes`，旁邊畫一個警告三角形
