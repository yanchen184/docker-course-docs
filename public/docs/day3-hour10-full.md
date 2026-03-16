# Day 3 第十小時：Dockerfile 基礎

---

## 一、為什麼需要 Dockerfile（10 分鐘）

### 1.1 我們一直在用別人的 Image

好，各位同學，歡迎回來。

我先問大家一個問題——到目前為止，我們跑了多少容器了？nginx、mysql、redis、alpine、ubuntu、tomcat、elasticsearch……各式各樣的 Image，跑得很開心對吧？

但是，你們有沒有注意到一件事情？

這些 Image，全部——我強調，**全部**——都是「別人做好的」。我們從 Docker Hub 上面把別人打包好的 Image 拉下來，docker run 跑起來，用得很爽。

那我現在問你：如果今天你自己寫了一個應用程式呢？一個 Python 的 Web 服務、一個 Node.js 的 API、一個 Java 的 Spring Boot 專案——你要怎麼把它打包成 Docker Image，讓別人也能 `docker run` 一行就跑起來？

這個問題，就是今天整堂課的核心。

今天開始，我們進入 Dockerfile 三部曲。三部曲，三堂課：

- **第一堂（就是今天）：Dockerfile 基礎** —— 把所有指令學會，能寫出可以用的 Dockerfile
- **第二堂：Dockerfile 進階與最佳化** —— 學會寫出「好的」Dockerfile，Image 又小又安全
- **第三堂：實戰應用** —— 打包真實的多語言專案，整合 CI/CD

好，我們先回到那個問題：怎麼把自己的程式碼打包成 Image？

### 1.2 docker commit：看起來可以，但千萬別用

昨天我們在 Tomcat 實戰中用過 `docker commit`，大家還記得嗎？進去容器手動改東西，然後 commit 存成新 Image。

看起來行得通，但它有**三大致命問題**：

| 問題 | 說明 |
|------|------|
| **不可重現** | 步驟只在腦子裡，無法精確重複 |
| **不可追溯** | 別人拿到 Image 不知道裡面怎麼建的 |
| **不可自動化** | 無法整合 CI/CD |

### 1.3 Dockerfile = Image 的食譜

那正確的做法是什麼呢？

答案就是——**Dockerfile**。

Dockerfile 是一個純文字檔案，裡面用特定的指令，一步一步地描述：從哪個基礎 Image 開始、要安裝什麼、要複製什麼檔案、啟動時要跑什麼命令。

我喜歡用一個比喻來解釋 docker commit 和 Dockerfile 的差別：

**docker commit 就像是打開冰箱，拍一張照片。** 你看到冰箱裡有牛奶、有雞蛋、有青菜，但你不知道這些東西是什麼時候買的、怎麼處理的、要怎麼變成一道菜。

**Dockerfile 就像是一份食譜。** 它清楚地寫著：先準備什麼食材、加多少鹽、炒幾分鐘、最後怎麼擺盤。任何人拿到這份食譜，都能做出一模一樣的菜。

而且食譜可以被版本控制——你可以把 Dockerfile 和你的程式碼放在一起，用 Git 管理。誰改了什麼、什麼時候改的、為什麼改的，全都一清二楚。

| 比較項目 | docker commit | Dockerfile |
|---------|---------------|------------|
| 可重現性 | 差，步驟在腦子裡 | 好，步驟寫在檔案裡 |
| 可追溯性 | 差，黑盒子 | 好，可以放進版本控制 |
| 可自動化 | 無法自動化 | 完美整合 CI/CD |
| 團隊協作 | 困難 | 方便，和程式碼一起管理 |
| 最佳實踐 | 不建議用於正式環境 | **業界標準做法** |

### 1.4 用 docker history 偷看別人的食譜

在我們開始寫自己的 Dockerfile 之前，我先教你們一個偷吃步——用 `docker history` 來看看別人的 Image 是怎麼建構的。

```bash
docker history nginx:latest
```

你會看到類似這樣的輸出：

```
IMAGE          CREATED       CREATED BY                                      SIZE
a8c37d68df1b   2 weeks ago   CMD ["nginx" "-g" "daemon off;"]                0B
<missing>      2 weeks ago   STOPSIGNAL SIGQUIT                              0B
<missing>      2 weeks ago   EXPOSE map[80/tcp:{}]                           0B
<missing>      2 weeks ago   ENTRYPOINT ["/docker-entrypoint.sh"]            0B
<missing>      2 weeks ago   COPY file:xxx in /docker-entrypoint.d           4.62kB
<missing>      2 weeks ago   RUN /bin/sh -c set -x && apt-get update...      60.3MB
<missing>      2 weeks ago   ENV NGINX_VERSION=1.25.3                        0B
<missing>      2 weeks ago   FROM debian:bookworm-slim                       74.8MB
```

看到了嗎？每一行就是 Dockerfile 裡面的一個指令！從最下面的 FROM 開始往上看，你就能大致還原出這個 Image 的 Dockerfile 長什麼樣子。

`docker history` 就像是 Image 的 X 光片。你可以用它來學習——看看官方的 nginx Image 是怎麼建的、MySQL Image 是怎麼建的。這是一個非常好的學習方式。

```bash
# 加上 --no-trunc 看完整的指令內容
docker history --no-trunc nginx:latest

# 也可以看看別的 Image
docker history python:3.11-slim
docker history mysql:8.0
```

好了，理論鋪墊夠了。接下來我們就動手寫自己的第一個 Dockerfile！

---

## 二、第一個 Dockerfile（10 分鐘）

### 2.1 從零開始寫三行 Dockerfile

好，接下來是激動人心的時刻。我們要寫人生中的第一個 Dockerfile。

先建立一個乾淨的資料夾：

```bash
mkdir my-first-image
cd my-first-image
```

然後建立一個檔案，檔名就叫 `Dockerfile`。注意幾件事：

- **D 是大寫的**——Dockerfile，不是 dockerfile
- **沒有副檔名**——不是 Dockerfile.txt
- **放在專案根目錄**

