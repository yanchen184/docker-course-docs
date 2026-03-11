# Docker 課程小測驗與休息時間

> Archived reference file.
> This file is not rendered by the app.
> Active course content is mapped through `src/App.tsx` and the `dayX-hourY(.md/-full.md)` files.

每堂課結束前 5-10 分鐘，可以選擇「動手操作」或「小測驗」，讓講師休息。

---

## 使用方式

1. **動手操作**：學員獨立完成任務，講師巡視
2. **小測驗**：投影題目，學員舉手或用紙筆回答
3. **小組討論**：分組討論問題，派代表回答

---

## Day 2

---

### Hour 1 結束：環境一致性（5 分鐘）

**選項 A：小測驗**

1. 「在我電腦上可以跑」這句話反映了什麼問題？
   - A. 程式寫得太好
   - B. 環境一致性問題 ✓
   - C. 電腦太慢
   - D. 網路問題

2. 容器和虛擬機最大的差別是什麼？
   - A. 價格不同
   - B. 容器不需要完整 Guest OS ✓
   - C. 虛擬機比較快
   - D. 容器只能跑 Linux

3. Docker 的三大元素是？
   - A. CPU、Memory、Disk
   - B. Image、Container、Registry ✓
   - C. Client、Server、Network
   - D. Build、Ship、Run

**選項 B：討論題**

> 想想你過去的開發經驗，有沒有遇過「環境不一致」的問題？怎麼解決的？

---

### Hour 2 結束：Docker 架構（5 分鐘）

**選項 A：小測驗**

1. 當你執行 `docker run nginx` 時，誰負責真正管理容器？
   - A. Docker Client
   - B. Docker Daemon (dockerd) ✓
   - C. Docker Hub
   - D. 你的終端機

2. Docker 預設從哪裡下載映像檔？
   - A. GitHub
   - B. Google Drive
   - C. Docker Hub ✓
   - D. 本機硬碟

3. containerd 的角色是什麼？
   - A. 使用者介面
   - B. 容器運行時管理 ✓
   - C. 網路管理
   - D. 儲存管理

**選項 B：動手操作**

```bash
# 5 分鐘內完成以下指令，截圖顯示結果：
docker version
docker info | head -20
```

---

### Hour 3 結束：Docker 安裝（10 分鐘）

**動手操作（必做）**

```bash
# 每個人必須成功執行：
docker run hello-world
```

**驗收標準**：螢幕顯示 "Hello from Docker!"

**小測驗（等待安裝時）**

1. 在 Linux 上，Docker 服務叫什麼名字？
   - A. docker-service
   - B. dockerd ✓
   - C. docker-engine
   - D. container-service

2. 想讓普通使用者免 sudo 執行 docker，要加入什麼群組？
   - A. admin
   - B. root
   - C. docker ✓
   - D. container

---

### Hour 4 結束：基本指令上（10 分鐘）

**動手操作**

```bash
# 限時 5 分鐘完成：
# 1. 拉取 redis:alpine 映像檔
# 2. 啟動一個名為 my-redis 的容器
# 3. 用 docker ps 確認它在執行
# 4. 截圖給講師看
```

**小測驗**

1. `docker run -d` 的 `-d` 是什麼意思？
   - A. delete
   - B. detach (背景執行) ✓
   - C. debug
   - D. download

2. 查看所有容器（包含已停止的）用什麼指令？
   - A. docker ps
   - B. docker ps -a ✓
   - C. docker list
   - D. docker show all

3. 下列哪個會把容器的 80 port 對應到主機的 8080？
   - A. -p 80:8080
   - B. -p 8080:80 ✓
   - C. -port 8080=80
   - D. --map 80 8080

---

### Hour 5 結束：基本指令下（10 分鐘）

**動手操作**

```bash
# 限時 7 分鐘完成：
# 1. 啟動一個 nginx 容器
# 2. 用 docker exec 進入容器
# 3. 在容器內執行 nginx -v 查看版本
# 4. 把 nginx 版本號寫下來

# 你的答案：nginx version: nginx/______
```

**小測驗**

1. 刪除一個正在執行的容器用什麼指令？
   - A. docker rm container
   - B. docker rm -f container ✓
   - C. docker delete container
   - D. docker kill container

2. `docker logs -f` 的 `-f` 是什麼意思？
   - A. file（輸出到檔案）
   - B. follow（持續追蹤） ✓
   - C. force（強制）
   - D. filter（過濾）

3. 把檔案從主機複製到容器的指令格式是？
   - A. docker cp host:container
   - B. docker cp file container:path ✓
   - C. docker copy file container
   - D. docker mv file container

---

### Hour 6 結束：Nginx 實戰（10 分鐘）

**動手操作**

```bash
# 限時 10 分鐘完成：
# 1. 建立一個 HTML 檔案，內容包含你的名字
# 2. 啟動 nginx 容器，掛載這個 HTML 檔案
# 3. 用瀏覽器訪問，看到你的名字
# 4. 截圖給講師看
```

