# Day 3 第十一小時：Port Mapping 進階

---

## 一、前情提要（2 分鐘）

上堂課：容器網路基礎。

本堂課：Port Mapping 進階
- -p 完整語法
- 綁定策略
- 常見問題
- 防火牆交互

---

## 二、Port Mapping 原理（8 分鐘）

### 流量路徑

```
外部請求 → 主機 Port → iptables NAT → 容器 Port
```

### 底層實現

```bash
sudo iptables -t nat -L -n | grep DOCKER
# DNAT tcp dpt:8080 to:172.17.0.2:80
```

---

## 三、-p 完整語法（15 分鐘）

### 格式

```
-p [host_ip:]host_port:container_port[/protocol]
```

### 各種寫法

```bash
-p 8080:80              # 所有介面 8080 → 容器 80
-p 127.0.0.1:8080:80    # 只綁定 localhost
-p 192.168.1.50:8080:80 # 綁定特定 IP
-p 8080:80/udp          # UDP 協定
-p 80:80 -p 443:443     # 多個 port
-p 8080-8085:80-85      # port 範圍
```

### 隨機 port（大寫 -P）

```bash
docker run -d -P nginx
docker port my-nginx
# 80/tcp -> 0.0.0.0:32769
```

---

## 四、綁定策略（10 分鐘）

### 0.0.0.0（所有介面）

```bash
docker run -d -p 8080:80 nginx
```

- 本機、內網、公網都可存取
- **風險**：可能暴露到網際網路

### 127.0.0.1（僅本機）

```bash
docker run -d -p 127.0.0.1:8080:80 nginx
```

**使用場景**：開發、有反向代理、敏感服務

### 案例：資料庫安全

```bash
# 錯誤
docker run -d -p 3306:3306 mysql

# 正確：只給本機
docker run -d -p 127.0.0.1:3306:3306 mysql

# 更好：完全不暴露
docker run -d --network app-network mysql
```

---

## 五、docker port 命令（5 分鐘）

```bash
docker port my-nginx
docker port my-nginx 80
```

```bash
# 用於腳本
HOST_PORT=$(docker port my-nginx 80 | cut -d: -f2)
```

---

## 六、常見問題（10 分鐘）

### Port 已被佔用

```bash
lsof -i :8080
# 換 port 或停止佔用者
```

### 外部無法存取

1. 檢查防火牆
```bash
sudo firewall-cmd --add-port=8080/tcp --permanent
```

2. 檢查綁定 IP
```bash
docker port my-nginx
# 如果是 127.0.0.1，外部無法存取
```

3. 雲平台 Security Group

### Docker 繞過 ufw

```bash
# 解法：綁定 127.0.0.1
docker run -d -p 127.0.0.1:8080:80 nginx
```

---

## 七、小結（5 分鐘）

### 語法

```
-p [host_ip:]host_port:container_port[/protocol]
```

### 常見寫法

| 寫法 | 效果 |
|-----|------|
| -p 8080:80 | 所有介面 |
| -p 127.0.0.1:8080:80 | 只有本機 |
| -p 8080:80/udp | UDP |
| -P | 隨機 port |

### 最佳實踐

- 敏感服務綁定 127.0.0.1
- 用 Nginx 反向代理
- 使用雲平台安全群組

下一堂：Volume 資料持久化。

---

## 板書 / PPT 建議

1. Port Mapping 原理圖
2. -p 語法格式表
3. 綁定策略比較圖
4. 常見問題對照表
