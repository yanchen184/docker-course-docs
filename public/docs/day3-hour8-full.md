# Day 3 第八小時：Volume 資料持久化

---

## 一、Day3 開場回顧（5 分鐘）

各位同學好，歡迎來到第三天的課程！

昨天我們花了一整天的時間，把 Docker 的基礎操作紮紮實實地走了一遍。我們先從「為什麼需要 Docker」這個大問題切入——還記得那個經典的場景嗎？「在我的電腦上明明可以跑啊！」然後我們學了 Docker 的核心概念——Image 和 Container 的關係，接著動手操作了 pull、run、ps、stop、rm、exec、logs 這些基本指令，再來學了 Port Mapping 把容器的服務暴露出來，最後用 Nginx 加上 Bind Mount 做了一個完整的實戰——在主機上改 HTML，容器裡面的網頁立刻更新。

大家對「怎麼用 Docker 跑一個服務」應該已經有感覺了吧？如果還沒有，今天會讓你更有感覺，因為今天的內容全部都是實戰導向。

好，先看一下今天一整天的規劃：

| 時段 | 主題 | 重點 |
|------|------|------|
| 第八小時（現在） | **Volume 資料持久化** | 資料不跟著容器消失 |
| 第九小時 | Docker 網路 | 容器之間怎麼溝通 |
| 第十～十二小時 | Dockerfile 自製映像檔（3 小時） | 把你的應用打包成 Image |
| 第十三～十四小時 | Docker Compose（2 小時） | 一次管理多個容器 |

今天學完這些，你就具備了完整的 Docker 實戰能力。你可以自己打包應用程式、設定資料持久化、讓多個容器互相溝通、用一個設定檔編排整套微服務架構。這就是你在公司實際工作時每天會用到的核心技能。

好，那今天第一堂課，我們要來講一個非常非常重要的主題——**Volume 資料持久化**。

為什麼說非常重要？因為等一下你學 Dockerfile、用 Docker Compose 的時候，一定會碰到「資料要存在哪裡」這個問題。如果不先把 Volume 搞懂，後面會一直卡住。而且我可以跟你說，在實際工作中，因為 Volume 設定不對而出事的案例，真的太多了。

好，我們直接開始。

---

## 二、Volume 基礎與 -v 用法（10 分鐘）

### 2.1 容器的讀寫層問題

先問大家一個問題：如果你把一個 MySQL 容器刪掉，裡面的資料會怎樣？

有人說資料還在？有人說不知道？

答案是：**全部消失。**

這是 Docker 初學者最容易踩到的坑，沒有之一。很多人以為資料庫的資料就是存在硬碟上，容器刪了資料應該還在。但在 Docker 的世界裡，事情不是這樣的。

昨天我們學過，Image 是唯讀的分層結構，對不對？容器啟動的時候，Docker 會在 Image 的最上面加一個讀寫層（R/W Layer）。你在容器裡面做的所有寫入操作——新增檔案也好、修改設定也好、資料庫寫入記錄也好——全部都存在這個讀寫層裡面。

重點來了：**這個讀寫層的生命週期跟容器綁在一起。** 當你執行 `docker rm` 刪除容器的時候，讀寫層就跟著一起被刪掉了。裡面所有的資料，全部都沒了。不管你的資料有多重要、存了多少年，容器一刪，全沒了。

所以我們需要一個機制，把重要的資料從容器的讀寫層裡面「抽出來」，存到一個獨立的地方。這個機制就是今天要學的 **Volume**。

我打個比方。**容器就像便利貼。** 你可以在上面寫東西，很方便，但它是用完就丟的。你把便利貼撕掉，上面寫的東西就跟著消失了。**Volume 就像筆記本。** 它是獨立存在的，不管你換了多少張便利貼、撕掉了多少張便利貼，筆記本上的內容都不會受到影響。

所以正確的做法是什麼？重要的資料不要寫在便利貼上，要寫在筆記本裡。對應到 Docker：重要的資料不要存在容器的讀寫層，要存在 Volume 裡。容器可以隨時刪掉、重建，只要 Volume 還在，資料就不會丟。

大家消化一下這個概念。有沒有問題？

### 2.2 三種掛載方式

好，那要怎麼把資料從容器裡面「抽出來」？Docker 提供三種掛載方式，我先讓大家有個全貌：

| 類型 | 說明 | 適用場景 |
|------|------|---------|
| **Volume** | Docker 自己管理的儲存空間 | **生產環境持久化（最推薦）** |
| **Bind Mount** | 直接映射你指定的主機目錄 | 開發環境即時同步 |
| **tmpfs** | 存在記憶體裡，不寫磁碟，容器停止就消失 | 敏感資料暫存（特殊用途） |

tmpfs 是比較特殊的用途，一般日常不太會碰到，知道有這個東西就好。今天的重點是 **Volume** 和 **Bind Mount**。

### 2.3 -v 掛載語法

這兩種掛載都用 `-v` 這個參數，語法長得一模一樣：

```bash
docker run -v 左邊:右邊 nginx:alpine
```

冒號右邊是容器內的掛載目錄，這沒什麼好說的。重點是**冒號左邊**——左邊寫什麼，決定了 Docker 用哪種掛載方式。

```bash
# Bind Mount —— 左邊是主機路徑（斜線開頭）
docker run -v /home/user/html:/data nginx

# Volume —— 左邊是 Volume 名稱（沒有斜線開頭）
docker run -v my-data:/data nginx
```

