# Day 2 第三小時：Docker 安裝與環境設置

---

## 一、前情提要（2 分鐘）

前兩個小時我們講了容器的概念和 Docker 的架構。

現在開始動手——安裝 Docker。

這堂課會涵蓋：
- Linux（CentOS/Ubuntu）安裝 Docker
- Windows/Mac 的 Docker Desktop
- 驗證安裝
- Docker Hub 註冊與登入

---

## 二、安裝前準備（8 分鐘）

### 2.1 系統需求

**Linux**
- 64 位元系統
- 核心版本 3.10+（建議 4.0+）
- 支援的發行版：Ubuntu 20.04+、CentOS 7+、Debian 10+、Fedora

**Windows**
- Windows 10/11 64 位元專業版或企業版
- 啟用 Hyper-V 或 WSL 2
- 至少 4GB RAM

**Mac**
- macOS 12+（Intel 或 Apple Silicon）
- 至少 4GB RAM

### 2.2 為什麼需要這些系統需求

**為什麼要 64 位元？**

Docker 的映像檔絕大多數是 64 位元。32 位元系統無法執行 64 位元的容器。現在的伺服器和開發機幾乎都是 64 位元了。

**為什麼 Linux 核心要 3.10+？**

Docker 依賴 Linux 核心的兩個關鍵功能：

| 功能 | 核心版本 | 用途 |
|------|----------|------|
| Namespace | 2.6.24+ | 隔離程序的視野（PID、網路、檔案系統） |
| Cgroups | 2.6.24+ | 限制資源（CPU、記憶體） |
| OverlayFS | 3.18+ | 分層檔案系統，高效能 |

核心 3.10 是最低要求，但 4.0+ 的 OverlayFS 效能更好，穩定性更高。

**為什麼 Windows 需要專業版/企業版？**

Windows 家用版沒有 Hyper-V 功能。Docker Desktop 需要 Hyper-V 或 WSL 2 來運行 Linux 虛擬機。

```
Docker on Windows 的架構：

┌─────────────────────────────┐
│     Docker CLI（Windows）    │
├─────────────────────────────┤
│     WSL 2 / Hyper-V         │
│  ┌───────────────────────┐  │
│  │   Linux 虛擬機        │  │
│  │  ┌─────────────────┐  │  │
│  │  │ Docker Daemon   │  │  │
│  │  │ 容器、映像檔    │  │  │
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│     Windows 核心            │
└─────────────────────────────┘
```

Docker 實際上跑在 Linux 虛擬機裡，所以需要虛擬化技術。

**為什麼至少 4GB RAM？**

- Docker Desktop 本身需要約 1-2GB
- Linux 虛擬機需要記憶體
- 每個容器也會消耗記憶體
- 還要留給你的開發工具和瀏覽器

實際開發建議 8GB 以上，跑多個容器建議 16GB。

**Mac 為什麼也需要虛擬機？**

macOS 不是 Linux，Docker 同樣需要一個 Linux 環境。Docker Desktop 用輕量級虛擬化（HyperKit 或 Apple Virtualization Framework）來運行 Linux。

```
Docker on Mac 的架構：

┌─────────────────────────────┐
│     Docker CLI（macOS）      │
├─────────────────────────────┤
│  Virtualization Framework   │
│  ┌───────────────────────┐  │
│  │   Linux VM            │  │
│  │   Docker Daemon       │  │
│  │   容器、映像檔        │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│     macOS 核心              │
└─────────────────────────────┘
```

### 2.3 檢查系統資訊

```bash
# 檢查核心版本
uname -r

# 檢查發行版
cat /etc/os-release

# 檢查 CPU 架構
uname -m
```

---

## 三、Linux 安裝 Docker（20 分鐘）

### 3.1 移除舊版本

如果之前裝過舊版 Docker，先移除：

