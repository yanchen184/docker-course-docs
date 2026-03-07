# Docker 課程動手實作指南

本文件整理每個小時的動手操作環節，確保學員有足夠的實作時間。

---

## Day 2 實作安排

---

### Hour 1：環境一致性問題與容器技術（實作 5 分鐘）

**實作：體驗環境差異問題**

```bash
# 請學員在自己電腦上執行
python --version
node --version
java --version
```

**討論問題**：
1. 大家的版本都一樣嗎？
2. 如果專案需要 Python 3.8，但你裝的是 3.11 怎麼辦？
3. 如果同時要維護兩個專案，一個要 Node 16、一個要 Node 20？

**觀察重點**：讓學員親身體驗版本不一致的問題。

---

### Hour 2：Docker 架構與工作原理（實作 8 分鐘）

**實作：探索 Docker 元件**

```bash
# 1. 檢查 Docker 版本
docker version

# 2. 檢查 Docker 系統資訊
docker info

# 3. 觀察 Docker daemon 狀態（Linux）
systemctl status docker

# 4. 查看 Docker 儲存位置
docker info | grep "Docker Root Dir"
```

**學員任務**：
1. 找出你的 Docker Client 版本
2. 找出你的 Docker Server 版本
3. 找出你的系統有多少個容器和映像檔

---

### Hour 3：Docker 安裝與環境設置（實作 15 分鐘）

**實作：完成 Docker 安裝**

**Linux 學員**：
```bash
# CentOS
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker

# Ubuntu
sudo apt install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker

# 加入 docker 群組（免 sudo）
sudo usermod -aG docker $USER
# 重新登入生效
```

**Windows/Mac 學員**：
1. 下載 Docker Desktop
2. 安裝並啟動
3. 確認系統列有 Docker 圖示

**驗證安裝**：
```bash
docker run hello-world
```

**學員任務**：
- [ ] 成功執行 `docker run hello-world`
- [ ] 截圖顯示 "Hello from Docker!" 訊息

---

### Hour 4：Docker 基本指令 上（實作 15 分鐘）

**實作 A：拉取和查看映像檔（5 分鐘）**

```bash
# 1. 拉取三個映像檔
docker pull nginx:alpine
docker pull python:3.11-slim
docker pull redis:7-alpine

# 2. 查看已下載的映像檔
docker images

# 3. 查看映像檔詳情
docker inspect nginx:alpine
```

**學員任務**：
- [ ] 拉取以上三個映像檔
- [ ] 記錄每個映像檔的大小

**實作 B：啟動容器（10 分鐘）**

```bash
# 1. 前景執行（觀察輸出）
docker run nginx:alpine
# Ctrl+C 停止

# 2. 背景執行
docker run -d --name my-nginx nginx:alpine

# 3. 查看運行中的容器
docker ps

# 4. 查看所有容器
docker ps -a

# 5. 用不同參數啟動
docker run -d --name my-nginx-2 -p 8080:80 nginx:alpine
```

**學員任務**：
- [ ] 啟動一個名為 `my-web` 的 nginx 容器
- [ ] 將容器的 80 port 對應到主機的 8888 port
- [ ] 用瀏覽器訪問 http://localhost:8888

---

### Hour 5：Docker 基本指令 下（實作 15 分鐘）

**實作 A：容器管理（7 分鐘）**

```bash
# 1. 查看所有容器
docker ps -a

# 2. 停止容器
docker stop my-nginx

# 3. 啟動已停止的容器
docker start my-nginx

# 4. 重啟容器
docker restart my-nginx

# 5. 刪除已停止的容器
docker stop my-nginx
docker rm my-nginx

# 6. 強制刪除運行中的容器
docker rm -f my-nginx-2
```

**實作 B：容器互動（8 分鐘）**

```bash
# 1. 查看容器日誌
docker run -d --name web nginx:alpine
docker logs web
docker logs -f web  # 持續追蹤

# 2. 進入容器
docker exec -it web sh

# 在容器內執行：
ls -la
cat /etc/nginx/nginx.conf
exit

# 3. 複製檔案
echo "<h1>Hello Docker</h1>" > index.html
docker cp index.html web:/usr/share/nginx/html/
docker exec web cat /usr/share/nginx/html/index.html
```

**學員任務**：
- [ ] 進入 nginx 容器，找出 nginx 的版本（nginx -v）
- [ ] 用 docker cp 把自己的 HTML 檔案放進容器
- [ ] 透過瀏覽器確認 HTML 有顯示

---

### Hour 6：Nginx 容器實戰（實作 20 分鐘）

**實作：建立完整的 Nginx 網站**

**步驟 1：準備網站檔案（3 分鐘）**

