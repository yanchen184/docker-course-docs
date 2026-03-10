# Day 2 第二小時：Docker 架構與工作原理

---

## 一、前情提要（3 分鐘）

上一個小時我們講了為什麼需要容器技術，以及 Docker 的基本概念。

我們知道了：
- 容器解決環境一致性問題
- Docker 有三個核心元素：Image、Container、Registry
- 容器比虛擬機輕量、快速

這個小時，我們要深入了解 Docker 的架構。知道它底層怎麼運作，之後使用起來會更有信心，出問題也知道怎麼排查。

---

## 二、Docker 架構總覽（10 分鐘）

### 2.1 Client-Server 架構

Docker 採用 Client-Server 架構，有三個主要元件：

1. **Docker Client**：使用者介面，接收你的命令
2. **Docker Daemon**：背景服務，實際執行工作
3. **Docker Registry**：遠端倉庫，存放 Image

當你在終端機輸入 `docker run nginx`，發生了什麼事？

```
你 → Docker Client → Docker Daemon → (Registry) → Container
```

1. Docker Client 接收你的命令
2. Client 透過 REST API 把命令送給 Daemon
3. Daemon 檢查本機有沒有 nginx Image
4. 如果沒有，Daemon 從 Registry 下載
5. Daemon 用 Image 建立並啟動 Container

### 2.2 為什麼要分開？

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

## 五、Docker Registry 詳解（10 分鐘）

### 5.1 什麼是 Registry

Registry 是存放 Image 的倉庫。

你可以把 Registry 想像成 GitHub：
- GitHub 存放程式碼
- Registry 存放 Docker Image

就像 GitHub 有公開和私有 repo，Registry 也有公開和私有的 Image。

### 5.2 Docker Hub

Docker Hub 是最大的公開 Registry，網址是 hub.docker.com。

**官方映像（Official Images）**

Docker Hub 上有很多官方維護的 Image，這些 Image 經過官方審核，品質有保證：

- `nginx`：Nginx 官方映像
- `mysql`：MySQL 官方映像
- `redis`：Redis 官方映像
- `python`：Python 官方映像
- `node`：Node.js 官方映像
- `ubuntu`：Ubuntu 官方映像

官方映像的名稱沒有斜線，直接就是 `nginx`、`mysql`。

**社群映像**

其他使用者上傳的 Image，名稱格式是 `使用者名稱/映像名稱`：

- `bitnami/nginx`
- `linuxserver/nginx`

使用社群映像要注意來源可靠性。

**私有映像**

Docker Hub 也可以存放私有 Image，但免費帳號只能有一個私有 repo。

### 5.3 Image 的命名規則

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

### 5.4 私有 Registry

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

### 5.5 Image 的拉取和推送

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

## 六、Image 的分層結構（12 分鐘）

### 6.1 Layer 的概念

Docker Image 不是一個單一的檔案，它是由多個層（Layer）疊加而成的。

每一層代表一組檔案系統的變更：
- 第一層可能是 Ubuntu 基礎系統
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

### 6.2 為什麼要分層？

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

### 6.3 查看 Image 的 Layer

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

### 6.4 唯讀層與可寫層

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

### 6.5 Copy-on-Write

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

## 八、本堂課小結（4 分鐘）

這個小時我們深入了解了 Docker 的架構：

**Client-Server 架構**
- Docker Client：使用者介面，接收命令
- Docker Daemon：背景服務，實際執行工作
- 透過 Unix Socket 或 TCP 溝通

**Docker Daemon**
- 管理 Image、Container、Network、Volume
- 委託 containerd 執行容器
- 設定檔在 /etc/docker/daemon.json

**Docker Registry**
- 存放 Image 的倉庫
- Docker Hub 是最大的公開 Registry
- 企業通常架設私有 Registry

**Image 分層結構**
- Image 由多個唯讀 Layer 組成
- Container 有一個額外的可寫層
- Layer 共用節省空間、加速下載
- Copy-on-Write 機制

下一個小時，我們要開始動手安裝 Docker。

有問題嗎？

---

## 板書 / PPT 建議

1. Docker 架構圖（Client → Daemon → Registry）
2. Docker Daemon 元件圖（dockerd → containerd → runc）
3. Image 完整命名格式
4. Layer 分層示意圖
5. Container Layer（可寫）vs Image Layer（唯讀）
6. Copy-on-Write 流程圖