**CentOS/RHEL**
```bash
sudo yum remove docker \
                docker-client \
                docker-client-latest \
                docker-common \
                docker-latest \
                docker-latest-logrotate \
                docker-logrotate \
                docker-engine
```

**Ubuntu/Debian**
```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

### 3.2 安裝方式選擇

有三種安裝方式：
1. **官方 Repository**（推薦）：最新版本，自動更新
2. **下載 DEB/RPM 套件**：離線環境使用
3. **官方安裝腳本**：最快，但不適合生產環境

我們用官方 Repository 方式。

### 3.3 CentOS 安裝步驟

**Step 1：安裝必要工具**
```bash
sudo yum install -y yum-utils
```

**Step 2：新增 Docker Repository**
```bash
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

**Step 3：安裝 Docker Engine**
```bash
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**Step 4：啟動 Docker**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

**Step 5：驗證安裝**
```bash
sudo docker run hello-world
```

### 3.4 Ubuntu 安裝步驟

**Step 1：更新套件索引，安裝必要工具**
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
```

**Step 2：新增 Docker 官方 GPG 金鑰**
```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

**Step 3：新增 Repository**
```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

**Step 4：安裝 Docker Engine**
```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**Step 5：驗證安裝**
```bash
sudo docker run hello-world
```

### 3.5 讓非 root 使用者執行 Docker

預設只有 root 可以執行 docker 命令。要讓一般使用者也能用：

```bash
# 建立 docker 群組（通常安裝時已建立）
sudo groupadd docker

# 把使用者加入 docker 群組
sudo usermod -aG docker $USER

# 重新登入讓群組生效
# 或執行
newgrp docker

# 測試
docker run hello-world
```

**安全提醒**：docker 群組的成員等同於有 root 權限，因為他們可以啟動任何容器。只把信任的使用者加入這個群組。

---

## 四、Windows/Mac 安裝 Docker Desktop（10 分鐘）

### 4.1 為什麼需要 Docker Desktop

Docker 依賴 Linux 核心功能（Namespace、Cgroups）。Windows 和 Mac 沒有 Linux 核心，所以需要 Docker Desktop。

Docker Desktop 內含一個輕量級 Linux 虛擬機，Docker 實際上跑在這個虛擬機裡。

### 4.2 Windows 安裝

**Step 1：啟用 WSL 2**

以系統管理員身份開啟 PowerShell：
```powershell
wsl --install
```

重開機後繼續。

**Step 2：下載並安裝 Docker Desktop**

從 docker.com/products/docker-desktop 下載安裝檔，執行安裝。

**Step 3：設定**

安裝完成後啟動 Docker Desktop，確認設定中使用 WSL 2 backend。

**Step 4：驗證**

開啟 PowerShell 或 CMD：
```bash
docker --version
docker run hello-world
```

### 4.3 Mac 安裝

**Step 1：下載 Docker Desktop**

從 docker.com/products/docker-desktop 下載。
- Intel Mac：下載 Intel 版本
- Apple Silicon（M1/M2/M3）：下載 Apple Silicon 版本

**Step 2：安裝**

打開 .dmg 檔案，把 Docker 拖到 Applications。

**Step 3：啟動並驗證**

打開 Docker Desktop，等待啟動完成（選單列出現 Docker 圖示）。

開啟 Terminal：
```bash
docker --version
docker run hello-world
```

### 4.4 Docker Desktop 的資源設定

Docker Desktop → Settings → Resources

可以設定：
- **CPUs**：分配給 Docker 的 CPU 核心數
- **Memory**：分配給 Docker 的記憶體
- **Disk image size**：Docker 資料的硬碟空間上限

如果你的電腦記憶體有限，可以調低這些設定。

---

## 五、驗證安裝（8 分鐘）

### 5.1 基本驗證命令

```bash
# 查看 Docker 版本
docker --version
# 或更詳細的版本資訊
docker version

