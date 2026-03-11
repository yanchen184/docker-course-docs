# Day 2 第二小時：Docker 架構與工作原理

---

## 一、前情提要（3 分鐘）

上一個小時我們講了為什麼需要容器技術，以及 Docker 的基本概念。

我們知道了：
- 容器解決環境一致性問題
- Docker 有三個核心元素：Image、Container、Registry
- 容器比虛擬機輕量、快速

這個小時，我們要深入了解 Docker 的架構。知道它底層怎麼運作，之後使用起來會更有信心，出問題也知道怎麼排查。

> 💡 **提醒**：本堂課出現的 Docker 指令（如 `docker run`、`docker history`）是為了**說明架構原理**，幫助你理解概念。Docker 的安裝與實際操作會在下一堂課（第三小時）進行，屆時你會親自動手練習這些指令。

---

## 二、Client-Server 架構深入（5 分鐘）

### 2.1 為什麼要分開 Client 和 Daemon？

你可能會問：為什麼要分成 Client 和 Daemon？直接一個程式不就好了？

分開有幾個好處：

**遠端操作**

Client 和 Daemon 可以在不同機器上。你可以在自己的筆電上操作遠端伺服器上的 Docker。

```bash
# 連接遠端 Docker
docker -H tcp://192.168.1.100:2375 ps
```

**權限分離**

Daemon 需要 root 權限才能操作容器。Client 可以以普通使用者身份運行，透過 socket 跟 Daemon 溝通。

**服務化**

Daemon 以背景服務運行，開機自動啟動。不管你有沒有開終端機，Docker 服務都在。

---

## 三、Docker Client 詳解（8 分鐘）

### 3.1 Docker CLI

Docker Client 最常見的形式就是命令列工具 `docker`。

```bash
docker version    # 查看版本
docker info       # 查看系統資訊
docker ps         # 列出容器
docker images     # 列出映像檔
docker run        # 執行容器
```

這些命令都是 Docker Client 提供的。

### 3.2 與 Daemon 的溝通方式

Docker Client 透過以下方式與 Daemon 溝通：

**Unix Socket（預設，Linux/Mac）**

```
/var/run/docker.sock
```

這是一個本機的 socket 檔案。Client 和 Daemon 在同一台機器上時，透過這個 socket 溝通。

**TCP**

```
tcp://localhost:2375    # 未加密
tcp://localhost:2376    # TLS 加密
```

用於遠端連線。生產環境務必使用 2376 + TLS。

**環境變數設定**

```bash
export DOCKER_HOST=tcp://192.168.1.100:2376
export DOCKER_TLS_VERIFY=1
export DOCKER_CERT_PATH=~/.docker/certs
```

設定後，所有 docker 命令都會送到遠端。

### 3.3 Docker API

Docker Client 底層是透過 REST API 跟 Daemon 溝通。你也可以直接呼叫 API：

```bash
# 透過 socket 呼叫 API
curl --unix-socket /var/run/docker.sock http://localhost/containers/json

# 透過 TCP 呼叫 API
curl http://localhost:2375/containers/json
```

這代表你可以用任何程式語言寫程式來操作 Docker，只要能發 HTTP 請求就行。

Python、Go、Java、Node.js 都有官方或社群維護的 Docker SDK。

---

## 四、Docker Daemon 詳解（15 分鐘）

### 4.1 dockerd

Docker Daemon 的執行檔叫做 `dockerd`。它在背景持續運行，等待 Client 的請求。

在 Linux 上，dockerd 通常由 systemd 管理：

```bash
# 查看 Docker 服務狀態
systemctl status docker

# 啟動 Docker 服務
systemctl start docker

# 停止 Docker 服務
systemctl stop docker

# 設定開機自動啟動
systemctl enable docker
```

### 4.2 Daemon 的職責

Docker Daemon 負責所有實際的工作：

**Image 管理**
- 從 Registry 下載 Image
- 在本機儲存和管理 Image
- 建立新的 Image

**Container 管理**
- 建立、啟動、停止、刪除 Container
- 監控 Container 狀態
- 收集 Container 日誌

**Network 管理**
- 建立和管理 Docker 網路
- 處理容器之間的網路連接
- 處理 Port Mapping

**Volume 管理**
- 建立和管理資料卷
- 處理資料持久化