**小測驗**

1. `-v /host/path:/container/path:ro` 的 `:ro` 是什麼意思？
   - A. root only
   - B. read only ✓
   - C. rotate
   - D. rollback

2. 下列哪個會把主機的 ./html 目錄掛載到容器的 /usr/share/nginx/html？
   - A. -v /usr/share/nginx/html:./html
   - B. -v ./html:/usr/share/nginx/html ✓
   - C. --mount ./html /usr/share/nginx/html
   - D. -volume html nginx

---

### Hour 7 結束：Day 2 總結（15 分鐘）

**綜合測驗**

1. 下列哪個不是 Docker 的優點？
   - A. 環境一致
   - B. 快速部署
   - C. 硬體層級虛擬化 ✓
   - D. 資源利用率高

2. 映像檔和容器的關係類似於？
   - A. 原始碼和執行檔
   - B. 類別和實例 ✓
   - C. 資料夾和檔案
   - D. 主機和客戶端

3. 哪個指令可以看到容器的即時資源使用？
   - A. docker info
   - B. docker inspect
   - C. docker stats ✓
   - D. docker top

4. 容器預設使用什麼網路模式？
   - A. host
   - B. bridge ✓
   - C. none
   - D. overlay

5. 寫出啟動一個 nginx 容器的完整指令，要求：
   - 背景執行
   - 名稱為 my-web
   - 把 80 對應到 8080
   - 掛載 ./site 到 /usr/share/nginx/html

   答案：`docker run -d --name my-web -p 8080:80 -v ./site:/usr/share/nginx/html nginx`

---

## Day 3

---

### Hour 8 結束：映像檔深入（8 分鐘）

**動手操作**

```bash
# 限時 5 分鐘完成：
# 1. 用 docker history 查看 nginx:alpine 有幾層
# 2. 比較 nginx:alpine 和 nginx:latest 的大小
# 3. 記錄結果

# nginx:alpine 層數：______
# nginx:alpine 大小：______
# nginx:latest 大小：______
```

**小測驗**

1. Docker 映像檔使用什麼機制來儲存？
   - A. Copy-on-write ✓
   - B. Full copy
   - C. Symbolic link
   - D. Hard link

2. 下列哪個 tag 應該避免在生產環境使用？
   - A. nginx:1.24.0
   - B. nginx:1.24-alpine
   - C. nginx:latest ✓
   - D. nginx:stable

---

### Hour 9 結束：容器生命週期（8 分鐘）

**動手操作**

```bash
# 限時 5 分鐘完成：
# 1. 啟動一個有記憶體限制 (64m) 的容器
# 2. 用 docker stats 查看它的資源使用
# 3. 截圖顯示 MEM USAGE / LIMIT

docker run -d --name limited --memory 64m nginx:alpine
docker stats limited --no-stream
```

**小測驗**

1. 容器被 `docker pause` 後是什麼狀態？
   - A. exited
   - B. paused ✓
   - C. stopped
   - D. frozen

2. 哪個重啟策略會在手動停止後，Docker 重啟時保持停止？
   - A. always
   - B. on-failure
   - C. unless-stopped ✓
   - D. no

3. `docker inspect` 輸出什麼格式？
   - A. YAML
   - B. XML
   - C. JSON ✓
   - D. TOML

---

### Hour 10 結束：容器網路（10 分鐘）

**動手操作**

```bash
# 限時 8 分鐘完成：
# 1. 建立一個自訂網路 test-net
# 2. 啟動兩個容器在這個網路上
# 3. 驗證容器之間可以用名稱互 ping
# 4. 截圖顯示 ping 成功

docker network create test-net
docker run -d --name c1 --network test-net alpine sleep 3600
docker run -d --name c2 --network test-net alpine sleep 3600
docker exec c1 ping -c 3 c2
```

**小測驗**

1. 預設的 bridge 網路和自訂 bridge 網路最大的差別是？
   - A. 速度不同
   - B. 自訂網路有內建 DNS ✓
   - C. 安全性不同
   - D. 容量不同

2. `--network host` 代表什麼？
   - A. 連到特定主機
   - B. 容器直接使用主機網路 ✓
   - C. 建立新網路
   - D. 沒有網路

---

### Hour 11 結束：Port Mapping（8 分鐘）

**動手操作**

```bash
# 限時 5 分鐘完成：
# 1. 用三種不同的 port mapping 啟動三個 nginx
# 2. 用 docker port 查看每個的對應
# 3. 記錄結果

docker run -d --name n1 -p 8081:80 nginx:alpine
docker run -d --name n2 -p 127.0.0.1:8082:80 nginx:alpine
docker run -d --name n3 -P nginx:alpine

docker port n1
docker port n2
docker port n3
```

**小測驗**

1. `-p 127.0.0.1:8080:80` 的效果是？
   - A. 所有介面都可存取
   - B. 只有本機可存取 ✓
   - C. 只有特定 IP 可存取
   - D. 隨機分配 port