# 查看 Docker 系統資訊
docker info
```

`docker version` 會顯示 Client 和 Server（Daemon）的版本。如果 Server 那邊出錯，表示 Daemon 沒有正確運行。

### 5.2 執行 hello-world

```bash
docker run hello-world
```

這個命令會：
1. 在本機找 hello-world Image
2. 本機沒有，從 Docker Hub 下載
3. 用這個 Image 建立 Container
4. Container 執行完畢，印出訊息

如果看到歡迎訊息，Docker 安裝成功。

### 5.3 執行互動式容器

```bash
docker run -it ubuntu bash
```

這會：
1. 下載 ubuntu Image
2. 啟動一個 Container
3. 在 Container 裡面開一個 bash shell
4. 你現在「在容器裡面」了

試試看：
```bash
cat /etc/os-release   # 確認是 Ubuntu
ls /                  # 看看檔案系統
exit                  # 離開容器
```

### 5.4 常見安裝問題

**問題：Cannot connect to Docker daemon**

```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

解法：
```bash
# 確認 Docker 服務有在跑
sudo systemctl status docker

# 如果沒有，啟動它
sudo systemctl start docker
```

**問題：Permission denied**

```
Got permission denied while trying to connect to the Docker daemon socket
```

解法：
```bash
# 把使用者加入 docker 群組
sudo usermod -aG docker $USER

# 重新登入
```

**問題：Windows 上 WSL 2 相關錯誤**

確認 WSL 2 正確安裝：
```powershell
wsl --status
wsl --update
```

---

## 六、Docker Hub 註冊與登入（8 分鐘）

### 6.1 為什麼需要 Docker Hub 帳號

- 下載某些 Image 有頻率限制，登入後限制較寬鬆
- 可以推送自己的 Image
- 可以建立私有 Repository

### 6.2 註冊帳號

1. 前往 hub.docker.com
2. 點選 Sign Up
3. 填寫 Username、Email、Password
4. 完成驗證

### 6.3 命令列登入

```bash
docker login
```

輸入 Username 和 Password。

登入成功後，認證資訊存在 ~/.docker/config.json。

### 6.4 登出

```bash
docker logout
```

### 6.5 Access Token（建議）

不建議直接用密碼登入，應該使用 Access Token：

1. 登入 Docker Hub 網頁
2. 進入 Account Settings → Security → Access Tokens
3. 建立新 Token，設定權限
4. 用 Token 代替密碼登入

```bash
docker login -u your-username
# 密碼處貼上 Token
```

---

## 七、設定映像加速（5 分鐘）

### 7.1 為什麼需要加速

Docker Hub 伺服器在國外，下載 Image 可能很慢。

可以設定映像站（Mirror）加速。

### 7.2 常用映像站

- 阿里雲：需要註冊取得專屬加速地址
- 中國科技大學：https://docker.mirrors.ustc.edu.cn
- 網易：https://hub-mirror.c.163.com

### 7.3 設定方式

編輯 /etc/docker/daemon.json：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

重啟 Docker：

```bash
sudo systemctl restart docker
```

驗證：

```bash
docker info | grep -A 5 "Registry Mirrors"
```

---

## 八、本堂課小結（2 分鐘）

這個小時我們完成了 Docker 的安裝：

**Linux 安裝**
- 使用官方 Repository
- CentOS 用 yum，Ubuntu 用 apt
- 啟動 Docker 服務
- 設定非 root 使用者權限

**Windows/Mac**
- 使用 Docker Desktop
- 內含 Linux 虛擬機

**驗證**
- docker version / docker info
- docker run hello-world

**Docker Hub**
- 註冊帳號
- 命令列登入
- 建議使用 Access Token

下一個小時，我們開始學習 Docker 的基本指令。

---

## 板書 / PPT 建議

1. 系統需求表
2. Linux 安裝流程圖
3. docker run hello-world 流程圖
4. 常見錯誤與解法表

---

## 📺 補充教材：狂神說 Docker

