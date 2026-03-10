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
2. **Docker Daemon（守護進程）**：背景服務，實際執行工作
3. **Docker Registry**：遠端倉庫，存放 Image

用 Java 來比喻的話：**Image 就像 class（類別），Container 就像 new 出來的 object（物件）**。一個 class 可以實例化出很多 object，同理一個 Image 也可以啟動出多個 Container，而且彼此互相隔離。例如一個 Tomcat Image 可以啟動 Tomcat01、Tomcat02 兩個 Container，各自獨立運行。

當你在終端機輸入 `docker run nginx`，發生了什麼事？

```
你 → Docker Client → Docker Daemon → (Registry) → Container
```

1. Docker Client 接收你的命令
2. Client 透過 REST API 把命令送給 Daemon
3. Daemon 檢查本機有沒有 nginx Image
4. 如果沒有，Daemon 從 Registry 下載
5. Daemon 用 Image 建立並啟動 Container

用 `docker run hello-world` 來看更完整的流程：

```
docker run hello-world
        ↓
  本機是否有該 Image？
     /        \
   有           沒有
   ↓             ↓
 直接運行    去 Docker Hub 下載
              /        \
           找到       找不到
            ↓           ↓
         下載到本機   返回錯誤
            ↓
         使用 Image 運行
```

如果本機找不到 Image，Docker 會嘗試從 Docker Hub 下載；如果 Docker Hub 上也沒有，就會報錯。這就是為什麼你第一次 `docker run` 時會看到 `Unable to find image locally` 然後自動觸發 `pull`。

### 2.2 Docker 為什麼比 VM 快

Docker 比虛擬機快的根本原因在於**更少的抽象層**：

- **虛擬機**：硬件 → Host OS → Hypervisor → Guest OS → 應用。每個 VM 都需要一個完整的 Guest OS，啟動要引導整個操作系統內核，是**分鐘級**。
- **Docker**：硬件 → Host OS → Docker Engine → Container。Container 直接共用宿主機的內核，不需要引導新的 OS，是**秒級**。

```
虛擬機架構               Docker 架構
┌──────────┐            ┌──────────┐
│  App A   │            │  App A   │
├──────────┤            ├──────────┤
│ Guest OS │            │ Container│
├──────────┤            ├──────────┤
│Hypervisor│            │  Docker  │
├──────────┤            ├──────────┤
│ Host OS  │            │ Host OS  │
└──────────┘            └──────────┘
```

Docker 容器直接利用宿主機的內核，省去了虛擬化整個 OS 的開銷。當然，虛擬機的隔離性更強（完整的硬體虛擬化），安全性更高；Docker 的優勢在於輕量與速度。

### 2.3 為什麼要分開？

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

### 6.1 聯合文件系統（UnionFS）

Docker Image 的分層結構建立在**聯合文件系統（UnionFS）**之上。UnionFS 可以將多個目錄「聯合掛載」到同一個虛擬目錄下，每一層的修改都作為一次獨立的提交疊加上去——概念上類似 Git 的版本控制，每操作一步就產生一個記錄。

Docker Image 不是一個單一的檔案，它是由多個層（Layer）疊加而成的。

在最底層，Docker 使用兩個關鍵結構：

- **bootfs（Boot File System）**：包含 bootloader 和內核。容器啟動時用來引導加載，加載完成後就會被卸載。所有容器共用宿主機的內核，所以 bootfs 這一層是共用的——這也是容器為什麼能秒級啟動的原因之一。
- **rootfs（Root File System）**：在 bootfs 之上，就是一個精簡的 Linux 發行版（如 Ubuntu、Debian）。Docker 裡的 CentOS 只有 200 多 MB，因為它只保留了最基本的命令和工具庫，底層內核直接用宿主機的。

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

**用 `docker commit` 把容器變成新 Image**

既然容器層記錄了你所有的修改，那你可以把「鏡像層 + 容器層」重新打包成一個新的 Image。這就是 `docker commit` 的作用：

```bash
# 在容器內做了一些修改後，提交為新 Image
docker commit <container-id> my-custom-image:v1
```

新產生的 Image 會包含原本的所有唯讀層，加上你在容器層中所做的變更。別人拉取這個新 Image 後，就能得到你修改過的環境。

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