**安全**
- 驗證 API 請求
- 管理容器的隔離和權限

### 4.3 containerd

Docker Daemon 不是直接管理容器，它把容器相關的工作委託給 containerd。

containerd 是一個獨立的容器執行環境（Container Runtime），負責：
- 容器的生命週期管理
- Image 的傳輸和儲存
- 容器的執行和監督

架構是這樣的：

```
Docker Client
     ↓
Docker Daemon (dockerd)
     ↓
containerd
     ↓
runc（實際執行容器）
```

**為什麼要這樣分層？**

歷史原因。早期 Docker 是一個單體程式，後來為了標準化，把容器執行的部分拆出來變成 containerd，再後來把最底層的執行部分拆出來變成 runc。

runc 是 OCI（Open Container Initiative）標準的參考實作。這個標準定義了容器應該怎麼執行，任何符合 OCI 標準的執行器都可以替換 runc。

**這對你有什麼影響？**

大部分時候沒影響，你只要跟 Docker Daemon 打交道就好。但了解這個架構有助於排查問題，也有助於理解為什麼 Kubernetes 可以不用 Docker。

### 4.4 Daemon 設定

Docker Daemon 的設定檔在：

```
/etc/docker/daemon.json
```

常見的設定：

```json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "registry-mirrors": [
    "https://mirror.example.com"
  ],
  "insecure-registries": [
    "192.168.1.100:5000"
  ],
  "default-address-pools": [
    {"base": "172.17.0.0/16", "size": 24}
  ]
}
```

**storage-driver**：儲存驅動，overlay2 是目前最推薦的。

**log-driver**：日誌驅動，控制容器日誌怎麼儲存。

**log-opts**：日誌選項，設定日誌檔案大小上限，避免日誌把硬碟塞爆。

**registry-mirrors**：Registry 映射站，加速 Image 下載。

**insecure-registries**：允許使用 HTTP（而非 HTTPS）連接的 Registry，用於測試環境。

修改設定後要重啟 Docker：

```bash
systemctl restart docker
```

---

## 五、Docker Hub 與官方文件（15 分鐘）

### 5.1 什麼是 Registry

Registry 是存放 Image 的倉庫。

你可以把 Registry 想像成 GitHub：
- GitHub 存放程式碼
- Registry 存放 Docker Image

就像 GitHub 有公開和私有 repo，Registry 也有公開和私有的 Image。

### 5.2 Docker Hub 官網導覽

Docker Hub 是最大的公開 Registry，網址是 hub.docker.com。這是你以後用 Docker 最常造訪的網站之一，所以我們花點時間來熟悉一下。

**首頁與搜尋**

打開 hub.docker.com，最醒目的就是搜尋欄。你可以直接搜尋你想要的軟體名稱，比如輸入「nginx」，就會列出所有跟 nginx 相關的 Image。

搜尋結果裡你會看到幾種標籤：
- **Official Image**（官方映像）：有一個藍色的「Official Image」標章。這是由 Docker 和上游軟體團隊共同維護的，品質和安全性有保證。
- **Verified Publisher**（認證發布者）：由經過 Docker 認證的組織發布，通常是大型軟體公司。
- **Sponsored OSS**（開源贊助）：Docker 贊助的開源專案。
- 其他就是社群使用者上傳的，品質參差不齊，使用前要多留意。

**映像詳情頁面**

點進任何一個 Image，比如官方的 nginx，你會看到一個非常豐富的頁面。我們以 nginx 為例來看看有哪些重要資訊：

**Overview（總覽）**：這是最重要的部分。官方映像的 Overview 通常寫得非常詳細，等於是一份完整的使用說明書。裡面會告訴你：
- 這個映像是做什麼的
- 怎麼啟動一個基本的容器
- 有哪些環境變數可以設定
- 設定檔放在容器的哪個路徑
- 怎麼掛載自己的設定檔
- 怎麼搭配 Docker Compose 使用

很多初學者遇到問題就直接 Google，其實第一步應該先去看 Docker Hub 上的 Overview，八成的問題裡面都有答案。

**Tags（標籤）**：列出這個映像所有可用的版本。這裡你可以看到每個 tag 的名稱、壓縮後的大小、最後更新時間、支援的 CPU 架構（amd64、arm64 等）。

