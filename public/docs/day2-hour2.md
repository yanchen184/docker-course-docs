# Day 2 第二小時：Docker 架構與工作原理

---

## 一、前情提要（3 分鐘）

上一小時學了容器概念和 Docker 基礎。

這小時深入架構——知道底層運作，出問題才知道怎麼查。

> 本堂課出現的指令是為了說明原理，安裝和實際操作在第三小時。

---

## 二、Client-Server 架構深入（5 分鐘）

### 為什麼要分開 Client 和 Daemon？

- **遠端操作**：Client 和 Daemon 可以在不同機器
- **權限分離**：Daemon 需 root，Client 可普通使用者
- **服務化**：Daemon 背景運行，開機自動啟動

```bash
# 連接遠端 Docker
docker -H tcp://192.168.1.100:2375 ps
```

---

## 三、Docker Client 詳解（8 分鐘）

### Docker CLI

```bash
docker version    # 查看版本
docker info       # 查看系統資訊
docker ps         # 列出容器
docker images     # 列出映像檔
docker run        # 執行容器
```

### 與 Daemon 溝通方式

| 方式 | 位置 | 用途 |
|------|------|------|
| Unix Socket | `/var/run/docker.sock` | 本機預設 |
| TCP | `tcp://localhost:2375` | 遠端（未加密） |
| TCP + TLS | `tcp://localhost:2376` | 遠端（生產環境）|

### Docker API

底層是 REST API，可用任何語言操作 Docker：

```bash
curl --unix-socket /var/run/docker.sock http://localhost/containers/json
```

---

## 四、Docker Daemon 詳解（15 分鐘）

### 職責

- **Image 管理**：下載、儲存、建立
- **Container 管理**：建立、啟動、停止、刪除
- **Network 管理**：建立網路、Port Mapping
- **Volume 管理**：資料持久化

### 架構分層

```
Docker Client
     ↓
Docker Daemon (dockerd)
     ↓
containerd
     ↓
runc（實際執行容器）
```

**containerd**：獨立的容器執行環境，負責容器生命週期
**runc**：OCI 標準實作，實際跑容器的程式

### Daemon 設定

設定檔位置：`/etc/docker/daemon.json`

常見設定：
- `storage-driver`：儲存驅動（推薦 overlay2）
- `log-opts`：日誌大小限制（避免硬碟爆炸）
- `registry-mirrors`：映射站加速下載

---

## 五、Docker Hub 與官方文件（15 分鐘）

### 什麼是 Registry

Registry 存放 Image，像 GitHub 存放程式碼。

### Docker Hub 官網導覽

**搜尋結果標籤**：
- **Official Image**：Docker + 上游團隊維護，品質有保證
- **Verified Publisher**：認證組織發布
- **Sponsored OSS**：Docker 贊助的開源專案

**映像詳情頁面**：
- **Overview**：使用說明書（啟動方式、環境變數、設定檔路徑）
- **Tags**：所有版本、大小、CPU 架構、Layer 資訊

**官方映像**（沒有斜線）：`nginx`、`mysql`、`redis`、`python`、`alpine`（5MB 精簡 Linux）

**社群映像**（有斜線）：`bitnami/nginx`、`linuxserver/nginx`

### Docker 官方文件（docs.docker.com）

| 區塊 | 用途 |
|------|------|
| Get started | 新手教學 |
| Guides | 主題深入指南（Dockerfile、網路、Volume） |
| Reference | 命令參考手冊 |
| Manuals | 各元件完整技術文件 |

**善用順序**：Hub Overview → docs Reference → docs Guides → Google

### Image 命名規則

```
[registry-host/][namespace/]repository[:tag]
```

**重點**：生產環境永遠不要用 `latest` tag！

### 私有 Registry

| 方案 | 特點 |
|------|------|
| Docker Registry | 官方開源，最簡單 |
| Harbor | 企業級，有漏洞掃描、存取控制 |
| 雲端服務 | AWS ECR、GCP GCR、Azure ACR |

---

## 六、Image 的分層結構（20 分鐘）

### 兩個關鍵問題

1. **Docker Image 為什麼只有幾 MB？**（CentOS ISO 4-5GB vs Docker Image 237MB）
2. **Container 為什麼可以 1 秒啟動？**（VM 開機需分鐘級）

### 聯合文件系統（UnionFS）

多個目錄「聯合掛載」到同一虛擬目錄，每層修改獨立疊加——像 Git 版本控制。

### bootfs 與 rootfs

**bootfs**：包含 bootloader + kernel。Container 直接用宿主機已運行的 kernel，跳過引導過程。
→ **所以 Container 1 秒啟動**（跳過最耗時的 kernel 引導）

**rootfs**：精簡的 Linux 發行版（`/bin`、`/etc`、`/usr`）。去掉 kernel、桌面環境、多餘工具。
→ **所以 Image 只有幾百 MB 甚至幾 MB**

