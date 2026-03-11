# Day 3 第八小時：映像檔深入理解

---

## 一、前情回顧（3 分鐘）

上週學了 Docker 基礎操作。

今天深入：映像檔、容器生命週期、網路、Volume、Dockerfile。

這堂課專門講映像檔：
- 分層結構
- Layer 運作原理
- 映像檔標籤管理
- 選擇適合的映像檔

---

## 二、映像檔分層結構（15 分鐘）

### 2.1 複習：什麼是 Layer

Docker Image 由多個 Layer 組成。每一層代表一組檔案變更。

```bash
docker pull nginx:alpine
```

輸出：

```
alpine: Pulling from library/nginx
4abcf2066143: Pull complete    # Layer 1: Alpine 基礎
6c1024b63145: Pull complete    # Layer 2: 安裝 nginx
a123cd45678b: Pull complete    # Layer 3: 設定檔
...
```

### 2.2 查看映像檔的 Layer

```bash
docker history nginx:alpine
```

輸出：

```
IMAGE          CREATED        CREATED BY                                      SIZE
a6bd71f48f68   2 weeks ago    /bin/sh -c #(nop)  CMD ["nginx" "-g" "daem...   0B
<missing>      2 weeks ago    /bin/sh -c #(nop)  STOPSIGNAL SIGQUIT           0B
<missing>      2 weeks ago    /bin/sh -c #(nop)  EXPOSE 80                    0B
<missing>      2 weeks ago    /bin/sh -c set -x && addgroup -g 101 -S ng...   7.52MB
<missing>      2 weeks ago    /bin/sh -c #(nop)  ENV PKG_RELEASE=1            0B
<missing>      3 weeks ago    /bin/sh -c #(nop)  CMD ["/bin/sh"]              0B
<missing>      3 weeks ago    /bin/sh -c #(nop) ADD file:7625ddfd589fb824...   7.34MB
```

**欄位說明**

- `IMAGE`：該層的 ID（`<missing>` 表示中間層，沒有獨立 ID）
- `CREATED BY`：建立這一層的命令
- `SIZE`：這一層的大小

### 2.3 為什麼是分層的？

**原因一：空間效率**

多個 Image 可以共用相同的 Layer。

```
Image A (Python App)     Image B (Python App)
┌─────────────────┐     ┌─────────────────┐
│  App A 程式碼   │     │  App B 程式碼   │
├─────────────────┤     ├─────────────────┤
│  pip packages   │     │  pip packages   │  ← 可能不同
├─────────────────┼─────┼─────────────────┤
│           Python 3.11 Layer             │  ← 共用
├─────────────────────────────────────────┤
│              Alpine Layer               │  ← 共用
└─────────────────────────────────────────┘
```

如果有 10 個 Python 應用，不用儲存 10 份 Python 和 Alpine。

**原因二：下載效率**

下載 Image 時，已經有的 Layer 不用重新下載。

```bash
$ docker pull python:3.11-alpine

3.11-alpine: Pulling from library/python
4abcf2066143: Already exists    # 本機已有
5de5f69f42d7: Already exists    # 本機已有
abc123def456: Pull complete     # 只下載這個
```

**原因三：建構效率**

Dockerfile 建構時，沒變化的 Layer 使用快取。

```
Step 1/5 : FROM python:3.11-alpine
 ---> Using cache
Step 2/5 : WORKDIR /app
 ---> Using cache
Step 3/5 : COPY requirements.txt .
 ---> Using cache
Step 4/5 : RUN pip install -r requirements.txt
 ---> Using cache
Step 5/5 : COPY . .
 ---> abc123def456           # 只有這步重新執行
```

### 2.4 Layer 的不可變性

每個 Layer 都是唯讀的，建立後不能修改。

如果要修改，只能在上面加新的 Layer。

**刪除檔案的真相**

假設 Layer 1 有一個 100MB 的檔案。
Layer 2 執行 `rm` 刪除這個檔案。

這個檔案真的消失了嗎？

**沒有。**

Layer 1 還是 100MB。Layer 2 只是加了一個「標記」說這個檔案被刪除了。
最終 Image 還是包含那 100MB。

這就是為什麼 Dockerfile 的寫法很重要——後面會詳細說。