---

## 📺 補充教材：狂神說 Docker

> 以下內容來自【狂神說Java】Docker 教程系列，作為本節的補充參考資料。

### P05：Docker 中的名詞概念

<sub>[00:00-00:15]</sub>
我們來繼續，了解了 Docker 能幹嘛之後，我們就要安裝。安裝之前我們來了解一下 Docker 的基本組成，我們跟他說了什麼鏡像、什麼容器，我們得先對這些印象有一些客觀的概念之後，再往下去學習會好一點，就是一個基本的名詞，那我們來看一下。

<sub>[00:18-00:57]</sub>
我們可以去百度來看一下，在這邊的話有非常多圖，我們去搜一個 Docker 的架構圖。大家打開百度圖片，這是我經常用的一個技巧，在裡面可以看到很多東西。比如說這個地方就是 Docker 的一個架構圖，在這個圖上面就形象的展現了 Docker 要用的所有東西。大家如果是第一次接觸 Docker 看到這個圖就蒙了，但是如果在我們學完之後，你再回過頭來看這個圖就非常清晰。

<sub>[00:58-01:20]</sub>
我們來看一下 Docker 它是怎麼組成的。這個地方有幾部分呢？第一部分有個 Client 客戶端，還有一個 Docker 的主機，我們就把它想像成一個服務就好了，Docker 的一個服務。還有一個就是我們的遠程倉庫。現在的話來給大家去理解，這分為了三部分，也就是客戶端、服務器、還有倉庫。

<sub>[01:21-01:52]</sub>
我們之前學過一個東西叫做 Redis，還記得嗎？它有一個 Redis Server 也是在本地就可以啟動起來，還有叫 Redis Client。比如說我通過 Redis Server 把它啟動起來，然後我們通過 Redis Client 的訪問。那這邊的話我們把 Docker 啟起來之後，它也會存在這兩個東西，我們可以通過 Docker 的一些命令來進行訪問。比如說 `docker run` 運行一個容器，`docker pull` 去拉取一個容器，`docker build` 構建一個容器。

<sub>[01:47-02:35]</sub>
構建完之後就要運行，這個真正的運行是在 Docker 的服務上去運行的，它這個地方是一個 Docker 守護進程。守護進程裡面要去運行，它首先要通過鏡像運行。這個鏡像大家就好比把它想成 Java 的一個 class 類模板，這個 class 是不是全局唯一的？那它真正運行起來的時候，它是不是可以產生很多很多的對象？那每一個容器我們就把它叫做對象就好了。比如說這個鏡像現在我是一個 Tomcat 的鏡像，那要部署一個的話就來個 Tomcat01 容器，現在我要再啟動一個 Tomcat，我還可以利用這個鏡像再啟動一個 Tomcat02。那這兩個我們就可以把它搭建成一個集群，但是它本質還是通過這個鏡像來進行運行的。

<sub>[02:35-03:10]</sub>
然後最終這些容器還有些鏡像來自於哪了？可能來自於我們的一個遠程倉庫，那這個地方有個 Docker Hub，它的地址這邊都是有的。那我們來先把這幾個名詞先聽一下：第一個就是咱們的鏡像（Image），第二個就是咱們的容器（Container），第三個就是咱們的倉庫（Repository）。

<sub>[03:12-04:08]</sub>
什麼是鏡像？Docker 鏡像就好比是一個模板，可以通過這個模板來創建咱們的一個容器服務。比如說我現在有個 Tomcat 鏡像，我現在要去把這個 Tomcat 啟動起來，這個鏡像是不能啟動的，要把這個鏡像運行起來才能啟動。所以我要把它 run 起來，run 就是運行，運行起來之後它就會變成一個真正啟動的一個服務，那這個服務就是一個容器嘛，比如說就是 Tomcat01，那這是咱們的一個具體的容器，它是來提供服務的。它除了通過這個鏡像可以 new 很多，通過這個鏡像可以創建多個容器，而這個容器你可以把它想象一個載體，最終的一個服務運行或者項目運行就是在容器中的。

