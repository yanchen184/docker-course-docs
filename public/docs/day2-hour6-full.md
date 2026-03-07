# Day 2 第六小時：Nginx 容器實戰

---

## 一、前情提要（2 分鐘）

前面學了一堆指令，現在來實戰。

這堂課用 Nginx 做一個完整的練習：
- 啟動 Nginx 容器
- Port Mapping
- 瀏覽器驗證
- 自訂首頁
- 設定檔修改
- 多個 Nginx 容器

---

## 二、認識 Nginx（5 分鐘）

### 2.1 Nginx 是什麼

Nginx 是一個高效能的 Web 伺服器，也常用作反向代理、負載均衡。

特點：
- 輕量、快速
- 高併發處理能力
- 設定簡單

Docker 官方映像檔是最常被下載的映像檔之一。

### 2.2 為什麼用 Nginx 練習

- 映像檔小（alpine 版約 40MB）
- 啟動快
- 有 Web 介面，方便驗證
- 實際工作常用

---

## 三、啟動第一個 Nginx 容器（10 分鐘）

### 3.1 拉取映像檔

```bash
docker pull nginx:alpine
```

alpine 版本比較小。

### 3.2 前景執行看看

```bash
docker run nginx:alpine
```

會看到 Nginx 的啟動日誌。

但這樣沒辦法訪問——沒有做 Port Mapping。

Ctrl+C 停止。

### 3.3 背景執行 + Port Mapping

```bash
docker run -d --name web -p 8080:80 nginx:alpine
```

- `-d`：背景執行
- `--name web`：容器名稱
- `-p 8080:80`：主機 8080 對應容器 80

### 3.4 驗證

```bash
# 確認容器在跑
docker ps

# 命令列測試
curl http://localhost:8080
```

或打開瀏覽器訪問 http://localhost:8080

會看到 Nginx 的歡迎頁面。

### 3.5 查看日誌

```bash
docker logs web
docker logs -f web    # 持續追蹤
```

用瀏覽器訪問幾次，可以看到 access log。

---

## 四、Port Mapping 深入（10 分鐘）

### 4.1 格式解析

```
-p [主機IP:]主機Port:容器Port[/協定]
```

**常見寫法**

```bash
-p 8080:80              # 主機 8080 → 容器 80
-p 127.0.0.1:8080:80    # 只綁定 localhost
-p 8080:80/tcp          # 指定 TCP（預設）
-p 8080:80/udp          # 指定 UDP
-p 80:80 -p 443:443     # 多個 port
```

### 4.2 綁定所有介面 vs 只綁定 localhost

```bash
# 所有介面（預設），外部可存取
docker run -d -p 8080:80 nginx

# 只綁定 localhost，外部無法存取
docker run -d -p 127.0.0.1:8080:80 nginx
```

生產環境考慮安全性，不要隨便開放所有介面。

### 4.3 使用隨機 Port

```bash
docker run -d -P nginx
```

大寫 `-P` 會把映像檔 EXPOSE 的所有 port 對應到隨機的高位 port。

查看對應：

```bash
docker port web
# 輸出：80/tcp -> 0.0.0.0:49153
```

### 4.4 查看 Port 使用

```bash
docker port web
docker ps --format "{{.Names}}: {{.Ports}}"
```

---

## 五、自訂網頁內容（15 分鐘）

### 5.1 Nginx 預設網頁目錄

Nginx 官方映像檔的網頁目錄：

```
/usr/share/nginx/html/
```

裡面有 index.html（歡迎頁）和 50x.html（錯誤頁）。

### 5.2 方法一：docker cp 複製檔案

先建立一個 HTML 檔案：

```bash
echo '<h1>Hello Docker!</h1>' > index.html
```

複製到容器：

```bash
docker cp index.html web:/usr/share/nginx/html/index.html
```

重新整理瀏覽器，看到變化。

### 5.3 方法二：Volume 掛載（推薦）

先準備一個目錄和檔案：

```bash
mkdir -p ~/docker-demo/html
echo '<h1>Hello from Volume!</h1>' > ~/docker-demo/html/index.html
```

啟動容器時掛載：

```bash
# 先刪除舊容器
docker rm -f web

# 用 volume 掛載
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/html:/usr/share/nginx/html:ro \
  nginx:alpine
```

`:ro` 表示唯讀（read-only），容器不能修改這個目錄。

驗證：

```bash
curl http://localhost:8080
```

**修改主機上的檔案**

```bash
echo '<h1>Updated!</h1>' > ~/docker-demo/html/index.html
```

刷新瀏覽器，立刻看到變化。不需要重啟容器。

這就是 Volume 的好處——主機和容器共用檔案。

### 5.4 建立完整的靜態網站