**判斷規則就一條：冒號左邊有斜線開頭，就是 Bind Mount；沒有斜線開頭，就是 Volume。**

看起來語法幾乎一樣對不對？就差一個斜線。但這兩個東西的行為完全不同，不只是名字不同而已。

### 2.4 Volume 和 Bind Mount 的差異

有同學可能會想：不就是把資料掛出來嗎？幹嘛搞兩個名字？

因為背後的儲存機制完全不同：

| | Bind Mount | Volume |
|--|-----------|--------|
| **資料存在哪** | 你指定的主機路徑（你完全控制） | Docker 管理的路徑（`/var/lib/docker/volumes/...`） |
| **誰管理** | 你自己管（用檔案總管、ls、rm） | Docker 管（用 `docker volume` 指令） |
| **可攜性** | 綁死主機路徑，換台機器路徑可能不對 | 跟主機路徑無關，哪台機器都能用 |
| **來源不存在時** | Docker 自動建空目錄（可能踩坑） | Docker 自動建 Volume（正常行為） |

**一句話分辨：Bind Mount 是「你來管」，Volume 是「Docker 幫你管」。**

打個比方。Bind Mount 就像你自己在家裡找一個櫃子存東西，你知道東西在哪、隨時可以去翻。Volume 就像你把東西交給物流公司的倉庫保管——你不用管倉庫地址在哪，需要的時候跟 Docker 說一聲「把 `my-data` 給我」就好。

### 2.5 開發用 Bind Mount，生產用 Volume

**Bind Mount 適合開發，是因為你需要用 IDE 直接改檔案。** 比如說你在開發一個網站，用 Bind Mount 把專案目錄掛進容器：

```bash
docker run -v $(pwd)/html:/usr/share/nginx/html nginx:alpine
```

`$(pwd)` 是 shell 語法，會被展開成你目前所在目錄的絕對路徑，所以 Docker 看到的是斜線開頭，判定為 Bind Mount。這樣你用 VS Code 改 HTML，容器裡的 Nginx 立刻就能讀到新的內容。檔案就在你的專案目錄下，IDE 直接開、git 直接管，開發流程非常順暢。

**Volume 適合生產，是因為它不依賴主機的目錄結構。** Bind Mount 必須指定一個具體的主機路徑，像 `/home/user/project/data`——換一台伺服器，路徑就可能不一樣了。Volume 是 Docker 自己管理的，不管在哪台機器，`docker run -v mysql-data:/var/lib/mysql` 都能用。而且 Volume 的檔案存在 `/var/lib/docker/volumes/mysql-data/_data` 裡面——如果你用的是 macOS 或 Windows，這個路徑在 Docker 的虛擬機裡面，主機上根本看不到。Linux 上看得到，但要 root 權限。所以 Volume 拿來當開發目錄體驗很差，但拿來做生產環境的資料持久化剛剛好——你不需要去碰底層檔案，透過 `docker volume` 指令就能管理、備份、遷移。

**簡單記：Bind Mount 方便你改 code，Volume 方便 Docker 管資料。**

還有一個小知識：如果你指定的 Volume 不存在，Docker 會在 `docker run` 的時候自動幫你建立。所以你可以直接寫 `-v my-data:/data`，不用先手動 `docker volume create`。當然，先手動建好也行，看你的習慣。

好，在進入實戰之前，先做一個小測驗，確認大家剛才的概念有聽進去。

> **📝 小測驗 1：Volume 還是 Bind Mount？**
>
> 請判斷以下指令用的是 Volume 還是 Bind Mount：
>
> 1. `docker run -v mydata:/app nginx`
> 2. `docker run -v /tmp/data:/app nginx`
> 3. `docker run -v $(pwd)/config:/app nginx`
> 4. `docker run -v db-backup:/backup mysql`
>
> **答案：**
> 1. Volume（`mydata` 沒有斜線開頭）
> 2. Bind Mount（`/tmp/data` 斜線開頭，是主機路徑）
> 3. Bind Mount（`$(pwd)` 會被 shell 展開成絕對路徑，斜線開頭）
> 4. Volume（`db-backup` 沒有斜線開頭）

> **📝 小測驗 2：情境題**
>
> 以下情境你會選 Volume 還是 Bind Mount？
>
> 1. 開發一個 React 專案，希望改完程式碼容器裡立刻生效
> 2. 生產環境的 MySQL 資料庫，要確保資料不會因為容器刪除而消失
> 3. 你要把一份 Nginx 設定檔掛進容器，方便隨時在主機上修改測試
> 4. 部署到客戶的伺服器上，你不確定客戶主機的目錄結構長什麼樣
>
> **答案：**
> 1. Bind Mount（你需要用 IDE 在專案目錄改 code）
> 2. Volume（生產環境用 Docker 管理，可攜、好備份）
> 3. Bind Mount（你要在主機上直接編輯那個檔案）
> 4. Volume（不依賴主機路徑，換台機器一樣能跑）

好，接下來我們直接用 MySQL 來做一次完整的對比實驗，親眼看到「沒有 Volume 資料就沒了」和「有 Volume 資料就還在」的差別。

---

## 三、MySQL 實戰對比（20 分鐘）

### 3.1 不用 Volume 啟動 MySQL（重現問題）

好，打開你的終端機，跟著我一起做。

第一步，我們先來重現問題——啟動一個**完全沒有 Volume** 的 MySQL 容器，看看資料會發生什麼事。

```bash
docker run -d \
  --name mysql-no-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=school \
  mysql:8.0
```

