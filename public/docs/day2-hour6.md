# Day 2 第六小時：Nginx 容器實戰

---

## 一、前情提要（2 分鐘）

學完指令，用 Nginx 做完整實戰：
- 啟動 Nginx 容器
- Port Mapping
- 自訂網頁內容（docker cp + Volume 掛載）
- 修改 Nginx 設定
- 多容器運行

---

## 二、認識 Nginx（5 分鐘）

### Nginx 是什麼

- 高效能 Web 伺服器，也常用作反向代理和負載均衡
- 輕量、快速、高併發處理能力
- Docker Hub 上下載量最高的映像檔之一

### 為什麼用 Nginx 練習

- 映像檔小（alpine 版約 40MB）
- 啟動快、有 Web 介面，操作後馬上能在瀏覽器看到結果
- 實際工作中非常常用

---

## 三、啟動第一個 Nginx 容器（10 分鐘）

### 基本流程

- 拉取映像檔 → 背景執行 + Port Mapping → 驗證
- 前景執行沒有 Port Mapping 無法訪問，要加 `-d` 和 `-p`

```bash
docker pull nginx:alpine
docker run -d --name web -p 8080:80 nginx:alpine
docker ps
curl http://localhost:8080
```

### 查看日誌與容器內部

- `docker logs -f` 即時追蹤 access log
- `docker exec -it` 進入容器查看目錄結構

```bash
docker logs -f web
docker exec -it web /bin/sh
```

### Nginx 容器重要路徑

- 設定檔：`/etc/nginx/nginx.conf`、`/etc/nginx/conf.d/default.conf`
- 網頁目錄：`/usr/share/nginx/html/`

---

## 四、Port Mapping 深入（10 分鐘）

### 格式解析

```
-p [主機IP:]主機Port:容器Port[/協定]
```

### 常見寫法

- `-p 8080:80`：主機 8080 → 容器 80
- `-p 127.0.0.1:8080:80`：只綁定 localhost，外部無法存取
- `-p 80:80 -p 443:443`：多個 port
- `-P`：隨機高位 port（大寫 P）

### Port 暴露的完整鏈路

- 外網請求 → 雲端安全組 → Linux 防火牆 → Docker `-p` → 容器應用
- 每一層都必須打通，少了任何一層都無法從外部訪問

### 查看 Port 對應

```bash
docker port web
```

---

## 五、自訂網頁內容（15 分鐘）

### 方法一：docker cp

- 快速但手動，適合臨時測試

```bash
echo '<h1>Hello Docker!</h1>' > index.html
docker cp index.html web:/usr/share/nginx/html/
```

### 方法二：Volume 掛載（推薦）

- 用 `-v` 把主機目錄掛載進容器，主機修改立即生效
- `:ro` 表示唯讀，容器不能修改

```bash
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/html:/usr/share/nginx/html:ro \
  nginx:alpine
```

### 驗證掛載

- 修改主機上的檔案，刷新瀏覽器立刻看到變化
- `docker inspect` 可查看 Mounts 區段確認掛載路徑

---

## 六、修改 Nginx 設定（10 分鐘）

### 提取設定檔

- 用 `docker cp` 從容器內複製出預設設定檔

```bash
docker cp web:/etc/nginx/conf.d/default.conf ~/docker-demo/nginx/
```

### 掛載自訂設定

- 同時掛載網頁目錄和設定檔

```bash
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/website:/usr/share/nginx/html:ro \
  -v ~/docker-demo/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
```

### 熱重載（不重啟容器）

- 修改設定後不需要重建容器

```bash
docker exec web nginx -s reload
```

---

## 七、運行多個 Nginx 容器（5 分鐘）

### 同時運行多個網站

- 同一映像檔可以跑多個容器，只要 port 不衝突
- 每個容器掛載不同的網頁目錄

```bash
docker run -d --name site-a -p 8081:80 \
  -v ~/docker-demo/site-a:/usr/share/nginx/html:ro \
  nginx:alpine

docker run -d --name site-b -p 8082:80 \
  -v ~/docker-demo/site-b:/usr/share/nginx/html:ro \
  nginx:alpine
```

### 篩選與管理

```bash
docker ps -f ancestor=nginx:alpine
docker stop site-a site-b web
```

---

## 八、練習題（3 分鐘）

```bash
mkdir -p ~/my-web
echo '<h1>Home</h1>' > ~/my-web/index.html
echo '<h1>About Page</h1>' > ~/my-web/about.html

docker run -d --name my-web \
  -p 80:80 \
  -v ~/my-web:/usr/share/nginx/html:ro \
  nginx:alpine

curl http://localhost/
curl http://localhost/about.html
```

---

## 九、本堂課小結（2 分鐘）

| 技能 | 指令 / 方法 |
|-----|------------|
| Port Mapping | `-p 主機Port:容器Port` |
| Volume 掛載 | `-v 主機路徑:容器路徑` |
| 查看日誌 | `docker logs -f` |
| 進入容器 | `docker exec -it` |
| 複製檔案 | `docker cp` |
| 熱重載 | `docker exec web nginx -s reload` |

**重點技巧**
- 掛載網頁目錄：主機修改立即生效
- 掛載設定檔：自訂 Nginx 行為
- 多容器運行在不同 port
- 容器內資料是臨時的，重要資料一定要用 `-v` 掛載出來
- Volume 的進階用法（匿名/具名掛載、數據卷容器）在後面課程深入講解

下一堂課：實作練習與 Day 2 總結。

---

## 板書 / PPT 建議

1. Nginx 容器目錄結構（/usr/share/nginx/html, /etc/nginx）
2. Port Mapping 示意圖（外網 → 安全組 → 防火牆 → Docker -p → 容器）
3. Volume bind mount 示意圖（主機目錄 ↔ 容器目錄）
4. 完整 docker run 命令解析（-d, --name, -p, -v）