點進某個 tag，還能看到這個映像的 Layer 資訊——每一層做了什麼操作、大小是多少。這對理解映像的組成非常有幫助，我們等一下講分層結構的時候會再回來看。

**下載量與星星數**：頁面上會顯示這個映像被下載了多少次、有多少人給星星。官方映像的下載量通常是幾十億次。這些數據可以幫助你判斷一個映像的可靠度——下載量越大、星星越多，通常越值得信賴。

**官方映像（Official Images）**

Docker Hub 上有很多官方維護的 Image，這些 Image 經過官方審核，品質有保證：

- `nginx`：Web 伺服器，下載量超過十億次
- `mysql`：關聯式資料庫
- `redis`：記憶體快取資料庫
- `python`：Python 執行環境
- `node`：Node.js 執行環境
- `ubuntu`：Ubuntu 作業系統
- `alpine`：只有 5MB 的精簡 Linux，很多映像用它做基礎

官方映像的名稱沒有斜線，直接就是 `nginx`、`mysql`。這是辨認官方映像最簡單的方式。

**社群映像**

其他使用者上傳的 Image，名稱格式是 `使用者名稱/映像名稱`：

- `bitnami/nginx`：Bitnami 維護的 nginx，預設設定跟官方不同
- `linuxserver/nginx`：LinuxServer.io 社群維護的版本

使用社群映像要注意來源可靠性。選擇的時候看幾個指標：下載量、星星數、最後更新時間、是否有 Dockerfile 原始碼連結。如果一個映像很久沒更新，可能存在已知的安全漏洞。

**私有映像**

Docker Hub 也可以存放私有 Image，但免費帳號只能有一個私有 repo。

### 5.3 Docker 官方文件

除了 Docker Hub，還有一個網站你一定要收藏：**docs.docker.com**——Docker 的官方文件。

這份文件的品質非常高，是學 Docker 最權威的參考資料。我們來看看它的結構：

**Get started（入門指南）**

這裡有一個完整的新手教學，從安裝到跑起第一個容器，一步一步帶你走。如果你課後想自己複習，從這裡開始最好。

**Guides（指引）**

針對不同主題的深入指南，比如：
- 怎麼寫好的 Dockerfile
- 怎麼管理 Docker 網路
- 怎麼做資料持久化
- 怎麼建構多階段映像

每個指南都有完整的範例和最佳實踐，比任何第三方教學都權威。

**Reference（參考手冊）**

這是查指令用的。每一個 Docker CLI 命令都有詳細的說明，包括所有的參數、選項、使用範例。比如你想查 `docker run` 有哪些參數，直接在這裡搜尋就好。

以後遇到不確定的指令用法，養成一個習慣：**先查官方文件，再 Google。** 官方文件永遠是最新、最準確的。很多部落格文章可能是幾年前寫的，裡面的指令或參數可能已經過時了。

**Manuals（手冊）**

更深入的技術文件，涵蓋 Docker Engine、Docker Compose、Docker Build 等各個元件的完整說明。當你需要了解某個功能的細節時，這裡是最好的去處。

**怎麼善用這兩個網站**

我給大家一個建議，學 Docker 的過程中養成這個習慣：

1. **想用一個新軟體**（比如 Redis、PostgreSQL）→ 先去 Docker Hub 搜尋官方映像，看 Overview 的使用說明
2. **想了解某個指令的用法**→ 去 docs.docker.com 查 Reference
3. **想深入了解某個主題**→ 去 docs.docker.com 看 Guides
4. **遇到錯誤訊息** → 先去官方文件的 Troubleshooting，再去 Google 或 Stack Overflow

這個順序很重要。很多人一遇到問題就 Google，找到一堆過時的答案，反而走更多彎路。官方文件雖然是英文的，但寫得很清楚，搭配翻譯工具完全看得懂。

### 5.4 Image 的命名規則

完整的 Image 名稱格式：

```
[registry-host/][namespace/]repository[:tag]
```

**範例：**

```bash
nginx                              # 官方映像，預設 tag 是 latest
nginx:1.25                         # 指定版本
nginx:1.25-alpine                  # Alpine 版本（更小）

mysql:8.0                          # MySQL 8.0
python:3.11-slim                   # Python 3.11 精簡版

bitnami/nginx                      # 社群映像
bitnami/nginx:1.25                 # 社群映像指定版本

gcr.io/google-containers/nginx     # Google Container Registry 的映像
192.168.1.100:5000/myapp           # 私有 Registry 的映像
```

