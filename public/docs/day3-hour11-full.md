# Day 3 第十一小時：Port Mapping 進階

---

## 一、前情提要（2 分鐘）

上堂課講了容器網路基礎。

這堂課深入 Port Mapping：
- -p 參數完整語法
- 多種綁定方式
- 隨機 port
- 實際應用場景
- 防火牆注意事項

---

## 二、Port Mapping 原理（8 分鐘）

### 2.1 為什麼需要 Port Mapping

容器有自己的網路命名空間，預設外部無法存取。

Port Mapping 讓外部流量進入容器：

```
外部請求 → 主機 Port → Docker NAT → 容器 Port
```

### 2.2 底層實現

Docker 用 iptables 實現 Port Mapping：

```bash
# 查看 Docker 建立的 iptables 規則
sudo iptables -t nat -L -n | grep DOCKER
```

當你執行 `-p 8080:80`，Docker 會加入類似這樣的規則：

```
DNAT tcp -- 0.0.0.0/0 0.0.0.0/0 tcp dpt:8080 to:172.17.0.2:80
```

### 2.3 流量路徑

```
外部 (192.168.1.100)
      ↓
主機 eth0 (192.168.1.50:8080)
      ↓
iptables DNAT
      ↓
docker0 → 容器 (172.17.0.2:80)
```

---

## 三、-p 參數完整語法（15 分鐘）

### 3.1 語法格式

```
-p [host_ip:]host_port:container_port[/protocol]
```

| 部分 | 必填 | 說明 |
|-----|------|------|
| host_ip | 否 | 綁定的主機 IP |
| host_port | 是 | 主機 port |
| container_port | 是 | 容器 port |
| protocol | 否 | tcp 或 udp，預設 tcp |

### 3.2 各種寫法

**基本：主機 port → 容器 port**

```bash
docker run -d -p 8080:80 nginx
```

主機所有介面的 8080 → 容器 80。

**指定主機 IP**

```bash
# 只綁定 localhost
docker run -d -p 127.0.0.1:8080:80 nginx

# 只綁定特定 IP
docker run -d -p 192.168.1.50:8080:80 nginx
```

**指定協定**

```bash
# TCP（預設）
docker run -d -p 8080:80/tcp nginx

# UDP
docker run -d -p 53:53/udp dns-server

# 同時 TCP 和 UDP
docker run -d -p 53:53/tcp -p 53:53/udp dns-server
```

**多個 port**

```bash
docker run -d \
  -p 80:80 \
  -p 443:443 \
  nginx
```

**port 範圍**

```bash
docker run -d -p 8080-8085:80-85 myapp
```

主機 8080-8085 對應容器 80-85。

### 3.3 隨機 port（大寫 -P）

```bash
docker run -d -P nginx
```

自動把映像檔 EXPOSE 的所有 port 對應到隨機高位 port（32768-65535）。

查看分配的 port：

```bash
docker port my-nginx
# 80/tcp -> 0.0.0.0:32769
```

### 3.4 只指定容器 port（讓主機自動分配）

```bash
docker run -d -p 80 nginx
```

主機會自動分配一個可用的高位 port。

```bash
docker port my-nginx
# 80/tcp -> 0.0.0.0:32770
```

---

## 四、綁定策略詳解（10 分鐘）

### 4.1 綁定 0.0.0.0（所有介面）

```bash
docker run -d -p 8080:80 nginx
# 等同於
docker run -d -p 0.0.0.0:8080:80 nginx
```

主機上的所有網路介面都可以存取：
- localhost (127.0.0.1)
- 內網 IP (192.168.x.x)
- 公網 IP（如果有）

**風險**：如果主機有公網 IP，服務會直接暴露到網際網路。

### 4.2 只綁定 127.0.0.1

```bash
docker run -d -p 127.0.0.1:8080:80 nginx
```

只有本機可以存取。

**使用場景**：
- 開發環境
- 前面有反向代理（Nginx）的服務
- 不想直接暴露的服務

### 4.3 綁定特定網路介面

```bash
# 只在內網 IP 上監聽
docker run -d -p 192.168.1.50:8080:80 nginx
```

**使用場景**：
- 主機有多個網路介面
- 只想在特定網路上提供服務

### 4.4 實際案例

**案例：資料庫只給內網存取**

```bash
# 錯誤：MySQL 暴露給所有人
docker run -d -p 3306:3306 mysql

# 正確：MySQL 只給本機
docker run -d -p 127.0.0.1:3306:3306 mysql

# 或者：完全不暴露，只讓同網路容器存取
docker run -d --network app-network mysql
```

**案例：多網卡伺服器**

```bash
# 公網服務
docker run -d -p 203.0.113.50:80:80 nginx

# 管理介面只給內網
docker run -d -p 10.0.0.50:9090:9090 admin-panel
```

---