```bash
# 建立專案目錄
mkdir -p ~/docker-lab/nginx-site
cd ~/docker-lab/nginx-site

# 建立 HTML
cat > index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>My Docker Site</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 50px; }
        h1 { color: #0066cc; }
    </style>
</head>
<body>
    <h1>Welcome to Docker!</h1>
    <p>This page is served from a container.</p>
    <p>Your name: ___________</p>
</body>
</html>
EOF
```

**步驟 2：啟動容器掛載網站（2 分鐘）**

```bash
docker run -d \
  --name my-site \
  -p 8080:80 \
  -v $(pwd):/usr/share/nginx/html:ro \
  nginx:alpine
```

**步驟 3：即時修改測試（5 分鐘）**

```bash
# 修改 HTML（把 "Your name" 改成自己的名字）
# 用編輯器修改 index.html

# 重新整理瀏覽器，看到變化
```

**步驟 4：自訂 Nginx 設定（10 分鐘）**

```bash
# 建立自訂設定
mkdir conf
cat > conf/default.conf << 'EOF'
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
    }

    location /api {
        return 200 '{"status": "ok", "message": "API is working"}';
        add_header Content-Type application/json;
    }
}
EOF

# 重新啟動容器
docker rm -f my-site
docker run -d \
  --name my-site \
  -p 8080:80 \
  -v $(pwd):/usr/share/nginx/html:ro \
  -v $(pwd)/conf/default.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine

# 測試
curl http://localhost:8080/
curl http://localhost:8080/api
```

**學員任務**：
- [ ] 完成以上所有步驟
- [ ] 修改 HTML 顯示自己的名字
- [ ] 成功訪問 /api 端點
- [ ] 截圖作為完成證明

---

### Hour 7：實作練習與 Day2 總結（實作 30 分鐘）

**綜合練習：三容器架構**

**挑戰**：建立一個包含 Nginx + Redis + Alpine 的環境

```bash
# 1. 建立專用網路
docker network create lab-network

# 2. 啟動 Redis
docker run -d \
  --name lab-redis \
  --network lab-network \
  redis:7-alpine

# 3. 啟動一個工作容器
docker run -d \
  --name lab-worker \
  --network lab-network \
  alpine sleep 3600

# 4. 測試 Redis 連線
docker exec lab-worker sh -c "
  apk add --no-cache redis
  redis-cli -h lab-redis ping
"

# 5. 啟動 Nginx
docker run -d \
  --name lab-nginx \
  --network lab-network \
  -p 80:80 \
  nginx:alpine

# 6. 清理
docker stop lab-redis lab-worker lab-nginx
docker rm lab-redis lab-worker lab-nginx
docker network rm lab-network
```

**學員任務**：
- [ ] 完成三容器架構
- [ ] 從 worker 容器 ping 到 redis 容器（用容器名稱）
- [ ] 理解自訂網路的 DNS 功能

---

## Day 3 實作安排

---

### Hour 8：映像檔深入理解（實作 10 分鐘）

**實作：探索映像檔分層**

```bash
# 1. 查看映像檔歷史
docker history nginx:alpine
docker history python:3.11-slim

# 2. 比較不同版本大小
docker images | grep nginx
docker images | grep python

# 3. 保存和載入映像檔
docker save nginx:alpine -o nginx-alpine.tar
ls -lh nginx-alpine.tar

# 解壓看內容
mkdir nginx-layers
tar -xf nginx-alpine.tar -C nginx-layers
ls nginx-layers

# 4. 標記映像檔
docker tag nginx:alpine myregistry/nginx:v1
docker images | grep nginx
```

**學員任務**：
- [ ] 比較 nginx:alpine 和 nginx:latest 的層數差異
- [ ] 保存一個映像檔並查看大小
- [ ] 為一個映像檔建立自己的 tag

---

### Hour 9：容器生命週期管理（實作 12 分鐘）

**實作 A：容器狀態管理（6 分鐘）**

```bash
# 1. 建立但不啟動
docker create --name lifecycle-test nginx:alpine
docker ps -a | grep lifecycle-test  # 狀態：Created

# 2. 啟動
docker start lifecycle-test
docker ps | grep lifecycle-test  # 狀態：Up

# 3. 暫停
docker pause lifecycle-test
docker ps | grep lifecycle-test  # 狀態：Paused

# 4. 恢復
docker unpause lifecycle-test

# 5. 停止
docker stop lifecycle-test
docker ps -a | grep lifecycle-test  # 狀態：Exited

# 6. 查看狀態詳情
docker inspect -f '{{.State.Status}}' lifecycle-test
```

**實作 B：資源限制（6 分鐘）**