<sub>[04:18-05:32]</sub>
容器的概念其實也不難。Docker 利用咱們的一個容器技術，它可以做到獨立運行一個或者一組應用，它可以把很多應用放在一個容器裡面去運行，完全是沒問題的。它是通過鏡像來創建的。它有一些基本的操作，容器可以啟動、停止、刪除，那這都是它的基本命令，等於我們要去學習這些命令也比較簡單。你可以把這個容器看成是一個 Linux，目前大家最開始理解的時候就可以把這個容器理解為一個簡易的 Linux 系統，就是一個非常非常輕巧的 Linux 系統，它裡面就是一些基本的東西，比如說一些基本的命令，我們的項目就放在這個特別微型的 Linux 系統上面跑起來了。

<sub>[05:35-06:53]</sub>
然後再往上就是一個倉庫。倉庫顧名思義是放東西的，就是來存放鏡像的地方，我們這麼多鏡像肯定要拿個地方來放嘛，就跟你們開發項目肯定要放到 GitHub 上。那這個倉庫的話分為咱們的一個公有倉庫和私有倉庫，這個就跟咱們 Git 的概念是一樣的，公用的就是所有人可以訪問，而私有的就是只有自己能夠訪問。那官方的話就是 Docker Hub，國內的話也有一些，包括阿里雲的、網易雲、華為雲的，它們都有咱們的容器服務。國內默認訪問國外倉庫是非常慢的，我們一般要去配置鏡像加速，就跟我們 Maven 是一樣的道理。

<sub>[06:47-07:09]</sub>
所以說要把這幾個概念理解一下，我們等會通過代碼運行你一下就知道它是幹嘛的了。然後把這幅圖先放在這，大家大腦裡產生一個基本的印象：我們把 Docker 安裝完之後，我們要用客戶端來去啟動 Docker 裡面的一個容器，這個容器要去服務器上去下載。那具體的流程我們就來看一下我們是怎麼做的，我們來安裝咱們的 Docker 了。

### P08：Run 的流程和 Docker 原理

<sub>[00:00-00:18]</sub>
我們再來看啊，這個 Hello World 到底是怎麼啟動的呢？我們這個地方剛才截了一個圖，在這個地方我們 `docker run hello-world` 之後，它是怎麼一步一步走到的，我們要把這個意思全部理懂啊。

<sub>[00:19-01:00]</sub>
我們這個地方繼續給大家畫圖，比如說我這麼來給大家畫個圖，大家一下就懂了。首先我們 `docker run`，就是比如說我們把它叫做「開始運行」。那首先開始運行了，它第一步我們來看一下我們這個圖。它說我們沒有找到這個鏡像，它說 Unable to find，那現在它肯定第一步要去尋找鏡像，就跟我們經常面試的提問你：這個地方敲下回車之後發生了什麼？很多人就懵了。

<sub>[01:01-02:07]</sub>
開始之後，Docker 首先會在本機尋找鏡像，這是它要做的第一步。那假設在 Docker 的本機尋找到了之後，它就會去做一個判斷：判斷本機是否有這個鏡像。那這個時候無非就會產生兩種情況，要麼有要麼沒有。假設有這個鏡像（yes），那結果就是使用這個鏡像運行。如果沒有這個鏡像呢（no），那肯定就要去下載這個鏡像，就去 Docker Hub 上下載。

<sub>[02:07-02:34]</sub>
那現在去下載完之後就能用了嗎？當然是不行的。Docker Hub 上也會產生兩種情況，判斷咱們在 Docker Hub（就是這個倉庫，跟 GitHub 是一樣的）是否可以找到這個鏡像。一種是找到，一種是找不到。假設如果找不到的話，它就返回錯誤「找不到鏡像」。如果能夠找到呢，就可以下載這個鏡像到本地。到了本地之後就跟前面連起來了，現在發現本地有這個鏡像，就可以使用這個鏡像進行運行了。這就是 `docker run` 的一個運行原理圖。

<sub>[02:35-03:29]</sub>
之後我們的所有東西就是基於這個內容進行的。現在大家是不是就理解了，剛才它為什麼要打印這些日誌啊？run 之後為什麼要去找，找不到又去 pull、去下載下來。那裡面具體的所有東西到底是怎麼執行的呢？我們現在要開始一步一步的去研究啊。比如說現在我們來搜一個找不到的，`docker run 狂神`，我絕對沒有這個鏡像吧，這個鏡像不可能存在的，沒人這麼無聊。回車，你看它就說找不到這個鏡像，它現在就嘗試去遠程下載，然後發現下載不到就會報一個錯。