> 以下內容來自【狂神說Java】Docker 教程系列，作為本節的補充參考資料。

### P06：安裝 Docker

<sub>[00:00-00:12]</sub>
我們來看一下，現在我要去安裝 Docker 的話，其實非常非常簡單。首先的話，我們要說一下我們的一個環境準備。之前的話，讓大家去安裝了，就是購買了咱們的 Linux，就是阿里雲的服務器對不對。

<sub>[00:12-00:33]</sub>
然後在這邊沒購買的話，可以去看一下我這邊 Linux 的一個教程。所以說它有一個基本的點，需要會一點點的 Linux 基礎就夠了，會基礎就可以學了，然後深入的話，我都會在課程裡面慢慢給大家去灌輸。第二個呢，我們需要我們的系統，我這個地方用的是 CentOS，你們的版本儘量跟我一致，我是用的 CentOS 7。

<sub>[00:33-00:57]</sub>
那這兩個點一定要注意啊。然後第三步我們使用 XShell，你們也可以用其他軟體，我用 XShell 連接遠程服務器來進行操作。現在的話，我們有這個環境了之後就可以用了，說白了就是我們要有一台服務器，並且可以操作它，是不是這麼一回事。

<sub>[01:00-01:32]</sub>
那我們來看一下怎麼樣操作。這是一個環境查看，我們打開咱們的 XShell，現在的話去連接上我這邊的一個遠程服務器。現在的話我登錄上我的阿里雲服務器了，要確定這個服務器是沒有什麼問題的，對不對。我這邊的話是一個新的服務器，所有東西都是 ok 的，所有環境也都是正常的。

<sub>[01:32-01:57]</sub>
那我們就基於這個目錄來進行學習啊。首先我們要來看一下我們這邊的一個環境。我這邊的話首先咱們的一個版本是完全沒有問題的，對不對。我們這個系統的內核版本是在 3.0 以上的。就是我們現在用的是最新版的 Docker，最新的 Docker 跟網上的那些 Docker 教程的一些區別就是最新版的 Docker 增加了很多功能，還有很多特性，我會教大家如何去看。那這個地方呢還是系統內核是咱們 3.10 以上的。

<sub>[01:58-02:32]</sub>
那所以說，希望大家也有跟我一樣的環境，這樣學起來是最 ok 的。然後我來給大家看一下我這邊的一個系統的環境。在我們的 etc 目錄下，這我們的配置目錄，裡面有一個 os-release，在這裡面的話，可以看到我們的所有的信息，我當前的話是 CentOS 7，這個是沒有任何問題的。

<sub>[02:32-02:50]</sub>
ok，那確定這些東西沒有問題了之後，我們就可以來安裝了。安裝的話，首先我們要去看一下幫助文檔。我說了，所有東西從幫助文檔開始，一切東西都是來自幫助文檔。我們打開我們的 Docker 幫助文檔。

<sub>[02:50-03:26]</sub>
那這個地方，點進來的話，這邊有一個 Get Docker，就是我們要下載 Docker，然後快速開始。然後 Docker 裡面的一些應用，比如說怎麼樣把你的應用發佈進去。那現在的話我們就來安裝，這個地方 Mac、Windows、Linux，我們在 Linux 下安裝的，點 Linux 就可以了。點進來之後呢，這個地方就有個 Install，告訴你如何安裝 Docker 引擎。然後在這個地方，你們可以看到，這邊有一個安裝的具體的版本，我要安裝在 CentOS、安裝在 Debian 上、安裝在 Ubuntu 上，這都是有一些特殊的。

<sub>[03:27-03:47]</sub>
那我們來安裝在 CentOS，根據你自己的版本進行選擇，但是本質沒有什麼變化。在這個地方就告訴你了，怎麼樣去安裝它，首先就是這個地方告訴你，你需要你的版本在 CentOS 7 以上才能夠進行 support 支持，否則的話是不行的。然後安裝之前呢，我們第一步要卸載舊版本，看到了嗎，就是假設我現在電腦上有，我先把它舊的卸載了。