**Tag 的重要性**

`latest` 是預設的 tag，但它不代表最新版本——它只是一個名字叫 latest 的 tag。

**永遠不要在生產環境使用 latest tag。** 因為你不知道它實際指向哪個版本，而且可能會變。

應該使用具體的版本號：

```bash
# 不好
docker pull nginx:latest

# 好
docker pull nginx:1.25.3
```

### 5.5 私有 Registry

企業通常會架設私有 Registry，原因：

1. **安全性**：不想把公司的 Image 放在公開平台
2. **速度**：內網下載比較快
3. **合規**：某些產業法規要求資料不能離開公司

常見的私有 Registry 方案：

**Docker Registry**

Docker 官方提供的開源 Registry，最簡單：

```bash
docker run -d -p 5000:5000 --name registry registry:2
```

**Harbor**

VMware 開源的企業級 Registry，功能豐富：
- 漏洞掃描
- 存取控制
- 映像簽名
- 多租戶

**其他雲端服務**

- AWS ECR（Elastic Container Registry）
- GCP GCR（Google Container Registry）
- Azure ACR（Azure Container Registry）
- 阿里雲 ACR

### 5.6 Image 的拉取和推送

**拉取 Image**

```bash
# 從 Docker Hub 拉取
docker pull nginx:1.25

# 從私有 Registry 拉取
docker pull 192.168.1.100:5000/myapp:v1
```

**登入 Registry**

```bash
# 登入 Docker Hub
docker login

# 登入私有 Registry
docker login 192.168.1.100:5000
```

**推送 Image**

```bash
# 先用 docker tag 設定目標名稱
docker tag myapp:v1 192.168.1.100:5000/myapp:v1

# 推送
docker push 192.168.1.100:5000/myapp:v1
```

---

## 六、Image 的分層結構（20 分鐘）

在深入分層結構之前，我想先問大家兩個問題。上一堂課我們提到容器比虛擬機更輕量、更快速，我給了大家具體的數據。但我們還沒有解釋**為什麼**。

### 6.1 兩個關鍵問題

**問題一：Docker Image 為什麼只有幾 MB？**

我們平時安裝一個 CentOS，ISO 檔案少說也有 4-5 GB。但是你去 Docker Hub 看一下 CentOS 的映像，才 200 多 MB。同樣是一個「作業系統」，為什麼大小差了幾十倍？

更誇張的是 Alpine Linux，它的 Docker 映像只有 5 MB。5 MB！你隨便拍一張照片都不止 5 MB，但它卻是一個可以跑程式的完整 Linux 環境。

**問題二：Container 為什麼可以 1 秒啟動？**

你們裝過虛擬機對吧？開一台虛擬機，從按下電源鍵到看到登入畫面，少說要一兩分鐘。中間你會看到 BIOS 畫面、引導程式、核心載入、各種系統服務啟動......一大堆流程跑完，系統才算真正起來。

但 Docker 容器呢？你打一個 `docker run`，還沒來得及眨眼，容器就已經在跑了。這根本不合理啊——一個「作業系統」怎麼可能在一秒內啟動？

要回答這兩個問題，我們得先理解 Docker Image 的分層結構。

### 6.2 聯合文件系統（UnionFS）

Docker Image 的分層結構建立在**聯合文件系統（UnionFS）**之上。UnionFS 可以將多個目錄「聯合掛載」到同一個虛擬目錄下，每一層的修改都作為一次獨立的提交疊加上去——概念上類似 Git 的版本控制，每操作一步就產生一個記錄。

Docker Image 不是一個單一的檔案，它是由多個層（Layer）疊加而成的。

### 6.3 bootfs 與 rootfs：回答兩個問題

在最底層，Docker 使用兩個關鍵結構。理解了這兩個結構，剛才的兩個問題就全部迎刃而解。

**bootfs（Boot File System）**

bootfs 包含 bootloader（引導程式）和 kernel（內核）。

你們想想看，我們開一台實體電腦或虛擬機，最耗時的步驟是什麼？就是載入內核。BIOS 要先把 bootloader 載入記憶體，bootloader 再把 kernel 載入記憶體，kernel 再初始化各種硬體驅動、啟動系統服務......這個過程是分鐘級的。