<sub>[03:29-04:12]</sub>
那這就是咱們 run 的一個基本流程。那其實到了目前為止你看這被卡住了，卡住的話它是去找但找不到。在這個地方從 Docker 組成到 run Docker，我們現在就把 Docker 安裝這一塊的所有命令都說了一下，但這些命令只是一個入門的命令，我們再要往下學的話需要把底層的一些命令全部了解。了解所有命令之前我們把底層原理在這個地方也給大家說一下。

<sub>[03:55-05:03]</sub>
Docker 是怎麼工作的？我們剛才說過 Docker 是一個 C/S（Client-Server）結構的系統，這個地方一定需要了解。Docker 的守護進程就是它的服務，就跟 Windows 上的服務一樣。好比你們安裝了一個 MySQL，它在後台運行，Docker 也是，它的服務一直在後台運行在我們的一個主機上（有時候要把它稱為宿主機）。這個時候通過咱們的一個 Socket，從客戶端訪問。就好比你們去訪問 MySQL 是一樣的。Docker Server 接收到我們 Docker Client 發來的指令之後，就會執行這個命令，這個命令說白了就是跟容器跟鏡像相關的。

<sub>[05:25-07:07]</sub>
再給大家畫幅圖理解一下。說白了就是我們這個地方可能會存在多個客戶端去連接，比如說 Docker 的一些命令。然後它在後台其實是一個整個大的服務，比如說這是咱們的一個後台的守護進程。這個整個大的就是我們的一個 Linux 服務器，我們在這個服務器上通過客戶端去連接它，去連接這些所謂的服務，連到這個後台守護進程之後它就會啟動一些容器。Docker 容器這些東西都在咱們的服務之內，通過這個守護進程去操作容器的資源。那你們現在就發現這個容器跟虛擬機是互相隔離的，這個容器就好比是一個小的 Linux 虛擬機。在裡面有相對於 Linux 獨立的比如說自己的端口號。比如說我在裡面運行了一個服務 localhost:8080，那這個 8080 外界是訪問不到的，它是在這個容器內的。比如說現在我又啟動了一個容器跑了一個 MySQL，來個 3306，這個就是互相隔離的。

<sub>[07:37-08:11]</sub>
容器裡面也有個小的 Linux 虛擬機，它也在裡面能跑，佔用的進程和內存消耗是非常小的。我們外面這個大的 Linux 跟裡面是相互隔離的。如果要訪問容器裡面的端口，我們還需要在 Linux 服務器上跟這個容器裡面做一個連通，這個的話我們之後再來講。現在大家就知道 Docker 到底是怎麼工作的了，我們通過客戶端的命令到守護進程，在裡面放了很多容器啟動了。這個容器默認是一個都沒有啟動的，我們啟動之後它才會產生。

<sub>[08:11-10:07]</sub>
第二個就是我們要了解 Docker 為什麼比虛擬機快。最簡單的話就是 Docker 有著比咱們虛擬機更少的抽象層。我們 Docker 的話是直接跟引擎相關的，而虛擬機首先安裝了硬件之後，比如說 Host OS，上面還安一層虛擬層，再往上我們要虛擬一個鏡像出來作為 Guest OS，把這個硬件裝起來之後在上面跑服務。比如說這台電腦上我們要跑兩個 CentOS，那就叫虛擬兩個虛擬機出來，非常非常慢。而我們的 Docker 沒有這一層的概念，它是直接在咱們的主機上安裝 Docker 這個服務，所有的東西是運行在 Docker 這個服務裡面的，就是容器。所以說 Docker 它有著比虛擬機更少的抽象層，Docker 利用的是咱們宿主機的內核，而虛擬機 VM 需要 Guest OS，需要再搭建一個這樣的環境。

<sub>[10:33-11:50]</sub>
所以說當我們去新建一個容器的時候，Docker 不需要像虛擬機一樣重新加載一個操作系統內核，這個是非常慢的。啟動操作系統內核引導性的操作，比如你們去裝系統都會引導操作，非常慢。虛擬機是加載 Guest OS，是分鐘級別的，就非常非常慢。而 Docker 是利用咱們宿主機的操作系統，它就不需要再去虛擬一個出來了，十分十分的快，省略了這個複雜的過程，所以相對來說就會比較快，它是一個秒級的啟動。

