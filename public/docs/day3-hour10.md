# Day 3 第十小時：容器網路基礎

---

## 一、前情提要（2 分鐘）

上堂課：容器生命週期管理。

本堂課：容器網路
- Docker 網路模式
- 容器之間通訊
- 自訂網路
- DNS 與服務發現

---

## 二、Docker 網路概述（8 分鐘）

### 三種網路驅動

```bash
docker network ls
```

| 驅動 | 說明 |
|-----|------|
| bridge | 預設，虛擬橋接器 |
| host | 直接使用主機網路 |
| none | 無網路 |

---

## 三、Bridge 網路（15 分鐘）

### 原理

```
Container A (172.17.0.2)
Container B (172.17.0.3)
       │
       ▼
   docker0 (172.17.0.1)
       │
       ▼
    eth0 → 外部
```

### 查看容器 IP

```bash
docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' my-nginx
```

### 預設 bridge 限制

- **沒有 DNS 解析**：不能用容器名稱互連
- 需要用 IP（會變動，不好維護）

---

## 四、自訂 Bridge 網路（15 分鐘）

### 建立與使用

```bash
docker network create my-network
docker run -d --name web --network my-network nginx
docker run -d --name app --network my-network alpine sleep 3600
```

### 自訂網路有內建 DNS！

```bash
docker exec app ping web     # 可以用名稱
docker exec app wget -qO- http://web
```

### 實作：Web + Database

```bash
docker network create app-network

docker run -d --name db \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=secret \
  mysql:8.0

docker run -d --name web \
  --network app-network \
  -e DATABASE_HOST=db \
  -p 8080:80 \
  my-web-app
```

---

## 五、Host 與 None 網路（8 分鐘）

### Host 網路

```bash
docker run -d --network host nginx
```

- 沒有 Port Mapping，直接監聽主機 port
- 效能最好，但無隔離

### None 網路

```bash
docker run -d --network none alpine sleep 3600
```

- 完全無網路
- 用於處理敏感資料

---

## 六、網路管理命令（5 分鐘）

```bash
docker network create my-network
docker network ls
docker network inspect my-network
docker network connect my-network container
docker network disconnect my-network container
docker network rm my-network
docker network prune
```

---

## 七、容器通訊最佳實踐（5 分鐘）

1. **不用預設 bridge**：沒 DNS、混在一起
2. **每個應用獨立網路**：隔離、好管理
3. **用容器名稱通訊**：IP 會變
4. **敏感服務不暴露 port**：MySQL 不需 `-p 3306:3306`

### 範例架構

```
frontend-network
  └── nginx (Port 80) → 外部

backend-network
  ├── api-server
  ├── mysql (不暴露)
  └── redis (不暴露)
```

---

## 八、小結（2 分鐘）

| 主題 | 重點 |
|-----|------|
| bridge | 預設，透過虛擬橋接器 |
| 自訂網路 | 有 DNS，用名稱通訊 |
| host | 直接用主機網路 |
| none | 無網路 |

**重點**：用自訂網路 + 容器名稱通訊。

下一堂：Port Mapping 進階。

---

## 板書 / PPT 建議

1. Bridge 網路架構圖
2. 預設 vs 自訂 bridge 比較
3. 三種網路模式比較表
4. 多網路架構範例