## 五、docker port 命令（5 分鐘）

### 5.1 查看容器的 port 對應

```bash
docker port my-nginx
```

輸出：

```
80/tcp -> 0.0.0.0:8080
443/tcp -> 0.0.0.0:8443
```

### 5.2 查詢特定 port

```bash
docker port my-nginx 80
# 0.0.0.0:8080

docker port my-nginx 80/tcp
# 0.0.0.0:8080
```

### 5.3 用於腳本

```bash
# 取得對應的主機 port
HOST_PORT=$(docker port my-nginx 80 | cut -d: -f2)
echo "Service available at http://localhost:$HOST_PORT"
```

---

## 六、常見問題與解決（10 分鐘）

### 6.1 Port 已被佔用

**錯誤訊息**

```
Bind for 0.0.0.0:8080 failed: port is already allocated
```

**解決方法**

```bash
# 查看誰佔用了 port
lsof -i :8080
# 或
netstat -tlnp | grep 8080
# 或
ss -tlnp | grep 8080

# 選項一：停止佔用者
# 選項二：換一個 port
docker run -d -p 8081:80 nginx
```

### 6.2 無法從外部存取

**可能原因一：防火牆**

```bash
# CentOS/RHEL
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload

# Ubuntu（ufw）
sudo ufw allow 8080/tcp
```

**可能原因二：綁定了 127.0.0.1**

```bash
docker port my-nginx
# 如果顯示 127.0.0.1:8080，外部就無法存取
```

**可能原因三：雲平台安全群組**

AWS、GCP、Azure 等雲平台有自己的防火牆（Security Group），也要開放對應的 port。

### 6.3 容器重啟後 port 變了

如果用 `-P` 或沒指定主機 port，每次重啟可能會分配不同的 port。

**解決**：永遠指定確定的主機 port。

```bash
# 不好
docker run -d -P nginx

# 好
docker run -d -p 8080:80 nginx
```

### 6.4 同一個 port 跑多個容器

**不能這樣做：**

```bash
docker run -d -p 8080:80 nginx
docker run -d -p 8080:80 nginx  # 錯誤：port 已被佔用
```

**解決方案一：不同 port**

```bash
docker run -d -p 8080:80 nginx
docker run -d -p 8081:80 nginx
```

**解決方案二：反向代理**

```bash
# 用一個 Nginx 做反向代理
docker run -d --name proxy -p 80:80 nginx
# 其他容器不暴露 port，透過 proxy 轉發
```

---

## 七、與防火牆的交互（5 分鐘）

### 7.1 Docker 和 iptables

Docker 會自動操作 iptables 來實現 Port Mapping。

**問題**：Docker 的規則可能繞過 ufw/firewalld。

```bash
# 你以為用 ufw 擋住了 8080
sudo ufw deny 8080

# 但 Docker 直接操作 iptables，可能還是通
docker run -d -p 8080:80 nginx
# 外部可能還是能存取！
```

### 7.2 解決方案

**方法一：綁定到 127.0.0.1**

```bash
docker run -d -p 127.0.0.1:8080:80 nginx
```

只允許本機存取，然後用 Nginx 反向代理。

**方法二：設定 Docker daemon**

在 `/etc/docker/daemon.json`：

```json
{
  "iptables": false
}
```

Docker 不再操作 iptables，但你要自己管理網路規則。

**方法三：設定 DOCKER-USER chain**

Docker 提供 DOCKER-USER chain 讓你加自訂規則：

```bash
sudo iptables -I DOCKER-USER -i eth0 -p tcp --dport 8080 -j DROP
```

### 7.3 最佳實踐

- 只暴露必要的 port
- 敏感服務綁定 127.0.0.1
- 前面放 Nginx 反向代理
- 使用雲平台的安全群組

---

## 八、本堂課小結（5 分鐘）

這堂課深入了 Port Mapping：

**-p 語法**

```
-p [host_ip:]host_port:container_port[/protocol]
```

**常見寫法**

| 寫法 | 效果 |
|-----|------|
| -p 8080:80 | 所有介面 8080 → 容器 80 |
| -p 127.0.0.1:8080:80 | 只有本機 |
| -p 8080:80/udp | UDP 協定 |
| -P | 隨機 port |

**綁定策略**

- 0.0.0.0：所有介面（注意安全）
- 127.0.0.1：只有本機
- 特定 IP：特定網路介面

**常見問題**

- port 佔用：換 port 或停止佔用者
- 外部無法存取：檢查防火牆和綁定 IP
- Docker 繞過 ufw：綁定 127.0.0.1 或設定 DOCKER-USER

下一堂：Volume 資料持久化。

---

## 板書 / PPT 建議

1. Port Mapping 原理圖（外部 → iptables → 容器）
2. -p 語法格式表
3. 綁定策略比較圖
4. 常見問題對照表