但 Docker 容器不需要做這些事情。為什麼？因為宿主機的內核已經在運行了！容器直接共用宿主機的內核，**不需要重新引導**。bootfs 這一層在容器啟動時會被用到，但因為內核已經在記憶體裡了，加載完成後 bootfs 就會被卸載。

**這就是為什麼容器可以 1 秒啟動——因為它跳過了最耗時的內核引導過程。**

打一個比方：開虛擬機就像蓋一棟新房子，從打地基開始；而啟動容器就像在已經蓋好的大樓裡租一間辦公室，搬張桌子進去就能開工了。地基（內核）已經在那裡了，你不需要重新打。

**rootfs（Root File System）**

rootfs 在 bootfs 之上，就是一個精簡的 Linux 發行版。你進到容器裡面看到的那些目錄——`/bin`、`/etc`、`/usr`、`/var`——都是 rootfs 提供的。

但注意，這個 rootfs 是**極度精簡**的。一個完整的 CentOS ISO 有 4-5 GB，是因為裡面包含了：
- 完整的 kernel 和所有驅動程式
- 圖形桌面環境（GNOME、KDE）
- 各種系統服務（防火牆、SELinux、NetworkManager）
- 大量的工具軟體（文字編輯器、壓縮工具、網路診斷工具）
- 文件和手冊頁面
- 國際化語言包

Docker 裡的 CentOS 只保留了最基本的東西：
- 核心的命令（ls、cat、cp、mkdir 這些）
- 最基本的工具庫（glibc、openssl 等）
- 套件管理器（yum）

其他的全部拿掉。kernel？不需要，用宿主機的。桌面環境？容器又不接螢幕，不需要。文件手冊？可以上網查，不需要。語言包？只留英文就好。

**這就是為什麼 Docker Image 只有幾百 MB 甚至幾 MB——因為它只保留了一個精簡的 rootfs，底層 kernel 直接用宿主機的。**

狂神在影片裡秀過這個對比：他下載的 CentOS ISO 是 1.5 GB，但 `docker images` 裡的 CentOS 只有 237 MB。你連那些最基本的命令比如 `ll`、`vim` 它都沒有，因為它被精簡到極致了。

```
一個完整的 Linux 系統：

┌─────────────────────────────────┐
│ 桌面環境、文件、語言包、工具軟體  │  ← Docker 不要
├─────────────────────────────────┤
│ 系統服務（防火牆、SELinux...）    │  ← Docker 不要
├─────────────────────────────────┤
│ rootfs（基本命令 + 工具庫）       │  ← Docker 只要這個（精簡版）
├─────────────────────────────────┤
│ kernel（內核 + 驅動）             │  ← Docker 不打包，用宿主機的
├─────────────────────────────────┤
│ bootfs（引導程式）               │  ← Docker 不打包，用宿主機的
└─────────────────────────────────┘
```

所以你現在回頭看這個問題：為什麼 Alpine 只有 5 MB？因為 Alpine 本身就是一個極簡的 Linux 發行版，它用 musl libc 替代了龐大的 glibc，用 BusyBox 把幾十個常用命令壓縮成一個執行檔。再加上 Docker 不需要打包 kernel，所以最終就只剩 5 MB。

### 6.4 分層結構

回到分層。Docker Image 是由多個層（Layer）疊加而成的。

每一層代表一組檔案系統的變更：
- 第一層可能是 Ubuntu 基礎系統（rootfs）
- 第二層可能是安裝 Python
- 第三層可能是安裝你的套件
- 第四層可能是複製你的程式碼

```
┌─────────────────────────┐
│   你的應用程式程式碼      │  Layer 4
├─────────────────────────┤
│   pip install 套件       │  Layer 3
├─────────────────────────┤
│   安裝 Python            │  Layer 2
├─────────────────────────┤
│   Ubuntu 基礎系統        │  Layer 1
└─────────────────────────┘
```

### 6.5 為什麼要分層？

**節省空間**

假設你有 10 個應用程式，都是用 Python 3.11 + Ubuntu 為基礎。

如果不分層，每個 Image 都要包含完整的 Ubuntu + Python，10 個 Image 就要 10 份重複的資料。

有了分層，Ubuntu 和 Python 的 Layer 只需要存一份，10 個 Image 共用這些 Layer，只有應用程式自己的部分是獨立的。