```bash
mkdir -p ~/docker-demo/website
cat > ~/docker-demo/website/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My Docker Website</title>
    <style>
        body { font-family: Arial; margin: 40px; }
        h1 { color: #0066cc; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to My Docker Website!</h1>
        <p>This website is running in a Docker container.</p>
        <ul>
            <li>Web Server: Nginx</li>
            <li>Container Engine: Docker</li>
        </ul>
    </div>
</body>
</html>
EOF
```

重新建立容器：

```bash
docker rm -f web
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/website:/usr/share/nginx/html:ro \
  nginx:alpine
```

瀏覽器訪問看效果。

---

## 六、修改 Nginx 設定（10 分鐘）

### 6.1 查看預設設定

```bash
docker exec web cat /etc/nginx/nginx.conf
docker exec web cat /etc/nginx/conf.d/default.conf
```

### 6.2 提取設定檔

```bash
mkdir -p ~/docker-demo/nginx
docker cp web:/etc/nginx/conf.d/default.conf ~/docker-demo/nginx/
```

### 6.3 修改設定

編輯 ~/docker-demo/nginx/default.conf：

```nginx
server {
    listen       80;
    server_name  localhost;

    # 自訂 access log 格式
    access_log  /var/log/nginx/access.log;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    # 新增 /api 路徑
    location /api {
        return 200 '{"status": "ok", "message": "Hello from Docker Nginx!"}';
        add_header Content-Type application/json;
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

### 6.4 套用新設定

重新建立容器，掛載設定檔：

```bash
docker rm -f web
docker run -d --name web \
  -p 8080:80 \
  -v ~/docker-demo/website:/usr/share/nginx/html:ro \
  -v ~/docker-demo/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
```

驗證：

```bash
curl http://localhost:8080
curl http://localhost:8080/api
```

### 6.5 熱重載設定（不重啟容器）

如果只是改設定，不需要重建容器：

```bash
# 修改主機上的設定檔後
docker exec web nginx -s reload
```

Nginx 會重新載入設定。

---

## 七、運行多個 Nginx 容器（5 分鐘）

### 7.1 同時運行多個

```bash
# 網站 A
docker run -d --name site-a -p 8081:80 \
  -v ~/docker-demo/site-a:/usr/share/nginx/html:ro \
  nginx:alpine

# 網站 B
docker run -d --name site-b -p 8082:80 \
  -v ~/docker-demo/site-b:/usr/share/nginx/html:ro \
  nginx:alpine
```

準備不同的內容：

```bash
mkdir -p ~/docker-demo/site-a ~/docker-demo/site-b
echo '<h1>Site A</h1>' > ~/docker-demo/site-a/index.html
echo '<h1>Site B</h1>' > ~/docker-demo/site-b/index.html
```

驗證：

```bash
curl http://localhost:8081    # Site A
curl http://localhost:8082    # Site B
```

### 7.2 查看所有 Nginx 容器

```bash
docker ps -f ancestor=nginx:alpine
```

### 7.3 統一管理

```bash
# 停止所有
docker stop site-a site-b web

# 啟動所有
docker start site-a site-b web

# 刪除所有
docker rm -f site-a site-b web
```

---

## 八、練習題（3 分鐘）

**題目**

1. 啟動一個 Nginx 容器
   - 名稱：my-web
   - Port：本機 80 → 容器 80
   - 掛載本機目錄到 /usr/share/nginx/html
2. 在掛載的目錄中建立一個 about.html
3. 瀏覽器訪問 http://localhost/about.html

**參考答案**

```bash
mkdir -p ~/my-web
echo '<h1>About Page</h1>' > ~/my-web/about.html
echo '<h1>Home</h1><a href="about.html">About</a>' > ~/my-web/index.html

docker run -d --name my-web \
  -p 80:80 \
  -v ~/my-web:/usr/share/nginx/html:ro \
  nginx:alpine

curl http://localhost/
curl http://localhost/about.html
```

---

## 九、本堂課小結（2 分鐘）

這堂課用 Nginx 實戰練習了：

**核心技能**
- Port Mapping：`-p 主機Port:容器Port`
- Volume 掛載：`-v 主機路徑:容器路徑`
- 查看日誌：`docker logs`
- 進入容器：`docker exec`
- 複製檔案：`docker cp`

**學到的技巧**
- 掛載網頁目錄，主機修改立即生效
- 掛載設定檔，自訂 Nginx 行為
- 多容器運行在不同 port
- 熱重載設定：`nginx -s reload`

Day 2 的內容到這邊。下一堂是練習和複習。

---

## 板書 / PPT 建議

1. Nginx 容器目錄結構（/usr/share/nginx/html, /etc/nginx）
2. Port Mapping 示意圖
3. Volume 掛載示意圖
4. 完整的 docker run 命令解析