```dockerfile
# 我的第一個 Dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y curl
CMD ["curl", "--version"]
```

就三行！我們一行一行來看：

**第一行：`FROM ubuntu:22.04`**

這是告訴 Docker：「我要以 Ubuntu 22.04 這個 Image 作為基礎，在它上面開始建構。」就像蓋房子要先打地基一樣，FROM 就是你的地基。每一個 Dockerfile 都**必須**以 FROM 開始（註解不算）。

**第二行：`RUN apt-get update && apt-get install -y curl`**

這是在建構過程中執行一個命令。就像你進到一台新裝好的 Ubuntu 電腦，第一件事就是更新套件清單然後安裝你需要的軟體。這裡我們安裝了 `curl`。

注意那個 `-y`，這很重要！因為 `apt-get install` 預設會問你「確定要安裝嗎？[Y/n]」。但是在 Docker 建構過程中，沒有人可以手動輸入 Y，所以必須加 `-y` 自動確認。初學者常常忘了這個 `-y`，然後建構就卡住了。

**第三行：`CMD ["curl", "--version"]`**

這是告訴 Docker：「當有人用這個 Image 跑容器的時候，預設執行 `curl --version` 這個命令。」

就這樣，三行，一個完整的 Dockerfile。

### 2.2 docker build 完整流程

Dockerfile 寫好了，接下來用 `docker build` 把它建構成 Image：

```bash
docker build -t my-curl:v1 .
```

這個指令拆解一下：

- **`docker build`**：建構 Image 的指令
- **`-t my-curl:v1`**：`-t` 是 tag 的意思，給 Image 取名叫 `my-curl`，版本標籤是 `v1`
- **`.`**：這個點是 **Build Context**，非常非常重要，等一下專門講

### 2.3 Build Context：那個「.」到底是什麼

很多初學者會困惑，最後那個 `.` 到底代表什麼？「就是當前目錄嘛」——沒錯，但它的含義比你想的深。

`.` 代表的是 **Build Context（建構上下文）**，也就是 Docker 在建構過程中可以存取的檔案範圍。

你知道 Docker 的架構是 Client-Server 的對吧？你在終端機輸入 `docker build`，這只是 Client 端的指令。真正執行建構的是 Docker Engine（Docker Daemon，Server 端）。Client 和 Server 可能不在同一台機器上！

所以 Client 必須把整個目錄的內容**打包**送給 Server，讓 Server 可以存取你要 COPY 進 Image 的檔案。

你在建構的時候會看到這行：

```
Sending build context to Docker daemon  2.048kB
```

這就是 Client 在把目錄打包送給 Daemon 的過程。

這裡有一個**大坑**：如果你在一個很大的目錄下執行 `docker build .`——比如你的家目錄，或者一個有幾個 GB `node_modules` 的專案目錄——Docker 會把整個目錄都打包送過去。你可能會看到：

```
Sending build context to Docker daemon  2.5GB
```

然後你就等吧，等到天荒地老。

所以有兩個注意事項：
1. **不要在太大的目錄下執行 docker build**
2. **後面我們會學 `.dockerignore` 來排除不需要的檔案**（跟 `.gitignore` 類似）

### 2.4 觀察建構輸出

讓我們仔細看建構時的輸出：

```
Sending build context to Docker daemon  2.048kB
Step 1/3 : FROM ubuntu:22.04
 ---> a8780b506fa4
Step 2/3 : RUN apt-get update && apt-get install -y curl
 ---> Running in 3f2a1b4c5d6e
...（一堆安裝輸出）...
 ---> 7e8f9a0b1c2d
Removing intermediate container 3f2a1b4c5d6e
Step 3/3 : CMD ["curl", "--version"]
 ---> 9d0e1f2a3b4c
Successfully built 9d0e1f2a3b4c
Successfully tagged my-curl:v1
```

來，注意幾個重點：

**第一，Step 1/3、Step 2/3、Step 3/3**——Dockerfile 裡每一行指令就是一步。

**第二，每一步都產生一個新的 Layer。** 那串像亂碼一樣的 ID（`a8780b506fa4`、`7e8f9a0b1c2d`）就是每一層 Layer 的 ID。還記得我們第二天學的 Image 分層概念嗎？這就是它在實際建構中的樣子。

**第三，`Running in ... / Removing intermediate container`**——Docker 為了執行 RUN 指令，會建立一個暫時的容器，在裡面跑命令，跑完把結果存成一個新的 Layer，然後刪掉那個暫時容器。

這就是 Dockerfile 建構的本質：**一層一層疊上去。**

### 2.5 跑一次看看

```bash
docker run my-curl:v1
```

輸出：

```
curl 7.81.0 (x86_64-pc-linux-gnu) libcurl/7.81.0 ...
```

成功！我們的 Image 能正常運作了。用 `docker history` 看看它的結構：

```bash
docker history my-curl:v1
```

### 2.6 Cache 的魔力

好，現在我要演示一個非常重要的東西——Docker 的 Build Cache（建構快取）。

我們把 CMD 那行改一下，不改別的：

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y curl
CMD ["curl", "-V"]
```

就改了最後一行，把 `--version` 改成 `-V`（其實效果差不多，就是為了演示）。

重新建構：

```bash
docker build -t my-curl:v2 .
```

注意看輸出：

```
Step 1/3 : FROM ubuntu:22.04
 ---> Using cache
 ---> a8780b506fa4
Step 2/3 : RUN apt-get update && apt-get install -y curl
 ---> Using cache
 ---> 7e8f9a0b1c2d
Step 3/3 : CMD ["curl", "-V"]
 ---> abc123def456