<sub>[11:53-14:08]</sub>
我們再來看一下，虛擬化技術以及 Docker 容器的對比。虛擬機是 OS 虛擬化，利用的是虛擬機性的隔離；Docker 是根據容器來進行隔離。安全性的話虛擬機一定是最強的，因為它是完全虛擬一台電腦，而 Docker 只是一個容器。Docker 速度比較快，而且它在一個虛擬機上可以安裝很多容器。那這是關於讓大家了解一下 Docker 的一個運行原理，說了一下 Hello World 的一個流程。現在大家知道我們要去啟動一個應用，怎麼樣去找的一個過程。底層原理的話先作為了解，等大家把所有的命令學完之後，我們再回過頭來看這一段，學習完畢所有的命令，你們再回過頭來看這一章，頭腦會非常的清晰。因為理論還沒有實踐，所以接下來我們就要去實踐了。

### P18：鏡像原理之聯合文件系統

<sub>[00:00-00:21]</sub>
我們來繼續，再往下走的話就是 Docker 鏡像的一個具體探究的過程，它並不難。我們來看一下 Docker 鏡像它到底是怎麼做的。

<sub>[00:21-00:59]</sub>
剛才我們已經說了，鏡像就是一個獨立的軟件包，包含了咱們的代碼、運行的一些環境的庫、還有一些環境變量和配置文件，它全部都帶了。就是我們未來的所有的應用不需要咱們的服務器再去部署了，所有的應用直接打包成為一個 Docker 鏡像，那就可以直接跑起來，不需要運維再去部署一些環境了。跑起來非常非常的快，而且方便咱們的擴展跟部署。

<sub>[00:59-01:36]</sub>
鏡像就是一個獨立的軟件包，你們可以理解為可以把它下載下來，它可以放在我們的倉庫。那如何得到鏡像呢？它有這麼幾種方式：第一種方式就是從遠程倉庫下載；第二種是讓朋友拷貝給你；第三種就是自己製作一個鏡像，用 Dockerfile，這個是我們後面要講的。只要你能把這個包拿過來，你就可以直接運行。

<sub>[01:36-02:28]</sub>
那鏡像加載什麼原理呢？剛才我們看到它是分層下載的，我們之前在 Docker 回顧 Hello World 的時候就說過，所有東西它是一層一層這樣去下載過來的。那這是怎麼理解的呢？在 Linux 裡面有個概念叫做聯合文件系統（UnionFS），它就是可以將我們所有的東西進行分層管理。我們以前學過 Git，它可以控制版本，我們每操作一步有個記錄。比如說第一步安裝 CentOS，這是一個基本的環境，那這個地方就是第一層。然後在上面安裝了 Python，那就是第二層。我再安裝了 JDK，那就是第三層。它每一層都會把它記錄下來。

<sub>[02:28-03:30]</sub>
聯合文件系統就這麼一層概念，它支持對文件系統的修改一次一次的作為提交，一層一層的疊加。那我們下載的時候看到的就是一層一層的。我們就可以通過這種方式來記錄它每一次修改。假設我現在有兩個鏡像，比如說 Tomcat 還有 MySQL，它們底下都要用到基本的 Linux 內核。假設都要用到 CentOS，那現在我的 Tomcat 下載了 CentOS，我的 MySQL 就不需要下載了。這一個聯合文件的這一層是共用的，它這邊要用直接從這邊拿過去就可以了，就是非常極大地節省了內存和空間。假設上面是不一樣的，Tomcat 就裝 Tomcat，MySQL 就裝 MySQL 的，但是這一層是一樣的，也可以方便咱們的內存。這就是聯合文件系統的一個基本概念。

<sub>[03:29-04:25]</sub>
了解了概念之後，接下來就是我們要了解它是怎麼進行加載的。最開始的時候看這幅圖，下面是一個 boot 就是一個內核，這個內核裡面什麼都沒有。現在我操作了一步，比如說第一步 From Debian，我就下了一個 Debian。然後在這邊我去安裝了 EMACS，那這個時候就在這個內核上面加了一層鏡像。然後我又執行了一步 install 了一個 Apache，又加了一層。就是咱們的內核，加上一個 EMACS，再加一個 Apache，一個越來越高的層了，而底下這個層一般是共用的。