```
完整 Linux：              Docker Image：
┌──────────────────┐
│ 桌面、文件、工具    │   ← 不要
├──────────────────┤
│ 系統服務           │   ← 不要
├──────────────────┤
│ rootfs（基本命令）  │   ← 只要這個（精簡版）
├──────────────────┤
│ kernel + 驅動      │   ← 用宿主機的
├──────────────────┤
│ bootfs             │   ← 用宿主機的
└──────────────────┘
```

### Layer 分層結構

```
┌─────────────────────────┐
│   你的應用程式           │  Layer 4
├─────────────────────────┤
│   pip install 套件       │  Layer 3
├─────────────────────────┤
│   安裝 Python            │  Layer 2
├─────────────────────────┤
│   Ubuntu 基礎系統        │  Layer 1
└─────────────────────────┘
```

### 分層的好處

1. **節省空間**：相同 Layer 只存一份
2. **加速下載**：已有的 Layer 不重複下載
3. **加速建構**：未變動的 Layer 用快取

### 唯讀層 vs 可寫層

- **Image Layer**：全部唯讀
- **Container Layer**：Container 獨有的可寫層

`docker commit` 可把容器層打包成新 Image。

### Copy-on-Write

Container 修改 Image 的檔案時：
1. 複製到 Container Layer
2. 在副本上修改
3. 原檔案不受影響

---

## 七、Storage Driver（8 分鐘）

決定 Docker 怎麼儲存資料。

| Driver | 說明 |
|--------|------|
| **overlay2** | 推薦，效能好、穩定 |
| devicemapper | 舊版 RHEL 預設，已不推薦 |
| btrfs/zfs | 需特定檔案系統，設定複雜 |

```bash
docker info | grep "Storage Driver"
```

---

## 八、深入理解 Docker 的九個問題（12 分鐘）

用九個問題串起整堂課的觀念。

### Q1：Container 為什麼要用跟 Host 相同的 Kernel？

Container 不含 kernel，直接用 host 的。Linux host → Linux container，不能跑 Windows container。

### Q2：`ps aux` 看不到 Container 裡的 Process？

其實**看得到**。Container 就是普通 Linux process，被 namespace 隔離。

### Q3：Container 之間為什麼看不到彼此的 Process？

**PID namespace**。每個 container 都以為自己的 PID 從 1 開始。

### Q4：兩個 Image 都 FROM ubuntu，會存兩份嗎？

不會。Docker 只存**一份 ubuntu layer**，這就是 layer reuse。

### Q5：Dockerfile 指令順序為什麼影響 Build 速度？

不常變動的放前面（如 `COPY package.json` + `RUN npm install`），常變動的放後面（`COPY . .`）。
→ Docker layer cache，避免每次重裝套件。

### Q6：為什麼建議一個 Container 只跑一個 Process？

- **可維護**：crash 時知道是誰出問題
- **可擴展**：獨立擴展各服務
- **K8s 設計假設**：container = 單一職責

### Q7：Production 為什麼常用 tini / dumb-init？

PID 1 在 Linux 負責轉發 signal + 回收 zombie。Node/Python 不會處理 zombie。
→ `docker run --init` 自動注入 tini 當 PID 1。

### Q8：Container 裡 apt install kernel 有意義嗎？

**完全沒意義。** Container 共用 host kernel，裝了也不會用到。

### Q9：`docker run nginx` 跟直接跑 `nginx` 差在哪？

Docker 額外做了：
1. 建立 Namespace（PID/NET/MNT/UTS/IPC 隔離）
2. 設定 Cgroups（CPU/Memory 限制）
3. 掛載 Filesystem（唯讀 image layers + 可寫 container layer）
4. 設定 Network（veth pair + docker0 bridge）
5. 最後才 exec nginx

> **Docker = process + filesystem + isolation + resource limit**

---

## 九、本堂課小結（4 分鐘）

| 主題 | 重點 |
|------|------|
| 架構 | Client → Daemon → Registry |
| Daemon | dockerd → containerd → runc |
| Docker Hub | 官方/社群/私有映像，善用 Overview |
| Image 原理 | bootfs/rootfs 解釋為何小且快 |
| 分層 | Layer 共用、Copy-on-Write |
| 九個問題 | kernel 共用、namespace 隔離、layer cache、單一職責 |

下一小時：安裝 Docker！

---

## 板書 / PPT 建議

1. Docker 架構圖（Client → Daemon → Registry）
2. Daemon 元件分層圖（dockerd → containerd → runc）
3. Docker Hub 搜尋結果標籤說明
4. bootfs/rootfs 分層圖
5. Layer 分層示意圖 + Copy-on-Write 流程
6. 九個問題清單（可做成快問快答互動）
