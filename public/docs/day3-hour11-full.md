# Day 3 第十一小時：Dockerfile 進階（Multi-stage、Best Practices、docker push）

---

## 一、開場與前情提要（3 分鐘）

好，各位同學，歡迎回來。

上堂課我們把 Dockerfile 的所有基本指令都走過一遍了——FROM、RUN、COPY、ADD、WORKDIR、ENV、ARG、EXPOSE、CMD、ENTRYPOINT、USER、VOLUME、HEALTHCHECK。然後我們還動手實作了一個 Python Flask 應用的 Docker 化，從寫 Dockerfile 到 docker build、docker run，完整走了一遍。

那堂課結束的時候，你們每個人手上都有一個可以跑的 Image。功能上完全沒問題，可以正常運作。

但是——我要講但是了——如果你把那個 Dockerfile 拿去面試，或是拿給公司裡的資深工程師看，他大概會跟你說一句話：「嗯，能跑，但不夠好。」

不夠好在哪裡？這就是今天這堂課要解決的事情。

今天是 Dockerfile 三部曲的第二堂。第一堂教你怎麼寫 Dockerfile，讓它能動。今天這堂教你怎麼把 Dockerfile 寫好，寫到生產環境的水準。第三堂我們會做一個完整的實戰專案，把所有東西串起來。

今天的課程大綱：

第一，.dockerignore——這個小東西很容易被忽略，但非常實用。第二，Dockerfile Best Practices——六七個重要的最佳實踐，包括怎麼善用快取、怎麼減少 Image 大小、怎麼提升安全性。第三，Multi-stage Build——這是今天的重頭戲，學完這個你的 Image 大小可以直接砍掉百分之九十。第四，docker push——怎麼把你做好的 Image 發佈到 Docker Hub 上讓別人用。第五，Image 大小優化的整體總結。

好，我們開始。

---

## 二、.dockerignore（5 分鐘）

### 2.1 Build Context 的陷阱

在講進階技巧之前，我們先處理一個看起來很小、但實際上非常重要的東西——.dockerignore。

同學們，還記得我們上堂課做 docker build 的時候，指令的最後面有一個小小的點嗎？

```bash
docker build -t my-flask-app .
```

這個點是什麼意思？對，它代表 Build Context。Docker 會把這個目錄底下的所有東西打包成一個 tar 檔案，然後整個送給 Docker Daemon。

注意，我說的是「所有東西」。

這件事情有多恐怖，讓我舉一個例子。假設你在做一個 Node.js 專案，你的專案目錄大概長這樣：

```
my-project/
├── src/                    （你的程式碼，大概 2 MB）
├── node_modules/           （依賴套件，300 MB）
├── .git/                   （版本控制歷史，150 MB）
├── test-reports/           （測試報告，50 MB）
├── .env                    （環境變數，裡面有資料庫密碼！）
├── package.json
├── package-lock.json
├── Dockerfile
└── README.md
```

你的原始碼才 2 MB，但整個目錄可能超過 500 MB。當你跑 docker build 的時候，這 500 MB 全部都要送給 Docker Daemon。

你們有沒有注意到，有時候跑 docker build 的第一行會顯示：

```
Sending build context to Docker daemon  512.4MB
```

然後你就在那邊等啊等啊等……這就是因為它在傳那些根本不需要的東西。

這裡有兩個問題。

第一個問題是**速度**。每次 build 都要傳幾百 MB，白白浪費時間。如果你是在 CI/CD 裡面跑的話，每次建置都多等一兩分鐘，累積起來非常可觀。

第二個問題更嚴重——**安全性**。如果你的 Dockerfile 裡面有一句 `COPY . .`，那你的 .env 檔案——裡面可能存著資料庫密碼、API Key、各種機密資訊——就會被複製進 Image 裡面。任何人只要拿到這個 Image，就能把這些機密資訊挖出來。我遇過真實案例，有家公司把 Image 推到 Docker Hub 的公開倉庫，結果裡面有 AWS 的 Access Key，被人拿去挖礦，一個月帳單多了幾萬美金。這是非常嚴重的安全事故。

怎麼解決？很簡單，用 .dockerignore。

### 2.2 .dockerignore 的語法

在你的專案根目錄——就是跟 Dockerfile 同一個目錄——建立一個叫做 `.dockerignore` 的檔案。它的語法跟 .gitignore 幾乎一模一樣，所以你應該很熟悉：

```bash
# .dockerignore

# 版本控制——.git 目錄可能有上百 MB，絕對不需要帶進去
.git
.gitignore

# 依賴套件——這些會在容器裡面重新安裝，不需要從外面帶進去
node_modules
__pycache__
*.pyc
.venv
venv

# 開發工具的設定
.vscode
.idea
*.swp
*.swo

# 機密資訊——這是最重要的！
.env
.env.local
.env.*.local

# 文件和測試——生產環境的 Image 不需要 README 和測試報告
*.md
docs/
tests/
coverage/
test-reports/

# Docker 相關的檔案——Dockerfile 自己不需要被複製進 Image
Dockerfile
docker-compose.yml
.dockerignore

# 系統檔案
.DS_Store
Thumbs.db

# 建置產物——如果有的話
dist/
build/
*.log
```

寫完這個檔案之後，你再跑 docker build，就會看到 Build Context 的大小從幾百 MB 降到幾 MB。效果是立竿見影的。

### 2.3 實際效果展示

讓我來展示一下差異。假設我有一個 Node.js 專案：

```bash
# 沒有 .dockerignore 的情況
$ docker build -t my-app .
Sending build context to Docker daemon  512.4MB
# 光是這一步就要等十幾秒

# 加上 .dockerignore 之後
$ docker build -t my-app .
Sending build context to Docker daemon  4.2MB
# 幾乎是瞬間完成
```

從 512 MB 降到 4 MB，差了一百多倍。這不是什麼高深的技術，就是一個檔案的事情，但效果非常顯著。

我的建議是：**每一個有 Dockerfile 的專案，都要配一個 .dockerignore。** 就像每個 Git 專案都要有 .gitignore 一樣，這是基本配備。養成這個習慣，你會省下很多不必要的等待時間，也避免不小心把機密資訊打包進 Image。

有同學可能會問：「老師，那 .env.example 要不要排除？」好問題。.env.example 通常只是一個範本，裡面沒有真正的密碼，只有變數名稱。這個看你的需求，如果你的應用程式啟動時會讀它作為預設值，就留著。如果不會用到，排除也無所謂。但 .env 本身一定要排除，這個沒有商量餘地。