<sub>[03:49-04:10]</sub>
步驟就開始了啊。這是第一步，卸載舊版本。那我們把它卸載了，到這個地方進行卸載就可以了，直接粘過來命令。OK，這裡面卸載的就是我們的 Docker Client，看到了嗎，還有 Docker Engine 引擎，OK，那這些東西都已經全部卸載完畢了。

<sub>[04:10-04:52]</sub>
然後我們就可以到我們的第二步了。然後他說你要有一些安裝方法，你可以直接安裝，這個地方有不同的方式，我們這個地方呢就可以通過倉庫來安裝。那怎麼安裝的話，他在這個地方也給我們去顯示了，你首先要安裝一些基本的環境。就是我們安裝這個軟體需要的一些安裝包，第二步，需要的安裝包。那我們把這個安裝包安裝一下，`yum install` 直接安裝，那我們來把它安裝上就可以了。

<sub>[04:53-05:26]</sub>
那如果安裝完之後呢，現在的話，第三步我們要設置鏡像的倉庫。那這個鏡像的倉庫的話，你看這個官方也是這麼說的，他說這個地方有一個 `yum-config-manager --add-repo`。那這個地方看到，下載這個地方，默認是從國外的。國外的十分慢，不要用這個，我們用國內的就可以了。我們可以怎麼樣找到國內的呢，還是一樣的，可以在百度上去搜索就好了，比如說 Docker 的阿里雲鏡像地址。

<sub>[05:27-06:10]</sub>
你這樣一搜的話，就能去找到一些阿里雲鏡像加速的地址啊。像這種配置，你可以看到這邊的話有一些基本的鏡像地址，比如說這個地方有一個阿里雲的，對，我們就用它。使用國內的阿里雲安裝，我們把它取過來就可以了。所以說這是我們正常的路徑，我們就安裝它就可以了。建議大家安裝阿里雲的。這個地方走的是阿里雲鏡像，不要去走國外的，非常非常慢。推薦使用阿里雲的，這樣的話十分的快。不然的話你們下個鏡像下半天啊，這樣的話我們可能幾分鐘就下好了，甚至幾秒鐘就下好了。

<sub>[06:16-06:56]</sub>
ok 這些東西做完了之後呢，繼續跟著官方文檔來走，我們說了，東西在官方文檔上，對不對。然後往下走你要去配置一些關於 Docker 的配置。我們再往下走看一下怎麼安裝，那他說現在的話你就可以安裝咱們的最新版的 Docker 引擎了。那你在這邊去安裝，我們就安裝最新的，因為最新的裡面有很多好東西。相關的還是一樣的，我們來看一下，`yum install`，那這個地方有一個 Docker-CE、Docker Client 和 containerd。容器、客戶端、以及 Docker 的核心，對不對。

<sub>[06:56-07:18]</sub>
那這個地方說一下，這個 Docker-CE 指的是什麼呢，就是咱們的一個社區版的。那除了有社區版的話，跟咱們的 CE 就是咱們的社區，還有一個 EE 版的。EE 版的話就是咱們的企業版的。那我們現在其實更多的時候都是在使用 CE，官方也推薦使用 CE。就是 EE 的話是你們要企業授權的話可以去使用的話，我們這邊都是基於 CE 的，一定要記住這個點。

<sub>[07:20-08:03]</sub>
那在安裝之前，我希望大家做一步更新的工作，就是更新，就是儘量把我們當前的一個環境更新我們的一個 yum 軟件包索引，我們來把這個索引更新一下。還是一樣的，更新索引的命令，`yum makecache fast`，把它安裝就可以了。那現在的話他就幫我們去更新軟件包的索引了。然後接下來我們就去安裝咱們 Docker，這都是從官方文檔來的。他就正在去安裝，那就安裝好了，安裝好了之後我們就可以取用了。