---

## 三、Content Addressable Storage（10 分鐘）

### 3.1 Image ID 是什麼

```bash
docker images

REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
nginx        alpine    a6bd71f48f68   2 weeks ago   43.2MB
```

IMAGE ID 是映像檔內容的 SHA256 雜湊值（取前 12 碼）。

完整的 ID：

```bash
docker inspect nginx:alpine --format '{{.Id}}'
# sha256:a6bd71f48f6831a6...
```

### 3.2 Content Addressable 的意義

ID 由內容決定，不是隨機的。

**相同內容 = 相同 ID**

如果兩個 Image 的內容完全一樣，它們的 ID 就一樣。

這讓 Docker 可以：
- 判斷 Layer 是否已存在（比對 ID）
- 驗證下載的內容是否正確（重算 hash 比對）
- 確保不可篡改（內容變了 ID 就變了）

### 3.3 Digest

Registry 上的映像檔有 Digest：

```bash
docker pull nginx:alpine

Digest: sha256:a59278fd22a9d411121e190b8cec8aa57b306aa3332459197777583beb728f59
```

Digest 是整個 Image manifest 的 hash，可以用來精確指定版本：

```bash
docker pull nginx@sha256:a59278fd22a9d411121e190b8cec8aa57b306aa3332459197777583beb728f59
```

這比用 tag 更精確，因為 tag 可能會指向不同的 Image。

---

## 四、映像檔標籤（Tag）管理（10 分鐘）

### 4.1 Tag 是什麼

Tag 是映像檔的標籤，用來區分不同版本。

```
nginx:1.25.3
nginx:1.25
nginx:latest
nginx:alpine
nginx:1.25-alpine
```

**Tag 只是別名**

Tag 不是 Image 的一部分，它只是指向某個 Image ID 的指標。

同一個 Image ID 可以有多個 Tag。
同一個 Tag 可以在不同時間指向不同 Image ID。

### 4.2 常見的 Tag 慣例

| Tag 模式 | 意義 | 範例 |
|---------|------|------|
| latest | 預設標籤 | nginx:latest |
| 版本號 | 特定版本 | nginx:1.25.3 |
| 主版本 | 該主版本最新 | nginx:1.25 |
| alpine | 基於 Alpine Linux | nginx:alpine |
| slim | 精簡版 | python:3.11-slim |
| buster/bullseye/bookworm | Debian 版本代號 | python:3.11-bookworm |

### 4.3 docker tag 命令

給映像檔加上新的 Tag：

```bash
# 語法
docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]

# 範例
docker tag nginx:alpine my-nginx:v1
docker tag nginx:alpine registry.example.com/nginx:v1
```

這不會複製 Image，只是建立新的 Tag 指向同一個 Image。

```bash
docker images

REPOSITORY                      TAG      IMAGE ID       SIZE
nginx                           alpine   a6bd71f48f68   43.2MB
my-nginx                        v1       a6bd71f48f68   43.2MB   # 同一個 ID
registry.example.com/nginx      v1       a6bd71f48f68   43.2MB   # 同一個 ID
```

### 4.4 latest 的陷阱

**latest 不是穩定版本號。**

latest 只是一個可變的 tag 名稱，不代表「最新版」，也不保證不同時間拉到的是同一份映像檔。

```bash
# 今天
docker pull nginx:latest  # 拉到 1.25.3

# 一個月後
docker pull nginx:latest  # 可能拉到不同內容的 latest，無法保證可重現
```

**生產環境永遠不要用 latest：**

```bash
# 不好
docker run nginx:latest

# 好
docker run nginx:1.25.3
```

### 4.5 刪除 Tag

```bash
# 刪除 tag
docker rmi my-nginx:v1

# 如果 Image 只有這一個 tag，Image 本身也會被刪除
# 如果還有其他 tag 指向同一個 Image，只刪除這個 tag
```

---

## 五、選擇適合的映像檔（15 分鐘）

### 5.1 官方映像檔 vs 社群映像檔

**官方映像檔**

- 由 Docker 官方或軟體官方維護
- 名稱沒有斜線：`nginx`、`mysql`、`python`
- 品質有保證，定期更新安全修補

**社群映像檔**