還有一個常見的問題：「tests/ 排除掉了，那如果我要在 Docker 裡面跑測試呢？」答案是——你可以用不同的 .dockerignore，或者在 CI/CD 的某個階段單獨處理。生產用的 Image 排除 tests/，測試用的環境可以另外安排。又或者你用 Multi-stage Build，在建構階段把測試跑完，但測試檔案不帶進最終的生產 Image。等一下我們講 Multi-stage 的時候你就會懂了。

好，.dockerignore 就講到這裡。很簡單對不對？但是很多人寫了 Dockerfile 卻忘了寫 .dockerignore，非常可惜。

---

## 三、Dockerfile Best Practices（15 分鐘）

好，接下來我們進入 Dockerfile 的最佳實踐。我要講六個重點，每一個都是實戰中總結出來的經驗。

### 3.1 合併 RUN 指令，減少 Layer

上堂課我們講過，Dockerfile 裡面每一個指令——FROM、RUN、COPY、ADD——都會產生一個新的 Layer。Layer 越多，Image 越大，管理起來也越麻煩。

來看一個反面教材，我在初學者的 Dockerfile 裡面非常常看到這種寫法：

```dockerfile
# ❌ 菜鳥寫法：每一行一個 RUN
FROM ubuntu:22.04
RUN apt-get update
RUN apt-get install -y python3
RUN apt-get install -y python3-pip
RUN apt-get install -y curl
RUN apt-get install -y vim
RUN apt-get clean
```

六個 RUN，六個 Layer。

除了 Layer 多之外，這裡還有一個很隱蔽的 Bug。你們能看出來嗎？我給你們十秒鐘想一下。

好，時間到。

第一行 `apt-get update` 會更新套件清單，對吧？這個操作會被做成一個 Layer，然後被快取住。假設你過了一個星期，決定加裝一個新套件，你在第五行後面加了一行 `RUN apt-get install -y git`。然後重新 build。

Docker 看到前面幾行都沒有變化，就直接用快取——包括 `apt-get update` 那一層。但快取裡的套件清單已經是一星期前的了！然後新加的 `apt-get install -y git` 可能因為套件版本不匹配而安裝失敗。更隱蔽的情況是——安裝成功了，但裝的是舊版本，帶有已知的安全漏洞。

所以，`apt-get update` 和 `apt-get install` 一定要寫在同一個 RUN 裡面。

正確的寫法是用 `&&` 把相關的指令串在一起，用反斜線 `\` 換行保持可讀性：

```dockerfile
# ✅ 正確寫法：一個 RUN，一個 Layer
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    vim \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
```

這樣只有一個 RUN，一個 Layer。而且 `apt-get update` 和 `apt-get install` 在同一個 RUN 裡面，保證不會用到過期的套件清單。最後還順手清理了 apt 的快取，進一步縮小 Image。

你們有沒有注意到，我把套件名稱按照字母順序排列了？curl、python3、python3-pip、vim。這不是必須的，但它讓你一眼就能看出裝了哪些東西，以後要增刪套件也比較方便。就像你整理書架一樣，按字母排比亂丟好找多了。這是一個小小的程式碼可讀性技巧，寫 Dockerfile 也要注意可讀性。

### 3.2 善用 Build Cache——最重要的優化技巧

上一堂課學了 Build Cache 的核心口訣：**依賴先裝，程式碼後放。** 現在來看不同語言怎麼應用這個原則。

Python 版本：

```dockerfile
# ✅ Python 版本
FROM python:3.11-slim
WORKDIR /app

# 先複製依賴描述檔案
COPY requirements.txt .
# 先安裝依賴
RUN pip install --no-cache-dir -r requirements.txt

# 最後才複製原始碼
COPY . .
CMD ["python", "app.py"]
```

Java Maven 版本：

```dockerfile
# ✅ Java Maven 版本
FROM maven:3.9-eclipse-temurin-17
WORKDIR /app

# 先複製 pom.xml
COPY pom.xml .
# 先下載依賴
RUN mvn dependency:go-offline

# 最後才複製原始碼
COPY src ./src
RUN mvn package -DskipTests
```

Go 版本：

```dockerfile
# ✅ Go 版本
FROM golang:1.22-alpine
WORKDIR /app

# 先複製 go.mod 和 go.sum
COPY go.mod go.sum ./
# 先下載依賴
RUN go mod download

# 最後才複製原始碼
COPY . .
RUN go build -o main .
```

不管什麼語言，邏輯都一樣：先複製依賴描述檔，先安裝依賴，最後才複製原始碼。這樣你改程式碼的時候，依賴那幾層都能快取命中，build 只要幾秒鐘。

### 3.3 不要用 root 執行——安全性

第三個最佳實踐：不要用 root 身份執行你的應用程式。

預設情況下，Docker 容器裡面的程序是用 root 身份跑的。你可能會想：「反正都在容器裡面了，跟外面隔離了，root 又怎樣？」

讓我告訴你怎樣。

假設你的 Web 應用有一個漏洞——比如說 2021 年的 Log4j 那種核彈級的漏洞——攻擊者透過這個漏洞，在你的容器裡面拿到了一個 shell。如果你的程序是用 root 跑的，攻擊者拿到的就是 root 權限的 shell。

有了 root 權限，他可以在容器裡面做很多事情：用 apt-get 安裝掃描工具、掃描你的內網、嘗試容器逃逸。歷史上確實出現過好幾次容器逃逸的漏洞（比如 CVE-2019-5736），而 root 權限會讓逃逸攻擊的成功率大大提高。一旦逃逸成功，攻擊者就從容器裡面跳到了宿主機上，那就完蛋了。

所以，在生產環境裡，用 root 跑應用程式是不可接受的。正確的做法是建立一個非 root 使用者，然後切換到那個使用者來執行：

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# 先用 root 安裝套件（安裝需要 root 權限）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 建立非 root 使用者
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 設定檔案權限（讓 appuser 能讀取應用程式檔案）
RUN chown -R appuser:appuser /app

# 切換到非 root 使用者
USER appuser

CMD ["python", "app.py"]
```

注意這裡的順序非常重要——USER 指令要放在**所有需要 root 權限的操作之後**。因為 `apt-get install`、`pip install`、`groupadd`、`useradd`、`chown` 這些都需要 root 權限。所以我們的策略是：先用 root 把該裝的都裝好、該設定的都設好，最後才切換到普通使用者來跑應用程式。

如果你用的是 Alpine 系列的 Image，建立使用者的語法稍微不同：

