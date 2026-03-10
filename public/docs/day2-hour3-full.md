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

### 3.3 Docker CE vs Docker EE

Docker 有兩個版本：
- **CE（Community Edition）**：社區版，免費開源，官方推薦一般使用者使用
- **EE（Enterprise Edition）**：企業版，需要授權付費，提供額外的企業級功能

我們使用的是 CE 版本。

### 3.4 CentOS 安裝步驟

**Step 1：安裝必要工具**
```bash
sudo yum install -y yum-utils
```

**Step 2：新增 Docker Repository**

官方預設的 Repository 在國外，下載速度可能很慢。建議使用阿里雲的鏡像源：

```bash
# 官方源（國外，可能較慢）
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 阿里雲源（國內，推薦）
sudo yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

**Step 3：更新 yum 套件索引**

安裝前建議先更新索引，確保取得最新的套件資訊：

```bash
sudo yum makecache fast
```

**Step 4：安裝 Docker Engine**
```bash
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

如果需要安裝指定版本，可以用以下方式：
```bash
# 列出可用版本
yum list docker-ce --showduplicates | sort -r

# 安裝指定版本
sudo yum install -y docker-ce-<版本號> docker-ce-cli-<版本號> containerd.io
```

**Step 5：啟動 Docker**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

Docker 是一個系統服務，啟動後可以用 `docker version` 確認是否成功：

```bash
docker version
```

如果看到 Client 和 Server 的版本資訊，並顯示 `Community` 字樣，表示社區版安裝成功。這跟 `java -version` 驗證 Java 安裝是同樣的道理。

**Step 6：驗證安裝**
```bash
sudo docker run hello-world
```

執行後 Docker 會先嘗試在本機找 hello-world 映像檔，找不到就會自動從遠端 Pull 下載。下載完成後執行容器，看到 `Hello from Docker!` 就代表安裝成功。

可以用 `docker images` 確認映像檔已下載到本機：
```bash
docker images
```

### 3.5 Ubuntu 安裝步驟

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

### 3.6 卸載 Docker

如果需要卸載 Docker，只需兩步：

```bash
# Step 1：卸載 Docker 套件
sudo yum remove docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Step 2：刪除 Docker 資源目錄
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
```

Docker 的所有資源（映像檔、容器、Volume 等）都存放在 `/var/lib/docker`，這是 Docker 的預設工作路徑。刪除這個目錄就能徹底清除所有 Docker 資料。

### 3.7 讓非 root 使用者執行 Docker

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

Docker Hub 伺服器在國外，下載 Image 可能很慢。即使前面安裝時使用了阿里雲的 Repository 源，拉取映像檔時仍然是從 Docker Hub 下載。配置映像加速器（Mirror）可以大幅提升下載速度，讓原本需要幾分鐘的下載變成幾秒鐘完成。

### 7.2 常用映像站

- **阿里雲**：需要註冊取得專屬加速地址（推薦，每個帳號有獨立的加速地址）
- 中國科技大學：https://docker.mirrors.ustc.edu.cn
- 網易：https://hub-mirror.c.163.com

**取得阿里雲加速地址的步驟：**
1. 登入阿里雲官網
2. 搜尋「容器鏡像服務」並開通（免費）
3. 在左側選單找到「鏡像加速器」
4. 頁面會顯示你的專屬加速地址，以及各系統（Ubuntu、CentOS、Mac、Windows）的配置方式

### 7.3 設定方式

配置只需要四個命令：

```bash
# Step 1：建立 Docker 配置目錄
sudo mkdir -p /etc/docker

# Step 2：寫入配置檔（將加速地址替換為你自己的）
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://your-accelerator.mirror.aliyuncs.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
EOF

# Step 3：重載 systemd 配置
sudo systemctl daemon-reload

# Step 4：重啟 Docker
sudo systemctl restart docker
```

驗證加速是否生效：

```bash
docker info | grep -A 5 "Registry Mirrors"
```

配置完成後，之後所有的映像檔下載都會通過加速器，速度會有明顯提升。

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