- 由一般使用者上傳
- 名稱有斜線：`bitnami/nginx`、`linuxserver/nginx`
- 品質參差不齊，要看維護者信譽

**建議**

- 優先用官方映像檔
- 如果用社群映像檔，選知名維護者（如 bitnami、linuxserver）
- 檢查 Docker Hub 上的星星數、下載數、更新頻率

### 5.2 Base Image 的選擇

同一個軟體通常有多種 Base Image 版本：

| 類型 | 範例 | 大小 | 特點 |
|-----|------|------|------|
| 預設 | python:3.11 | ~1GB | 完整 Debian，含編譯工具 |
| slim | python:3.11-slim | ~150MB | 精簡 Debian，移除非必要套件 |
| alpine | python:3.11-alpine | ~50MB | 基於 Alpine Linux，最小 |

**Alpine 的優缺點**

優點：
- 超小（基礎只有 5MB）
- 安全（攻擊面小）
- 啟動快

缺點：
- 用 musl libc 而非 glibc，某些套件可能不相容
- 套件管理用 apk 而非 apt，生態較小
- 除錯工具較少

**選擇建議**

| 場景 | 建議 |
|-----|------|
| 開發/測試 | 預設版本，方便除錯 |
| 生產環境（一般） | slim 版本 |
| 生產環境（極致優化） | alpine 版本 |
| 需要編譯原生套件 | 預設版本（有編譯工具） |

### 5.3 查看映像檔資訊

**Docker Hub 頁面**

https://hub.docker.com/_/nginx

可以看到：
- 支援的 Tag
- Dockerfile 內容
- 使用說明
- 漏洞掃描結果

**命令列查看**

```bash
# 查看映像檔詳細資訊
docker inspect nginx:alpine

# 取得特定欄位
docker inspect -f '{{.Config.Env}}' nginx:alpine
docker inspect -f '{{.Config.ExposedPorts}}' nginx:alpine
docker inspect -f '{{.Config.Cmd}}' nginx:alpine
```

### 5.4 映像檔大小優化

```bash
# 查看映像檔大小
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -hr
```

**為什麼要在意大小？**

- 下載更快
- 部署更快
- 儲存成本更低
- 攻擊面更小

**大小比較範例**

| Image | 大小 |
|-------|------|
| python:3.11 | 1.01GB |
| python:3.11-slim | 155MB |
| python:3.11-alpine | 52MB |
| nginx | 187MB |
| nginx:alpine | 43MB |

---

## 六、映像檔的匯出與匯入（5 分鐘）

### 6.1 儲存成檔案（docker save）

```bash
docker save -o nginx.tar nginx:alpine
```

產生一個 tar 檔案，包含映像檔的所有 Layer。

可以用來：
- 備份
- 傳輸到沒有網路的機器
- 分享給他人

### 6.2 從檔案載入（docker load）

```bash
docker load -i nginx.tar
```

還原映像檔到本機。

### 6.3 使用場景

**離線環境部署**

```bash
# 在有網路的機器
docker pull nginx:alpine
docker save -o nginx.tar nginx:alpine

# 把 nginx.tar 傳到離線機器（USB、SCP...）

# 在離線機器
docker load -i nginx.tar
docker images  # 確認已載入
```

**備份重要映像檔**

```bash
docker save -o backup/my-app-v1.tar my-app:v1
```

---

## 七、本堂課小結（2 分鐘）

這堂課深入了解了映像檔：

**分層結構**
- Image 由多個唯讀 Layer 組成
- Layer 共用節省空間和下載時間
- 用 `docker history` 查看 Layer

**Content Addressable**
- Image ID 是內容的 hash
- Digest 精確指定版本

**Tag 管理**
- Tag 是指向 Image 的別名
- latest 不等於最新版
- 生產環境用具體版本號

**選擇映像檔**
- 優先用官方映像檔
- 根據需求選擇 base image（預設/slim/alpine）
- 考慮大小和相容性

下一堂：容器生命週期管理。

---

## 板書 / PPT 建議

1. Layer 堆疊示意圖
2. Layer 共用示意圖
3. Tag 指向 Image ID 關係圖
4. 不同 Base Image 大小比較表
5. docker history 輸出解析