這行指令大家現在應該都看得懂了對不對？`-d` 背景執行、`--name` 取名字。重點是那兩個 `-e` 參數，這是用來設定環境變數的：

- `MYSQL_ROOT_PASSWORD`：MySQL root 使用者的密碼。**這個是必填的。** 如果你不設，容器會直接啟動失敗，等一下錯誤處理的部分會講到。
- `MYSQL_DATABASE`：告訴 Docker 在初始化的時候自動幫你建一個叫 `school` 的資料庫。這是選填的，但設了比較方便，省得我們自己進去 `CREATE DATABASE`。

注意看，這行指令裡面**沒有 `-v`**。沒有掛載任何 Volume，沒有掛載任何 Bind Mount。所有 MySQL 寫入的資料，全部都會存在容器的讀寫層裡面——就是我們剛才說的那張「便利貼」。

好，按 Enter 執行。

MySQL 第一次啟動需要做初始化，會花比較長的時間，大概 15 到 20 秒。怎麼知道它有沒有啟動完成呢？用 `docker logs -f mysql-no-volume` 看即時日誌，等看到這行字：

```
ready for connections. Version: '8.0.x'  socket: '/var/run/mysqld/mysqld.sock'
```

看到 `ready for connections` 就表示啟動完成了。按 `Ctrl+C` 退出日誌。

好，現在進去寫一些資料：

```bash
docker exec -it mysql-no-volume mysql -uroot -ptest123
```

這行大家昨天也用過了。`docker exec -it` 是進入一個正在運行的容器，後面的 `mysql -uroot -ptest123` 是在容器裡面執行 MySQL 客戶端指令。

進到 MySQL 命令列之後，我們建一張表、塞三筆資料：

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

好，三筆資料都在，完全沒問題。大家都看到一樣的結果了嗎？

輸入 `EXIT;` 離開 MySQL。

好，現在來做那個關鍵的動作——**我們要把這個容器刪掉，然後重新啟動一個一模一樣的容器。**

```bash
docker stop mysql-no-volume
docker rm mysql-no-volume
```

容器已經被刪了。現在重新啟動一個，用完全一樣的指令：

```bash
docker run -d \
  --name mysql-no-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=school \
  mysql:8.0
```

等 MySQL 啟動完成（一樣看 logs 確認），然後查資料：

```bash
docker exec -it mysql-no-volume mysql -uroot -ptest123 -e "SELECT * FROM school.students;"
```

結果：

```
ERROR 1146 (42S02): Table 'school.students' doesn't exist
```

**資料全部消失了。**

剛才寫入的三筆學生資料——小明、小華、小美——全部都不見了。為什麼？因為舊容器的讀寫層已經跟著 `docker rm` 一起被刪除了。新容器有一個全新的、乾淨的讀寫層，裡面什麼都沒有。雖然我們用的是同一個 Image、同樣的參數、同樣的名字，但新容器就是新容器，跟舊容器沒有任何關係。

大家感受到了嗎？這就是沒有 Volume 的後果。在實際工作中，如果你的資料庫容器沒有掛 Volume，哪天你升級版本、或者容器意外崩潰被重啟，資料就全沒了。客戶的資料、交易記錄、使用者帳號，全部歸零。這不是開玩笑的。

好，先清掉這個容器：

```bash
docker stop mysql-no-volume && docker rm mysql-no-volume
```

### 3.2 用 Named Volume 啟動 MySQL（正確做法）

好，接下來我們用正確的方式來做。

**第一步，建立一個 Volume：**

```bash
docker volume create mysql-school-data
```

執行完，Docker 就在主機上建好了一個叫 `mysql-school-data` 的 Volume。

**第二步，啟動 MySQL，掛載這個 Volume：**

```bash
docker run -d \
  --name mysql-with-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -e MYSQL_DATABASE=school \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0
```

跟剛才比，多了什麼？兩個參數：

- `-v mysql-school-data:/var/lib/mysql`：這是關鍵！把我們剛建的 `mysql-school-data` Volume 掛載到容器裡面的 `/var/lib/mysql`。而 `/var/lib/mysql` 正好就是 MySQL 存放所有資料檔案的目錄——資料表、索引、交易日誌，全部都在這裡。所以現在 MySQL 寫入的資料，不是寫在容器的讀寫層了，而是寫在 Volume 裡面。
- `-p 3306:3306`：把容器的 3306 port 暴露出來。這不是 Volume 相關的，只是方便我們之後用 GUI 工具連線。

等 MySQL 啟動完成，寫入資料。這次我們多塞幾筆：

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

好，五筆資料都在。輸入 `EXIT;` 離開。

### 3.3 刪容器、重建、驗證資料

好，見證奇蹟的時刻到了。**我們要把這個容器刪掉。**

```bash
docker stop mysql-with-volume
docker rm mysql-with-volume
```

容器已經被刪了。跟剛才一模一樣的操作對不對？

但是——Volume 還在不在呢？我們來看：

```bash
docker volume ls
```

```
DRIVER    VOLUME NAME
local     mysql-school-data
```

**Volume 還在！** 因為 Volume 的生命週期是獨立於容器的。你刪容器，不會影響到 Volume。就像你撕掉便利貼，筆記本上的內容不會受到任何影響。

好，現在我們用同一個 Volume，建一個全新的容器：

```bash
docker run -d \
  --name mysql-with-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0
```

這裡注意一個小地方：我**不需要**再設 `-e MYSQL_DATABASE=school`。為什麼？因為 `school` 這個資料庫已經存在 Volume 裡面了，不需要再建一次。如果你加了也不會出錯，Docker 會發現資料庫已經存在就跳過，但嚴格來說是不需要的。