2. `-P`（大寫）的功能是？
   - A. 永久對應
   - B. 公開所有 port
   - C. 自動對應 EXPOSE 的 port 到隨機 port ✓
   - D. 建立 proxy

---

### Hour 12 結束：Volume（10 分鐘）

**動手操作**

```bash
# 限時 8 分鐘完成：
# 1. 建立一個名為 my-vol 的 volume
# 2. 啟動 alpine 容器，掛載這個 volume 到 /data
# 3. 在 /data 裡面建立一個檔案寫入你的名字
# 4. 刪除容器，再建立一個新的，驗證檔案還在

docker volume create my-vol
docker run -it --name v1 -v my-vol:/data alpine sh
# 在容器內：
# echo "你的名字" > /data/myfile.txt
# exit

docker rm v1
docker run -it --name v2 -v my-vol:/data alpine cat /data/myfile.txt
```

**小測驗**

1. 哪種掛載方式最適合生產環境的資料持久化？
   - A. Bind Mounts
   - B. Volumes ✓
   - C. tmpfs
   - D. 直接寫入容器

2. tmpfs 的資料存在哪裡？
   - A. 硬碟
   - B. 記憶體 ✓
   - C. 網路
   - D. 雲端

3. 刪除所有未使用的 Volume 用什麼指令？
   - A. docker volume rm -all
   - B. docker volume clean
   - C. docker volume prune ✓
   - D. docker volume delete

---

### Hour 13 結束：Dockerfile 入門（10 分鐘）

**動手操作**

```bash
# 限時 10 分鐘完成：
# 1. 建立一個簡單的 Dockerfile
# 2. Build 成映像檔
# 3. 執行容器，確認可以運作
# 4. 截圖顯示成功畫面

mkdir ~/my-dockerfile && cd ~/my-dockerfile

cat > app.py << 'EOF'
print("Hello from my first Dockerfile!")
print("My name is: [你的名字]")
EOF

cat > Dockerfile << 'EOF'
FROM python:3.11-alpine
WORKDIR /app
COPY app.py .
CMD ["python", "app.py"]
EOF

docker build -t my-first-image:v1 .
docker run my-first-image:v1
```

**小測驗**

1. 每個 Dockerfile 必須以什麼指令開頭？
   - A. RUN
   - B. FROM ✓
   - C. CMD
   - D. COPY

2. `CMD` 和 `ENTRYPOINT` 的主要差別是？
   - A. 沒有差別
   - B. CMD 可被覆蓋，ENTRYPOINT 是固定的 ✓
   - C. CMD 在 build 時執行
   - D. ENTRYPOINT 只能有一個

3. 為什麼要把 `COPY requirements.txt` 放在 `COPY . .` 之前？
   - A. 字母順序
   - B. 利用 build 快取 ✓
   - C. 語法要求
   - D. 沒有差別

---

### Hour 14 結束：課程總結（15 分鐘）

**最終測驗**

1. Multi-stage Build 的主要目的是？
   - A. 加快建構速度
   - B. 減少最終映像檔大小 ✓
   - C. 增加安全性
   - D. 簡化 Dockerfile

2. 在 Dockerfile 中，為什麼建議使用非 root 使用者？
   - A. 跑得比較快
   - B. 省記憶體
   - C. 安全性考量 ✓
   - D. Docker 要求

3. 下列哪個基礎映像檔最小？
   - A. ubuntu:22.04
   - B. python:3.11
   - C. python:3.11-slim
   - D. python:3.11-alpine ✓

4. Docker 和 Kubernetes 的關係是？
   - A. 互相取代
   - B. 完全無關
   - C. Kubernetes 用來編排 Docker 容器 ✓
   - D. Docker 包含 Kubernetes

5. **實作題**：寫一個 Multi-stage Dockerfile，要求：
   - 第一階段用 node:20 安裝依賴和建構
   - 第二階段用 node:20-alpine 執行
   - 最終映像檔不包含 devDependencies

---

## 休息時間建議

| 時段 | 建議休息方式 |
|------|--------------|
| 動手操作時 | 講師可以坐下休息，偶爾巡視 |
| 小測驗時 | 講師可以喝水、看手機 |
| 小組討論時 | 講師完全休息，讓學員自己討論 |

**小技巧**：
- 動手操作設定「限時」，增加緊迫感
- 小測驗用「舉手搶答」方式，增加互動
- 每 2 小時安排一次 10 分鐘正式休息

---

## 答案速查

### Day 2
- Hour 1: B, B, B
- Hour 2: B, C, B
- Hour 3: B, C
- Hour 4: B, B, B
- Hour 5: B, B, B
- Hour 6: B, B
- Hour 7: C, B, C, B

### Day 3
- Hour 8: A, C
- Hour 9: B, C, C
- Hour 10: B, B
- Hour 11: B, C
- Hour 12: B, B, C
- Hour 13: B, B, B
- Hour 14: B, C, D, C
