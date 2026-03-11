# Day 2 第六小時：Nginx 容器實戰

---

## 一、前情提要（2 分鐘）

學完指令，用 Nginx 實戰：
- Port Mapping
- 自訂網頁內容
- 設定檔修改
- 多容器運行

---

## 二、認識 Nginx（5 分鐘）

### 為什麼用 Nginx 練習

- 高效能 Web 伺服器
- 映像檔小（alpine 版約 40MB）
- 啟動快、有 Web 介面
- 實際工作常用

---

## 三、啟動 Nginx 容器（10 分鐘）

### 基本流程

```bash
docker pull nginx:alpine
docker run -d --name web -p 8080:80 nginx:alpine
docker ps
curl http://localhost:8080
```

### 查看日誌

```bash
docker logs web
docker logs -f web    # 持續追蹤
```

---

## 四、Port Mapping 深入（10 分鐘）

### 格式

```
-p [主機IP:]主機Port:容器Port[/協定]
```

### 常見寫法

```bash
-p 8080:80              # 主機 8080 → 容器 80
-p 127.0.0.1:8080:80    # 只綁定 localhost
-p 80:80 -p 443:443     # 多個 port
-P                      # 隨機高位 port
```

### 查看對應

```bash
docker port web
```

---

## 五、自訂網頁內容（15 分鐘）

### 方法一：docker cp

```bash
echo '<h1>Hello Docker!</h1>' > index.html
docker cp index.html web:/usr/share/nginx/html/
```

### 方法二：Volume 掛載（推薦）

```bash
mkdir -p ~/docker-demo/html
echo '<h1>Hello from Volume!</h1>' > ~/docker-demo/html/index.html

docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/html:/usr/share/nginx/html:ro \
  nginx:alpine
```

- `:ro`：唯讀模式
- 主機修改立即生效，不需重啟

---

## 六、修改 Nginx 設定（10 分鐘）

### 提取設定檔

```bash
docker exec web cat /etc/nginx/conf.d/default.conf
docker cp web:/etc/nginx/conf.d/default.conf ~/docker-demo/nginx/
```

### 掛載自訂設定

```bash
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/website:/usr/share/nginx/html:ro \
  -v ~/docker-demo/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
```

### 熱重載（不重啟）

```bash
docker exec web nginx -s reload
```

---

## 七、運行多個 Nginx 容器（5 分鐘）

```bash
docker run -d --name site-a -p 8081:80 \
  -v ~/docker-demo/site-a:/usr/share/nginx/html:ro \
  nginx:alpine

docker run -d --name site-b -p 8082:80 \
  -v ~/docker-demo/site-b:/usr/share/nginx/html:ro \
  nginx:alpine
```

### 篩選特定映像檔的容器

```bash
docker ps -f ancestor=nginx:alpine
```

---

## 八、練習題（3 分鐘）

```bash
# 建立目錄和內容
mkdir -p ~/my-web
echo '<h1>About Page</h1>' > ~/my-web/about.html
echo '<h1>Home</h1>' > ~/my-web/index.html

# 啟動容器
docker run -d --name my-web \
  -p 80:80 \
  -v ~/my-web:/usr/share/nginx/html:ro \
  nginx:alpine

# 驗證
curl http://localhost/
curl http://localhost/about.html
```

---

## 九、小結（2 分鐘）

| 技能 | 指令 |
|-----|-----|
| Port Mapping | `-p 主機Port:容器Port` |
| Volume 掛載 | `-v 主機路徑:容器路徑` |
| 查看日誌 | `docker logs` |
| 進入容器 | `docker exec` |
| 複製檔案 | `docker cp` |
| 熱重載 | `nginx -s reload` |

**重點技巧**
- 掛載網頁目錄：修改立即生效
- 掛載設定檔：自訂 Nginx 行為
- 多容器運行在不同 port

下一堂課：實作練習與 Day 2 總結。

---

## 板書 / PPT 建議

1. Nginx 容器目錄結構
2. Port Mapping 示意圖
3. Volume 掛載示意圖
4. 完整 docker run 命令解析