等 MySQL 啟動完成，查資料：

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

**五筆資料全部都在！一筆都沒少！**

容器刪了又重建，資料完完全全沒有受到影響。前面沒有 Volume 的時候，容器一刪資料就沒了。現在有了 Volume，容器怎麼刪怎麼建，資料穩穩地待在 Volume 裡面。

大家有沒有感覺到差別？這就是 Volume 的核心價值。

### 3.4 用 inspect 查看掛載狀態

好，接下來教大家一個非常實用的技巧。

剛才這個容器是我們自己建的，我們當然知道有掛 Volume。但如果是接手別人的容器呢？或者是一個跑了半年的容器，你想確認它的資料到底有沒有做持久化？

這時候就要用 `docker inspect`。

```bash
docker inspect mysql-with-volume --format '{{json .Mounts}}' | python3 -m json.tool
```

這行指令的意思是：查看這個容器的掛載資訊。`--format '{{json .Mounts}}'` 是只抓 Mounts 這一段出來（不然 `docker inspect` 輸出超長，你找不到重點），後面 `python3 -m json.tool` 是把 JSON 格式化，讓輸出比較好讀。

輸出會長這樣：

```json
[
    {
        "Type": "volume",
        "Name": "mysql-school-data",
        "Source": "/var/lib/docker/volumes/mysql-school-data/_data",
        "Destination": "/var/lib/mysql",
        "Driver": "local",
        "Mode": "z",
        "RW": true,
        "Propagation": ""
    }
]
```

每個欄位的意思我來說明一下：

- **Type**：掛載類型。`volume` 就是 Volume，`bind` 就是 Bind Mount。這是最重要的欄位，一看就知道是什麼類型的掛載
- **Name**：Volume 的名稱。如果是 Bind Mount，這裡會是空的
- **Source**：資料在主機上的實際路徑。Volume 的話就是 `/var/lib/docker/volumes/<卷名>/_data`
- **Destination**：容器內的掛載目錄。這裡是 `/var/lib/mysql`，就是 MySQL 存資料的地方
- **RW**：讀寫權限。`true` 表示可讀可寫，`false` 表示唯讀

**這個技巧一定要記住。** 以後你接手別人的容器、或者排查問題的時候，第一件事就是 `docker inspect` 看 Mounts。如果 Mounts 陣列是空的 `[]`，那就表示這個容器沒有掛載任何 Volume 或 Bind Mount——所有資料都存在讀寫層，非常危險。

我們也可以直接看 Volume 本身的資訊：

```bash
docker volume inspect mysql-school-data
```

```json
[
    {
        "CreatedAt": "2026-03-17T10:30:00Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/mysql-school-data/_data",
        "Name": "mysql-school-data",
        "Options": {},
        "Scope": "local"
    }
]
```

這裡最重要的欄位是 **Mountpoint**——它告訴你 Volume 的資料實際存在主機的哪個目錄。在 Linux 上就是 `/var/lib/docker/volumes/mysql-school-data/_data`。

但是注意！如果你用的是 Docker Desktop（Mac 或 Windows），這個路徑是在 Docker 的虛擬機裡面，你在主機上直接 `cd` 到這個路徑是找不到的。這也是為什麼 Volume 應該透過 Docker 的指令來操作，不要直接去碰底層的檔案系統。

### 3.5 升級 MySQL 版本但保留資料

好，再來做一個更實際的場景——MySQL 版本升級。

在實際工作中，你一定會遇到要升級資料庫版本的情況。如果沒有 Volume，升級就意味著要先把資料匯出來、刪掉舊容器、啟動新版本容器、再把資料灌回去。很麻煩而且容易出錯。

但有了 Volume，升級變得超級簡單。看好了：

```bash
docker stop mysql-with-volume
docker rm mysql-with-volume
```

**只改 Image 版本，Volume 完全不動：**

```bash
docker run -d \
  --name mysql-with-volume \
  -e MYSQL_ROOT_PASSWORD=test123 \
  -v mysql-school-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.4
```

整個指令跟剛才一模一樣，唯一的差別就是最後一行從 `mysql:8.0` 變成了 `mysql:8.4`。Volume 名稱不變、掛載路徑不變。

MySQL 8.4 啟動的時候，它會偵測到 `/var/lib/mysql` 裡面有 8.0 版本的資料檔案，然後自動執行資料升級程序。這個過程可能比平常多花個十幾秒，但完成之後一切正常。

等啟動完成，來驗證：

```bash
docker exec -it mysql-with-volume mysql -uroot -ptest123 -e "SELECT * FROM school.students;"
```

五筆資料全部都在。再確認一下版本有沒有真的升上去：

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

資料完整保留，版本也確實升級了。

這就是 Volume 讓升級變安全的原因——你的資料在 Volume 裡，容器只是一個可以隨時拋棄的執行環境。升級就是換一個新版本的容器，掛上同一個 Volume，搞定。

**但是要注意一件事！** 不是所有版本升級都這麼順利。小版本升級（像 8.0→8.4）通常沒問題，但大版本跳躍（像 5.7→8.0）可能會有不相容的地方。所以在做版本升級之前，一定要：

1. **先備份！** 不管什麼升級，先用 `mysqldump` 做一個完整備份
2. 在測試環境先跑一次，確認沒問題
3. 再到生產環境操作

這是鐵律，不能省。

### 3.6 常見錯誤處理