```bash
# 1. 啟動有資源限制的容器
docker run -d \
  --name limited-container \
  --memory 100m \
  --cpus 0.5 \
  nginx:alpine

# 2. 查看資源使用
docker stats limited-container --no-stream

# 3. 動態調整
docker update --memory 200m limited-container

# 4. 驗證限制
docker inspect -f '{{.HostConfig.Memory}}' limited-container
```

**學員任務**：
- [ ] 讓容器經歷完整生命週期：create → start → pause → unpause → stop → rm
- [ ] 建立一個只能使用 50MB 記憶體的容器
- [ ] 使用 docker stats 觀察資源使用

---

### Hour 10：容器網路基礎（實作 15 分鐘）

**實作：建立隔離的應用網路**

```bash
# 1. 查看現有網路
docker network ls

# 2. 建立兩個獨立網路
docker network create frontend-net
docker network create backend-net

# 3. 在 backend 網路啟動資料庫
docker run -d \
  --name db \
  --network backend-net \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=testdb \
  mysql:8.0

# 4. 在 frontend 網路啟動 Web
docker run -d \
  --name web \
  --network frontend-net \
  -p 8080:80 \
  nginx:alpine

# 5. 測試隔離（這會失敗）
docker exec web ping -c 2 db
# ping: bad address 'db'

# 6. 建立跨網路的 API 容器
docker run -d \
  --name api \
  --network backend-net \
  alpine sleep 3600

# 連接到 frontend
docker network connect frontend-net api

# 7. 現在 api 可以連到兩邊
docker exec api ping -c 2 db    # 成功
docker exec api ping -c 2 web   # 成功

# 8. 清理
docker stop db web api
docker rm db web api
docker network rm frontend-net backend-net
```

**學員任務**：
- [ ] 建立兩個網路 net-a 和 net-b
- [ ] 在每個網路各啟動一個 alpine 容器
- [ ] 驗證不同網路的容器無法互相 ping
- [ ] 把其中一個容器連接到另一個網路，再次 ping

---

### Hour 11：Port Mapping 進階（實作 10 分鐘）

**實作：各種 Port Mapping 情境**

```bash
# 1. 基本對應
docker run -d --name p1 -p 8081:80 nginx:alpine

# 2. 只綁定 localhost
docker run -d --name p2 -p 127.0.0.1:8082:80 nginx:alpine

# 3. 隨機 port
docker run -d --name p3 -P nginx:alpine

# 4. 查看 port 對應
docker port p1
docker port p2
docker port p3

# 5. 測試存取
curl http://localhost:8081      # 成功
curl http://localhost:8082      # 成功
curl http://localhost:$(docker port p3 80 | cut -d: -f2)  # 成功

# 6. 測試 localhost 綁定
# 從另一台機器存取 8082 會失敗（如果有的話）

# 7. 清理
docker stop p1 p2 p3
docker rm p1 p2 p3
```

**學員任務**：
- [ ] 啟動一個 nginx，將 80 對應到 9000
- [ ] 啟動另一個 nginx，只允許本機存取 9001
- [ ] 使用 -P 啟動並找出自動分配的 port

---

### Hour 12：Volume 資料持久化（實作 15 分鐘）

**實作：資料持久化完整演練**

```bash
# 1. 建立 Volume
docker volume create mydata

# 2. 啟動容器使用 Volume
docker run -d \
  --name db1 \
  -v mydata:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=testdb \
  mysql:8.0

# 等待 MySQL 啟動
sleep 30

# 3. 寫入資料
docker exec -it db1 mysql -uroot -psecret -e "
  USE testdb;
  CREATE TABLE users (id INT, name VARCHAR(50));
  INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');
  SELECT * FROM users;
"

# 4. 刪除容器
docker rm -f db1

# 5. 用新容器連接同一個 Volume
docker run -d \
  --name db2 \
  -v mydata:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  mysql:8.0

sleep 20

# 6. 驗證資料還在
docker exec db2 mysql -uroot -psecret -e "SELECT * FROM testdb.users;"

# 7. 備份 Volume
docker run --rm \
  -v mydata:/data \
  -v $(pwd):/backup \
  alpine tar cvf /backup/mydata-backup.tar /data

ls -lh mydata-backup.tar

# 8. 清理
docker rm -f db2
docker volume rm mydata
```

**學員任務**：
- [ ] 建立名為 `student-data` 的 Volume
- [ ] 啟動 MySQL 容器使用此 Volume
- [ ] 建立一個表格並寫入自己的名字
- [ ] 刪除容器後重新建立，驗證資料還在
- [ ] 備份 Volume 到 tar 檔案

---

### Hour 13：Dockerfile 入門（實作 15 分鐘）

**實作：建立第一個 Dockerfile**