Successfully built abc123def456
Successfully tagged my-curl:v2
```

看到了嗎？Step 1 和 Step 2 都顯示 **Using cache**！Docker 發現前兩步的內容跟上次一模一樣，就直接用之前的結果，不需要重新執行。

只有 Step 3 因為內容改了，才重新執行。

整個建構過程原本可能要一兩分鐘（因為 apt-get install 很慢），但用了快取之後，幾秒鐘就完成了。**這就是 Docker Build Cache 的威力。**

但是注意一個重要的規則：**一旦某一層快取失效，它後面的所有層都要重新建構。** 這就像疊積木，你抽掉中間一塊，上面的全部要重疊。

所以如果你改了第二行的 RUN，那第三行的 CMD 也要重新跑，即使 CMD 本身沒有改。快取是**從上到下、連續的**，中間斷了後面全部失效。

這個概念非常非常重要，後面寫 Dockerfile 的時候會一直用到。

> **📝 練習題 1：第一個 Dockerfile**
>
> 自己寫一個 Dockerfile，基於 `alpine:3.18`，安裝 `curl` 和 `wget`，容器啟動時顯示 curl 的版本號。
>
> 提示：Alpine Linux 用 `apk add` 而不是 `apt-get install`。
>
> ```dockerfile
> FROM alpine:3.18
> RUN apk add --no-cache curl wget
> CMD ["curl", "--version"]
> ```
>
> 建構並執行，確認能看到 curl 的版本訊息。然後改一下 CMD，重新 build，觀察哪些 Step 用了 cache。

---

## 三、Dockerfile 指令完整詳解（30 分鐘）

好，接下來是這堂課的重頭戲。我們要把 Dockerfile 裡面常用的指令**全部**學一遍。每個指令我會講：是什麼、語法怎麼寫、實際範例、常見的雷。

### 3.1 FROM：一切的起點

`FROM` 是每個 Dockerfile 的第一個指令（註解除外），它指定你要以哪個映像檔作為基礎。你可以把它想成「我要站在巨人的肩膀上」——選一個別人已經做好的 Image，在上面加你自己的東西。

```dockerfile
# 使用官方 Python 映像檔
FROM python:3.11

# 使用 Node.js 的精簡版
FROM node:20-slim

# 使用 Alpine Linux（超小的 Linux 發行版）
FROM alpine:3.18