**加速下載**

當你拉取一個 Image，Docker 會檢查本機已經有哪些 Layer。已經有的就不用再下載了。

```bash
$ docker pull python:3.11

3.11: Pulling from library/python
a2abf6c4d29d: Already exists      # 本機已有
a9edb18cadd1: Already exists      # 本機已有
589b7251471a: Already exists      # 本機已有
186b1aaa4aa6: Pull complete       # 需要下載
7c55dd8f39fa: Pull complete       # 需要下載
```

**加速建構**

當你建構 Image 時，如果某一層沒有變化，Docker 會使用快取，不需要重新建構。

這就是為什麼 Dockerfile 的順序很重要——把不常變動的放前面，常變動的放後面。我們之後講 Dockerfile 時會詳細說明。

### 6.6 查看 Image 的 Layer

```bash
# 查看 Image 的層次
docker history nginx:1.25
```

輸出類似：

```
IMAGE          CREATED       CREATED BY                                      SIZE
a6bd71f48f68   2 weeks ago   /bin/sh -c #(nop)  CMD ["nginx" "-g" "daemon…   0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  STOPSIGNAL SIGQUIT           0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  EXPOSE 80                    0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  ENTRYPOINT ["/docker-entr…   0B
<missing>      2 weeks ago   /bin/sh -c set -x     && groupadd --system -…   112MB
<missing>      2 weeks ago   /bin/sh -c #(nop)  ENV PKG_RELEASE=1~bookworm   0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  ENV NJS_VERSION=0.8.2        0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  ENV NGINX_VERSION=1.25.3     0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  LABEL maintainer=NGINX Do…   0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  CMD ["bash"]                 0B
<missing>      2 weeks ago   /bin/sh -c #(nop) ADD file:…                    74.8MB
```

每一行就是一個 Layer。`CREATED BY` 告訴你這一層是怎麼來的。

### 6.7 唯讀層與可寫層

Image 的所有 Layer 都是唯讀的。

當你用 Image 啟動一個 Container 時，Docker 會在最上面加一個可寫層（Writable Layer），也叫做 Container Layer。

```
┌─────────────────────────┐
│   Container Layer       │  可寫（Container 專屬）
├─────────────────────────┤
│   Layer 4               │  唯讀
├─────────────────────────┤
│   Layer 3               │  唯讀
├─────────────────────────┤
│   Layer 2               │  唯讀
├─────────────────────────┤
│   Layer 1               │  唯讀
└─────────────────────────┘
```

Container 裡的所有檔案操作——建立檔案、修改檔案、刪除檔案——都發生在這個可寫層。Image 本身不會被改變。

這就是為什麼同一個 Image 可以啟動多個 Container，而且互不影響——每個 Container 都有自己獨立的可寫層。

**用 `docker commit` 把容器變成新 Image**

既然容器層記錄了你所有的修改，那你可以把「鏡像層 + 容器層」重新打包成一個新的 Image。這就是 `docker commit` 的作用：

```bash
# 在容器內做了一些修改後，提交為新 Image
docker commit <container-id> my-custom-image:v1
```

新產生的 Image 會包含原本的所有唯讀層，加上你在容器層中所做的變更。別人拉取這個新 Image 後，就能得到你修改過的環境。

### 6.8 Copy-on-Write

如果 Container 想修改一個來自 Image Layer 的檔案，怎麼辦？

Docker 使用 Copy-on-Write（寫時複製）策略：

1. Container 想修改 /etc/nginx/nginx.conf
2. 這個檔案原本在 Layer 3（唯讀）
3. Docker 把這個檔案複製到 Container Layer
4. 修改發生在 Container Layer 的副本上
5. 原本的 Layer 3 不受影響

這個機制讓 Image 可以被多個 Container 共用，同時每個 Container 又可以有自己的修改。

---

## 七、Storage Driver（8 分鐘）

### 7.1 什麼是 Storage Driver

Storage Driver 決定了 Docker 怎麼在硬碟上儲存 Image 和 Container 的資料。

不同的 Storage Driver 有不同的特性和效能。

### 7.2 常見的 Storage Driver

**overlay2**（推薦）

目前最推薦的選擇。
- Linux 核心 4.0+ 原生支援
- 效能好、穩定
- 同時支援 ext4 和 xfs 檔案系統