```bash
# 1. 建立專案目錄
mkdir -p ~/docker-lab/my-flask-app
cd ~/docker-lab/my-flask-app

# 2. 建立 Python 應用
cat > app.py << 'EOF'
from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def hello():
    name = os.environ.get('MY_NAME', 'Docker')
    return f'<h1>Hello, {name}!</h1><p>This is my first Docker image.</p>'

@app.route('/health')
def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
EOF

# 3. 建立 requirements.txt
cat > requirements.txt << 'EOF'
flask==3.0.0
EOF

# 4. 建立 Dockerfile
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 5000

ENV MY_NAME=Student

CMD ["python", "app.py"]
EOF

# 5. 建立 .dockerignore
cat > .dockerignore << 'EOF'
__pycache__
*.pyc
.git
.env
EOF

# 6. 建構映像檔
docker build -t my-flask-app:v1 .

# 7. 執行容器
docker run -d \
  --name flask-app \
  -p 5000:5000 \
  -e MY_NAME="你的名字" \
  my-flask-app:v1

# 8. 測試
curl http://localhost:5000/
curl http://localhost:5000/health

# 9. 查看映像檔大小
docker images my-flask-app
```

**學員任務**：
- [ ] 完成以上所有步驟
- [ ] 修改 MY_NAME 環境變數為自己的名字
- [ ] 成功在瀏覽器看到 "Hello, 你的名字!"
- [ ] 截圖作為完成證明

---

### Hour 14：Dockerfile 實戰與課程總結（實作 20 分鐘）

**實作：Multi-stage Build**

```bash
# 1. 建立專案目錄
mkdir -p ~/docker-lab/multi-stage
cd ~/docker-lab/multi-stage

# 2. 建立 Node.js 應用
cat > package.json << 'EOF'
{
  "name": "multi-stage-demo",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.2"
  }
}
EOF

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
EOF

mkdir src
cat > src/index.ts << 'EOF'
import express from 'express';

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Multi-stage Build!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# 3. 建立單階段 Dockerfile（用於比較）
cat > Dockerfile.single << 'EOF'
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

CMD ["npm", "start"]
EOF

# 4. 建立 Multi-stage Dockerfile
cat > Dockerfile << 'EOF'
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# 只複製必要檔案
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 只安裝生產依賴
RUN npm ci --only=production && npm cache clean --force

# 非 root 使用者
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]
EOF

# 5. 建構兩個版本
docker build -t demo:single -f Dockerfile.single .
docker build -t demo:multi -f Dockerfile .

# 6. 比較大小
echo "=== 映像檔大小比較 ==="
docker images | grep demo

# 7. 測試
docker run -d --name demo-app -p 3000:3000 demo:multi
curl http://localhost:3000/
curl http://localhost:3000/health

# 8. 清理
docker stop demo-app
docker rm demo-app
```

**學員任務**：
- [ ] 完成單階段和多階段 Dockerfile
- [ ] 比較兩個映像檔的大小差異
- [ ] 記錄節省了多少空間
- [ ] 理解 Multi-stage Build 的優勢

---

## 實作評量檢核表

### Day 2 技能檢核

| 技能 | 完成 |
|-----|------|
| 能執行 docker run 啟動容器 | ☐ |
| 能使用 -p 進行 port mapping | ☐ |
| 能使用 -v 掛載 volume | ☐ |
| 能使用 docker exec 進入容器 | ☐ |
| 能查看 docker logs | ☐ |
| 能建立自訂網路 | ☐ |
| 能完成 Nginx 網站部署 | ☐ |

### Day 3 技能檢核

| 技能 | 完成 |
|-----|------|
| 理解映像檔分層概念 | ☐ |
| 能設定容器資源限制 | ☐ |
| 能建立和使用自訂網路 | ☐ |
| 能使用各種 port mapping 語法 | ☐ |
| 能建立和備份 Volume | ☐ |
| 能撰寫基本 Dockerfile | ☐ |
| 能使用 Multi-stage Build | ☐ |
| 能優化映像檔大小 | ☐ |

---

## 常見問題快速排解

### docker: command not found
```bash
# 確認 Docker 已安裝
which docker
# 如果沒有，重新安裝
```

### Permission denied
```bash
# 加入 docker 群組
sudo usermod -aG docker $USER
# 重新登入
```

### Port already in use
```bash
# 找出佔用者
lsof -i :8080
# 換一個 port 或停止佔用的程序
```

### Container exited immediately
```bash
# 查看日誌
docker logs <container_name>
# 常見原因：命令錯誤、缺少環境變數
```

### Cannot connect to Docker daemon
```bash
# 啟動 Docker 服務
sudo systemctl start docker
```