做 MySQL 容器的時候，有幾個常見的坑，我先幫大家踩過，省得你們等一下自己練習的時候卡住。

**錯誤一：忘記設 MYSQL_ROOT_PASSWORD**

這是最常見的。你興高采烈地打了：

```bash
docker run -d --name mysql mysql:8.0
```

結果容器啟動失敗。用 `docker logs mysql` 查看錯誤：

```
error: database is uninitialized and password option is not specified
  You need to specify one of the following as an environment variable:
  - MYSQL_ROOT_PASSWORD
  - MYSQL_ALLOW_EMPTY_PASSWORD
  - MYSQL_RANDOM_ROOT_PASSWORD
```

錯誤訊息寫得很清楚——你沒設密碼。MySQL 容器要求你必須設定 root 密碼才能啟動，這是安全考量。

解決方法：加上 `-e MYSQL_ROOT_PASSWORD=你的密碼`。

**錯誤二：容器還沒啟動完就嘗試連線**

MySQL 第一次啟動需要做初始化，可能要 15 到 30 秒。如果容器剛跑起來你就 `docker exec` 進去，可能會遇到「連線被拒絕」或者「MySQL is initializing」的錯誤。

解決方法：用 `docker logs -f mysql-with-volume` 看即時日誌，等看到 `ready for connections` 這行字再操作。不要急，等它初始化完。

**錯誤三：Port 已被佔用**

```
Error response from daemon: Ports are not available: exposing port TCP 0.0.0.0:3306 -> 0.0.0.0:0: listen tcp 0.0.0.0:3306: bind: address already in use
```

這個錯誤表示主機的 3306 port 已經被其他程式佔了。可能是你本機安裝的 MySQL，也可能是另一個正在跑的 Docker 容器。

解決方法：換一個 port，比如 `-p 3307:3306`。這樣主機的 3307 會對應到容器內的 3306。連線的時候用 3307 就行了。

**錯誤四：密碼裡面有特殊字元**

如果你的密碼包含 `$`、`!`、`&` 這些在 bash 裡面有特殊意義的字元，一定要用**單引號**把密碼包起來：

```bash
docker run -d -e MYSQL_ROOT_PASSWORD='my$ecr&t!' mysql:8.0
```

如果你用雙引號，bash 會嘗試展開 `$ecr` 變成一個環境變數（通常是空的），你的密碼就不對了。這是 bash 的行為，不是 Docker 的問題，但很多人在這裡被坑過。

---

## 四、具名掛載 vs 匿名掛載 + Volume 管理（10 分鐘）

### 4.1 Named Volume vs Anonymous Volume

好，前面我們用 MySQL 做完了實戰對比，大家應該已經實際感受到 Volume 的威力了。接下來要講一個很重要的觀念——**具名掛載和匿名掛載的差別**。

什麼是 **Named Volume（具名卷）**？就是你在建立或使用的時候，有給它一個名字：

```bash
# 先建好再用
docker volume create mysql-data
docker run -v mysql-data:/var/lib/mysql mysql:8.0

# 或者直接用名字（不存在的話 Docker 會自動建立）
docker run -v mysql-data:/var/lib/mysql mysql:8.0
```

那什麼是 **Anonymous Volume（匿名卷）**？就是你只寫了容器內的路徑，沒有給 Volume 名字：

```bash
docker run -v /var/lib/mysql mysql:8.0
```

注意看，`-v` 後面直接就是容器內路徑 `/var/lib/mysql`，沒有冒號、沒有左邊的名稱。這時候 Docker 會自動建立一個 Volume，但它的名字是一串隨機的長雜湊字串。

我們來看看差異。用 `docker volume ls` 列出所有 Volume：

```bash
docker volume ls
```

```
DRIVER    VOLUME NAME
local     a3b4c5d6e7f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a1b2c3d4e5f6a7b8
local     mysql-data
```

看到了嗎？一個是一長串亂碼，一個是有意義的名字。你現在看這兩個，可能還記得哪個是哪個。但三個月後你回來看呢？你知道 `a3b4c5d6e7f8...` 是幹嘛的嗎？是哪個服務的？存了什麼資料？肯定不知道。

**所以，永遠用 Named Volume。** 每個 Volume 都要有一個描述性的名字。這不只是為了好看，更是為了可維護性。你的同事看到 `mysql-prod-data`，立刻知道是什麼。看到一串亂碼？只能猜。

### 4.2 用 inspect 對比具名和匿名

我們來用 `docker volume inspect` 看看這兩種 Volume 的差異。

具名 Volume：

```bash
docker volume inspect mysql-data
```

```json
[
    {
        "Mountpoint": "/var/lib/docker/volumes/mysql-data/_data",
        "Name": "mysql-data"
    }
]
```

路徑是 `/var/lib/docker/volumes/mysql-data/_data`。清清楚楚、一看就知道。

匿名 Volume：

```bash
docker volume inspect a3b4c5d6e7f8a1b2c3d4e5f6a7b8c9d0...
```

```json
[
    {
        "Mountpoint": "/var/lib/docker/volumes/a3b4c5d6e7f8.../_data",
        "Name": "a3b4c5d6e7f8a1b2c3d4e5f6a7b8c9d0..."
    }
]
```

路徑也是一串亂碼。你根本不知道這是什麼服務的資料。等你要清理磁碟空間的時候，面對十幾個亂碼 Volume，你也不敢隨便刪，因為搞不好裡面有重要資料。

### 4.3 命名慣例

