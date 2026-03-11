# Day 2 第五小時：Docker 基本指令（下）

---

## 一、前情提要（2 分鐘）

上一堂課：pull、images、run、ps。

本堂課：管理和清理
- stop/start/restart：容器啟停
- rm/rmi：刪除容器和映像檔
- logs：查看日誌
- exec：進入容器
- cp：複製檔案

---

## 二、容器生命週期操作（15 分鐘）

### 啟停容器

```bash
docker stop my-nginx       # 優雅關閉（SIGTERM → 10秒 → SIGKILL）
docker stop -t 0 my-nginx  # 立刻強制終止
docker start my-nginx      # 啟動已停止的容器
docker restart my-nginx    # 重啟
docker kill my-nginx       # 強制終止（直接 SIGKILL）
```

### 暫停/恢復

```bash
docker pause my-nginx      # 凍結所有程序
docker unpause my-nginx    # 解凍
```

### 批次操作

```bash
docker stop $(docker ps -q)    # 停止所有容器
```

---

## 三、刪除容器和映像檔（12 分鐘）

### 刪除容器

```bash
docker rm my-nginx             # 刪除已停止的容器
docker rm -f my-nginx          # 強制刪除執行中容器
docker container prune         # 清理所有已停止容器
```

### 刪除映像檔

```bash
docker rmi nginx:1.25          # 刪除映像檔
docker rmi -f nginx:1.25       # 強制刪除
docker image prune             # 清理 dangling images
docker image prune -a          # 清理所有未使用映像檔
```

### 全面清理

```bash
docker system prune            # 清理容器、網路、dangling images、cache
docker system prune -a         # 更徹底（含未使用映像檔）
docker system df               # 查看磁碟使用
```

---

## 四、docker logs - 查看日誌（10 分鐘）

### 基本用法

```bash
docker logs my-nginx           # 顯示所有日誌
docker logs -f my-nginx        # 即時追蹤（類似 tail -f）
docker logs -t my-nginx        # 顯示時間戳
docker logs --tail 100 my-nginx  # 最後 100 行
docker logs --since 1h my-nginx  # 最近 1 小時
```

### 日誌輪替設定

```json
// /etc/docker/daemon.json
{
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

---

## 五、docker exec - 進入容器（10 分鐘）

### 基本用法

```bash
docker exec -it my-nginx bash      # 進入 shell
docker exec -it my-nginx /bin/sh   # Alpine 用 sh
docker exec my-nginx ls /etc/nginx # 執行單一命令
```

### 進階選項

```bash
docker exec -u root my-nginx whoami       # 指定使用者
docker exec -e MY_VAR=hello my-nginx env  # 設定環境變數
docker exec -w /etc/nginx my-nginx ls     # 指定工作目錄
```

### exec vs attach

| | docker exec | docker attach |
|--|-------------|---------------|
| 作用 | 開新程序 | 連到主程序 |
| 離開 | 只結束 shell | 可能停止容器 |
| 適用 | 除錯、檢查 | 查看主程序輸出 |

---

## 六、docker cp - 複製檔案（8 分鐘）

### 雙向複製

```bash
# 主機 → 容器
docker cp ./index.html my-nginx:/usr/share/nginx/html/

# 容器 → 主機
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf
```

### 使用場景

```bash
# 快速修改設定
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf.bak
# 修改後放回
docker cp ./nginx.conf my-nginx:/etc/nginx/nginx.conf
docker exec my-nginx nginx -s reload
```

---

## 七、其他常用指令（3 分鐘）

```bash
docker inspect my-nginx                    # 查看詳細資訊（JSON）
docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' my-nginx  # 取得 bridge IP
docker stats                               # 即時監控（CPU、記憶體）
docker top my-nginx                        # 查看容器內程序
```

---

## 八、小結（2 分鐘）

| 指令 | 功能 |
|-----|-----|
| stop/start/restart | 啟停容器 |
| kill | 強制終止 |
| rm | 刪除容器 |
| rmi | 刪除映像檔 |
| logs | 查看日誌 |
| exec | 進入容器 |
| cp | 複製檔案 |
| inspect/stats | 查看資訊 |

**清理指令**

| 指令 | 對象 |
|-----|------|
| container prune | 已停止容器 |
| image prune | Dangling images |
| system prune | 全面清理 |

下一堂課：Nginx 容器實戰。

---

## 板書 / PPT 建議

1. 容器生命週期狀態圖
2. stop vs kill 比較
3. docker logs 參數表
4. docker exec vs attach 比較
5. 清理指令對照表
