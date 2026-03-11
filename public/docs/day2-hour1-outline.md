# Day 2 第一小時：環境一致性問題與容器技術

> Archived reference file.
> This file is not rendered by the app.
> Active course content is mapped through `src/App.tsx` and the `dayX-hourY(.md/-full.md)` files.

## 一、開場（2 分鐘）
- 「It works on my machine」問題
- 本堂課目標

## 二、環境一致性問題（10 分鐘）

### 問題根源
- 作業系統版本差異
- 程式語言版本差異
- 套件版本差異
- 系統設定差異

### 真實案例
- Mac 開發 → Linux 部署失敗
- Python 3.11 vs 3.8 衝突

### 傳統解法
1. 詳細安裝文件 → 會過時
2. 虛擬機 → 太肥

## 三、容器是什麼（15 分鐘）

### 核心概念
- 輕量級虛擬化
- 共用主機核心
- **Namespace**：隔離
- **Cgroups**：資源限制

### 容器 vs 虛擬機
| 項目 | 虛擬機 | 容器 |
|------|--------|------|
| 啟動時間 | 分鐘 | 秒 |
| 大小 | GB | MB |
| 效能 | 有損耗 | 接近原生 |

## 四、Docker 簡介（15 分鐘）

### Docker 是什麼
- 2013 年開源
- 最流行的容器平台

### 核心三元素
1. **Image**（映像檔）：唯讀模板
2. **Container**（容器）：執行實例
3. **Registry**（倉庫）：儲存 Image

### 如何解決環境問題
開發者建立 Image → 推送 Registry → 維運拉取執行

## 五、小結（3 分鐘）
- 環境一致性問題
- 容器：輕量虛擬化
- Docker：Image → Container → Registry