<sub>[04:27-05:17]</sub>
Docker 的鏡像實際上就是一層一層的文件系統構成的，而這種層級的文件系統就是咱們的 UnionFS，叫做聯合文件系統。而我們在裡面分為兩個名詞：一個叫 bootfs，一個叫 rootfs。boot 就是我們啟動的時候，任何一個系統啟動需要引導加載。最開始這個加載系統的這一塊東西是幾乎不變的，就是我們啟動的時候需要一個內核加上一個加載器（bootloader），把這個內核加載成功之後我們的系統就運行起來了。運行起來之後這個引導加載就不要了。

<sub>[05:19-06:14]</sub>
就是代表我們從電腦黑屏到開機進入系統，這個之間的過程我們就把它稱之為加載。假設這個加載完之後系統已經開起來了，這個加載是不是就可以卸載掉了？這一部分是不是共用的？就是無論是什麼鏡像它這部分是共用的，因為進來之後這個系統就不用變了。第二個就是 rootfs，就是我們真正這個系統啟動之後就會變成我們的一個基本的 Linux 系統，就是開機之後裡面就是一個典型的 Linux 文件系統。在裡面就是一個小的 Linux，這就是我們說的為什麼啟動了之後一個容器就是一個小的虛擬機環境，它就是一個完整的虛擬機環境，比如 CentOS。

<sub>[06:14-07:01]</sub>
rootfs 說白了就是上面不同的發行版，比如說 CentOS、Ubuntu，只是在這一層有了一些些許的區別。我們平時安裝的 CentOS 都是幾個 G，但是 Docker 裡面的 CentOS 你看一下才 237 兆，一個系統就這麼點。所以說它肯定是精簡過了，它沒有那麼多內核。對於精簡的操作系統，rootfs 可以很小，就是一些基本的命令和程序工具庫就好了，比如 ls 命令、cd 命令。有些壓縮命令像 ll 什麼 vim 它都沒有，是被精簡過的。

<sub>[07:15-08:32]</sub>
因為上面那個 bootstrap 這些很大的引導沒了，它只需要放一些文件跟命令就可以了，所以說就變得非常小，這些鏡像很小的。這個時候底層還是使用我們主機的一個內核，容器內部就是命令，真正的內核還是用的咱們主機的，所以說可以實現效率的最大化。我們真正的啟動虛擬機就是要去啟動底下的那個內核引導，非常慢。而真正去運行這個命令那就是分分鐘的事情，這也就是為什麼虛擬機是分鐘級別的，而容器是秒級的啟動。那就是來源於這個底層的一個改變，非常簡單。理解了 Docker 鏡像加載的原理跟聯合文件系統之後，我們就可以來理解一下它分層的一個原理了。

### P19：鏡像原理之分層理解

<sub>[00:00-00:32]</sub>
我們來看一下它是怎麼分層的。我們之前下載一個軟件的時候，它都會有一層一層的概念。比如說現在我們還是按照這個來下載，在這邊去下載一個 Redis，`docker pull redis`，它會去拉取 Redis。它下載這個版本的時候你可以看它有非常多層，裡面的層有可能跟我們之前有重複的，就是已經下載過了它就不會再下載了。你看這一層是不是就被下載過了，它就不用再下載了，它只用下載跟 Redis 相關的一些新的東西就可以了，其他東西它不用動。這就是一層一層的概念，每一個就稱為一個 Layer。

<sub>[00:34-01:15]</sub>
再往下走的話我們剛才學過一個命令叫做 `inspect`，我們來看一下剛才下載的這個 Redis，`docker inspect` 鏡像的一些操作。在這個地方往上走，上面是它的一個鏡像 ID，往下找它的一個分層，這個地方有個叫 Layers。這裡面每一層其實就是對應的每一個步驟，比如說第一步安裝 CentOS，剛才有人做過所以它不做了，already exists 就已經安裝完了。而剩下安裝 Redis 需要的步驟在一步一步的安裝，每安裝一步它就是一個記錄，說白了就是一個文件級的記錄。

