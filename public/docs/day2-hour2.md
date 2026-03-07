# Day 2 第二小時：Docker 架構與工作原理

---

## 一、前情提要（3 分鐘）

上一小時學了容器概念和 Docker 基礎。

這小時深入架構——知道底層運作，出問題才知道怎麼查。

---

## 二、Docker 架構總覽（10 分鐘）

### Client-Server 架構

三個主要元件：

| 元件 | 功能 |
|------|------|
| **Docker Client** | 使用者介面，接收命令 |
| **Docker Daemon** | 背景服務，實際執行工作 |
| **Docker Registry** | 遠端倉庫，存放 Image |

執行 `docker run nginx` 的流程：

```
你 → Client → Daemon → (Registry) → Container
```

### 為什麼要分開？

- **遠端操作**：Client 和 Daemon 可以在不同機器
- **權限分離**：Daemon 需 root，Client 可普通使用者
- **服務化**：Daemon 背景運行，開機自動啟動

---

## 三、Docker Client（8 分鐘）

### 常用命令

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

---

## 四、Docker Daemon（15 分鐘）

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

## 五、Docker Registry（10 分鐘）

### Docker Hub

最大的公開 Registry。

**Image 命名規則**：

```
[registry-host/][namespace/]repository[:tag]
```

範例：
- `nginx` → 官方映像
- `nginx:1.25` → 指定版本
- `bitnami/nginx` → 社群映像
- `192.168.1.100:5000/myapp` → 私有 Registry

**重點**：生產環境永遠不要用 `latest` tag！

### 私有 Registry 方案

| 方案 | 特點 |
|------|------|
| Docker Registry | 官方開源，最簡單 |
| Harbor | 企業級，有漏洞掃描、存取控制 |
| 雲端服務 | AWS ECR、GCP GCR、Azure ACR |

---

## 六、Image 分層結構（12 分鐘）

### Layer 概念

Image = 多個 Layer 疊加

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

Container 的檔案修改只影響自己的可寫層，不影響 Image。

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

查看目前使用的 Driver：
```bash
docker info | grep "Storage Driver"
```

---

## 八、小結（4 分鐘）

| 主題 | 重點 |
|------|------|
| 架構 | Client → Daemon → Registry |
| Daemon | dockerd → containerd → runc |
| Registry | Docker Hub、私有 Registry |
| Image | 分層結構、Layer 共用、Copy-on-Write |

下一小時：安裝 Docker！

---

## 板書 / PPT 建議

1. Docker 架構圖
2. Daemon 元件分層圖
3. Image 命名格式
4. Layer 分層示意圖
5. Copy-on-Write 流程