Volume 怎麼取名？建議用 `<服務>-<用途>` 或 `<服務>-<環境>-<用途>` 的格式：

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

一看就知道是什麼服務、存的是什麼資料。以後團隊裡其他人接手，也能立刻看懂。

### 4.4 Volume 管理指令

Volume 有一整套管理指令，我們來逐個操作。

**建立 Volume：**

```bash
docker volume create mydata
```

輸出就是 Volume 名稱：`mydata`。

**列出所有 Volume：**

```bash
docker volume ls
```

```
DRIVER    VOLUME NAME
local     mydata
local     mysql-school-data
```

`DRIVER` 欄位顯示 `local`，表示用的是本地儲存。Docker 也支援第三方 Volume Driver，比如可以把資料存到 NFS、AWS EBS 等等。但一般情況，`local` 就夠了。

如果你之前做了很多練習，可能會看到一堆 Volume，有些名字是你取的，有些是一長串亂碼。那些亂碼就是匿名 Volume。

**查看 Volume 詳細資訊：**

```bash
docker volume inspect mydata
```

```json
[
    {
        "CreatedAt": "2026-03-17T10:30:00Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/mydata/_data",
        "Name": "mydata",
        "Options": {},
        "Scope": "local"
    }
]
```

重點欄位：
- **Mountpoint**：資料實際存放的主機路徑
- **CreatedAt**：建立時間
- **Driver**：儲存驅動程式

**刪除 Volume：**

```bash
docker volume rm mydata
```

這裡注意：如果有容器正在使用這個 Volume，指令會失敗：

```
Error response from daemon: remove mydata: volume is in use - [abc123def456]
```

這是 Docker 的保護機制，防止你誤刪正在使用中的 Volume。要先停掉並刪除使用它的容器，才能刪 Volume。

**清理未使用的 Volume（⚠️ 危險指令！）：**

```bash
docker volume prune
```

```
WARNING! This will remove all local volumes not used by at least one container.
Are you sure you want to continue? [y/N]
```

**這個指令我要特別特別強調——非常危險！**

為什麼？因為「沒有被任何容器使用」不等於「不重要」。

想像這個場景：你有一個 MySQL 容器用了 `mysql-prod-data` 這個 Volume，裡面存了重要的生產資料。有一天你把容器停掉了，準備升級版本。你刪掉了舊容器，正準備啟動新容器的時候——你的同事在旁邊跑了一句 `docker volume prune`。

在那個時刻，`mysql-prod-data` 確實沒有被任何容器使用（舊容器已刪，新容器還沒建），prune 就會把它清掉。資料全部消失。

更可怕的是 `docker system prune -a --volumes`——這個大殺器會把 Image、Container、Volume 全部清掉。我聽過有人在生產伺服器上不小心執行了這個，把正在維護期間暫停的三個資料庫 Volume 全部刪了。

**所以我的建議是：**

1. **生產環境永遠不要用 `docker volume prune`**
2. 要刪就用 `docker volume rm <name>` 一個一個指定著刪，確認清楚再刪
3. 刪之前先 `docker volume ls` 看看有哪些，搞清楚每個是什麼

### 4.5 Dockerfile 裡的 VOLUME 陷阱

順便講一個很多人不知道的事情。

很多 Docker Image 的 Dockerfile 裡面寫了 `VOLUME` 指令。比如 MySQL 官方的 Dockerfile 裡有這麼一行：`VOLUME /var/lib/mysql`。

這代表什麼？代表就算你在 `docker run` 的時候完全沒有指定 `-v`，Docker 也會自動幫你建一個**匿名 Volume** 來掛載 `/var/lib/mysql`。

聽起來好像很貼心對不對？Docker 幫你保護了資料？

其實不然。因為它建的是**匿名 Volume**——一串亂碼、難以辨識、prune 的時候容易被誤刪。你甚至不知道它的存在，直到有一天你 `docker volume ls` 才發現一堆不知名的 Volume 佔滿了你的磁碟。

**所以不要依賴 Dockerfile 裡的 VOLUME 指令。永遠自己明確地用 Named Volume 掛載。** 這樣你才能完全掌控你的資料在哪裡、叫什麼名字、什麼時候該備份。

### 4.6 掛載權限：ro 和 rw

最後講一個擴充知識。掛載的時候，可以在冒號後面再加一個參數來控制讀寫權限：

```bash
# 唯讀掛載（容器只能讀，不能寫）
docker run -v my-data:/data:ro nginx:alpine

# 可讀可寫（預設值，不加就是 rw）
docker run -v my-data:/data:rw nginx:alpine
```

- **ro（read-only）**：容器內的程式無法修改這個目錄裡的任何檔案。只能從主機端或其他容器去改
- **rw（read-write）**：預設值，容器可以正常讀寫

一旦設了 `:ro`，容器裡的程式如果嘗試寫入這個目錄，會直接被作業系統拒絕。這是一個很好的安全機制，生產環境裡經常會用到。

什麼時候該用 `:ro`？原則很簡單——**容器只需要「讀」的東西，一律掛 `:ro`。** 舉幾個實際的例子：

**掛載 Nginx 設定檔：**

```bash
docker run -v ./nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine
```

Nginx 只需要讀取設定檔，不該有權限去修改它。如果容器被入侵了，攻擊者也改不了你的設定。

**掛載應用程式的環境設定：**

```bash
docker run -v ./config.yaml:/app/config.yaml:ro myapp
```

萬一應用程式有 bug 或被入侵，它也沒辦法寫入你的設定檔。

**掛載 TLS 憑證和私鑰：**