<sub>[01:15-02:02]</sub>
那它是怎麼記錄的呢？所有的鏡像最開始的時候都有一個基礎鏡像，我們在上面去修改的時候它就會創建一個層。比如說第一層就是我們的一個操作系統，比如用 Ubuntu 為例。現在我要裝一個 Python 環境，它立馬就生成了第二層，這個層只有一個 Python。如果只留這兩個的話就是 Ubuntu 加 Python。我每操作一個環境，比如我再加一層裝一個 JDK，裝完 JDK 之後就會產生一個新的鏡像層。就是你每裝一個東西它就會加一層，就好比 Windows 裡面的一個安全補丁是一樣的，我們每操作一步它都會加一層。

<sub>[02:02-03:31]</sub>
比如說現在有兩個鏡像了，在第一層裡面存在三個文件（文件1、文件2、文件3），第二層裡面來了文件4、文件5、文件6，這兩個是沒有衝突的。把它打包成一個鏡像的時候裡面就會有六個文件。它會把這兩個大層再壓縮，一個大層裡面有三個小層，最終拼下來就是六個文件。但是現在我突然又來了一個新需求，比如底下三層是我們最基本的環境（CentOS、MySQL、Tomcat），第二層又加了一些東西（比如 Redis、ES），然後文件5 原來是 App 1.0。現在我把這個應用升級了，來個 App 2.0，一旦升級之後它會發現這是版本的升級，就會用文件7 把文件5 替換掉，所以我們還是差不多的層數。這樣就可以實現文件複用。

<sub>[03:31-04:15]</sub>
假設現在又來一個應用，底層用的還是 CentOS、MySQL 以及 Tomcat 的，這一層直接可以原封不動的拿過來進行使用。第二層如果 Redis 跟 ES 不變，也可以直接進行複用。如果只是應用文件變了，操作文件就好了。在外部看來我們可能有六個 Layer（就是那個單詞 Layer，就是一個層級）。大家重點要理解一個概念就是聯合文件系統，它的所有鏡像是一步一步的進行了分層。

<sub>[04:19-05:14]</sub>
了解分層之後，我們再來看一下它最終把鏡像打包之後就會生成這麼一個樣子。有了基礎的文件層，我們真正下載的時候下載的就是它。假如我們去下載 Redis，你會看到它這邊有六個 Layer。比如 `docker pull redis`，這個 Redis 就直接一下下載下來，它是分層下載的。分層下載的好處就是假設有些應用它的層是相同的，我們就可以直接複用。

<sub>[05:15-06:28]</sub>
那 Docker 鏡像默認都是只讀的，容器啟動的時候我們就加了一個新的層。比如說我們從 Docker 官方去 pull 了一個 Tomcat 把它下載下來，我一旦把它運行起來之後它就會變成這個樣子：本來的 Tomcat 你是沒有權限去動它的，這個就是啟動的這個鏡像，它是一個只讀的。那現在你對它的操作其實也是一個層級操作，在上面加了一層，你的所有操作都在這裡。這個地方是新的一層了。

<sub>[06:04-07:48]</sub>
之後我們可以把我們新的這一層加上原來的，再打包成一個大的鏡像發布。我們把它當作一個新的鏡像，而這個鏡像裡面的操作就是被我們改過的了，底下的是不會變的。所以說你每次下過來的新東西裡面的你是不會變的，而你操作就是在容器層上去新加操作。裡面的叫鏡像層，鏡像層是無法改變的，就是你從遠程 pull 過來的，這個東西是無法改變的。但是你通過 run 起來的時候就已經新加了一層。你把 pull 下來的理解為鏡像層（也就是原本的鏡像），run 起來之後就變成了兩層：一個基本的 Tomcat 鏡像層，加上一個容器層。鏡像層是固定的，就是你下載過來的東西；你的所有操作都是基於容器層的。

<sub>[08:11-08:44]</sub>
最終你把這個容器寫完之後、部署完之後，你想用這個容器發布。比如說我是狂神，我想發布給張三，我就需要把操作完的這個容器通過原來的鏡像層加上新改變的容器層，再次打包成為一個新的鏡像。接下來我們就來研究一下如何提交一個自己的鏡像，也就是 `docker commit`。理解了這個分層，再來理解 commit 你瞬間就懂了。