# 使用完整的 Ubuntu
FROM ubuntu:22.04
```

#### 基礎映像檔的選擇

同一個語言的 Image 通常有完整版、slim、alpine 三種變體（Day 2 介紹過），大小差異很大。一般建議：開發用完整版，正式環境用 slim 或 alpine。alpine 要注意 musl libc 的相容性問題。

#### Digest：比 tag 更精確的指定方式

你們知道 `python:3.11` 這個 tag 對應的具體 Image 可能會變嗎？今天 `python:3.11` 可能指向某個版本，下個月官方更新了，`python:3.11` 可能指向另一個版本。

如果你需要**百分之百確保**每次建構都用同一個 Image，可以用 **Digest**：

```dockerfile
FROM python@sha256:abc123def456...
```

Digest 是 Image 內容的雜湊值，內容不同 Digest 就不同。它比 tag 更精確，因為 tag 可以被覆蓋，但 Digest 不會。

這在對可重現性要求很高的環境（例如金融系統、醫療系統）特別重要。一般專案用 tag 就夠了。

#### scratch：空白映像檔

Docker 有一個特殊的映像檔叫 `scratch`，它是**完全空白**的——連 shell 都沒有。

```dockerfile
FROM scratch
COPY my-static-binary /app
CMD ["/app"]
```

什麼時候會用到？當你有一個靜態編譯的二進位檔——比如 Go 語言編譯出來的程式，不需要任何外部函式庫，就可以直接放在 scratch 上面跑。這樣你的 Image 可能只有幾 MB，超級小。

這是後面講 Multi-stage Build 的時候會用到的概念，現在先知道有這個東西就好。

### 3.2 RUN：在建構過程中執行命令

`RUN` 就是在建構 Image 的過程中執行命令，最常用來安裝套件。

```dockerfile
# 安裝系統套件
RUN apt-get update && apt-get install -y \
    curl \
    vim \
    git \
    && rm -rf /var/lib/apt/lists/*

# 安裝 Python 套件
RUN pip install --no-cache-dir flask requests

# 建立目錄
RUN mkdir -p /app/data
```

#### Shell Form vs Exec Form

RUN 有兩種寫法：

```dockerfile
# Shell Form：直接寫命令
RUN apt-get update && apt-get install -y curl

# Exec Form：用 JSON 陣列
RUN ["apt-get", "update"]
```

Shell Form 會被包在 `/bin/sh -c` 裡面執行，所以你可以用 `&&`、`|`、`$HOME` 等 shell 語法。Exec Form 是直接執行，不經過 shell，所以不能用 shell 語法。

**對於 RUN，大部分情況用 Shell Form 就好**，因為你通常需要 `&&` 來串接多個命令。

#### 每個 RUN 產生一個 Layer

這是非常重要的觀念。每一個 RUN 都會在 Image 上疊一層新的 Layer。

所以**不要**這樣寫：

```dockerfile
# ❌ 不好：三個 RUN = 三個 Layer
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y vim
RUN rm -rf /var/lib/apt/lists/*
```

要合併成一個：

```dockerfile
# ✅ 好：一個 RUN = 一個 Layer
RUN apt-get update && apt-get install -y \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*
```

為什麼要這樣？兩個原因：

**第一，減少 Layer 數量，Image 更小。** 雖然每一層的增量不一定很大，但層數多了加起來也可觀。

**第二，更重要的原因——清理操作必須在同一個 RUN 裡。** 如果你在第一個 RUN 裝東西，第二個 RUN 刪暫存，那個暫存檔其實已經寫進第一個 Layer 了，第二個 Layer 只是「標記刪除」，前面那層的空間還是佔著。只有在同一個 RUN 裡面「裝完立刻刪」，暫存檔才不會出現在最終的 Layer 裡。

最後那行 `rm -rf /var/lib/apt/lists/*` 就是清理 apt 的套件清單快取。這是一個標準的最佳實踐，能幫你省掉幾十 MB 的空間。

### 3.3 COPY vs ADD：複製檔案進 Image

`COPY` 和 `ADD` 都是把檔案從 Build Context 複製到 Image 裡面。

#### COPY：單純的複製

```dockerfile
# 複製單一檔案
COPY app.py /app/

# 複製整個目錄
COPY src/ /app/src/

# 使用萬用字元
COPY *.py /app/

# 同時複製多個檔案
COPY package.json package-lock.json /app/

# 配合 WORKDIR 使用相對路徑
WORKDIR /app
COPY . .
```

COPY 很直觀——就是把檔案從這裡複製到那裡，沒有任何魔法。

#### ADD：有額外功能的複製

```dockerfile
# ADD 可以自動解壓 tar 檔案
ADD app.tar.gz /app/

# ADD 可以從 URL 下載（但不建議）
ADD https://example.com/file.txt /app/
```

ADD 比 COPY 多了兩個功能：自動解壓 tar 檔案、支援 URL。但這兩個「額外功能」其實是把事情搞複雜了。

**結論：99% 的情況用 COPY。** Docker 官方文件也建議優先用 COPY。原因很簡單——COPY 的行為明確可預測，ADD 做的事情太多，容易讓人搞混。

唯一用 ADD 的場景：你需要在建構過程中自動解壓一個 tar 檔案。

| 功能 | COPY | ADD |
|------|------|-----|
| 複製本地檔案 | ✅ | ✅ |
| 自動解壓 tar | ❌ | ✅ |
| 支援 URL | ❌ | ✅（但不建議） |
| 建議使用程度 | ✅ **優先使用** | 只在需要解壓時使用 |

> **📝 練習題 2：COPY 與 WORKDIR**
>
> 建立一個 `index.html`（內容隨便寫一段 HTML），然後寫一個 Dockerfile，基於 `nginx:alpine`，把 `index.html` 複製到 `/usr/share/nginx/html/`。建構並執行，用瀏覽器確認能看到你的自訂頁面。
>
> ```bash
> docker build -t my-web .
> docker run -d -p 8080:80 my-web
> # 打開瀏覽器訪問 http://localhost:8080
> ```

### 3.4 WORKDIR：設定工作目錄

`WORKDIR` 設定後續指令的工作目錄。如果目錄不存在，Docker 會自動建立。

```dockerfile
WORKDIR /app

# 之後的 RUN、COPY、CMD 等都在 /app 下執行
RUN pwd          # 輸出：/app
COPY . .         # 等同於 COPY . /app/
CMD ["python", "app.py"]  # 在 /app 下執行 python app.py
```

#### 為什麼不要用 RUN cd？

初學者常犯的錯誤：

```dockerfile
# ❌ 錯誤！
RUN cd /app
RUN pwd          # 輸出 /，不是 /app！
```

為什麼？因為每個 RUN 都是**獨立的 shell**。第一個 RUN 裡面 cd 到 /app，但這個 shell 結束後，效果就消失了。第二個 RUN 又是一個全新的 shell，工作目錄回到預設的 `/`。

用 WORKDIR 才是正確的做法。WORKDIR 的效果會持續到後面所有的指令。

```dockerfile
# ✅ 正確！
WORKDIR /app
RUN pwd          # 輸出 /app ✓
```

你也可以多次使用 WORKDIR，而且支援相對路徑：

```dockerfile
WORKDIR /app
WORKDIR src
WORKDIR utils
RUN pwd          # 輸出 /app/src/utils
```

### 3.5 ENV vs ARG：環境變數 vs 建構參數

這兩個長得很像，但生命週期完全不同。我用一個比喻來幫你們記住——

**ENV 是刺青，永久的。** 建構的時候刺上去，容器跑起來之後還在。

**ARG 是貼紙，暫時的。** 建構的時候貼上去用一下，建構完了就撕掉，容器跑起來之後就看不到了。

#### ENV：執行時也存在

```dockerfile
ENV APP_VERSION=1.0.0
ENV APP_HOME=/app
ENV NODE_ENV=production

# 後續指令可以引用
WORKDIR $APP_HOME
RUN echo "Version: $APP_VERSION"
```

容器啟動後，這些變數還在：

```bash
docker run my-app env
# 會看到 APP_VERSION=1.0.0
# 會看到 NODE_ENV=production
```

而且可以在 `docker run` 時用 `-e` 覆蓋：

```bash
docker run -e NODE_ENV=development my-app
```

#### ARG：只在建構時存在

```dockerfile
ARG PYTHON_VERSION=3.11
FROM python:${PYTHON_VERSION}

ARG APP_ENV=production
RUN echo "Building for $APP_ENV"
```

用 `--build-arg` 在建構時傳入：

```bash
docker build --build-arg PYTHON_VERSION=3.10 -t my-app .
docker build --build-arg APP_ENV=development -t my-app .
```

但是容器跑起來之後：

```bash
docker run my-app env
# 看不到 APP_ENV！它只存在於建構過程中
```

#### 對照表

| 比較 | ENV（刺青） | ARG（貼紙） |
|------|------------|------------|
| 建構時可用 | ✅ | ✅ |
| **執行時可用** | **✅** | **❌** |
| 建構時覆蓋 | ❌ | ✅（`--build-arg`） |
| 執行時覆蓋 | ✅（`-e`） | ❌（已經不在了） |
| 適合放什麼 | 應用程式需要的設定 | 建構時的版本號、開關 |

一個常見的搭配技巧——用 ARG 接收建構參數，轉存到 ENV 讓執行時也能用：

```dockerfile
ARG APP_VERSION=1.0.0
ENV APP_VERSION=$APP_VERSION
```

這樣建構時可以用 `--build-arg APP_VERSION=2.0.0` 來指定，而且容器跑起來之後也看得到 APP_VERSION 環境變數。

> **📝 練習題 3：ENV 與 ARG**
>
> 寫一個 Dockerfile，用 ARG 定義 `BUILD_ENV`（預設 `production`），用 ENV 定義 `APP_VERSION=1.0.0`。
>
> 建構兩次：一次不帶 `--build-arg`，一次帶 `--build-arg BUILD_ENV=development`。
>
> 然後用 `docker run <image> env` 檢查——哪個變數在容器裡看得到？哪個看不到？

### 3.6 EXPOSE：宣告埠號

`EXPOSE` 宣告這個容器會監聽哪個埠號。

```dockerfile
EXPOSE 80
EXPOSE 443
EXPOSE 3000
```

但是，注意！**EXPOSE 只是一種文件說明，它不會真的打開埠號！**

就像是在門上貼一個標籤「這扇門可以從 80 號進來」，但門本身並沒有被打開。你不用 `-p` 做埠號映射的話，外面還是連不進來。

```bash
# 即使 Dockerfile 裡寫了 EXPOSE 80
# 你還是必須用 -p 來映射
docker run -p 8080:80 my-web-app
```

那 EXPOSE 有什麼用？

**第一，文件作用。** 讓使用這個 Image 的人知道應該映射哪些埠號。你 `docker inspect` 的時候也能看到 EXPOSE 的資訊。

**第二，搭配 `-P`（大寫 P）使用。** `docker run -P` 會自動把所有 EXPOSE 宣告的埠號隨機映射到主機的高埠號：

```bash
docker run -P my-web-app
# Docker 會自動把 80 映射到一個隨機的高埠號，例如 32768

docker port <container_id>
# 80/tcp -> 0.0.0.0:32768
```

所以 EXPOSE 雖然「不做事」，但它是一個好的文件習慣。建議你們在 Dockerfile 裡都加上。

### 3.7 CMD vs ENTRYPOINT（重點中的重點！）

好了，接下來是整堂課最重要的部分。CMD 和 ENTRYPOINT 是 Dockerfile 裡面最容易搞混的兩個指令，也是面試最愛問的。我要花多一點時間來講。

#### CMD：容器的「預設命令」

`CMD` 定義容器啟動時「預設」要執行的命令。注意這個「預設」兩個字——它是可以被覆蓋的。

```dockerfile
FROM ubuntu:22.04
CMD ["echo", "Hello World"]
```

```bash
docker build -t demo-cmd .

# 情況一：不帶參數 → 執行 CMD 定義的命令
docker run demo-cmd
# 輸出：Hello World

# 情況二：帶參數 → CMD 被完全覆蓋！
docker run demo-cmd echo "Goodbye"
# 輸出：Goodbye

# 情況三：帶別的命令 → CMD 完全消失
docker run demo-cmd ls -la
# 輸出：當前目錄的檔案列表
```

看到了嗎？`docker run` 後面只要帶了任何命令，CMD 就被**完全覆蓋**了。不是附加，不是修改，而是整個被替換掉。

CMD 就像是手機的預設鈴聲——你不改它就用預設的，你一改它就完全換掉。

#### ENTRYPOINT：容器的「主程序」

`ENTRYPOINT` 定義容器的「主程序」，它**不會被** `docker run` 後面的參數覆蓋。相反，那些參數會被**附加**在 ENTRYPOINT 後面。

```dockerfile
FROM ubuntu:22.04
ENTRYPOINT ["echo", "Hello"]
```

```bash
docker build -t demo-ep .

# 情況一：不帶參數
docker run demo-ep
# 輸出：Hello

# 情況二：帶參數 → 參數被附加在 ENTRYPOINT 後面！
docker run demo-ep World
# 輸出：Hello World

docker run demo-ep Docker is awesome
# 輸出：Hello Docker is awesome
```

看到差異了嗎？ENTRYPOINT 不會被覆蓋，參數是被**附加上去**的。

ENTRYPOINT 就像是一台咖啡機——機器本身不會變（ENTRYPOINT），你可以選不同口味的咖啡（參數），但出來的一定是咖啡，不會變成果汁。

#### CMD + ENTRYPOINT 搭配使用

這才是最精華的用法——用 ENTRYPOINT 定義主程序，用 CMD 定義預設參數。

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY app.py .
ENTRYPOINT ["python", "app.py"]
CMD ["--port", "8080"]
```

```bash
# 不帶參數：ENTRYPOINT + CMD → python app.py --port 8080
docker run my-app

# 帶參數：CMD 被替換，ENTRYPOINT 保留 → python app.py --port 3000
docker run my-app --port 3000

# 帶別的參數：→ python app.py --debug --verbose
docker run my-app --debug --verbose
```

這個模式非常優雅：

- **ENTRYPOINT**：固定的部分——「這個容器就是跑 `python app.py` 的」
- **CMD**：可變的預設參數——「預設用 port 8080，但使用者可以改」

再舉一個更實用的例子：

```dockerfile
FROM alpine:3.18
RUN apk add --no-cache curl
ENTRYPOINT ["curl"]
CMD ["https://www.google.com"]
```

```bash
# 預設 curl google
docker run my-curl

# 改成 curl 其他網站
docker run my-curl https://httpbin.org/get

# 加上參數
docker run my-curl -s -o /dev/null -w "%{http_code}" https://www.google.com
```

這就把容器變成了一個「curl 工具」——主程序永遠是 curl，使用者只需要指定 URL 和選項。

#### Shell Form vs Exec Form

CMD 和 ENTRYPOINT 都有兩種寫法，這個差異**非常重要**：

```dockerfile
# Exec Form（推薦！）—— JSON 陣列格式
CMD ["python", "app.py"]
ENTRYPOINT ["python", "app.py"]

# Shell Form —— 直接寫字串
CMD python app.py
ENTRYPOINT python app.py
```

看起來差不多？差很多！

**Exec Form** 直接執行指定的程式。在容器裡，你的程式是 **PID 1**（系統中的第一個程序）。

**Shell Form** 會先啟動 `/bin/sh -c`，然後你的程式是 shell 的子程序。在容器裡，PID 1 是 `/bin/sh`，你的程式是 PID 不知道幾。

```bash
# Exec Form 的程序樹
PID 1: python app.py

# Shell Form 的程序樹
PID 1: /bin/sh -c "python app.py"
  └── PID 7: python app.py
```

這會導致一個嚴重問題：

當你執行 `docker stop` 的時候，Docker 會送一個 **SIGTERM** 信號給 PID 1，讓它優雅地關閉。

- **Exec Form**：PID 1 就是你的 Python 程式，它收到 SIGTERM，可以做清理工作然後優雅退出。
- **Shell Form**：PID 1 是 `/bin/sh`，shell 收到 SIGTERM 但**不會轉發**給你的 Python 程式！10 秒超時後，Docker 只好用 SIGKILL 強制殺掉，你的程式沒有機會做任何清理。

這就像——Exec Form 是老闆直接叫你下班（你可以先存檔再走），Shell Form 是老闆叫了一個傳話的，結果傳話的忘了告訴你（你在苦等，然後突然被拉出去）。

**結論：一律使用 Exec Form（JSON 陣列格式）。** 除非你真的需要 shell 的環境變數替換功能。

#### 完整對照表

| 特性 | CMD | ENTRYPOINT |
|------|-----|------------|
| 用途 | 預設命令/參數 | 主程序 |
| docker run 帶參數時 | **被完全覆蓋** | **參數被附加** |
| 一個 Dockerfile 裡 | 只有最後一個生效 | 只有最後一個生效 |
| 被 docker run 覆蓋 | 直接覆蓋 | 需要 `--entrypoint` |
| 推薦寫法 | Exec Form | Exec Form |
| 搭配使用 | 當預設參數 | 當主程序 |

#### 常見錯誤

**錯誤 1：CMD 寫了多個，只有最後一個生效**

```dockerfile
# ❌ 只有最後一個 CMD 會生效！
CMD ["echo", "first"]
CMD ["echo", "second"]
# 容器啟動時只會執行 echo second
```

**錯誤 2：用 Shell Form 導致收不到信號**

```dockerfile
# ❌ Shell Form，PID 1 不是你的程式
CMD python app.py

# ✅ Exec Form，PID 1 是你的程式
CMD ["python", "app.py"]
```

**錯誤 3：搞混 CMD 和 ENTRYPOINT**

```dockerfile
# 你想讓容器當作 curl 工具使用
# ❌ 用 CMD → docker run my-curl https://google.com 會覆蓋整個 CMD
CMD ["curl", "https://google.com"]

# ✅ 用 ENTRYPOINT → docker run my-curl https://google.com 會附加 URL
ENTRYPOINT ["curl"]
CMD ["https://google.com"]
```

> **📝 練習題 4：CMD vs ENTRYPOINT**
>
> 寫兩個 Dockerfile：
>
> **版本 A**（只用 CMD）：
> ```dockerfile
> FROM ubuntu:22.04
> CMD ["echo", "Hello Docker"]
> ```
>
> **版本 B**（只用 ENTRYPOINT）：
> ```dockerfile
> FROM ubuntu:22.04
> ENTRYPOINT ["echo", "Hello Docker"]
> ```
>
> 分別建構後，執行以下測試，記錄輸出差異：
> ```bash
> docker run <image>
> docker run <image> "I am a student"
> ```
>
> 用一句話總結 CMD 和 ENTRYPOINT 的核心差異。

### 3.8 USER：指定執行身份

`USER` 指定後續指令要用哪個使用者身份執行。

```dockerfile
FROM python:3.11-slim

# 先用 root 安裝需要的東西
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# 建立非 root 使用者
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 切換使用者
USER appuser

# 以 appuser 身份執行
CMD ["python", "app.py"]
```

為什麼要這麼做？**安全性。**

預設情況下，容器裡的程序是用 root 身份執行的。如果你的應用程式有漏洞被攻擊者利用了，攻擊者就直接拿到了容器內的 root 權限。雖然容器有隔離機制，但 root 權限還是增加了攻擊面。

用一個權限受限的使用者來執行應用程式，是正式環境的**最佳實踐**。開發階段可以先不設定，但部署到正式環境之前一定要加上。

注意 USER 的位置：要放在 `apt-get install` 和 `pip install` **之後**，因為安裝套件需要 root 權限。先用 root 把該裝的裝好，最後才切換到普通使用者執行你的應用程式。

### 3.9 VOLUME：在 Dockerfile 中宣告掛載點

`VOLUME` 宣告這個容器有某些目錄的資料需要被持久化。

```dockerfile
FROM mysql:8.0

# 宣告資料目錄需要持久化
VOLUME /var/lib/mysql
```

效果：如果使用者在 `docker run` 時沒有手動用 `-v` 掛載這個目錄，Docker 會**自動建立一個匿名 Volume** 掛載上去，確保資料不會隨著容器刪除而消失。

還記得我們前面學 Volume 的時候講過的嗎？VOLUME 指令就是把那個概念寫進 Dockerfile 裡面。

但老實說，更推薦在 `docker run` 時明確用 `-v` 指定掛載路徑：

```bash
docker run -v mysql-data:/var/lib/mysql mysql:8.0
```

因為匿名 Volume 的名字是一串亂碼，很難管理。Dockerfile 裡的 VOLUME 更像是一種「提醒」——告訴使用者「嘿，這個目錄的資料很重要，記得掛載！」

### 3.10 HEALTHCHECK：健康檢查

`HEALTHCHECK` 讓 Docker 可以定期檢查容器裡的服務是否正常運作。

```dockerfile
FROM nginx:alpine

HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=5s \
  CMD curl -f http://localhost/ || exit 1
```

參數說明：

| 參數 | 說明 | 預設 |
|------|------|------|
| `--interval` | 每隔多久檢查一次 | 30s |
| `--timeout` | 超過多久算超時 | 30s |
| `--retries` | 連續失敗幾次才算不健康 | 3 |
| `--start-period` | 啟動緩衝時間（這段時間內失敗不算數） | 0s |

容器有三種健康狀態：

1. **starting**：剛啟動，還在緩衝期
2. **healthy**：健康檢查通過
3. **unhealthy**：連續多次健康檢查失敗

```bash
docker ps
# CONTAINER ID   IMAGE       STATUS
# abc123         my-app      Up 30s (healthy)
```

寫在 Dockerfile 裡的好處是：所有用這個 Image 跑的容器都**自動**有健康檢查，不需要每次 `docker run` 時手動加。後面學 Docker Compose 和 Swarm 的時候，健康檢查會變得更加重要。

### 3.11 指令總覽

把所有指令彙整成一張表：

| 指令 | 用途 | 會產生新 Layer？ |
|------|------|----------------|
| FROM | 指定基礎映像檔 | ✅ |
| RUN | 建構時執行命令 | ✅ |
| COPY | 複製檔案到 Image | ✅ |
| ADD | 複製檔案（支援解壓） | ✅ |
| WORKDIR | 設定工作目錄 | ✅ |
| ENV | 設定環境變數 | ✅ |
| ARG | 建構時參數 | ❌ |
| EXPOSE | 宣告埠號 | ❌ |
| CMD | 容器預設命令 | ❌ |
| ENTRYPOINT | 容器主程序 | ❌ |
| USER | 指定執行身份 | ❌ |
| VOLUME | 宣告掛載點 | ❌ |
| HEALTHCHECK | 健康檢查 | ❌ |

注意看最右邊那一欄——不是每個指令都會產生 Layer 的。FROM、RUN、COPY、ADD、WORKDIR、ENV 會，其他的只是修改 Image 的 metadata（中繼資料），不會增加 Layer。

---

## 四、實作練習：打包 Python Flask 應用（10 分鐘）

好，理論講完了，我們來做一個完整的實作——把一個真正的 Python Flask Web 應用打包成 Docker Image。

### 4.1 準備應用程式

先建立專案目錄：

```bash
mkdir flask-docker-demo
cd flask-docker-demo
```

建立 `app.py`：

```python
from flask import Flask
import os
import datetime

app = Flask(__name__)

@app.route('/')
def hello():
    return {
        "message": "Hello from Docker!",
        "hostname": os.uname().nodename,
        "version": "1.0.0",
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.route('/health')
def health():
    return {"status": "healthy"}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

建立 `requirements.txt`：

```
flask==3.0.0
```

### 4.2 撰寫 Dockerfile

現在重點來了——我們要怎麼寫 Dockerfile？

在動手寫之前，先想清楚步驟：

1. 選一個有 Python 的基礎 Image
2. 設定工作目錄
3. 安裝 Python 套件
4. 複製我們的程式碼
5. 告訴 Docker 容器會用哪個 port
6. 設定啟動命令

```dockerfile
# 1. 選擇基礎映像檔：Python 3.11 的精簡版
FROM python:3.11-slim

# 2. 設定工作目錄
WORKDIR /app

# 3. 先複製 requirements.txt 並安裝套件
#    為什麼要分開複製？等一下示範 cache 的時候就知道了
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 複製應用程式碼
COPY app.py .

# 5. 宣告埠號
EXPOSE 5000

# 6. 設定健康檢查
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1

# 7. 容器啟動命令
CMD ["python", "app.py"]
```

我來解釋幾個重點：

**為什麼用 `python:3.11-slim` 而不是 `python:3.11`？** 因為完整版有 ~900MB，slim 版只有 ~120MB。省了七百多 MB，而且我們不需要那些額外的工具。

**為什麼 COPY 分兩步？** 先 COPY `requirements.txt`，裝完套件，再 COPY `app.py`。這是為了**善用 Docker 的 Build Cache**。等一下我們改程式碼重新 build 的時候，你就會明白這個技巧有多重要。

**`pip install --no-cache-dir` 是什麼意思？** pip 預設會把下載的套件快取起來，但在 Docker 裡面我們不需要快取（以後不會在這個 Image 裡面再跑 pip install 了），加 `--no-cache-dir` 可以省掉快取檔案的空間。

### 4.3 建構與執行

```bash
# 建構 Image
docker build -t flask-demo:v1 .
```

你會看到完整的建構過程：

```
Sending build context to Docker daemon  4.096kB
Step 1/7 : FROM python:3.11-slim
 ---> xxxxxxxx
Step 2/7 : WORKDIR /app
 ---> xxxxxxxx
Step 3/7 : COPY requirements.txt .
 ---> xxxxxxxx
Step 4/7 : RUN pip install --no-cache-dir -r requirements.txt
 ---> Running in xxxxxxxx
Collecting flask==3.0.0
...
Successfully installed flask-3.0.0 ...
Step 5/7 : COPY app.py .
 ---> xxxxxxxx
Step 6/7 : EXPOSE 5000
 ---> xxxxxxxx
Step 7/7 : CMD ["python", "app.py"]
 ---> xxxxxxxx
Successfully built xxxxxxxx
Successfully tagged flask-demo:v1
```

```bash
# 查看 Image
docker images flask-demo

# 執行容器
docker run -d -p 5000:5000 --name my-flask flask-demo:v1

# 查看容器狀態
docker ps
```

### 4.4 驗證

```bash
# 用 curl 測試
curl http://localhost:5000
```

輸出：

```json
{
  "hostname": "a1b2c3d4e5f6",
  "message": "Hello from Docker!",
  "timestamp": "2025-01-15T10:30:00.123456",
  "version": "1.0.0"
}
```

也可以打開瀏覽器訪問 `http://localhost:5000`。

看到 hostname 了嗎？那串亂碼就是容器的 ID。每次跑一個新容器，hostname 都會不一樣。這就是容器的隔離性——每個容器都以為自己是一台獨立的機器。

```bash
# 測試健康檢查端點
curl http://localhost:5000/health
```

```json
{
  "status": "healthy"
}
```

### 4.5 體驗 Build Cache 的威力

現在，重頭戲來了。

我們修改 `app.py`，把 version 改成 2.0.0：

```python
# 只改這一行
"version": "2.0.0",
```

然後重新建構：

```bash
docker build -t flask-demo:v2 .
```

注意看輸出：

```
Step 1/7 : FROM python:3.11-slim
 ---> Using cache
Step 2/7 : WORKDIR /app
 ---> Using cache
Step 3/7 : COPY requirements.txt .
 ---> Using cache
Step 4/7 : RUN pip install --no-cache-dir -r requirements.txt
 ---> Using cache
Step 5/7 : COPY app.py .
 ---> 新的 Layer（因為 app.py 改了）
Step 6/7 : EXPOSE 5000
 ---> 新的 Layer
Step 7/7 : CMD ["python", "app.py"]
 ---> 新的 Layer
```

看到了嗎？**Step 1 到 Step 4 全部 Using cache！** 只有 Step 5 開始才重新跑，因為 `app.py` 的內容變了。

pip install 那一步直接跳過了！省下了可能一兩分鐘的安裝時間。

這就是為什麼我們要先 COPY `requirements.txt` 再 COPY `app.py` 的原因。如果你把它們合在一起：

```dockerfile
# ❌ 不好的寫法
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
```

那不管你改了什麼檔案——哪怕只是改了 `app.py` 裡面的一行字——`COPY . .` 的快取就失效了，後面的 `pip install` 也要重新跑。

```dockerfile
# ✅ 好的寫法（Cache 友善）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
```

原則：**把不常變的東西放前面，常變的東西放後面。** 依賴套件不常變，程式碼常變。所以先裝依賴，後放程式碼。

記住這個口訣：**依賴先裝，程式碼後放。**

```bash
# 最後查看分層結構
docker history flask-demo:v1

# 清理
docker stop my-flask
docker rm my-flask
```

> **📝 練習題 5：完整應用打包**
>
> 用你熟悉的程式語言，寫一個簡單的 Hello World HTTP 伺服器，然後寫 Dockerfile 打包它。
>
> **Node.js 範例：**
>
> `server.js`：
> ```javascript
> const http = require('http');
> const server = http.createServer((req, res) => {
>   res.writeHead(200, {'Content-Type': 'application/json'});
>   res.end(JSON.stringify({message: 'Hello from Docker!', hostname: require('os').hostname()}));
> });
> server.listen(3000, () => console.log('Server running on port 3000'));
> ```
>
> `Dockerfile`：
> ```dockerfile
> FROM node:20-slim
> WORKDIR /app
> COPY server.js .
> EXPOSE 3000
> CMD ["node", "server.js"]
> ```
>
> 要求：
> - 使用 WORKDIR 設定工作目錄
> - 使用 EXPOSE 宣告埠號
> - 能用 `docker run -p` 執行並在瀏覽器看到回應

---

## 五、本堂課小結

好，我們來回顧一下今天學的內容。

### 為什麼要用 Dockerfile

- `docker commit` 有三大問題：不可重現、不可追溯、不可自動化
- Dockerfile 是 Image 的食譜——可重現、可追溯、可自動化
- 用 `docker history` 可以查看別人的 Image 是怎麼建構的

### 建構流程

- `docker build -t name:tag .` 建構 Image
- 最後的 `.` 是 Build Context，會被打包送給 Docker Daemon
- 每個指令產生一個 Layer
- Docker 會快取每一層，內容沒變就用快取

### 核心指令速記

| 指令 | 一句話說明 | 口訣 |
|------|----------|------|
| FROM | 選基礎映像檔 | 地基 |
| RUN | 建構時執行命令 | 施工 |
| COPY | 複製檔案 | 搬東西 |
| WORKDIR | 設定工作目錄 | 定位 |
| ENV | 環境變數（容器內也有） | 刺青 |
| ARG | 建構參數（建構完就沒了） | 貼紙 |
| EXPOSE | 宣告埠號（只是文件） | 門牌 |
| CMD | 預設命令（可被覆蓋） | 預設鈴聲 |
| ENTRYPOINT | 主程序（參數附加） | 咖啡機 |
| USER | 指定執行身份 | 安全帽 |
| VOLUME | 宣告掛載點 | 保險箱 |
| HEALTHCHECK | 健康檢查 | 體檢 |

### 最重要的三件事

1. **CMD vs ENTRYPOINT**：CMD 可被覆蓋，ENTRYPOINT 的參數是附加的。搭配使用最強大。
2. **Shell Form vs Exec Form**：一律用 Exec Form（JSON 陣列），否則你的程式收不到 SIGTERM。
3. **Cache 友善的 COPY 順序**：先 COPY 依賴檔、安裝依賴，最後再 COPY 程式碼。依賴先裝，程式碼後放。

下一堂課，我們進入 Dockerfile 三部曲的第二部——**Dockerfile 進階與最佳化**。我們會學 `.dockerignore`、Multi-stage Build（多階段建構）、怎麼讓 Image 又小又安全。學完那堂課，你寫出來的 Dockerfile 就能達到生產環境的標準了。

好，今天先到這裡，大家有問題可以舉手。休息十分鐘後我們繼續。

---

## 板書 / PPT 建議

1. **docker commit vs Dockerfile 比較表** —— 用三列對比：可重現、可追溯、可自動化
2. **Build Context 示意圖** —— Client 把目錄打包送給 Docker Daemon 的流程圖
3. **Image 分層示意圖** —— 每個 Dockerfile 指令疊一層 Layer
4. **CMD vs ENTRYPOINT 行為對比** —— 用兩欄表格，分別展示帶參數/不帶參數的行為
5. **Shell Form vs Exec Form 差異圖** —— 畫出 PID 1 是誰的程序樹
6. **ENV vs ARG 生命週期圖** —— 時間軸上標出「建構時」和「執行時」，ENV 跨越兩個階段，ARG 只在建構時
7. **Cache 友善的 COPY 順序** —— 先 requirements.txt → pip install → 再 app.py 的流程圖，標示哪些步驟用了 cache
8. **Flask 實作的完整 Dockerfile** —— 投影在螢幕上，每一行都有註解
9. **指令速查表** —— 所有指令、用途、是否產生 Layer 的完整表格
