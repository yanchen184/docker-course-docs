# Day 2 第一小時：環境一致性問題與容器技術

---

## 一、開場（5 分鐘）

今天開始講容器技術。

先問大家：有沒有遇過程式在自己電腦跑得好好的，丟到伺服器就壞掉？

這叫「It works on my machine」——業界經典的痛。

今天就是要解決這個問題。

學習路線圖：
1. Docker 基礎概念
2. 安裝與基本命令
3. 映像檔深入
4. 資料持久化（Volume）
5. 自製映像檔（Dockerfile）
6. Docker 網路
7. Docker Compose
8. 叢集編排（Swarm、K8s）
9. CI/CD 整合

---

## 二、環境一致性問題（15 分鐘）

### 什麼是執行環境

程式不是獨立存在的，它依賴五個層面：
- 作業系統版本（Ubuntu 20.04 vs 22.04）
- 程式語言版本（Python 3.8 vs 3.11）
- 相依套件版本（Django 3.2 vs 4.2）
- 系統函式庫（OpenSSL、libpng）
- 設定檔和環境變數

### 真實案例

| 案例 | 問題 |
|------|------|
| Python 版本不一致 | Mac 用 3.11，伺服器 3.8，match-case 語法報錯 |
| 套件版本衝突 | 多專案共用伺服器，底層套件版本互相衝突 |
| 系統函式庫缺失 | Mac 有 libjpeg，Linux 最小化安裝沒有 |
| 設定檔路徑寫死 | `/Users/john/config/` 在伺服器不存在 |

### 問題有多嚴重

- 上百個套件，幾萬種版本組合
- 環境會隨時間改變（套件更新、OS 升級）
- 不同專案需求互相衝突
- 團隊成員環境各不相同（Mac/Windows/Linux）

### 傳統解法

**1. 寫詳細安裝文件**
→ 會過時、會漏寫、不同人照做結果不同

**2. 用虛擬機**
→ 可以解決，但太肥。一個 VM 幾十 GB，開機要幾分鐘，一台機器跑不了幾個。

---

## 三、容器技術的誕生（20 分鐘）

### 核心概念

容器 = 輕量級虛擬化

不模擬整個作業系統，只打包應用程式 + 相依套件。

靠 Linux 核心兩個功能實現：
- **Namespace**：隔離。PID、Network、Mount、UTS、User、IPC 六種隔離
- **Cgroups**：限制資源。控制 CPU、記憶體、磁碟 IO

容器共用主機的 Linux 核心，所以很輕。

### 容器 vs 虛擬機

```
虛擬機：                    容器：
┌─────────┐ ┌─────────┐   ┌─────────┐ ┌─────────┐
│  App A  │ │  App B  │   │  App A  │ │  App B  │
├─────────┤ ├─────────┤   ├─────────┤ ├─────────┤
│ Guest OS│ │ Guest OS│   │  Libs   │ │  Libs   │
└─────────┘ └─────────┘   └─────────┘ └─────────┘
┌─────────────────────┐   ┌─────────────────────┐
│     Hypervisor      │   │   Container Engine  │
├─────────────────────┤   ├─────────────────────┤
│      Host OS        │   │      Host OS        │
└─────────────────────┘   └─────────────────────┘
```

### 具體數據比較

| 項目 | 虛擬機 | 容器 |
|-----|-------|------|
| 啟動時間 | 分鐘級 | 秒級 |
| 映像大小 | GB 級 | MB 級 |
| 效能 | 5-10% 損耗 | 接近原生 |
| 單機數量 | ~10-20 | 數百~上千 |
| 隔離程度 | 完全隔離（核心級） | 程序級隔離 |

### 容器技術的歷史演進

Docker 不是發明 Container，是讓它變好用。

| 年份 | 技術 | 貢獻 |
|------|------|------|
| 1979 | Unix chroot | 最早的 filesystem 隔離 |
| 2000 | FreeBSD Jails | 第一個完整 container |
| 2002 | Linux Namespaces | PID/NET/MNT 等隔離 |
| 2006 | Google Process Containers | 後來的 cgroups |
| 2008 | LXC | 整合 namespaces + cgroups |
| 2013 | Docker | 把 LXC 包裝成好用工具 |

Docker 三個創新：
1. **Image + Layer** — 分層映像，共用 layer
2. **Dockerfile** — Infrastructure as Code
3. **Docker Hub** — 生態系，`docker pull nginx` 一行搞定

---

## 四、Docker 簡介（15 分鐘）

### Docker 是什麼

2013 年開源，目前最流行的容器平台。

一句話：**把應用程式和執行環境打包成標準單元，在任何有 Docker 的機器上都能跑。**

### 核心三元素

| 概念 | 比喻 | 說明 |
|------|------|------|
| **Image** | 光碟 / Java class | 唯讀模板，包含程式+環境+設定 |
| **Container** | 裝好的電腦 / new 出的 object | Image 的執行實例，可啟動、停止、刪除 |
| **Registry** | App Store | 存放 Image 的地方，Docker Hub 是最大公開倉庫 |

### 如何解決環境問題

1. 開發者建立 Image（程式 + 環境都打包）
2. 推送到 Registry
3. 維運拉下來直接跑

不只給程式碼，連環境一起給。

### Docker 架構

Client-Server 架構：

| 元件 | 功能 |
|------|------|
| Docker Client | 你打的命令（docker run, build 等） |
| Docker Daemon | 背景服務，實際執行工作 |
| Docker Registry | 遠端倉庫，存放 Image |

`docker run hello-world` 流程：

```
docker run hello-world
        ↓
  本機有 Image？
     /        \
   有          沒有 → Docker Hub 下載
   ↓                        ↓
 直接運行              找到 → 下載 → 運行
                       找不到 → 報錯
```

### Docker 生態系統

- **Docker Desktop**：Windows/Mac 使用 Docker 的工具
- **Docker Compose**：定義和管理多容器應用
- **Docker Swarm**：基本容器編排（業界更常用 K8s）
- **Docker Hub**：最大公開 Image 倉庫

---

## 五、Podman 簡介（5 分鐘）

Red Hat 推出的容器引擎，指令跟 Docker 幾乎一樣。

最大差別：**沒有 Daemon**（daemonless）

好處：
- 安全性更高（不需 root daemon）
- 省資源（無背景程序）
- systemd 整合更好

RHEL/CentOS/Fedora 預設使用 Podman。本課程以 Docker 為主。

---

## 六、本堂課小結（5 分鐘）

| 主題 | 重點 |
|------|------|
| 環境問題 | 程式依賴環境，環境不同就出錯 |
| 容器 | 輕量虛擬化，共用核心，Namespace + Cgroups |
| Docker | Image → Container → Registry，CS 架構 |
| 歷史 | chroot → Jails → LXC → Docker |
| 四大優勢 | 快速交付、便捷擴縮、簡單運維、高效資源 |

下一小時：Docker 架構細節。

---

## 板書 / PPT 建議

1. 「It works on my machine」梗圖
2. 執行環境五層次圖
3. 容器 vs VM 架構圖 + 比較表
4. 容器技術歷史時間線
5. Docker 三元素關係圖
6. docker run hello-world 流程圖