```dockerfile
# Alpine 版本
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

這個差異是因為 Alpine 用的是 BusyBox 的 adduser/addgroup，不是 Debian 系的 useradd/groupadd。語法不一樣，但效果一樣。

有些官方 Image 已經內建了非 root 使用者。比如 `node:20-alpine` 就有一個叫 `node` 的使用者，你直接 `USER node` 就好了，不用自己建。這是一個小知識，但能幫你省幾行 Dockerfile。

在大公司裡面，不用 root 是強制要求。如果你的 Dockerfile 沒有 USER 指令，Code Review 是過不了的。安全團隊會直接退回來叫你改。這是 DevSecOps 的基本功。

### 3.4 清理暫存檔案——在同一個 RUN 裡面

安裝套件的時候，套件管理器會產生很多暫存檔案——下載的 .deb 安裝包、套件清單快取等等。如果你不清理，這些東西會留在 Image 裡，白白占空間。

```dockerfile
# ✅ 正確：在同一個 RUN 裡面安裝和清理
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
```

這裡有一個非常重要的觀念，很多初學者都會搞錯，你們聽好——**清理動作必須和安裝動作在同一個 RUN 裡面。**

如果你分開寫：

```dockerfile
# ❌ 這樣清理是沒有用的！
RUN apt-get update && apt-get install -y python3
RUN rm -rf /var/lib/apt/lists/*
```

為什麼沒用？因為 Docker Image 是由一層一層的 Layer 疊起來的。第一個 RUN 產生了一個 Layer，暫存檔案已經被寫進那個 Layer 了，它像化石一樣凝固在那裡了。第二個 RUN 雖然刪除了檔案，但只是在新的 Layer 裡面標記「這個檔案已刪除」。前面那個 Layer 裡面的檔案還是在那裡，還是占著空間。

我用一個比喻來解釋。你們有沒有用過修正液？就是那種白色的，可以塗掉寫錯的字。假設你在第一頁寫了一個錯字，然後在第二頁用修正液塗掉了——等等，你在第二頁塗？第一頁的錯字還是在那裡啊！你只是在新的一頁上面做了標記，但翻回第一頁，錯字清清楚楚。

Docker Layer 也是一樣。每一個 Layer 就像一頁紙。你在後面的 Layer 做的刪除操作，不會真的影響前面 Layer 裡的資料。所以你的 Image 大小不會減少。

那為什麼在同一個 RUN 裡面清理就有用？因為同一個 RUN 的所有操作都在同一個 Layer 裡面完成。暫存檔案產生之後馬上被刪除，等到這個 Layer 被「凝固」的時候，暫存檔案已經不存在了，不會被寫進去。

所以記住：**安裝和清理一定要寫在同一個 RUN 裡面。**

pip 也有類似的處理方式：

```dockerfile
# ✅ pip 安裝時不要快取
RUN pip install --no-cache-dir -r requirements.txt
```

`--no-cache-dir` 告訴 pip 不要把下載的套件快取起來。為什麼在 Docker 裡面不需要 pip 的下載快取？因為下次 build 的時候，快取是透過 Docker 的 Layer Cache 機制來處理的，不是靠 pip 自己的快取。加了這個選項，可以省下幾十 MB 的空間。

npm 也可以清理：

```dockerfile
RUN npm ci && npm cache clean --force
```

### 3.5 使用具體的版本號——可重現性

前面講過 `latest` 陷阱和 alpine/slim 的選擇，這裡再強調一次：**永遠在 FROM 裡指定具體版本**（如 `python:3.11-slim`），確保可重現性。大部分情況下 slim 是最佳選擇。

### 3.6 每個容器只跑一個程序

最後一個原則，也是容器化設計的核心哲學：**一個容器只做一件事。**

不要在一個容器裡面同時跑 Web Server 加資料庫加 Redis 加排程器。應該是四個容器：一個跑 Web Server，一個跑資料庫，一個跑 Redis，一個跑排程器。它們之間透過 Docker Network 溝通。

為什麼要這樣做？我給你三個理由。

第一，**彈性擴展**。你的 Web Server 撐不住了，多開兩個 Web 容器做負載均衡就好，資料庫不用動。如果全部擠在一個容器裡，你沒辦法只擴展其中一個服務。你要擴展 Web Server，就得連資料庫也一起複製一份？那資料怎麼同步？馬上就亂套了。

第二，**獨立維護**。升級 Redis 版本，不影響 Web Server。重啟 Web Server 修 Bug，Redis 的連線不會斷。如果什麼都擠在一起，牽一髮動全身。

第三，**日誌清晰**。每個容器的 stdout/stderr 只有一個程序的輸出。你要看 Web Server 的日誌就看 Web 容器，要看資料庫的日誌就看資料庫容器。如果全部混在一起，你從一坨日誌裡面找某個程序的錯誤訊息，就像在垃圾堆裡面找戒指一樣痛苦。

這個原則跟微服務的理念是一致的。Docker 天生就是為了跑微服務而設計的，一個容器一個服務，然後用 Docker Compose 或 Kubernetes 來做編排管理。後面的課程我們會詳細講 Docker Compose 和 Docker Network。

好，Best Practices 就講這六個。讓我快速總結一下：

1. **合併 RUN** 指令，減少 Layer
2. **善用 Build Cache**：依賴先裝，程式碼後放
3. **不要用 root**：建立非 root 使用者
4. **清理暫存檔案**：跟安裝寫在同一個 RUN
5. **使用具體版本號**：不要用 latest
6. **一個容器一個程序**

這六條如果你都做到了，你的 Dockerfile 就已經比市面上百分之八十的 Dockerfile 還要專業了。

---

## 四、Multi-stage Build（20 分鐘）——本堂重點

### 4.1 問題引入：你的 Image 太肥了

好，接下來要講今天的重頭戲——Multi-stage Build，多階段建構。

在開始之前，我想問大家一個問題。假設你用 Node.js 開發了一個前端網站，打包成 Docker Image 之後，你猜 Image 有多大？

你們上堂課打包 Flask 應用，Image 大概兩三百 MB 對不對？那個算小的了。如果是 Node.js 專案，用預設的 `node:20` 當 Base Image，裝完 node_modules，整個 Image 輕輕鬆鬆超過 1 GB。

1 GB。一個前端網站的 Docker Image，1 GB。

你覺得這合理嗎？

一個前端網站 build 出來的東西是什麼？HTML、CSS、JavaScript 檔案，全部加起來可能 5 MB。但 Image 有 1 GB。剩下的 995 MB 是什麼？是 Node.js 運行環境、npm、node_modules、原始碼——這些東西在生產環境裡根本用不到。

想像一下，你有 10 台伺服器要部署這個 Image。1 GB 乘以 10，就是 10 GB 的網路流量。如果你的 CI/CD 每天 build 十次、部署十次，一天就是 100 GB。如果你用的是雲端的 Container Registry，那個流量費用會讓你的老闆非常不開心。

更重要的是，Image 越大，裡面的東西越多，攻擊面就越大。如果你的 Image 裡面有 gcc 編譯器、有 make、有 wget、有各種開發工具——這些東西在運行時根本用不到，但如果攻擊者進到了容器裡，這些工具就成了他的武器庫。

所以，我們需要讓 Image 盡可能地小。而 Multi-stage Build 就是最有效的手段。

### 4.2 核心概念：建構時需要的 ≠ 運行時需要的

讓我用一個生活中的比喻來解釋 Multi-stage Build 的核心概念。

你們有沒有看過房子怎麼蓋的？蓋房子的時候，工地上有什麼？鷹架、起重機、水泥攪拌機、一大堆工具和建材。這些東西在施工過程中是必需的，少一個都不行。

但是，房子蓋好之後呢？你搬進去住的時候，你會把鷹架留在客廳嗎？你會把水泥攪拌機放在廚房嗎？你會把起重機停在車庫嗎？

當然不會。房子蓋好之後，你只需要房子本身，施工用的所有工具和材料全部撤走。你住的是乾乾淨淨的房子，不是工地。

Docker Image 也是一樣的道理。

**建構時需要的東西（施工工具）：**
- 編譯器（gcc、javac、Go compiler、TypeScript compiler）
- 套件管理器（npm、pip、maven、gradle）
- 開發用的函式庫（-dev 套件、header files）
- 建構工具（webpack、vite、babel）
- 原始碼本身

**運行時需要的東西（你住的房子）：**
- 編譯好的執行檔，或打包好的靜態檔案
- 運行時依賴（JRE、動態函式庫）
- 設定檔

這兩組東西的差異非常大。以 Go 語言為例，Go 的編譯器加上標準函式庫大概有 500-600 MB，但編譯出來的二進位檔可能只有 5-10 MB。你只需要那個 5 MB 的執行檔，但傳統做法會把整個 600 MB 的 Go 開發環境都帶進最終的 Image。那 600 MB 就是「留在客廳裡的鷹架」。

Multi-stage Build 就是讓你把「蓋房子」和「住房子」分成兩個階段。在第一個階段用全套的施工工具來建構；在第二個階段，只把蓋好的成品搬進一個全新的、乾淨的環境裡。

### 4.3 語法介紹

語法其實非常簡單。一個 Dockerfile 裡面可以有多個 `FROM`，每個 `FROM` 開啟一個新的階段。你可以用 `AS` 給每個階段取一個名字。然後在後面的階段裡，用 `COPY --from=` 從前面的階段複製檔案。

```dockerfile
# ========== 階段一：建構（施工階段）==========
FROM <build-image> AS builder
# ... 在這裡做建構（安裝依賴、編譯、打包） ...

# ========== 階段二：運行（入住階段）==========
FROM <runtime-image>
# 從建構階段只複製需要的成品
COPY --from=builder /path/to/artifact /destination
# ... 設定運行時配置 ...
```

關鍵：**最終的 Image 只包含最後一個 `FROM` 階段的內容。** 前面的階段只是暫時用的，build 完就丟掉了。它們不會出現在最終的 Image 裡面。

好，理論講完了，我們來看三個實際的例子。這三個例子涵蓋三種不同類型的語言，讓你們感受一下 Multi-stage Build 在不同場景下的威力。

### 4.4 範例一：Node.js 前端應用

第一個例子是最常見的場景——Node.js 前端應用，比如 React 或 Vue 專案。

先想一下前端專案的 build 流程：

1. `npm install`——安裝依賴（包括 webpack、babel、TypeScript 等建構工具）
2. `npm run build`——打包，產出 dist/ 目錄

build 完之後，dist/ 裡面是什麼？就是一些 HTML、CSS、JavaScript 檔案，可能還有一些圖片和字型。全部加起來可能 5-10 MB。這些都是靜態檔案。

靜態檔案要提供服務，需要 Node.js 嗎？不需要。你只需要一個 Web Server——比如 Nginx——就夠了。Nginx 提供靜態檔案的效能比 Node.js 好得多，而且 Nginx 的 Image 非常小。

但如果你用傳統的寫法：

```dockerfile
# ❌ 傳統寫法——Image 超過 1 GB
FROM node:20
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
```

最終 Image 裡面有什麼？Node.js 執行環境（大約 400 MB）、node_modules（可能 300 MB）、原始碼（幾 MB）、dist/ 目錄（幾 MB）。你真正需要的 dist/ 可能只有 5 MB，但整個 Image 超過 1 GB。那 995 MB 全是「客廳裡的鷹架」。

用 Multi-stage Build 改寫：

```dockerfile
# ========== 階段一：建構 ==========
FROM node:20-alpine AS builder

WORKDIR /app

# 安裝依賴（善用快取）
COPY package.json package-lock.json ./
RUN npm ci

# 複製原始碼並建構
COPY . .
RUN npm run build

# ========== 階段二：運行 ==========
FROM nginx:alpine

# 從建構階段只複製 dist/ 目錄到 Nginx 的靜態檔案目錄
COPY --from=builder /app/dist /usr/share/nginx/html

# 如果有自定義的 Nginx 設定
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

就這樣。兩個 FROM，一個 COPY --from。來比較一下效果：

| 項目 | 傳統寫法 | Multi-stage |
|------|---------|-------------|
| 最終 Image 大小 | ~1.2 GB | ~40 MB |
| 包含 Node.js | 是 | 否 |
| 包含 node_modules | 是 | 否 |
| 包含原始碼 | 是 | 否 |
| Web Server | serve（Node.js 寫的） | Nginx（高效能） |

**從 1.2 GB 縮小到 40 MB，縮小了 97%！**

而且不只是大小的問題。最終的 Image 裡面只有 Nginx 和你的靜態檔案，沒有 Node.js、沒有 npm、沒有 node_modules、沒有原始碼。攻擊者就算進到了容器裡面，也找不到什麼有用的工具，攻擊面非常小。

注意幾個細節：

第一，建構階段我用了 `npm ci` 而不是 `npm install`。`ci` 是 Clean Install 的意思，它會嚴格依照 package-lock.json 來安裝，不會修改 lock 檔案，速度更快、結果更可預測。在 Docker Build 和 CI/CD 裡面，永遠優先用 `npm ci`。

第二，運行階段用的是 `nginx:alpine`，不是 `nginx`。Alpine 版本的 Nginx 只有大約 40 MB，比完整版的 140 MB 小很多。

第三，`/usr/share/nginx/html` 是 Nginx 預設的靜態檔案目錄。把 dist/ 的內容放到這裡，Nginx 就會自動提供服務了，不需要任何額外的設定。

### 4.5 範例二：Go 應用

第二個例子是 Go 語言。Go 是 Multi-stage Build 最經典、效果最驚人的使用場景。

為什麼？因為 Go 是編譯型語言。Go 的原始碼經過編譯之後，產出的是一個獨立的二進位執行檔。這個執行檔包含了所有需要的程式碼和函式庫，完全不依賴任何外部的運行時環境。

這意味著什麼？意味著你只需要那一個執行檔就夠了。不需要 Go 語言環境，不需要任何函式庫，甚至——聽好了——**不需要作業系統**。

```dockerfile
# ========== 階段一：編譯 ==========
FROM golang:1.22-alpine AS builder

WORKDIR /app

# 先複製依賴描述檔，下載依賴（善用快取）
COPY go.mod go.sum ./
RUN go mod download

# 複製原始碼並編譯
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# ========== 階段二：運行 ==========
FROM scratch

# 從建構階段複製執行檔
COPY --from=builder /app/main /main

EXPOSE 8080
ENTRYPOINT ["/main"]
```

看到那個 `FROM scratch` 了嗎？

scratch 是 Docker 裡面一個非常特別的東西——它是一個**完全空的 Image**。裡面什麼都沒有。沒有 Linux、沒有 shell、沒有 ls、沒有 cat、沒有 /bin、沒有 /usr、什麼都沒有。零 bytes。一張白紙。

你可能會覺得不可思議：「一個什麼都沒有的 Image，怎麼跑程式？」

答案就在這行編譯指令裡面：

```bash
CGO_ENABLED=0 GOOS=linux go build -o main .
```

`CGO_ENABLED=0` 表示不使用 CGO（C 語言的橋接介面），這樣編譯出來的就是純 Go 程式碼，不依賴任何 C 函式庫。

這樣產出的二進位檔是「靜態連結」的。什麼叫靜態連結？就是所有需要的東西——程式邏輯、標準函式庫、甚至網路相關的系統呼叫介面——全部都打包在這一個檔案裡面了。它不需要外部的 libc、不需要 libpthread、不需要任何東西。它只需要 Linux 核心提供系統呼叫（system call）的介面就夠了。而 Docker 容器是共享宿主機的 Linux 核心的，所以系統呼叫是有的。

所以，一個完全空的 Image 加上一個靜態連結的 Go 二進位檔，就足以跑起來了。

來看效果：

| 項目 | 傳統寫法 | Multi-stage |
|------|---------|-------------|
| 最終 Image 大小 | ~800 MB | ~8 MB |
| 包含 Go 編譯器 | 是 | 否 |
| 包含原始碼 | 是 | 否 |
| Base Image | golang:1.22（800 MB） | scratch（0 MB） |

**從 800 MB 縮小到 8 MB！差了 100 倍！**

這個結果是不是非常震撼？很多雲原生的工具——Kubernetes 的各種組件、etcd、CoreDNS、Docker 自己的一些工具——都是用 Go 寫的，而且都是這樣打包的。這就是為什麼 Go 在雲原生領域特別受歡迎的原因之一——它天然適合容器化，打出來的 Image 超級小。

不過，用 scratch 有一個缺點要注意：你沒辦法用 `docker exec -it container sh` 進到容器裡面去除錯，因為連 shell 都沒有。在開發和測試環境裡，你可能需要進去看看狀況。

解決方案：用 `alpine` 代替 scratch。

```dockerfile
# 如果需要除錯能力
FROM alpine:3.19
COPY --from=builder /app/main /main
EXPOSE 8080
ENTRYPOINT ["/main"]
```

Alpine 大概只有 7 MB，所以最終 Image 也就 15 MB 左右。多了 7 MB，但你有了 shell、有了 ls、有了 cat，出問題的時候可以 exec 進去看看。這個取捨就看你的需求。生產環境追求極致的小和安全，用 scratch；開發和測試環境需要除錯能力，用 alpine。

還有一個小細節——如果你的 Go 程式需要發 HTTPS 請求（例如呼叫外部 API），用 scratch 的話你還需要把 CA 根憑證帶進去：

```dockerfile
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/main /main
ENTRYPOINT ["/main"]
```

因為 scratch 裡面連 SSL 根憑證都沒有，不帶的話 HTTPS 請求會報「certificate signed by unknown authority」的錯誤。

### 4.6 範例三：Java Spring Boot 應用

第三個例子是 Java。Java 的世界裡有一個天然的分離——建構時需要 JDK（Java Development Kit）+ Maven 或 Gradle，但運行時只需要 JRE（Java Runtime Environment）。

JDK 裡面有什麼？Java 編譯器 javac、各種開發工具（jdb、jstack、jmap）、以及 JRE。JDK 比 JRE 大很多——JDK 大概 400 多 MB，JRE 只有 100 多 MB。再加上 Maven 本身也要幾百 MB。

在生產環境裡，你不需要 javac——你又不會在伺服器上面寫 Java 程式。你也不需要 Maven——jar 檔已經打好了，不需要再打一次。你只需要 JRE 來跑已經打包好的 .jar 檔案。

```dockerfile
# ========== 階段一：建構 ==========
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# 先複製 pom.xml，下載依賴（善用快取）
COPY pom.xml .
RUN mvn dependency:go-offline

# 複製原始碼並打包
COPY src ./src
RUN mvn package -DskipTests

# ========== 階段二：運行 ==========
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 從建構階段複製 JAR 檔
COPY --from=builder /app/target/*.jar app.jar

# 建立非 root 使用者
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080

# 設定 JVM 記憶體參數，讓 JVM 正確感知容器的資源限制
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

效果比較：

| 項目 | 傳統寫法 | Multi-stage |
|------|---------|-------------|
| 最終 Image 大小 | ~800 MB | ~250 MB |
| 包含 Maven | 是 | 否 |
| 包含 JDK（完整版） | 是 | 否（只有 JRE） |
| 包含原始碼 | 是 | 否 |

Java 因為本身需要 JRE 來跑，所以沒辦法像 Go 那樣縮到 8 MB。但從 800 MB 縮到 250 MB，省了 550 MB，也是非常顯著的改善。

注意幾個細節：

第一，建構階段用了 `mvn dependency:go-offline`。這個指令會預先下載所有 Maven 依賴到本地倉庫，類似 Node.js 的 `npm install`。把它放在 `COPY pom.xml` 之後、`COPY src` 之前，就能善用 Docker 的 Build Cache——只要 pom.xml 沒變，依賴下載那一層就會被快取住。Java 專案的依賴下載通常非常慢（幾分鐘是常態），能快取住就省很多時間。

第二，運行階段用的是 `eclipse-temurin:17-jre-alpine`。注意兩件事：JRE 不是 JDK，Alpine 不是 Debian。eclipse-temurin 是目前社群推薦的 OpenJDK 發行版，品質很好。

第三，`-DskipTests` 是因為在 Docker Build 裡面跑測試通常不是好主意。測試應該在 CI/CD 的另一個階段跑（比如在 build 之前），不需要在打包 Image 的時候再跑一次。

第四，ENTRYPOINT 裡的 `-XX:+UseContainerSupport` 讓 JVM 能正確感知容器的記憶體和 CPU 限制。如果不加這個，JVM 會去讀宿主機的 `/proc/meminfo`，以為自己有幾十 GB 的記憶體可以用，然後分配過多的堆記憶體，最後被 OOM Kill。`-XX:MaxRAMPercentage=75.0` 表示 JVM 最多使用容器記憶體上限的 75%，留 25% 給 off-heap 的東西（metaspace、code cache、thread stack 等）。

### 4.7 三個例子的大小比較

讓我把三個例子放在一起看一張總表：

| 語言 | 傳統 Image 大小 | Multi-stage Image 大小 | 縮減比例 |
|------|----------------|----------------------|---------|
| Node.js 前端 | ~1.2 GB | ~40 MB | 97% |
| Go | ~800 MB | ~8 MB | 99% |
| Java Spring Boot | ~800 MB | ~250 MB | 69% |

Go 的效果最驚人，因為 Go 可以靜態編譯，直接用 scratch。Node.js 前端的效果也很好，因為最終只需要靜態檔案加 Nginx。Java 的縮減比例在三者中最小，但絕對值也很可觀——省了超過 500 MB。

### 4.8 Multi-stage 的進階用法

在結束 Multi-stage 之前，補充兩個進階的小知識。

**第一，你可以有超過兩個階段。** 比如三個階段：

```dockerfile
# 階段一：安裝依賴
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 階段二：建構
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 階段三：運行
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

把依賴安裝和程式碼建構分成兩個階段，快取效果會更好——如果你只改了建構設定（比如 webpack config）但沒改 package.json，依賴安裝那個階段可以完全快取住。

**第二，COPY --from 不只能從同一個 Dockerfile 的階段複製，還能從外部 Image 複製。**

```dockerfile
# 從官方的 nginx Image 複製設定檔
COPY --from=nginx:alpine /etc/nginx/nginx.conf /etc/nginx/nginx.conf
```

這個用法比較少見，但在某些場景下很方便——比如你想要某個 Image 裡的某個特定檔案，但不想用整個 Image 當 Base。

好，Multi-stage Build 就講到這裡。這個技術是寫生產級 Dockerfile 的必備技能，面試的時候也是高頻考點。如果面試官問你「你怎麼優化 Docker Image 的大小？」你第一個就要講 Multi-stage Build。

---

## 五、docker push 發佈到 Docker Hub（10 分鐘）

### 5.1 為什麼要 push

好，你花了很多功夫，用 Best Practices 寫了 Dockerfile，用 Multi-stage Build 把 Image 縮得很小。現在這個 Image 只存在你自己的電腦上。

如果你要部署到伺服器上，怎麼辦？如果你的同事也想用這個 Image，怎麼辦？如果你的 CI/CD 流水線需要用到這個 Image，怎麼辦？

你需要把 Image 推送到一個 Image Registry。最常用的公開 Registry 就是 Docker Hub。

Docker Hub 就像是 Docker Image 的 GitHub。你可以把 Image 推上去，別人就可以 pull 下來用。我們之前一直在用的 `docker pull nginx`、`docker pull python`、`docker pull redis`，那些 Image 就是存在 Docker Hub 上的。

### 5.2 docker login

首先，你需要一個 Docker Hub 帳號。去 hub.docker.com 免費註冊一個。

然後在終端機登入：

```bash
$ docker login
Username: your-username
Password: ********
Login Succeeded
```

登入成功之後，你的認證資訊會被存在 `~/.docker/config.json` 裡面。下次就不用再輸入密碼了。

小提醒：在生產環境或 CI/CD 裡面，建議用 Access Token 而不是密碼登入。你可以在 Docker Hub 的 Account Settings 裡面產生 Token，比較安全。

### 5.3 docker tag——命名規範

在推送之前，你的 Image 需要遵循 Docker Hub 的命名規範：

```
<你的 Docker Hub 帳號>/<Image 名稱>:<版本標籤>
```

比如你的帳號是 `johndoe`，你要推一個叫 `my-flask-app` 的 Image，版本是 1.0：

```bash
# 方法一：build 的時候就用正確的名字
docker build -t johndoe/my-flask-app:1.0 .

# 方法二：先 build，再用 docker tag 改名
docker build -t my-flask-app .
docker tag my-flask-app johndoe/my-flask-app:1.0
```

注意，`docker tag` 不是重新命名，而是「多取一個名字」。原來的名字還在，只是多了一個別名指向同一個 Image。就像一個人可以有本名也有暱稱，都是指同一個人。

通常我們會打兩個 tag——一個具體版本號，一個 latest：

```bash
docker tag my-flask-app johndoe/my-flask-app:1.0
docker tag my-flask-app johndoe/my-flask-app:latest
```

這樣使用者可以用 `johndoe/my-flask-app:1.0` 拉取特定版本（適合生產環境），也可以用 `johndoe/my-flask-app:latest` 拉取最新版（適合快速試用）。

### 5.4 docker push

命名好了之後，推送就一行指令的事：

```bash
$ docker push johndoe/my-flask-app:1.0
The push refers to repository [docker.io/johndoe/my-flask-app]
5f70bf18a086: Pushed
a3ed95caeb02: Pushed
e2eb06d8af82: Layer already exists
...
1.0: digest: sha256:abc123... size: 1234
```

推送的過程中你會看到每一層 Layer 的上傳進度。如果某一層已經存在 Docker Hub 上了（比如 base image 的 Layer 很可能已經有人推過），就會顯示 `Layer already exists`，不用重複上傳。這就是分層機制的好處——不只是下載的時候可以共享 Layer，上傳也可以。

```bash
# 也把 latest 推上去
$ docker push johndoe/my-flask-app:latest
```

推送完之後，打開瀏覽器，去 `hub.docker.com/r/johndoe/my-flask-app`，就能看到你的 Image 了。你可以看到所有的 tag、每個 tag 的大小、上傳時間等等。

現在，全世界任何有 Docker 的機器都可以用你的 Image 了：

```bash
# 在任何一台機器上
docker pull johndoe/my-flask-app:1.0
docker run -d -p 5000:5000 johndoe/my-flask-app:1.0
```

就是這麼簡單。你做了一個應用，打包成 Image，推到 Docker Hub，別人一條指令就能跑起來。不需要裝 Python、不需要裝套件、不需要設定環境。這就是 Docker 最強大的地方。

### 5.5 docker save / docker load——離線部署

有些環境是完全沒有外網的。比如軍方系統、金融機構的核心系統、工廠裡的封閉網路。這些環境的伺服器連不上 Docker Hub，docker pull 完全沒用。

怎麼辦？Docker 提供了 `save` 和 `load` 兩個指令來處理離線場景：

```bash
# 在有網路的機器上：把 Image 匯出成一個 tar 檔案
docker save -o my-flask-app.tar johndoe/my-flask-app:1.0

# 這時候你有一個叫 my-flask-app.tar 的檔案
# 你可以用 USB 隨身碟、光碟、或任何物理方式把它搬到離線環境

# 在沒有網路的機器上：從 tar 檔案載入 Image
docker load -i my-flask-app.tar
# Loaded image: johndoe/my-flask-app:1.0

# 現在就可以用了
docker run -d -p 5000:5000 johndoe/my-flask-app:1.0
```

`docker save` 會把整個 Image（包括所有 Layer 和 metadata）打包成一個 tar 檔案。`docker load` 則是反向操作，從 tar 檔案還原出 Image。

這個做法雖然不太優雅，但在離線環境裡是唯一的選擇。我之前在一個客戶的案子裡就用過這個方式——客戶的生產環境在一個完全隔離的網路裡面，所有的 Docker Image 都是用 USB 帶進去的。

### 5.6 Private Registry 簡介

Docker Hub 上的公開 Image 任何人都可以看到和拉取。但企業內部的應用程式，你通常不希望外面的人看到——裡面可能有商業邏輯、有內部 API 的結構，這些都是公司的智慧財產。

這時候就需要 Private Registry。簡單介紹幾個常見的選項：

| Registry | 說明 | 適用場景 |
|----------|------|---------|
| **Docker Hub** | 付費方案支持 Private Repo | 小團隊、個人 |
| **Harbor** | VMware 開源，可自己架設 | 企業自建，需要完整管控 |
| **AWS ECR** | Amazon 的容器 Registry | 用 AWS 的團隊 |
| **Google GCR / Artifact Registry** | GCP 的容器 Registry | 用 GCP 的團隊 |
| **GitHub GHCR** | GitHub Container Registry | 程式碼在 GitHub 上的團隊 |
| **Azure ACR** | Azure 的容器 Registry | 用 Azure 的團隊 |

用法都跟 Docker Hub 類似，差別主要在登入方式和 Image 名稱的前綴：

```bash
# Docker Hub
docker push johndoe/my-app:1.0

# AWS ECR
docker push 123456789.dkr.ecr.ap-northeast-1.amazonaws.com/my-app:1.0

# GitHub Container Registry
docker push ghcr.io/johndoe/my-app:1.0

# 自建 Harbor
docker push harbor.mycompany.com/project/my-app:1.0
```

核心概念都一樣：`docker login` 登入、`docker tag` 命名、`docker push` 推送。換湯不換藥。

Private Registry 的詳細操作我們後面的課程會再深入，今天先知道有這些選項就好。

---

## 六、Image 大小優化總結（5 分鐘）

### 6.1 四大優化策略

好，我們來做一個完整的 Image 大小優化總結。要讓你的 Docker Image 瘦身，有四個策略。我按照效果從大到小排列：

**策略一：Multi-stage Build（效果最大）**

把建構環境和運行環境分開，只把最終產物帶到運行階段。前面已經講過了，效果可以達到 97-99% 的縮減。

**策略二：選擇小的 Base Image**

| Base Image | 大小 | 特點 |
|-----------|------|------|
| ubuntu:22.04 | ~77 MB | 功能齊全，套件豐富 |
| debian:bookworm-slim | ~52 MB | 精簡版 Debian |
| python:3.11 | ~920 MB | 完整版，含 gcc、make 等大量系統工具 |
| python:3.11-slim | ~130 MB | 精簡版，去掉不必要的系統工具 |
| python:3.11-alpine | ~50 MB | Alpine 版，超小 |
| node:20 | ~1.1 GB | 完整版 |
| node:20-slim | ~200 MB | 精簡版 |
| node:20-alpine | ~130 MB | Alpine 版 |
| alpine:3.19 | ~7 MB | 超輕量 Linux 發行版 |
| scratch | 0 MB | 完全空的 Image |

一般原則：**能用 slim 就用 slim，能用 alpine 就用 alpine。** 但 alpine 有時候會因為 musl libc 的相容性問題導致某些套件行為異常，需要測試確認。

Google 還推出了一種叫 **Distroless** 的 Image，裡面只有應用程式的運行時依賴，連 shell 都沒有。安全性最高，但除錯最不方便。在安全性要求極高的場景下可以考慮。

**策略三：合併 RUN + 清理暫存檔**

把多個 RUN 合成一個，減少 Layer 數量。在同一個 RUN 裡面安裝完套件後立刻清理快取。

**策略四：.dockerignore**

排除不必要的檔案，減少 Build Context 大小，也避免機密資訊進入 Image。

### 6.2 優化效果累積表

用一個實際的 Node.js 前端專案來看，每一步優化能帶來多少效果：

| 優化步驟 | Image 大小 | 說明 |
|---------|-----------|------|
| 未優化（FROM node:20） | ~1.2 GB | 完整 Node + 所有檔案 |
| + 換 Base Image（node:20-alpine） | ~400 MB | 用 Alpine 版本 |
| + 加 .dockerignore | ~350 MB | 排除 node_modules、.git 等 |
| + 善用 Build Cache | ~350 MB | 大小不變，但 Build 速度大幅提升 |
| + Multi-stage Build（Nginx） | ~40 MB | 只留 dist/ + Nginx |

從 1.2 GB 到 40 MB，縮小了 97%。

在生產環境裡，Image 小有四個直接的好處：

1. **拉取速度快**——CI/CD 流水線速度提升，部署更快
2. **啟動更快**——新節點啟動時間縮短，彈性擴展更敏捷
3. **儲存空間省**——Registry 佔用空間小，省錢
4. **攻擊面小**——沒有多餘的工具可以被利用，安全性提升

所以 Image 大小優化不是什麼錦上添花的事情，它直接影響你的部署速度、營運成本、和系統安全性。公司的 SRE 和安全團隊都會非常在意這件事。

---

## 七、學生練習題

好，理論講完了，現在是你們動手的時間。

> **練習題 1：撰寫 .dockerignore**
>
> 你有一個 Node.js 專案，目錄結構如下：
> ```
> my-app/
> ├── node_modules/          （200 MB）
> ├── .git/                  （50 MB）
> ├── src/
> ├── tests/
> ├── docs/
> ├── .env                   （包含資料庫密碼）
> ├── .env.example
> ├── package.json
> ├── package-lock.json
> ├── Dockerfile
> ├── docker-compose.yml
> ├── README.md
> └── .vscode/
> ```
> 請寫出這個專案的 .dockerignore 檔案。哪些應該排除？哪些不能排除？為什麼？
>
> 提示：package.json 和 package-lock.json 能排除嗎？src/ 能排除嗎？

> **練習題 2：修正 Dockerfile 的快取問題**
>
> 以下 Dockerfile 有快取效率的問題，請修正它：
> ```dockerfile
> FROM python:3.11-slim
> WORKDIR /app
> COPY . .
> RUN pip install -r requirements.txt
> COPY config.yaml /app/config.yaml
> CMD ["python", "app.py"]
> ```
> 提示：想想「依賴先裝，程式碼後放」的原則。另外，COPY config.yaml 那一行有什麼問題？

> **練習題 3：改寫成 Multi-stage Build**
>
> 以下是一個 React 前端應用的 Dockerfile，請用 Multi-stage Build 改寫，讓最終 Image 只包含靜態檔案和 Nginx：
> ```dockerfile
> FROM node:20
> WORKDIR /app
> COPY package.json package-lock.json ./
> RUN npm install
> COPY . .
> RUN npm run build
> RUN npm install -g serve
> CMD ["serve", "-s", "dist", "-l", "3000"]
> ```

> **練習題 4：Go 應用的 Multi-stage Build**
>
> 你有一個簡單的 Go Web 應用（main.go），請寫一個 Multi-stage Build 的 Dockerfile，讓最終 Image 使用 scratch 或 alpine，大小控制在 15 MB 以內。
>
> 提示：
> - 編譯階段用 `golang:1.22-alpine`
> - 記得設定 `CGO_ENABLED=0`
> - 想想什麼時候該用 scratch、什麼時候該用 alpine

> **練習題 5：docker push 實戰**
>
> 1. 在 Docker Hub 上註冊帳號（如果還沒有的話）
> 2. 選擇練習 3 或練習 4 的結果，打包好 Image
> 3. 用 docker tag 命名，然後 docker push 推送到你的 Docker Hub
> 4. 在 Docker Hub 網頁上確認 Image 已經上傳
> 5. 刪掉本地的 Image（docker rmi），然後從 Docker Hub 重新 pull 回來
> 6. 確認 pull 回來的 Image 可以正常 docker run
> 7. （加分題）用 docker save 把 Image 匯出成 tar 檔案，再用 docker load 載入回來

> **練習題 6：綜合最佳化**
>
> 以下 Dockerfile 有多個問題，請指出所有問題並修正：
> ```dockerfile
> FROM ubuntu
> RUN apt-get update
> RUN apt-get install -y python3 python3-pip
> COPY . .
> RUN pip3 install flask
> RUN pip3 install requests
> RUN pip3 install gunicorn
> EXPOSE 5000
> CMD python3 app.py
> ```
> 提示：至少能找出 7 個可以改善的地方。（版本號、Layer 數量、快取順序、root 權限、清理暫存、CMD 格式、Base Image 選擇、WORKDIR、.dockerignore……）

---

## 八、本堂課小結（2 分鐘）

好，來回顧一下今天這堂課學了什麼。

**.dockerignore**
- 排除不必要的檔案進入 Build Context
- 最重要的是排除 .env（機密資訊）和 node_modules（大而不需要）
- 語法跟 .gitignore 一樣
- 每個有 Dockerfile 的專案都該配一個 .dockerignore

**Dockerfile Best Practices——六條黃金法則**
1. 合併 RUN 指令，減少 Layer 數量
2. 善用 Build Cache：**依賴先裝，程式碼後放**
3. 不要用 root：建立非 root 使用者，用 USER 切換
4. 清理暫存檔案：必須跟安裝寫在同一個 RUN 裡
5. 使用具體版本號：不要用 latest，確保可重現性
6. 一個容器只跑一個程序

**Multi-stage Build——今天的重頭戲**
- 核心思想：建構環境和運行環境分開
- 語法：多個 FROM + AS 命名 + COPY --from=
- Node.js 前端：build 用 node → 運行用 nginx，1.2 GB → 40 MB
- Go：build 用 golang → 運行用 scratch，800 MB → 8 MB
- Java：build 用 maven + JDK → 運行用 JRE，800 MB → 250 MB

**docker push 發佈**
- docker login → docker tag → docker push
- 命名規範：username/image-name:tag
- docker save / docker load 處理離線部署
- 私有 Registry：Harbor、ECR、GCR、GHCR

**Image 大小優化四大策略**
1. Multi-stage Build（效果最大）
2. 選擇小的 Base Image（alpine、slim、distroless）
3. 合併 RUN + 清理暫存檔
4. .dockerignore

這些東西全部學完，你的 Dockerfile 功力就已經達到生產環境的水準了。去面試的時候被問到 Docker Best Practices 或 Multi-stage Build，你也可以講得頭頭是道。

下一堂課，我們要進入 Dockerfile 三部曲的最後一堂——實戰專案。我們會從零開始打包一個完整的全端應用，把今天學的這些 Best Practices 全部用上，一個都不漏。到時候見！

---

## 板書 / PPT 建議

1. Build Context 概念圖（docker build 時，整個目錄打包送給 Docker Daemon 的過程）
2. Build Cache 快取失效的骨牌效應示意圖（一層失效，後面全部重建）
3. 「依賴先裝，程式碼後放」的對比圖（錯誤寫法 vs 正確寫法的快取命中情況）
4. Layer 清理的比喻圖（修正液的比喻，或透明片的比喻）
5. Multi-stage Build 兩階段流程圖（Builder Stage → Final Stage，用 COPY --from 連接的箭頭）
6. 蓋房子的比喻圖（施工階段：鷹架、工具 → 入住階段：乾淨的房子）
7. Node.js Multi-stage Build 前後 Image 內容對比（1.2 GB vs 40 MB）
8. Go Multi-stage Build 前後對比（特別標注 scratch = 0 MB 的 Base Image）
9. Java Multi-stage Build 前後對比（JDK vs JRE）
10. 三種語言的 Image 大小比較總表
11. Base Image 大小階梯圖（ubuntu → slim → alpine → distroless → scratch）
12. docker push 完整流程圖（build → tag → login → push → Hub → pull）
13. 優化步驟累積效果表（1.2 GB → 40 MB 的逐步過程）