**devicemapper**

Red Hat 系（RHEL、CentOS 7）早期的預設選擇。
- 現在已不推薦，應該用 overlay2

**btrfs / zfs**

這兩個需要特定的檔案系統支援。
- 功能強大，支援快照
- 但設定複雜，不常用

**vfs**

最簡單的實作，不支援 Copy-on-Write。
- 每個 Layer 都完整複製
- 效能差、浪費空間
- 只用於測試或相容性問題排查

### 7.3 查看和設定 Storage Driver

```bash
# 查看目前使用的 Storage Driver
docker info | grep "Storage Driver"
```

設定 Storage Driver（在 /etc/docker/daemon.json）：

```json
{
  "storage-driver": "overlay2"
}
```

**注意**：改變 Storage Driver 會讓既有的 Image 和 Container 無法使用（因為儲存格式不同）。通常只在初次安裝時設定，不要在有資料的系統上隨便改。

---

## 八、深入理解 Docker 的九個問題

學完架構和分層之後，我用九個問題幫大家把觀念串起來。這些問題看起來簡單，但能回答得清楚的人不多。

### 問題 1：為什麼 Container 一定要用跟 Host 相同的 Kernel？

因為 Container 不包含 kernel。

```
Container 架構：          VM 架構：

┌──────────────┐         ┌──────────────┐
│ App          │         │ App          │
├──────────────┤         ├──────────────┤
│ Libraries    │         │ Libraries    │
├──────────────┤         ├──────────────┤
│ Root FS      │         │ Guest Kernel │
├──────────────┤         ├──────────────┤
│ Host Kernel  │ ← 共用   │ Hypervisor   │
└──────────────┘         └──────────────┘
```

`docker run ubuntu` 實際上只是：用 host 的 Linux kernel + 掛載 ubuntu 的 root filesystem + 啟動一個 process。

所以 container 的 kernel 就是 host 的 kernel。這代表：
- Linux host → Linux container ✔
- Linux host → Windows container ✘（Windows container 需要 Windows kernel）

### 問題 2：`ps aux` 為什麼看不到 Container 裡的 Process？

其實**看得到**。Container 本質就是普通的 Linux process。

```bash
docker run nginx

# 在 host 上查看
ps aux | grep nginx
# root  23123  nginx: master process   ← 看得到！
```

但 Docker 透過 Linux **namespaces** 把 process 隔離了。Docker daemon 會記錄哪些 process 屬於哪個 container，所以 `docker ps` 只是 Docker 自己整理出來的 view。

### 問題 3：為什麼 Container 之間看不到彼此的 Process？

因為 **PID namespace**。

Linux namespace 可以讓 process 看到不同的「世界」。

```
Host 看到的：              Container A 看到的：     Container B 看到的：

PID                       PID                     PID
  1  systemd                1  nginx                 1  redis
200  nginx
300  redis
```

Container A 裡的 nginx 在 host 上其實是 PID 200，但 namespace 讓它以為自己是 PID 1。每個 container 都以為自己是整個系統。

### 問題 4：兩個 Image 都 FROM ubuntu，會存兩份 Ubuntu 嗎？

不會。Docker 只會存**一份 ubuntu layer**。

```dockerfile
# Image A                    # Image B
FROM ubuntu                  FROM ubuntu
RUN apt install nginx        RUN apt install mysql
```

磁碟上的實際儲存：

```
         ubuntu layer（只存一份）
          /            \
     nginx layer    mysql layer
```

這就是 **layer reuse**——節省空間、加快 pull。我們剛才講的分層結構，這就是最直接的好處。

### 問題 5：Dockerfile 的指令順序為什麼會影響 Build 速度？

**慢的寫法：**

```dockerfile
COPY . .
RUN npm install
```

任何原始碼改變 → COPY layer 改變 → npm install cache 失效 → 每次都重新安裝所有套件。

**快的寫法：**

```dockerfile
COPY package.json .
RUN npm install
COPY . .
```

如果只改了原始碼：
- Layer 1（copy package.json）→ cache 命中 ✔
- Layer 2（npm install）→ cache 命中 ✔
- Layer 3（copy source code）→ 重新建構

npm install 不會重新跑，build 快很多。這叫 **Docker layer cache**，寫 Dockerfile 時把不常變動的放前面、常變動的放後面。