<sub>[08:09-08:44]</sub>
那我們來看一下安裝完之後呢，再往下走。這邊的話，他說如果你不想安裝 Latest Version 就是最後一個版本的，你也可以指定咱們的版本安裝，比如說你可以使用 `docker-ce` 加上版本號。我們這邊就不用他了，因為我們已經安裝最新的了。那你要安裝指定版本的，他也告訴你了，怎麼安裝。我們這個地方默認的話，就直接去用咱們最新的。

<sub>[08:44-09:19]</sub>
安裝完之後呢，他告訴我們就可以第三步啟動 Docker，最後一步測試 Hello World。那我們來啟動一下 Docker。這是一個標準的 Linux 命令，對不對，安裝完了之後就要啟動 Docker。那這個啟動 Docker 就是 `systemctl start docker`，那說明 Docker 他是一個服務了，對吧。你現在一旦這麼運行完就代表啟動成功了，對不對。怎麼樣子判斷自己啟動成功了？`docker version`。看到這個 Docker Version 的時候，你們就明白了一切，說明我們成功啟動了，可以看到當前的一個最新的版本號。

<sub>[09:19-09:54]</sub>
還有當前的一些信息，我們用的是 Community，這是咱們的一個社區版本，對不對。如果是企業版就是 Docker EE。然後我們當前的一個系統是咱們的 Linux 系統。所以說這個地方有個命令，跟咱們的 `java -version` 一樣，確定他安裝成功了的話就可以使用 `docker version` 來看嘛，判斷他是否安裝成功。

<sub>[09:54-10:17]</sub>
那假設他安裝成功了之後，我們就可以測試咱們的 Hello World 了。那我們這個地方就到了第七步，怎麼樣運行 Hello World。在這邊他也告訴你了，你要使用 Docker 引擎的話，你可以用 Hello World 測試一下，怎麼用呢，`docker run hello-world`，看到嗎。所有的命令都是通過 `docker run` 來啟動的。

<sub>[10:17-10:58]</sub>
我們也來 run 一下，看一下他做一些什麼樣的操作。點擊 `docker run`，那現在的話他說了一句話，他說沒有找到 Image，Image 是鏡像不是圖片。然後他說他要去下載對吧，那這個時候他就去下載。這個地方的信息量非常大，我們來看一下。首先第一步，我們這個地方 `docker run hello-world`，他先去做了一件事，他說 Unable to find，他是不是沒有尋找到這個鏡像啊。這個時候他就做了一個事情叫做 Pull，這個 Pull 是不是就去遠程拉取鏡像啊。

<sub>[10:58-11:29]</sub>
拉取咱們官方的 library 下面的 hello-world，那拉取到之後呢，這邊就有一個簽名信息，代表他拉取 OK 了。那這邊就拉取完了，對不對，然後拉取完之後他就運行起來了，通過 run 運行的嘛。那運行的時候這個地方就寫出了 Hello from Docker。說明如果你彈出了這句話，就相當於你的 Docker 已經安裝成功了，對不對。那這是咱們的一個 Docker Hello World，那啟動完之後能看到這句話，就只是證明你的安裝成功了，僅此而已。

<sub>[11:30-12:09]</sub>
那然後再往下走，那我們如何可以看到這個鏡像是被下載過來的呢。所以說我們要確保這個 Docker 是 OK 的，我們來查看一下下載的這個 Hello World 的鏡像。那這個時候怎麼樣操作呢，還是一樣的，我們可以通過 `docker images`。可以看到我們的鏡像在這個地方，這就是我們剛才下載的嘛，我們 run 的時候是不是就 run 這個鏡像呀。這個鏡像沒有最開始的時候，它就去 Pull 把它下載下來，所以說我們最終的服務都是要打包成這樣的鏡像進行運行，對不對。

