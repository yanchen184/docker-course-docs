# Day 2 第三小時：Docker 安裝與環境設置

---

## 一、前情提要（2 分鐘）

前兩小時講了概念和架構，現在開始動手——安裝 Docker。

---

## 二、系統需求（8 分鐘）

### 各平台需求

| 平台 | 需求 |
|------|------|
| **Linux** | 64 位元、核心 3.10+（建議 4.0+） |
| **Windows** | Win 10/11 專業版/企業版、Hyper-V 或 WSL 2、4GB+ RAM |
| **Mac** | macOS 12+（Intel 或 Apple Silicon）、4GB+ RAM |

### 為什麼這些需求？

**Windows/Mac 需要虛擬機**：Docker 依賴 Linux 核心功能，非 Linux 系統需要跑 Linux VM。

```
Docker on Windows/Mac：
┌───────────────────────┐
│   Docker CLI          │
├───────────────────────┤
│   WSL 2 / Hyper-V     │
│  ┌─────────────────┐  │
│  │  Linux VM       │  │
│  │  Docker Daemon  │  │
│  │  容器、映像檔   │  │
│  └─────────────────┘  │
├───────────────────────┤
│   Host OS 核心        │
└───────────────────────┘
```

---

## 三、Linux 安裝（20 分鐘）

### CentOS

```bash
# 1. 安裝工具
sudo yum install -y yum-utils

# 2. 加入 Repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 3. 安裝 Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. 啟動
sudo systemctl start docker
sudo systemctl enable docker

# 5. 驗證
sudo docker run hello-world
```

### Ubuntu

```bash
# 1. 更新並安裝工具
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# 2. 加入 GPG 金鑰
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 3. 加入 Repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list

# 4. 安裝 Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. 驗證
sudo docker run hello-world
```

### 讓非 root 使用者執行 Docker

```bash
sudo usermod -aG docker $USER
newgrp docker  # 或重新登入
docker run hello-world  # 不用 sudo 了
```

**安全提醒**：docker 群組成員等同 root 權限。

---

## 四、Windows/Mac 安裝 Docker Desktop（10 分鐘）

### Windows

1. 啟用 WSL 2：`wsl --install`（PowerShell 系統管理員）
2. 重開機
3. 下載並安裝 Docker Desktop
4. 驗證：`docker run hello-world`

### Mac

1. 下載 Docker Desktop（注意 Intel vs Apple Silicon）
2. 安裝：拖到 Applications
3. 啟動 Docker Desktop
4. 驗證：`docker run hello-world`

### 資源設定

Docker Desktop → Settings → Resources
- CPUs：分配的 CPU 核心數
- Memory：分配的記憶體
- Disk：硬碟空間上限

---

## 五、驗證安裝（8 分鐘）

### 基本命令

```bash
docker --version     # 簡單版本
docker version       # 詳細版本（Client + Server）
docker info          # 系統資訊
```

### 測試容器

```bash
# hello-world
docker run hello-world

# 互動式 Ubuntu
docker run -it ubuntu bash
```

### 常見錯誤

| 錯誤 | 解法 |
|------|------|
| `Cannot connect to Docker daemon` | `sudo systemctl start docker` |
| `Permission denied` | `sudo usermod -aG docker $USER` + 重新登入 |
| WSL 2 相關錯誤 | `wsl --status` 和 `wsl --update` |

---

## 六、Docker Hub（8 分鐘）

### 為什麼需要帳號

- 下載頻率限制較寬鬆
- 可以推送自己的 Image
- 可以建立私有 Repository

### 命令列登入

```bash
docker login
# 輸入 Username 和 Password

docker logout  # 登出
```

**建議**：用 Access Token 代替密碼（Docker Hub → Account Settings → Security）

---

## 七、映像加速（5 分鐘）

Docker Hub 在國外，下載可能慢。設定映像站加速：

```json
// /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
```

```bash
sudo systemctl restart docker
docker info | grep -A 5 "Registry Mirrors"
```

---

## 八、小結（2 分鐘）

| 平台 | 安裝方式 |
|------|----------|
| Linux | 官方 Repository + systemctl |
| Windows/Mac | Docker Desktop |

驗證：`docker run hello-world`

下一小時：Docker 基本指令！

---

## 板書 / PPT 建議

1. 系統需求表
2. Linux 安裝流程圖
3. hello-world 執行流程
4. 常見錯誤與解法