```bash
docker run \
  -v /etc/ssl/certs/server.crt:/certs/server.crt:ro \
  -v /etc/ssl/private/server.key:/certs/server.key:ro \
  myapp
```

憑證和私鑰是極度敏感的東西，絕對不能被容器內的程式修改。

這就是 `:ro` 的價值——就算容器被打穿了，攻擊者也動不了這些關鍵檔案。在生產環境，設定檔、憑證、靜態資源這些東西，都應該用 `:ro` 掛載。

---

## 五、`--mount` 語法 vs `-v` 語法（5 分鐘）

### 5.1 為什麼有兩種語法

前面我們一直在用 `-v` 來掛載 Volume。其實 Docker 還有另一種語法叫做 `--mount`，而且**官方更推薦用 `--mount`**。那為什麼我前面先教 `-v`？因為 `-v` 比較短、比較直覺，練習的時候方便。但你一定要知道 `--mount` 怎麼寫，因為正式環境和 Docker 文件裡面用的幾乎都是 `--mount`。

我們來對比一下：

**`-v` 語法：**

```bash
# Volume 掛載
docker run -v my-data:/data nginx:alpine

# Bind Mount 掛載
docker run -v /host/path:/container/path nginx:alpine

# 唯讀掛載
docker run -v my-data:/data:ro nginx:alpine
```

格式是用冒號分隔的三段：`來源:目標:選項`。簡短、快速，但容易搞混 Volume 和 Bind Mount。

**`--mount` 語法：**

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

`--mount` 用 key=value 的格式，每個參數的意思都寫得清清楚楚。你一看就知道 `type=volume` 是 Volume、`type=bind` 是 Bind Mount，不會搞混。

### 5.2 關鍵差異

兩種語法有一個非常重要的行為差異：

| 比較項目 | `-v` / `--volume` | `--mount` |
|---------|-------------------|-----------|
| **語法風格** | 簡短，冒號分隔 | key=value，明確 |
| **可讀性** | 短但容易搞混 | 長但一目瞭然 |
| **來源不存在時** | **自動建立空目錄** | **直接報錯** |
| **支援 tmpfs** | 有限 | 完整支援 |
| **官方推薦** | 可以用 | **推薦** |

這裡最重要的是第三點——**當你掛載的來源不存在時，行為完全不同。**

用 `-v` 的話，如果你寫的路徑不存在，Docker 會默默地幫你建一個空目錄。你的容器跑起來了，但掛載的目錄是空的，你可能 debug 半天才發現是路徑打錯了。

用 `--mount` 的話，Docker 會直接報錯告訴你：「這個路徑不存在！」一秒鐘就知道問題在哪。

**我的建議：平常練習、快速操作用 `-v`。正式的 Docker Compose 檔案或生產環境用 `--mount`。**

---

## 六、多容器共用 Volume（5 分鐘）

### 6.1 為什麼需要共用

在實際的系統架構中，經常會有多個容器需要存取同一份資料的情況。比如：

- 一個 Nginx 容器負責提供靜態檔案，一個應用容器負責產生這些檔案
- 多個應用容器共用同一份設定檔
- 一個容器寫日誌，另一個容器負責收集和分析日誌

Volume 天生就支援被多個容器同時掛載。我們來實際做一下。

### 6.2 實作：兩個容器共享同一個 Volume

**建立一個共用的 Volume：**

```bash
docker volume create shared-data
```

**啟動第一個容器（寫入者）——用 BusyBox 每秒寫一行日誌：**

```bash
docker run -d \
  --name writer \
  -v shared-data:/data \
  busybox \
  sh -c 'while true; do date >> /data/log.txt; sleep 1; done'
```

這個容器很簡單：每秒鐘把當前時間寫到 `/data/log.txt`。而 `/data` 掛載的是 `shared-data` Volume。

**啟動第二個容器（讀取者）——讀取同一個 Volume 的內容：**

```bash
docker run -it --rm \
  --name reader \
  -v shared-data:/data:ro \
  busybox \
  tail -f /data/log.txt
```

注意這裡我們用了 `:ro`（唯讀），因為 reader 只需要讀、不需要寫。

你會看到即時的輸出：

```
Mon Mar 17 10:30:01 UTC 2026
Mon Mar 17 10:30:02 UTC 2026
Mon Mar 17 10:30:03 UTC 2026
...
```

**兩個完全獨立的容器，透過同一個 Volume 共享資料。** writer 寫入的東西，reader 立刻就能讀到。

按 `Ctrl+C` 退出 reader，然後清掉 writer：

```bash
docker stop writer && docker rm writer
```

這個模式在後面學 Docker Compose 的時候會大量用到——多個服務之間透過 Volume 共享資料，是微服務架構裡面非常常見的設計模式。

---

## 七、Volume 備份與還原（5 分鐘）

### 7.1 有 Volume 不代表不需要備份

前面我們說了，Volume 可以讓資料不隨容器消失。但這不代表 Volume 裡的資料就是絕對安全的。

Volume 還是存在主機的硬碟上。如果硬碟壞了呢？如果有人不小心 `docker volume rm` 了呢？如果有人執行了 `docker volume prune` 呢？

**所以，備份是必須的。有 Volume 不代表不需要備份。** 這是這堂課最後一個重要觀念。

### 7.2 資料庫專用備份（推薦）

對資料庫來說，最好的備份方式是用資料庫自帶的備份工具。因為這些工具會正確處理交易一致性——如果你在資料庫正在寫入的時候直接複製檔案，可能會拿到不完整的資料。

