# Day 3 第八小時：映像檔深入理解

---

## 一、前情回顧（3 分鐘）

上週學了 Docker 基礎操作。

今天深入：映像檔、容器生命週期、網路、Volume、Dockerfile。

本堂課：映像檔深入理解
- 分層結構
- Layer 運作原理
- Tag 管理
- 選擇適合的映像檔

---

## 二、映像檔分層結構（15 分鐘）

### 查看 Layer

```bash
docker history nginx:alpine
```

```
IMAGE          CREATED BY                                      SIZE
a6bd71f48f68   CMD ["nginx" "-g" "daemon off;"]               0B
<missing>      EXPOSE 80                                       0B
<missing>      RUN set -x && addgroup...                       7.52MB
<missing>      ADD file:7625ddfd589fb824...                    7.34MB
```

### 分層的好處

1. **空間效率**：多個 Image 共用相同 Layer
2. **下載效率**：已存在的 Layer 不重複下載
3. **建構效率**：未變動的 Layer 使用快取

### Layer 不可變性

- 每個 Layer 都是**唯讀的**
- 刪除檔案只是加標記，不會真正減少大小
- 這影響 Dockerfile 寫法（後面會講）

---

## 三、Content Addressable Storage（10 分鐘）

### Image ID

```bash
docker inspect nginx:alpine --format '{{.Id}}'
# sha256:a6bd71f48f6831a6...
```

- ID 是內容的 SHA256 雜湊值
- 相同內容 = 相同 ID
- 用於判斷 Layer 是否已存在

### Digest

```bash
docker pull nginx@sha256:a59278fd22a9d411...
```

比 tag 更精確，因為 tag 可能指向不同 Image。

---

## 四、Tag 管理（10 分鐘）

### 常見 Tag 慣例

| Tag | 意義 |
|-----|------|
| latest | 預設標籤（不等於最新） |
| 1.25.3 | 精確版本 |
| 1.25 | 主版本最新 |
| alpine | 基於 Alpine Linux |
| slim | 精簡版 |

### docker tag 命令

```bash
docker tag nginx:alpine my-nginx:v1
docker tag nginx:alpine registry.example.com/nginx:v1
```

### latest 的陷阱

**生產環境永遠不要用 latest！**

```bash
# 不好
docker run nginx:latest

# 好
docker run nginx:1.25.3
```

---

## 五、選擇映像檔（15 分鐘）

### 官方 vs 社群

| 類型 | 命名 | 建議 |
|-----|------|------|
| 官方 | `nginx` | 優先使用 |
| 社群 | `bitnami/nginx` | 看維護者信譽 |

### Base Image 比較

| 類型 | 大小 | 特點 |
|-----|------|------|
| python:3.11 | ~1GB | 完整，含編譯工具 |
| python:3.11-slim | ~155MB | 精簡，移除非必要 |
| python:3.11-alpine | ~52MB | 最小，musl libc |

### 選擇建議

| 場景 | 建議 |
|-----|------|
| 開發測試 | 預設版本 |
| 生產環境 | slim 版本 |
| 極致優化 | alpine 版本 |
| 需要編譯 | 預設版本 |

---

## 六、匯出與匯入（5 分鐘）

```bash
# 匯出
docker save -o nginx.tar nginx:alpine

# 匯入
docker load -i nginx.tar
```

**用途**：離線環境部署、備份

---

## 七、小結（2 分鐘）

| 主題 | 重點 |
|-----|------|
| 分層 | Image 由多個唯讀 Layer 組成，可共用 |
| ID | 內容的 hash，確保完整性 |
| Tag | 別名，latest 不等於最新 |
| 選擇 | 優先官方，根據需求選 base image |

下一堂：容器生命週期管理。

---

## 板書 / PPT 建議

1. Layer 堆疊示意圖
2. Layer 共用示意圖
3. Tag 指向 Image ID 關係圖
4. Base Image 大小比較表