<sub>[12:09-12:38]</sub>
那到了這個地方的話，鏡像就已經查看了。那再做一個了解，官方也給我們講了，假設你不想玩 Docker 了，你要把它卸載怎麼辦，就是卸載 Docker。這篇文檔的話還是非常詳細。

<sub>[12:38-13:08]</sub>
在這邊，uninstall 就是卸載 Docker，就兩步。第一步移除你剛才安裝的東西，最後一步 `rm -rf`，把這個東西全部移除了。你看是不是很簡單，就是跟我們的想法是一樣的，卸載當前的軟件，然後刪除目錄嘛，兩步。卸載依賴，刪除目錄。

<sub>[13:07-13:23]</sub>
Docker 的資源在哪個地方呢？比如說這個地方有個 `rm -rf`，我們的資源就在咱們的 `/var/lib/docker`，對不對。你們要去以後查資源的話，都是在這個地方。那這是咱們的 Docker 的默認資源，它的一個工作路徑。ok，那這是我們的一個基本的點，了解完這個就完全可以使用了。

### P07：配置阿里雲鏡像加速

<sub>[00:00-00:15]</sub>
剛才安裝完之後呢，我們這個地方的倉庫的鏡像其實還不夠快，因為我們這個地方是使用的阿里雲內部的，對不對。那這個時候我們可以做一個操作，就是阿里雲鏡像加速。我們可以通過阿里雲鏡像加速，讓我們這個效率達到更高。

<sub>[00:19-00:54]</sub>
那我們現在的話可以去登錄一下我的阿里雲。那現在教你們如何把阿里雲這個給我們配置過來啊。我們到了這個阿里雲後台的話，在這個地方的話我們要去看這個服務，點擊這個側邊欄。在這邊的話有個產品與服務，我們要去找到我們的容器鏡像服務，把這個地方給大家畫起來。你可以看到一個容器鏡像服務就是它，那你們直接點擊它，然後把它開通就可以了，默認就是直接打開的。

<sub>[00:58-01:28]</sub>
那到了這個位置，最下面有個鏡像加速器。第一步，登錄阿里雲，找到咱們的一個容器服務。找到了之後呢，第二步就是我們要找到鏡像加速的位置、加速地址。每個人都有自己的加速地址。然後在這個地方你可以看到一個鏡像加速器，那這裡面的話他就告訴你了，怎麼樣去用。有幾個系統，比如說 Ubuntu 怎麼操作、CentOS 怎麼操作、Mac 怎麼操作、Windows 怎麼操作，我們這個地方用 CentOS 就可以了。

<sub>[01:38-02:07]</sub>
鏡像加速器，我們這個地方選擇 CentOS，那我們要怎麼做呢。配置使用就是這樣配置之後，我們以後安裝的東西就超級快了。所以說這就是我們的準備工作。鏡像加速器，我們只是把它配置過來而已，一堆配置文件，那這個配置文件也極其的簡單。

<sub>[02:09-02:52]</sub>
我們來看一下，第一步，新建一個目錄 Docker，然後在 Docker 裡面有一個 `daemon.json`，然後給他配置了一個我們阿里雲的地址。然後配置完之後，把這個鏡像重啟，然後把 Docker 重啟，四個命令，我們一個一個來。第一個，咱們的 `mkdir -p` 創建一個目錄。第二步，在這個地方編寫它的一個配置文件，把這個配置文件編寫成功了，展示出來了你的當前阿里雲的地址。然後第三步，把這個服務重啟，`systemctl daemon-reload`。第四步，`systemctl restart docker` 把它啟動。

<sub>[02:53-03:16]</sub>
ok，那現在的話，如果這樣子走完了之後，咱們整個服務就配置完畢了。那現在的話，我們就把阿里雲這個鏡像配置完畢了，非常非常簡單。那配置完畢之後，我們再來回顧咱們 Hello World 流程，就是問這個 Hello World 它到底是怎麼執行的。