### 問題 6：為什麼建議一個 Container 只跑一個 Process？

三個原因：

**可維護**：如果一個 container 裡跑 nginx + mysql + redis，其中一個 crash 了，你很難判斷是誰出問題、該怎麼重啟。

**可擴展**：微服務架構下，nginx 需要擴展到 3 個實例，但 mysql 不用。如果全塞在一起就沒辦法獨立擴展。

**Kubernetes 的設計假設**：Kubernetes 假設 container = 單一職責。一個 container 跑一個 service，是整個容器生態系的最佳實踐。

### 問題 7：為什麼 Production 常用 tini / dumb-init？

因為 **PID 1 在 Linux 有特殊行為**。

在 Linux 裡，PID 1 是 init process，它負責：
- 轉發 signal 給子 process
- 回收 zombie process

如果 container 直接跑 `node app.js`，node 就會變成 PID 1。但 node 不會處理 zombie process，久了 zombie 越來越多。

所以 production container 常用 `tini` 或 `dumb-init` 來當 PID 1：

```bash
# 最簡單的方式：加上 --init
docker run --init node app.js
```

Docker 的 `--init` flag 會自動注入 tini 作為 PID 1。

### 問題 8：在 Container 裡 apt install kernel 有意義嗎？

**完全沒意義。**

Container 不能換 kernel——kernel 是 host 的。

```bash
# 在 container 裡
apt install linux-image    # 安裝了 /boot/vmlinuz
```

裝是裝了，但：
- Container 不會 reboot
- Container 不會 boot kernel
- 這個檔案永遠不會被用到

這也呼應問題 1：container 共用 host kernel，裝了也白裝。

### 問題 9（終極）：`docker run nginx` 跟直接跑 `nginx` 差在哪？

Docker 多做了這幾件事：

```
docker run nginx 的完整流程：

1. 建立 Namespace（隔離）
   ├── PID namespace   → process 隔離
   ├── NET namespace   → 網路隔離
   ├── MNT namespace   → 檔案系統隔離
   ├── UTS namespace   → hostname 隔離
   └── IPC namespace   → 行程間通訊隔離

2. 設定 Cgroups（資源限制）
   ├── CPU 限制
   ├── Memory 限制（如 docker run -m 512m）
   └── Disk IO 限制

3. 掛載 Filesystem
   ├── 唯讀的 image layers
   └── 可寫的 container layer

4. 設定 Network
   ├── 建立 veth pair
   └── 連接到 docker0 bridge

5. 最後才是：exec nginx
```

**一句話總結 Docker：**

> Docker 本質就是：**process + filesystem + isolation + resource limit**。
> 核心技術：Linux namespaces、Linux cgroups、Union filesystem。

---

## 九、本堂課小結（4 分鐘）

這個小時我們深入了解了 Docker 的架構：

**Client-Server 架構**
- Docker Client：使用者介面，接收命令
- Docker Daemon：背景服務，實際執行工作
- 透過 Unix Socket 或 TCP 溝通

**Docker Daemon**
- 管理 Image、Container、Network、Volume
- 委託 containerd 執行容器
- 設定檔在 /etc/docker/daemon.json

**Docker Hub 與官方文件**
- Docker Hub（hub.docker.com）：搜尋映像、看 Overview 使用說明、看 Tags 版本
- 官方文件（docs.docker.com）：查指令、看 Guides、排錯首選
- 養成習慣：先查官方資源，再 Google

**Image 分層結構**
- Image 由多個唯讀 Layer 組成
- Container 有一個額外的可寫層
- Layer 共用節省空間、加速下載
- Copy-on-Write 機制

下一個小時，我們要開始動手安裝 Docker。

有問題嗎？

---

## 板書 / PPT 建議

1. Docker Hub 官網截圖導覽（搜尋、映像詳情頁、Tags 頁）
2. Docker 官方文件結構圖（Get started / Guides / Reference / Manuals）
3. Docker Daemon 元件圖（dockerd → containerd → runc）
4. Image 完整命名格式
5. Layer 分層示意圖
6. Container Layer（可寫）vs Image Layer（唯讀）
7. Copy-on-Write 流程圖
8. Container vs VM 架構對比圖（問題 1）
9. PID namespace 示意圖（問題 3）
10. `docker run nginx` 完整流程圖（問題 9）