**MySQL 備份：**

```bash
# 備份整個資料庫到主機上的 SQL 檔案
docker exec mysql-with-volume \
  mysqldump -uroot -ptest123 school > school-backup.sql
```

這行指令在容器裡面執行 `mysqldump`，把 `school` 資料庫匯出成 SQL 文字檔，存到你主機的當前目錄。

**MySQL 還原：**

```bash
docker exec -i mysql-with-volume \
  mysql -uroot -ptest123 school < school-backup.sql
```

注意還原的時候用的是 `-i`（不是 `-it`），因為我們是把檔案的內容透過 stdin 灌進去。

資料庫工具備份的好處很多：

- **資料一致性**：正確處理交易，不會有截斷的問題
- **人類可讀**：產生的是 SQL 文字檔，用編輯器就能打開看
- **跨版本還原**：5.7 的 dump 可以還原到 8.0
- **選擇性還原**：可以只還原某張表

### 7.3 通用方法：臨時容器 + tar

如果你想備份整個 Volume（不只是資料庫，而是 Volume 裡面的所有檔案），可以用一個臨時容器加上 `tar` 來做：

**備份：**

```bash
docker run --rm \
  -v mysql-school-data:/source:ro \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/mysql-school-data-backup.tar.gz -C /source .
```

這行看起來有點長，我來拆解一下：

- `docker run --rm`：啟動一個臨時容器，用完自動刪除
- `-v mysql-school-data:/source:ro`：把要備份的 Volume 掛進來，設成唯讀避免意外修改
- `-v $(pwd):/backup`：把主機的當前目錄掛進來，備份檔案會存在這
- `alpine`：用最小的 Alpine Linux Image，因為我們只需要 `tar` 指令
- `tar czf ...`：把 `/source`（就是 Volume 的內容）壓縮成 tar.gz

執行完，你的當前目錄就會多一個 `mysql-school-data-backup.tar.gz`。

**還原：**

```bash
docker run --rm \
  -v mysql-school-data:/target \
  -v $(pwd):/backup \
  alpine \
  sh -c "cd /target && tar xzf /backup/mysql-school-data-backup.tar.gz"
```

反過來的操作——把壓縮檔解壓回 Volume。

### 7.4 備份的基本原則

1. **自動化**：不要依賴手動備份，用 cron job 定期執行
2. **異地儲存**：備份不要只存在同一台機器，傳到 S3、GCS、或另一台伺服器
3. **定期測試還原**：備份有了不代表能還原，定期拿備份做還原測試
4. **檔名加日期**：例如 `mysql-school-data-2026-03-17.tar.gz`

---

## 八、本堂課小結（5 分鐘）

好，我們來快速回顧一下這堂課學了什麼。

### 核心概念

一句話：**容器的資料是暫時的。** R/W Layer 隨著 `docker rm` 消失，重要的資料一定要用 Volume 來保存。

### 三種掛載方式

| 類型 | 何時使用 | 一句話記憶 |
|------|---------|-----------|
| **Volume** | 生產環境持久化 | Docker 幫你管的倉庫 |
| **Bind Mount** | 開發環境即時同步 | 你家目錄直連容器 |
| **tmpfs** | 敏感資料暫存 | 便條紙，關機就沒 |

### 關鍵指令

```bash
# Volume 生命週期管理
docker volume create <name>     # 建立
docker volume ls                # 列出
docker volume inspect <name>    # 查看詳情（Mountpoint）
docker volume rm <name>         # 刪除（安全）
docker volume prune             # 清理（危險！生產禁用）

# 掛載語法
docker run -v <volume>:<path>           # Volume 掛載
docker run -v <volume>:<path>:ro        # Volume 唯讀掛載
docker run -v $(pwd)/dir:<path>         # Bind Mount 掛載

# 查看容器掛載狀態
docker inspect <container> --format '{{json .Mounts}}'
```

### 三件事一定要記住

1. **永遠用 Named Volume，不要用匿名 Volume**
2. **開發用 Bind Mount，生產用 Volume**
3. **接手別人的容器，先 `docker inspect` 看 Mounts**

今天學的 Volume，後面講 Docker Compose 的時候還會大量用到。到時候你會發現，Docker Compose 的 YAML 檔案裡面，volumes 的設定跟今天學的概念完全一樣，只是換了一個寫法而已。所以一定要確保你現在是真的理解了。

好的，這堂課就到這裡。下一堂課我們要講 Docker 網路——容器之間怎麼互相溝通。大家休息十分鐘，有問題趕快問，十分鐘後繼續！

---

## 板書 / PPT 建議

1. **容器儲存結構圖**：R/W Layer + Image Layers 堆疊圖，紅色標注「R/W Layer 隨容器刪除而消失」，Volume 用綠色箭頭從外部連接
2. **三種掛載方式一張表**：Volume / Bind Mount / tmpfs 對比
3. **MySQL 對比實驗流程圖**：左邊無 Volume → 資料消失（紅色叉叉），右邊有 Volume → 資料保留（綠色打勾）
4. **docker inspect 輸出重點**：標記 Type、Name、Source、Destination、RW 欄位
5. **Named vs Anonymous Volume 對比**：`mysql-prod-data`（打勾）vs 一串亂碼（打叉），搭配 `docker volume ls` 輸出
6. **Volume 管理指令速查表**：create / ls / inspect / rm / prune，prune 用紅色警告
7. **危險指令警告**：紅色大字 `docker volume prune`，標注「生產環境禁用」
