# Day 3 第十二小時：Dockerfile 實戰 + 常見問題排查

---

## 一、開場（3 分鐘）

好，各位同學，歡迎來到 Dockerfile 三部曲的最後一堂課。

我們先回顧一下前兩堂課講了什麼。

**第十小時**，我們把 Dockerfile 的所有指令走了一遍——FROM、RUN、COPY、ADD、WORKDIR、ENV、ARG、EXPOSE、CMD、ENTRYPOINT、USER、VOLUME、HEALTHCHECK、LABEL。然後我們用這些指令動手打包了一個 Python Flask 應用，從無到有把 Dockerfile 寫出來，build、run，整個流程跑了一次。那堂課結束的時候，你們應該已經有能力「寫出一個能用的 Dockerfile」了。

**第十一小時**，我們往上提升了一個層次——學了 .dockerignore 來控制 build context、學了一系列 Best Practices 讓 Dockerfile 更專業，最重要的是學了 Multi-stage Build 這個大殺器，還有怎麼把映像檔推上 Docker Hub。那堂課結束的時候，你們應該有能力「寫出一個優化過的 Dockerfile」了。

好，那今天呢？

今天是收成的一堂課。前兩堂是打底，今天要做的是——讓你們能在公司裡真正寫 Dockerfile。

具體來說，我們要做三件事：

第一，完整地從頭到尾打包一個 **Node.js + TypeScript** 的生產級專案。不是教學用的小玩具，是真的可以拿去上線的那種。每一行每一個設計決策，我都會告訴你「為什麼」。

第二，打包一個 **Spring Boot Java** 應用。Java 在企業裡面用得極其廣泛，而且 JVM 在容器裡有一些特殊的「坑」，你不知道的話一定會踩到。

第三，我整理了一份 **Dockerfile 常見問題排查寶典**。你以後在公司遇到 Dockerfile 的問題，翻這份東西就行了。

準備好了嗎？鍵盤打開，我們直接開始。

---

## 二、實戰一：Node.js + TypeScript 生產級專案（20 分鐘）

### 2.1 為什麼選這個專案

在動手之前，我先解釋一下為什麼我選 Node.js + TypeScript 做第一個實戰。

原因很簡單——這是目前業界最常見的後端技術棧之一。你去看各大公司的招聘 JD，Node.js 加 TypeScript 的組合出現頻率非常高。而且 TypeScript 專案有一個很好的特性：它需要「編譯」。TypeScript 要先編譯成 JavaScript 才能跑。

這意味著什麼？意味著你在 build 的時候需要 TypeScript 編譯器、需要型別定義檔案、需要一堆 devDependencies。但是到了生產環境，你只需要編譯完的 JavaScript。

這不就是 Multi-stage Build 最完美的使用場景嗎？Build 階段有一堆工具，Production 階段乾乾淨淨，只有需要的東西。

好，我們來看專案結構。

### 2.2 專案結構介紹

```
my-ts-api/
├── src/
│   └── index.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── .dockerignore
└── Dockerfile
```

這是一個非常典型的 TypeScript 後端專案結構。我們一個一個來看。

**package.json**：

```json
{
  "name": "my-ts-api",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "ts-node": "^10.9.1"
  }
}
```

我想請大家注意一個重要的細節——`dependencies` 和 `devDependencies` 的區別。

`dependencies` 裡面只有 `express`，這是我們的 API 框架，生產環境一定需要它。

`devDependencies` 裡面有 `typescript`、`@types/express`、`@types/node`、`ts-node`，這些都是開發和編譯時才需要的東西。`typescript` 是編譯器，`@types` 開頭的是型別定義，`ts-node` 是開發時用來直接跑 TypeScript 的工具。

到了生產環境，TypeScript 已經被編譯成 JavaScript 了，這些 devDependencies 統統不需要。這個觀念等一下寫 Dockerfile 的時候會用到，請記住。

還有 `scripts` 裡面的三個指令：`build` 是用 `tsc`（TypeScript Compiler）編譯，`start` 是跑編譯後的 JavaScript，`dev` 是開發時直接跑 TypeScript。

**tsconfig.json**：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

這個檔案是 TypeScript 的設定。關鍵的一行是 `"outDir": "./dist"`，意思是編譯後的 JavaScript 檔案會放到 `dist/` 資料夾裡。

所以流程是：`src/index.ts` → `tsc` 編譯 → `dist/index.js`。

**src/index.ts**：

```typescript
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from TypeScript API!', version: '1.0.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

很簡單的一個 Express API，兩個端點。首頁回傳一個歡迎訊息，`/health` 回傳健康狀態和運行時間。

有同學可能會問：「為什麼要特別做一個 `/health` 端點？」

好問題。這不是為了好看，而是給 Docker 的 HEALTHCHECK 用的。等一下 Dockerfile 裡面會設定健康檢查，就是定期去打這個端點，如果打得通就代表應用還活著。在真實的生產環境中，Kubernetes 或者負載均衡器也會用這個端點來判斷你的服務是不是正常的。

所以養成習慣——每個 API 服務都要有一個 health check 端點。

### 2.3 寫 .dockerignore

好，專案結構看完了，我們開始動手。第一步不是寫 Dockerfile，而是先寫 .dockerignore。

為什麼要先寫？因為這是一個好習慣。就像你做菜之前會先洗菜備料一樣，寫 Dockerfile 之前先把不需要的東西排除掉。

```
# .dockerignore

# 依賴套件——容器內會重新安裝
node_modules
npm-debug.log

# 編譯產物——容器內會重新編譯
dist

# 版本控制
.git
.gitignore

# 機密資訊
.env
.env.*

# 文件
*.md
LICENSE

# IDE 設定
.vscode
.idea

# 測試相關
coverage
.nyc_output
```

我來解釋幾個重點。

`node_modules` 是必須排除的。你們想一下，一個 Node.js 專案的 node_modules 可能有幾百 MB、上千個資料夾、幾萬個檔案。如果不排除，docker build 的時候光是「Sending build context to Docker daemon」這一步就要等半天。而且我們在容器裡面會重新 `npm install`，所以本機的 node_modules 根本不需要送進去。

`dist` 也要排除。為什麼？因為 dist 是本機編譯的產物，我們在容器的 Build stage 裡面會重新編譯一份。送進去不但浪費時間，還可能造成混淆——萬一本機的 dist 是過期的呢？

`.env` 更不用說了，裡面可能有資料庫密碼、API Key 等等機密資訊，絕對不能打包進映像檔。這是安全的基本常識。

有同學可能會注意到，我連 `Dockerfile` 和 `.dockerignore` 本身都沒有排除。其實排不排都可以，不影響功能。有些人會排除、有些人不排除，這是個人習慣。

### 2.4 寫 Dockerfile（Multi-stage）

好，重頭戲來了。我要帶你們寫一個真正的生產級 Dockerfile。

我先把完整的 Dockerfile 貼出來，你們先整體看一遍，然後我一段一段解釋，每一行都不放過。

```dockerfile
# ============================================
# Stage 1: Build（建構階段）
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# 先複製 package 檔案，利用快取
COPY package.json package-lock.json ./

# 安裝所有依賴（包含 devDependencies，因為要編譯 TS）
RUN npm ci

# 複製原始碼
COPY tsconfig.json ./
COPY src/ ./src/

# 編譯 TypeScript
RUN npm run build

# ============================================
# Stage 2: Production（生產階段）
# ============================================
FROM node:20-alpine AS production

# 安裝 dumb-init 處理 PID 1 信號問題
RUN apk add --no-cache dumb-init

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# 只複製 package 檔案，安裝生產依賴
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 從 build 階段複製編譯好的 JavaScript
COPY --from=builder /app/dist ./dist

# 設定檔案擁有權並切換到非 root 使用者
RUN chown -R node:node /app
USER node

# 暴露 port
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 用 dumb-init 啟動應用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

好，讓我們一段一段來看。每一行我都要告訴你們「為什麼這樣寫」。

### 2.5 Build Stage 逐行解析

```dockerfile
FROM node:20-alpine AS builder
```

我們的 Build stage 用 `node:20-alpine` 做 base image。

有同學可能會問：「為什麼是 alpine？用完整版的 node:20 不行嗎？」

行。功能上完全沒問題。但你想一下——Build stage 的東西最後會被丟掉，不會出現在最終映像裡。所以用哪個 base image 對最終大小沒有影響。那為什麼還要用 alpine？

兩個原因。第一，下載速度。node:20 完整版大概 350MB，alpine 版只有 50MB 左右。在 CI/CD 環境裡，如果你的 pipeline 每次都要重新拉 base image（沒有 cache 的話），那 300MB 的差距就很可觀了。第二，好習慣。養成用小映像的習慣，以後不管什麼場景都不會吃虧。

`AS builder` 是給這個 stage 取名字，等一下在 Production stage 要用 `COPY --from=builder` 來引用。

```dockerfile
WORKDIR /app
```

設定工作目錄。所有後續的指令都在 `/app` 裡面執行。

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci
```

**這裡有一個非常重要的設計決策。**

我們先只複製 `package.json` 和 `package-lock.json`，然後跑 `npm ci`。而不是一口氣 `COPY . .` 把所有東西都複製進去再安裝。

為什麼？

大家還記得上堂課講的 Docker layer cache 嗎？Docker 在建構的時候，每一行指令都會產生一個 layer。如果某一行指令的輸入沒有變化，Docker 就會直接用快取的結果，不用重新執行。

想一下，你在開發的過程中，什麼會經常變？原始碼對吧？你改一行 TypeScript，原始碼就變了。

什麼不常變？package.json 對吧？你不會每天都在加新套件。

所以我們把不常變的 `package.json` 放前面，常變的原始碼放後面。這樣只要 package.json 沒變，`npm ci` 這一步就會用快取，幾乎是秒完成。只有原始碼的 COPY 和編譯需要重新執行。

這個技巧可以把建構時間從幾分鐘壓到幾秒鐘。在你一天 build 幾十次的開發過程中，這個差異是非常巨大的。

再說一下 `npm ci` 和 `npm install` 的差別。`npm ci` 是「Clean Install」的意思，它會：

1. 嚴格根據 `package-lock.json` 安裝，不會去更新 lock 檔
2. 如果 `package-lock.json` 和 `package.json` 有衝突，直接報錯，而不是默默修改
3. 會先刪掉 node_modules 再裝

所以 `npm ci` 比 `npm install` 更可預測、更可靠。在 Dockerfile 和 CI/CD 環境中，一定要用 `npm ci`。你不會希望今天 build 和昨天 build 用了不同版本的套件吧？

```dockerfile
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build
```

然後我們複製 TypeScript 的設定檔和原始碼，執行編譯。`npm run build` 實際上就是跑 `tsc`，TypeScript 編譯器會把 `src/` 裡的 `.ts` 檔案編譯成 `.js`，放到 `dist/` 資料夾。

注意我沒有寫 `COPY . .`，而是分開寫 `COPY tsconfig.json` 和 `COPY src/`。這也是為了 cache 優化。如果你改了 README.md 或者其他無關的檔案，`COPY . .` 會導致這一層 cache 失效，但分開寫就不會。

Build stage 到這裡就結束了。這個 stage 最終產生的東西就是 `/app/dist/` 裡面的 JavaScript 檔案。

### 2.6 Production Stage 逐行解析

```dockerfile
FROM node:20-alpine AS production
```

生產階段用一個「全新的、乾淨的」`node:20-alpine`。

這就是 Multi-stage 的精髓——前一個 stage 的所有東西（TypeScript 編譯器、型別定義檔、devDependencies、原始碼）通通不會帶過來。除非你用 `COPY --from` 明確地去拿。

```dockerfile
RUN apk add --no-cache dumb-init
```

好，這裡出現了一個新東西——**dumb-init**。我要花一點時間解釋，因為這個東西很重要，但很多人不知道。

先說結論：**如果你在 Docker 容器裡跑 Node.js，你幾乎一定需要 dumb-init。**

為什麼？讓我用一個故事來解釋。

在 Linux 的世界裡，有一個很特殊的角色，叫做 **PID 1 程序**。PID 1 是系統裡第一個啟動的程序，傳統上叫 `init`。PID 1 有一個很重要的責任——它要當所有程序的「家長」，負責回收孤兒程序（zombie processes），還要負責把系統信號正確地傳遞給子程序。

在你的普通 Linux 伺服器上，PID 1 是 systemd 或者 init，它們生來就是幹這個的。

但是在 Docker 容器裡面呢？你的 Dockerfile 最後一行 `CMD ["node", "dist/index.js"]`，Node.js 會直接變成 PID 1。

問題來了——**Node.js 不是設計來當 PID 1 的**。

具體會有什麼問題？最常見的就是信號處理。當你執行 `docker stop` 的時候，Docker 會送一個 SIGTERM 信號給容器的 PID 1 程序，意思是「請你優雅地關閉」。正常的 init 系統收到 SIGTERM 會把信號轉發給所有子程序，讓它們有機會做清理工作——關閉資料庫連線、完成正在處理的請求、寫入日誌等等。

但是 Node.js 預設不會處理 SIGTERM。結果就是 Docker 送了 SIGTERM 出去，Node.js 完全沒反應。Docker 等了 10 秒（預設的 grace period），心想：「你不理我？那我就強制 kill 了。」然後送出 SIGKILL，容器被強制殺掉。

被強制 kill 會怎樣？正在處理的請求會直接中斷（用戶端收到 connection reset）、正在寫入的資料可能不完整、連線沒有正確關閉可能導致對端的連線池被耗盡。

這些在開發環境裡你可能不覺得有什麼，但在生產環境，尤其是高流量的系統裡，「每次部署都會有一小段時間請求失敗」是不能接受的。

**dumb-init 的解法很簡單**——它來當 PID 1，把信號正確地轉發給你的 Node.js。這樣 `docker stop` → SIGTERM → dumb-init 收到 → 轉發給 Node.js → Node.js 優雅關閉。整個過程通常在 1-2 秒內完成，不用等 10 秒被強制 kill。

`apk add --no-cache dumb-init`——因為我們用的是 Alpine，用 `apk` 安裝。`--no-cache` 是不要保留安裝快取，省一點空間。dumb-init 本身非常小，只有幾十 KB，完全不用擔心映像變大。

有同學可能會問：「那我自己在 Node.js 程式碼裡面加一個 `process.on('SIGTERM', ...)` 不行嗎？」

行。但 dumb-init 的好處是它幫你處理了所有信號，不只是 SIGTERM。而且它還能回收孤兒程序，避免 zombie process 的問題。你自己處理就只能一個一個寫，容易漏掉。

一個好的工程實踐是：用 dumb-init 做 PID 1 的信號處理，同時在你的 Node.js 程式碼裡也加上 graceful shutdown 的邏輯。這是雙重保障。

```dockerfile
ENV NODE_ENV=production
ENV PORT=3000
```

設定環境變數。`NODE_ENV=production` 很重要，很多 Node.js 框架和套件會根據這個變數來調整行為。比如 Express 在 production 模式下會啟用更多的效能優化、關閉詳細的錯誤訊息（避免洩漏內部資訊給攻擊者）。

`PORT=3000` 定義應用監聽的 port。注意回去看我們的 `index.ts`——`const PORT = process.env.PORT || 3000;`——程式碼會讀這個環境變數。這樣在 `docker run` 的時候可以用 `-e PORT=8080` 來覆蓋。

```dockerfile
WORKDIR /app
```

設定工作目錄。

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
```

這裡又 COPY 一次 package.json，再裝一次依賴。但注意和 Build stage 的差別——這裡用了 `--omit=dev`。

`--omit=dev` 的意思是「不要安裝 devDependencies」。所以 typescript、@types/express、@types/node、ts-node 這些統統不會被安裝。只裝 express。

為什麼？因為到了這個 stage，TypeScript 已經在上一個 stage 編譯好了。我們只需要 JavaScript 的執行環境，不需要編譯器。少裝一些套件，映像就小一些，攻擊面也小一些。

`npm cache clean --force` 是清掉 npm 的快取。npm 安裝套件之後會在本地保留快取（通常在 `~/.npm`），方便下次安裝的時候更快。但在 Docker 映像裡面，我們不會再安裝任何套件了，所以這個快取只是佔空間。清掉它可以省個幾 MB。

注意我把 `npm ci` 和 `npm cache clean` 用 `&&` 連在一起，寫在同一個 RUN 裡面。為什麼？因為 Docker 的每一行 RUN 都是一層 layer。如果你先 `RUN npm ci` 再 `RUN npm cache clean`，那 npm ci 產生的快取會存在第一層裡面，第二層的 clean 只是新增了一層「刪除」，但下面那層的空間並沒有真正被釋放。合併成一個 RUN，快取在同一層裡被創建又被刪除，最終這一層就不包含快取了。

```dockerfile
COPY --from=builder /app/dist ./dist
```

**這是 Multi-stage 最核心的一行。**

`--from=builder` 的意思是「從 builder 這個 stage 複製檔案」。我們只複製了 `/app/dist`——也就是編譯好的 JavaScript 檔案。

Builder stage 裡面的 TypeScript 原始碼、node_modules（包含所有 devDependencies）、tsconfig.json——通通不會帶過來。

到目前為止，我們的 Production 映像裡只有：

- Node.js runtime（來自 base image）
- dumb-init（一個小工具）
- express（生產依賴）
- dist/ 裡面的 JavaScript 檔案

乾淨得不得了。

```dockerfile
RUN chown -R node:node /app
USER node
```

先把 `/app` 目錄的擁有權改成 `node:node`，然後切換到 `node` 使用者。

`node:alpine` 這個 base image 已經內建了一個叫 `node` 的非 root 使用者（uid 1000），我們直接用就好。

為什麼不用 root？安全性。這是縱深防禦的概念。如果你的應用程式有漏洞——比如某個依賴有 Remote Code Execution 的漏洞——攻擊者拿到的權限就只是一個普通使用者，而不是 root。root 可以做任何事情——讀任何檔案、改任何設定、甚至逃逸容器。普通使用者則被限制在自己的權限範圍內。

有同學問過我：「容器不是已經隔離了嗎？為什麼還要擔心 root？」

隔離不等於安全。歷史上有不少容器逃逸的漏洞（container escape）。如果容器內是 root，一旦發生逃逸，攻擊者在宿主機上也是 root 權限。如果容器內是普通使用者，即使逃逸了，造成的損害也有限。

注意先 `chown` 再 `USER`。為什麼要這個順序？因為 `chown` 需要 root 權限才能執行。一旦切換到 `node` 使用者，就沒辦法 `chown` 了。

```dockerfile
EXPOSE 3000
```

宣告容器監聽 3000 port。EXPOSE 本身不會真的開放 port，它只是一個文件性質的宣告，告訴使用者「這個容器用 3000 port」。真正的 port mapping 要在 `docker run -p` 的時候指定。

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

健康檢查。讓我解釋每個參數：

- `--interval=30s`：每 30 秒檢查一次
- `--timeout=3s`：每次檢查的超時時間是 3 秒
- `--start-period=5s`：容器啟動後先等 5 秒再開始檢查。Node.js 啟動通常很快，5 秒綽綽有餘
- `--retries=3`：連續失敗 3 次才標記為 unhealthy

為什麼用 `wget` 不用 `curl`？因為 Alpine 預設有 wget 但沒有 curl。如果要用 curl 就得額外安裝，多一個套件。`--spider` 參數是只檢查 URL 是否可以連上，不下載內容。`--no-verbose` 是減少輸出。

有了 HEALTHCHECK，`docker ps` 的時候你會看到容器的健康狀態：

```
STATUS: Up 30s (healthy)
```

如果變成 `(unhealthy)`，你就知道有問題了。在 Docker Swarm 或 Kubernetes 裡面，unhealthy 的容器會被自動重啟。

```dockerfile
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

最後兩行。ENTRYPOINT 設定 dumb-init 為 PID 1 程序，CMD 設定實際要跑的應用。

為什麼拆成 ENTRYPOINT 和 CMD 兩行？

還記得我們講過 ENTRYPOINT 和 CMD 的關係嗎？ENTRYPOINT 是「固定的部分」，CMD 是「可覆蓋的參數」。最終執行的指令是兩個合併在一起：`dumb-init -- node dist/index.js`。

分開寫的好處是——CMD 可以在 `docker run` 的時候被覆蓋。比如你想進去容器 debug：

```bash
docker run -it my-ts-api:1.0.0 sh
```

這樣 CMD 被覆蓋成 `sh`，但 ENTRYPOINT 的 `dumb-init --` 還在，所以實際執行的是 `dumb-init -- sh`。信號處理還是正確的。

如果你把全部寫在 ENTRYPOINT 裡面，想覆蓋就得加 `--entrypoint` 參數，比較麻煩。

### 2.7 建構與驗證

好，Dockerfile 講完了，我們來實際跑一次。

```bash
# 建構映像檔
docker build -t my-ts-api:1.0.0 .
```

建構過程中你會看到兩個 stage 依序執行。第一次可能要一兩分鐘，因為要下載 base image 和安裝依賴。第二次建構如果只改了原始碼，package.json 沒變，那 `npm ci` 會用快取，幾秒鐘就完成了。

來看一下映像檔大小：

```bash
docker images my-ts-api
```

```
REPOSITORY   TAG     IMAGE ID       CREATED          SIZE
my-ts-api    1.0.0   abc123def456   10 seconds ago   125MB
```

125MB。一個可以上線的 Node.js API，125MB。如果你不用 Multi-stage、不用 Alpine——直接用 node:20 然後 `npm install` 裝所有東西——映像可能會到 500MB 甚至更大。

啟動容器：

```bash
docker run -d --name ts-api -p 3000:3000 my-ts-api:1.0.0
```

驗證 API：

```bash
curl http://localhost:3000/
# {"message":"Hello from TypeScript API!","version":"1.0.0"}

curl http://localhost:3000/health
# {"status":"healthy","uptime":5.123}
```

驗證健康狀態（等大約 30 秒讓第一次健康檢查完成）：

```bash
docker ps
```

```
CONTAINER ID   IMAGE            STATUS                    PORTS
abc123def      my-ts-api:1.0.0  Up 35s (healthy)         0.0.0.0:3000->3000/tcp
```

看到那個 `(healthy)` 了嗎？健康檢查通過了。

驗證不是用 root 在跑：

```bash
docker exec ts-api whoami
# node
```

驗證 PID 1 是 dumb-init：

```bash
docker exec ts-api ps aux
```

```
PID   USER     COMMAND
  1   node     dumb-init -- node dist/index.js
  7   node     node dist/index.js
```

PID 1 是 dumb-init，Node.js 是它的子程序。

測試優雅關閉：

```bash
time docker stop ts-api
```

應該在 1-2 秒內停止，而不是等 10 秒。如果沒有 dumb-init，你會看到整整等了 10 秒才停下來——那就是 Docker 在等 SIGTERM 超時之後強制 kill 的。

**同學們，這就是你在公司裡真正會寫的 Dockerfile。** 不是什麼三行五行的玩具版本，而是一個考慮了建構效率、映像大小、安全性、信號處理、健康檢查的生產級 Dockerfile。

清理一下：

```bash
docker rm -f ts-api
```

---

## 三、實戰二：Spring Boot Java 應用（15 分鐘）

### 3.1 為什麼要講 Java

好，第二個實戰——Spring Boot Java 應用。

有同學可能會想：「我又不寫 Java，為什麼要學這個？」

讓我告訴你為什麼。第一，Java 在企業裡面的佔有率極高。即使你自己不寫 Java，你的同事很可能在寫。你要能看得懂他們的 Dockerfile。第二，Java 在容器裡面有一些獨特的問題，特別是記憶體管理方面，如果你不知道，一定會踩到坑。這些知識是通用的，理解了之後對其他語言也有幫助。

### 3.2 專案結構

假設我們有一個標準的 Spring Boot 專案：

```
my-spring-app/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/example/demo/
│       │       └── DemoApplication.java
│       └── resources/
│           └── application.yml
├── pom.xml
├── .dockerignore
└── Dockerfile
```

**DemoApplication.java**（簡化版）：

```java
@SpringBootApplication
@RestController
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @GetMapping("/")
    public Map<String, String> hello() {
        return Map.of("message", "Hello from Spring Boot!", "version", "1.0.0");
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "healthy");
    }
}
```

跟剛才的 Node.js API 一樣簡單——首頁和健康檢查兩個端點。

### 3.3 .dockerignore

```
# .dockerignore
target
.git
.gitignore
*.md
.idea
.vscode
.settings
.classpath
.project
```

Java 專案的 `target` 資料夾相當於 Node.js 的 `node_modules`，是編譯產物和下載的依賴。一定要排除。

### 3.4 Multi-stage Dockerfile

```dockerfile
# ============================================
# Stage 1: Build（用 Maven 編譯）
# ============================================
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# 先複製 pom.xml，下載依賴（利用快取）
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 複製原始碼，打包
COPY src ./src
RUN mvn package -DskipTests -B

# ============================================
# Stage 2: Production（只需要 JRE）
# ============================================
FROM eclipse-temurin:21-jre-alpine AS production

# 建立非 root 使用者
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# 從 build 階段複製 jar 檔
COPY --from=builder /app/target/*.jar app.jar

# 設定 JVM 參數
ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:InitialRAMPercentage=50.0 \
  -Djava.security.egd=file:/dev/./urandom"

# 切換使用者
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### 3.5 逐段講解

**Build Stage：**

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS builder
```

Maven 的官方映像檔已經包含了 JDK 和 Maven，你不需要自己裝。就像 `node:20-alpine` 自帶 Node.js 和 npm 一樣。

```dockerfile
COPY pom.xml .
RUN mvn dependency:go-offline -B
```

先複製 `pom.xml`，然後跑 `dependency:go-offline` 把所有依賴預先下載下來。這和 Node.js 先複製 `package.json` 再 `npm ci` 是完全一樣的套路——利用 Docker layer cache。

Java 專案的依賴下載比 Node.js 更慢（Maven 中央倉庫的速度嘛……你們懂的），所以這個 cache 的效益更大。如果不做這一步，每次改一行 Java 程式碼都要重新下載幾百 MB 的依賴，你會想砸電腦。

`-B` 是 batch mode，Maven 不會輸出那些花花綠綠的進度條。在 Docker 建構環境裡面用 batch mode 是好習慣，log 會乾淨很多。

```dockerfile
COPY src ./src
RUN mvn package -DskipTests -B
```

複製原始碼，執行打包。`-DskipTests` 是跳過測試。在 Docker 建構的時候通常不跑測試——測試應該在 CI/CD 的前一個步驟已經跑過了。在這裡再跑一次只是浪費時間。

`mvn package` 會在 `target/` 目錄下產生一個 `.jar` 檔案。Spring Boot 的 jar 是「Fat JAR」——裡面包含了所有依賴和一個內嵌的 Tomcat 伺服器。所以你只要有一個 JRE，跑 `java -jar app.jar` 就能把整個 API 跑起來。

**Production Stage：**

```dockerfile
FROM eclipse-temurin:21-jre-alpine
```

注意這裡用的是 **JRE** 不是 JDK。

JDK = Java Development Kit，包含編譯器（javac）、除錯工具（jdb）、打包工具（jar）等等一大堆東西。
JRE = Java Runtime Environment，只有 Java 程式的執行環境。

生產環境只需要「跑」Java 程式，不需要「編譯」。JDK 的映像大概 430MB，JRE-Alpine 大概 100MB。差了四倍多。

`eclipse-temurin` 是目前社群推薦的 OpenJDK 發行版，品質很好、更新及時。

```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
```

因為 eclipse-temurin 的 base image 不像 node:alpine 自帶一個非 root 使用者，所以我們自己建一個。`-S` 是建立 system user/group，不需要密碼。

```dockerfile
COPY --from=builder /app/target/*.jar app.jar
```

從 Build stage 複製 jar 檔案。`*.jar` 是因為 Maven 產生的 jar 檔名可能包含版本號（比如 `demo-1.0.0.jar`），用 wildcard 就不用管具體檔名了。

### 3.6 JVM 在容器中的特殊設定

好，接下來的部分非常重要。如果你是寫 Java 的，或者以後會維護 Java 的 Docker 容器，這段你一定要聽清楚。

```dockerfile
ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:InitialRAMPercentage=50.0 \
  -Djava.security.egd=file:/dev/./urandom"
```

**`-XX:+UseContainerSupport`**

讓我講一個歷史故事。在 Java 8 的早期版本（update 131 之前），JVM 有一個很嚴重的問題——它不認識容器的記憶體限制。

JVM 啟動的時候，會去讀 `/proc/meminfo` 來決定要分配多少堆記憶體。在普通的伺服器上，`/proc/meminfo` 顯示的就是這台機器的實際記憶體。但在容器裡面，`/proc/meminfo` 顯示的是**宿主機**的記憶體！

什麼意思？假設你的宿主機有 32GB 記憶體，你用 `docker run -m 512m` 限制容器只能用 512MB。JVM 一看 `/proc/meminfo`——「哇，32GB！那我預設堆記憶體取 1/4，分個 8GB 吧。」

結果呢？JVM 嘗試分配 8GB 記憶體，但容器只有 512MB。Linux 的 OOM Killer 立刻出手——殺掉！容器啟動就被 kill，日誌裡面可能什麼都沒有，或者只有一個「Killed」。

這個問題坑了無數人。有些人甚至在生產環境跑了幾個月才發現，因為 OOM Killer 殺掉容器後 Docker 會自動重啟，看起來就像是偶爾「閃退」一下。

Java 10 開始加入了「容器感知」功能，`-XX:+UseContainerSupport` 就是啟用它。啟用之後，JVM 會去讀 cgroup 的記憶體限制（`/sys/fs/cgroup/memory/memory.limit_in_bytes`），而不是 `/proc/meminfo`。這樣它就知道自己能用多少記憶體了。

在 Java 11 以後，這個功能是預設開啟的。但我建議還是明確寫出來——第一，讓看 Dockerfile 的人知道你有考慮這個問題；第二，以防萬一。

**`-XX:MaxRAMPercentage=75.0`**

「JVM 最多用容器記憶體限制的 75%。」

為什麼不用 100%？因為 JVM 的記憶體使用不只有堆記憶體（Heap）。還有：

- **Metaspace**：存放類的元資料
- **Code Cache**：JIT 編譯後的原生碼
- **Thread Stack**：每個執行緒的堆疊空間
- **Direct Buffers**：NIO 的直接緩衝區
- **GC Overhead**：垃圾回收器本身需要的空間

這些加起來通常需要 20-30% 的額外空間。所以堆記憶體設 75%，留 25% 給上面這些東西。如果你設 100%，這些 off-heap 記憶體一分配就超出容器限制，又會被 OOM Kill。

有同學可能問：「那為什麼不用 `-Xmx` 指定具體的堆記憶體大小，比如 `-Xmx384m`？」

可以。但 `-Xmx` 是寫死的絕對值。假設你今天容器限制 512MB，你寫 `-Xmx384m`。明天老闆說「加記憶體到 1GB」，你改了 `docker run -m 1g`，但 `-Xmx` 還是 384MB——多出來的記憶體 JVM 根本用不到。你得記得去改 Dockerfile，重新 build。

用 `-XX:MaxRAMPercentage=75.0` 就沒有這個問題——它是按比例的。容器給 512MB，堆記憶體就是 384MB。容器給 1GB，堆記憶體自動變成 768MB。不用改任何程式碼。

**`-Djava.security.egd=file:/dev/./urandom`**

加速隨機數生成。Spring Boot 啟動的時候需要生成 session ID 之類的隨機數，預設用 `/dev/random`。`/dev/random` 會從系統的「熵池」取隨機數，如果熵不夠就會阻塞等待。

在容器環境裡，熵池的補充通常比較慢（因為容器沒有鍵盤、滑鼠等物理設備來產生熵），可能導致 Spring Boot 啟動卡在那裡等好幾秒甚至幾十秒。

改用 `/dev/urandom`（unlimited random）就不會阻塞了。安全性上的差異在絕大多數場景下是可以忽略的。

你們可能注意到路徑寫的是 `/dev/./urandom` 而不是 `/dev/urandom`，中間多了一個 `./`。這是一個歷史原因——Java 早期版本有一個 bug，會把 `/dev/urandom` 自動「修正」回 `/dev/random`，加上 `./` 可以繞過這個 bug。雖然新版本已經修復了，但寫上去也沒有壞處。

### 3.7 其他設計決策

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

注意 `--start-period=30s`，比 Node.js 的 5 秒多了很多。為什麼？因為 Spring Boot 啟動需要時間——JVM 要初始化、Spring Context 要掃描、Bean 要注入、嵌入式 Tomcat 要啟動。通常需要 10-20 秒，比較複雜的專案可能要 30 秒以上。

`start-period` 的意思是：容器啟動後先等 30 秒再開始健康檢查。在這 30 秒內，健康檢查的失敗不會被計入 retries。避免應用還沒啟動完就被標記為 unhealthy。

```dockerfile
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

注意這裡用了 shell form（透過 `sh -c`），而不是 exec form。為什麼？因為我們要讓 shell 展開 `$JAVA_OPTS` 這個環境變數。如果寫成 exec form `["java", "$JAVA_OPTS", "-jar", "app.jar"]`，`$JAVA_OPTS` 不會被展開，會被當成字面值傳給 java 命令。

有人會問：「那 PID 1 不就變成 sh 了嗎？信號處理不會有問題嗎？」好問題。在 Java 的場景裡，JVM 本身其實比 Node.js 更善於處理信號。而且 `sh -c` 在收到 SIGTERM 時會把信號傳遞給它的子程序。如果你仍然擔心，可以也加上 dumb-init 或者使用 `exec java` 的寫法：

```dockerfile
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
```

`exec` 會讓 java 程序取代 sh 成為 PID 1。

### 3.8 建構與驗證

```bash
# 建構
docker build -t my-spring-app:1.0.0 .

# 啟動（限制記憶體為 512MB）
docker run -d --name spring-app \
  -p 8080:8080 \
  -m 512m \
  my-spring-app:1.0.0

# 等待啟動（Spring Boot 需要更多時間）
sleep 15

# 測試
curl http://localhost:8080/
# {"message":"Hello from Spring Boot!","version":"1.0.0"}

curl http://localhost:8080/health
# {"status":"healthy"}
```

驗證 JVM 有正確感知容器記憶體限制：

```bash
docker exec spring-app java -XX:+PrintFlagsFinal -version 2>&1 | grep MaxHeapSize
# MaxHeapSize = 402653184  (約 384MB，是 512MB 的 75%)
```

看到了嗎？512MB 的 75% 大約是 384MB。JVM 正確地根據容器的記憶體限制來設定了堆記憶體。如果沒有 `UseContainerSupport`，這個值可能是宿主機記憶體的 1/4——比如你的電腦有 16GB，那 JVM 可能會想拿 4GB，直接被 OOM Kill。

清理：

```bash
docker rm -f spring-app
```

---

## 四、常見 Dockerfile 問題排查（15 分鐘）

好，兩個實戰做完了。接下來是我要送給你們的禮物——一份 Dockerfile 除錯寶典。

我在業界這些年，自己踩過、幫同事踩過的坑，全都整理在這裡了。以後你遇到問題，先翻這個，大概率能解決。

每個問題我都用「症狀 → 原因 → 解法 → 診斷指令」的格式來講。

### 4.1 問題一：建構速度非常慢

**症狀**：每次改一行程式碼，docker build 要跑好幾分鐘。明明只改了一個小東西，卻感覺在重新 build 整個宇宙。

**可能原因一：Build Context 太大。**

你有沒有注意過 docker build 的第一行輸出？

```
Sending build context to Docker daemon  2.5MB
```

如果這個數字很大，比如 500MB、1GB，那問題就在這裡。通常是因為沒寫 .dockerignore，把 node_modules、.git、target 等等全都送進去了。

診斷方式：

```bash
# 看 build context 大小
docker build -t test . 2>&1 | head -3
# Sending build context to Docker daemon  2.5MB   ← 正常
# Sending build context to Docker daemon  850MB   ← 太大了！
```

解法：寫 .dockerignore。我們前面已經講過了，不再重複。一般來說，build context 應該在幾 MB 以內。如果超過 50MB，你就該檢查是不是漏了什麼沒排除。

**可能原因二：Cache 沒用好。**

最典型的就是 `COPY . .` 放在 `RUN npm install` 前面。

```dockerfile
# 壞的寫法
COPY . .
RUN npm install
RUN npm run build
```

問題在哪？每次你改任何一個原始碼檔案，`COPY . .` 這一層的 cache 就失效了。後面的 `npm install` 也跟著失效，每次都要重新安裝所有依賴。

```dockerfile
# 好的寫法
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

先複製不常變的 package.json，安裝依賴（這一層可以被 cache），再複製會變的原始碼。

診斷方式：

```bash
# 用 --progress=plain 看每一步是 CACHED 還是重新執行
docker build -t test . --progress=plain 2>&1 | grep -E "(CACHED|RUN)"
```

如果你看到 `RUN npm ci` 每次都在重新執行（沒有 CACHED），就是 cache 沒用好。

**可能原因三：每次都重新下載 base image。**

如果你的 CI/CD 環境沒有映像快取，每次建構都要重新 `docker pull node:20-alpine`。解法是在 CI/CD 裡面配置 Docker layer cache。

### 4.2 問題二：映像檔太大

**症狀**：docker images 一看，你的映像檔 800MB、1GB，跟競爭對手的 100MB 比起來肥了好幾倍。Pull 一次要等半天，磁碟空間也吃不消。

**可能原因一：Base image 太肥。**

```bash
# 比較不同 base image 的大小
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"
```

| Base Image | 大小 |
|-----------|------|
| ubuntu:22.04 | ~77MB |
| debian:bookworm-slim | ~74MB |
| node:20 | ~350MB |
| node:20-slim | ~200MB |
| node:20-alpine | ~50MB |
| eclipse-temurin:21-jdk | ~430MB |
| eclipse-temurin:21-jre-alpine | ~100MB |
| python:3.12 | ~350MB |
| python:3.12-slim | ~130MB |
| python:3.12-alpine | ~50MB |

差距很大吧？如果你用了完整版的 `node:20`（基於 Debian），光 base image 就 350MB 了。換成 alpine 只要 50MB，省了 300MB。

解法：優先使用 Alpine 或 slim 版本。Alpine 最小但有些套件兼容性問題（主要是因為它用 musl libc 而不是 glibc），slim 是折衷方案。

**可能原因二：沒用 Multi-stage Build。**

你的 Dockerfile 裡面有 build 工具、編譯器、devDependencies，全部都留在最終映像裡了。

解法：我們已經花了大量時間講 Multi-stage，就是為了解決這個問題。

**可能原因三：快取和暫存檔沒清理。**

```dockerfile
# 壞的寫法（快取留在 layer 裡面）
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# 好的寫法（同一個 RUN 裡面清理）
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
```

記住：不同 RUN 之間的「刪除」不會真正減少映像大小，因為底層的 layer 還在。

診斷方式：

```bash
# 查看每一層的大小
docker history my-image:latest
```

```
IMAGE          CREATED          CREATED BY                                      SIZE
abc123def456   2 minutes ago    CMD ["node" "dist/index.js"]                    0B
def456abc789   2 minutes ago    COPY dir:xxx /app/dist                          50KB
789abc123def   2 minutes ago    RUN npm ci --omit=dev && npm cache clean...     35MB
...
```

哪一層特別大，就去檢查對應的指令。

### 4.3 問題三：容器啟動就退出

**症狀**：docker build 成功了，docker run 也沒報錯，但 docker ps 一看——容器已經退出了。

這個問題是新手最常遇到的，也是最讓人抓狂的。因為建構成功給你一種「應該沒問題」的錯覺，結果容器跑起來就死。

**第一步：看日誌。**

```bash
docker logs my-container
```

90% 的情況，答案就在日誌裡面。

**常見原因一：CMD/ENTRYPOINT 寫錯。**

```dockerfile
# 錯誤：在 Alpine 裡面用 bash（Alpine 沒有 bash）
CMD ["bash", "-c", "node app.js"]
# 報錯：exec: "bash": executable file not found in $PATH

# 正確：用 sh 或直接跑
CMD ["node", "app.js"]
```

Alpine 只有 sh，沒有 bash。這是 Alpine 的「經典坑」之一。

還有一個常見錯誤——Shell form 和 Exec form 的差異：

```dockerfile
# Shell form（會透過 /bin/sh -c 執行）
CMD node app.js

# Exec form（直接執行，推薦）
CMD ["node", "app.js"]
```

Shell form 看起來沒問題，但在某些情況下會有意想不到的行為——比如信號不會正確傳遞給你的程序。生產環境一定要用 Exec form。

**常見原因二：程式找不到。**

```bash
docker logs my-container
# Error: Cannot find module '/app/dist/index.js'
```

檔案沒有正確 COPY 進去，或者 WORKDIR 設錯了。

診斷方式——進去容器裡面看：

```bash
# 覆蓋 CMD 或 ENTRYPOINT，進去 shell
docker run -it --entrypoint sh my-image

# 看一下檔案結構
ls -la /app/
ls -la /app/dist/
```

**常見原因三：缺少環境變數或設定檔。**

你的程式需要連資料庫，但沒有設定資料庫的連線字串。啟動的時候一連，連不上，就掛了。

```bash
docker logs my-container
# Error: connect ECONNREFUSED 127.0.0.1:3306
```

解法：用 `-e` 傳入必要的環境變數：

```bash
docker run -d -e DATABASE_URL=mysql://user:pass@host:3306/db my-app
```

**診斷工具箱：**

```bash
# 看容器的退出碼
docker inspect my-container --format='{{.State.ExitCode}}'

# 看容器的完整狀態
docker inspect my-container --format='{{json .State}}' | python3 -m json.tool

# 用互動模式進去除錯
docker run -it my-image sh

# 如果有 ENTRYPOINT 擋住，覆蓋它
docker run -it --entrypoint sh my-image
```

Day 2 學過的 Exit Code 還記得嗎？137 是被 kill（OOM 也會），143 是正常 stop。排查容器問題時第一件事就是看 exit code。

### 4.4 問題四：COPY 失敗

**症狀**：

```
COPY failed: file not found in build context or excluded by .dockerignore
```

**常見原因一：路徑寫錯。**

COPY 的來源路徑是相對於 **Build Context** 的，不是相對於 Dockerfile 的位置，也不是相對於你執行 docker build 的 shell 路徑。

```bash
# 假設你的專案結構是：
# project/
# ├── docker/
# │   └── Dockerfile
# └── config/
#     └── app.conf

# 你在 project/ 目錄下執行：
docker build -f docker/Dockerfile -t myapp .

# 那 build context 就是 project/
# 在 Dockerfile 裡面：
COPY config/app.conf /app/conf/    # 正確！相對於 build context (project/)
COPY ../config/app.conf /app/conf/ # 錯誤！不能用 .. 跳出 build context
```

**常見原因二：被 .dockerignore 排除了。**

你在 .dockerignore 裡面寫了太寬泛的規則，不小心把需要的檔案排除了。

```
# .dockerignore
*.json    # 這會排除掉 package.json！
```

排查方式——暫時把 .dockerignore 改名，看問題是不是消失：

```bash
mv .dockerignore .dockerignore.bak
docker build -t test .
# 如果成功了，問題就是 .dockerignore 排除了需要的檔案
mv .dockerignore.bak .dockerignore
```

**常見原因三：大小寫問題。**

Linux 的檔案系統是大小寫敏感的。如果你在 Mac 上開發（Mac 預設不分大小寫），`Dockerfile.json` 和 `dockerfile.json` 是同一個檔案。但在 Linux 上建構的時候，它們是不同的檔案。

如果你寫了 `COPY Readme.md /app/`，但檔案實際上叫 `README.md`，在 Mac 上 build 沒問題，推到 CI/CD（Linux）上就會失敗。

### 4.5 問題五：權限問題

**症狀**：

```
Error: EACCES: permission denied, open '/app/data/logs.txt'
```

或者：

```
mkdir: can't create directory '/app/uploads': Permission denied
```

**原因**：你用 `USER` 切換到非 root 使用者後，這個使用者沒有權限存取某些檔案或目錄。

在 Dockerfile 裡面，如果你沒有特別指定，所有用 COPY、RUN 建立的檔案都是 root 擁有的。然後你切換到 node 使用者，node 使用者就讀不了、寫不了那些檔案。

**解法一：COPY 的時候指定擁有者。**

```dockerfile
# 壞的寫法
COPY dist/ /app/dist/
USER node
# node 可能沒有 /app/dist/ 的讀取權限

# 好的寫法
COPY --chown=node:node dist/ /app/dist/
USER node
```

**解法二：在切換 USER 之前設定權限。**

```dockerfile
# 先建立需要的目錄並設定權限
RUN mkdir -p /app/data /app/logs && \
    chown -R node:node /app

# 然後再切換使用者
USER node
```

記住——`chown` 需要 root 權限。所以一定要在 `USER node` 之前執行。

**解法三：如果你需要可寫的 Volume。**

```dockerfile
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
VOLUME /app/uploads
```

先用 root 建好目錄、設好權限，再切換使用者。Volume 掛載進來的時候，目錄的權限會保留。

**診斷方式：**

```bash
# 進去容器看檔案的擁有者
docker exec my-container ls -la /app/

# 看當前是什麼使用者
docker exec my-container whoami

# 看使用者的 UID/GID
docker exec my-container id
```

### 4.6 排查流程總結

我把整個排查流程整理成一個決策樹，以後遇到問題按這個順序來：

```
問題發生
    │
    ├── 建構失敗？
    │   ├── COPY 失敗 → 檢查路徑、.dockerignore、大小寫
    │   ├── RUN 失敗 → 看錯誤訊息，通常是套件安裝或編譯問題
    │   └── 建構很慢 → 檢查 build context 大小、cache 使用情況
    │
    ├── 容器啟動失敗？
    │   ├── docker logs → 看錯誤訊息
    │   ├── 退出碼 137 → OOM Kill，增加記憶體或檢查記憶體洩漏
    │   ├── 退出碼 1 → 應用程式錯誤，進去容器 debug
    │   └── exec format error → CMD/ENTRYPOINT 格式問題
    │
    ├── 容器跑起來但功能異常？
    │   ├── 連不上 → 檢查 port mapping（-p）和 EXPOSE
    │   ├── 權限問題 → 檢查 USER 和檔案擁有者
    │   └── 環境變數缺失 → 用 docker exec env 檢查
    │
    └── 映像檔太大？
        ├── docker history → 看每一層的大小
        ├── 用 Multi-stage 去除建構工具
        └── 換更小的 base image
```

---

## 五、Dockerfile 三堂課總結（10 分鐘）

### 5.1 知識地圖

好，到這裡，Dockerfile 三部曲就全部結束了。讓我們做一個完整的回顧。

**第十小時——基礎指令**：

我們認識了 Dockerfile 的每一個指令。FROM、RUN、COPY、ADD、CMD、ENTRYPOINT、ENV、ARG、EXPOSE、VOLUME、WORKDIR、USER、HEALTHCHECK、LABEL。

那堂課結束後，你會的是：**寫出一個能跑的 Dockerfile。**

**第十一小時——進階技巧**：

我們學了 .dockerignore 控制 build context、Best Practices 讓 Dockerfile 更專業、Multi-stage Build 分離建構和生產環境、還有怎麼把映像檔推到 Docker Hub。

那堂課結束後，你會的是：**寫出一個優化過的 Dockerfile。**

**第十二小時——實戰應用（今天）**：

我們從頭到尾打包了兩個真實的專案——Node.js + TypeScript 和 Spring Boot Java。每一行每一個設計決策都解釋了「為什麼」。然後整理了一份常見問題排查寶典。

今天結束後，你會的是：**在公司裡真正能用 Dockerfile。**

這是一個漸進式的過程：

```
Hour 10：能寫 → Hour 11：寫得好 → Hour 12：實際能用
```

### 5.2 完整流程圖

把整個 Dockerfile 的知識串起來，就是這張圖：

```
┌──────────────────┐     docker build     ┌──────────────────┐
│                  │ ──────────────────►  │                  │
│   原始碼          │                      │   Image          │
│ + Dockerfile     │                      │   (映像檔)        │
│ + .dockerignore  │                      │                  │
│                  │                      │                  │
└──────────────────┘                      └────────┬─────────┘
                                                   │
                                       ┌───────────┴───────────┐
                                       │                       │
                                  docker run              docker push
                                       │                       │
                                       ▼                       ▼
                              ┌──────────────────┐    ┌──────────────────┐
                              │                  │    │                  │
                              │   Container      │    │   Registry       │
                              │   (容器)         │    │   (Docker Hub /  │
                              │                  │    │    Harbor /      │
                              │                  │    │    ECR ...)      │
                              └──────────────────┘    └────────┬─────────┘
                                                               │
                                                          docker pull
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │  任何有 Docker   │
                                                      │  的機器都能跑    │
                                                      └──────────────────┘
```

這就是 Docker 映像檔的完整生命週期：

1. 你寫好原始碼和 Dockerfile
2. `docker build` 把它打包成映像檔
3. `docker push` 推到 Registry
4. 任何人在任何機器上 `docker pull` 拉下來
5. `docker run` 跑起來

不管是在你的筆電上、同事的 Windows 電腦上、公司的 Linux 伺服器上、AWS 的雲端機器上——只要有 Docker，同一個映像檔跑出來的結果就是一樣的。

這就是我們第一天講的「It works on my machine」的終極解決方案。

### 5.3 帶走的核心觀念

三堂課下來，我希望你們帶走這幾個觀念：

**第一，Dockerfile 就是程式碼。**

它應該放在版本控制裡（Git），應該被 code review，應該有人維護和更新。不要把 Dockerfile 當成「寫一次就不管了」的東西。你的應用程式在演進，Dockerfile 也要跟著演進。

**第二，Multi-stage Build 幾乎是必須的。**

除非你的專案真的非常簡單（比如一個純靜態的 HTML 網頁），否則都該用 Multi-stage。它是讓映像檔保持小巧、乾淨的最有效手段。

**第三，安全性不是選配。**

不用 root 執行、使用最小化映像檔、不在映像檔裡放機密資訊——這些不是「進階技巧」，是「基本要求」。在公司裡寫 Dockerfile，如果你的映像檔是用 root 跑的，code review 一定會被打回來。

**第四，建構效率靠 cache。**

好好利用 Docker 的 layer cache 機制——把不常變的東西放前面，常變的放後面。可以把幾分鐘的建構時間壓到幾秒鐘。在你一天 build 幾十次的開發過程中，這就是效率和煩躁的差別。

**第五，出問題先看 logs。**

`docker logs` 和 `docker build --progress=plain` 是你最好的朋友。90% 的問題，答案就在日誌裡面。不要瞎猜，看日誌。

### 5.4 下一步預告

好，Dockerfile 三部曲到此結束。我們現在已經學會了怎麼把單個應用打包成映像檔、推到 Registry、跑成容器。

但在真實的世界裡，一個完整的系統不會只有一個容器。一個 Web 應用通常需要：前端 + 後端 API + 資料庫 + 快取。四個容器。

如果你要一個一個 `docker run` 來啟動、管理、停止、重建，那會非常痛苦。光是記住每個容器的參數就夠你喝一壺的了。

所以從下一堂課開始，我們要學 **Docker Compose**——用一個 YAML 檔案定義所有服務，一個指令啟動整個系統。這是 Docker 在開發和部署中最實用的工具之一。

---

## 六、學生練習題

> **練習題一：Node.js + TypeScript Dockerfile 實作**
>
> 請依照今天課堂上學的內容，自己從頭寫一個 Node.js + TypeScript 專案的 Dockerfile。
>
> 要求：
> 1. 使用 Multi-stage Build（Build stage + Production stage）
> 2. 包含 dumb-init 處理 PID 1 信號問題
> 3. 使用非 root 使用者（USER node）
> 4. 包含 HEALTHCHECK
> 5. 正確的 cache 策略（先複製 package.json，再複製原始碼）
> 6. 搭配一個完整的 .dockerignore
>
> 建構完成後，請驗證：
> - `curl http://localhost:3000/` 回傳正確
> - `curl http://localhost:3000/health` 回傳正確
> - `docker exec <container> whoami` 回傳 `node`
> - `docker exec <container> ps aux` 確認 PID 1 是 dumb-init
> - `docker ps` 顯示 `(healthy)`

---

> **練習題二：診斷以下 Dockerfile 的問題**
>
> 這個 Dockerfile 有至少 8 個問題，請全部找出來並說明解法：
>
> ```dockerfile
> FROM node:20
>
> COPY . /app
> WORKDIR /app
>
> RUN npm install
> RUN npm run build
>
> RUN apt-get update
> RUN apt-get install -y curl vim wget htop net-tools
>
> ENV NODE_ENV=production
>
> EXPOSE 3000
>
> CMD npm start
> ```
>
> 提示：思考建構效率、映像大小、安全性、cache 策略、指令格式等方面。

---

> **練習題三：Spring Boot Dockerfile 實作**
>
> 請寫一個 Spring Boot 專案的 Multi-stage Dockerfile。
>
> 要求：
> 1. Build stage 使用 Maven 映像檔
> 2. Production stage 使用 JRE（不是 JDK）
> 3. 包含適當的 JVM 容器感知參數
> 4. 使用非 root 使用者
> 5. HEALTHCHECK 的 start-period 至少 30 秒
>
> 思考題：如果容器記憶體限制為 1GB，JVM 堆記憶體大約會被設定為多少？為什麼？

---

> **練習題四：容器啟動失敗除錯**
>
> 你的同事跑來跟你說：「我的 Dockerfile build 成功了，但容器跑起來就馬上退出。」
>
> 請列出你的完整除錯步驟（至少 5 步），包含每一步要用的 Docker 指令和要檢查什麼。

---

> **練習題五（綜合挑戰題）：完整的生產級 Dockerfile**
>
> 選擇你最熟悉的程式語言（Node.js / Python / Java / Go 都可以），完成以下任務：
>
> 1. 建立一個簡單的 Hello World API（至少包含 `/` 和 `/health` 兩個端點）
> 2. 寫好 .dockerignore
> 3. 寫一個生產級的 Multi-stage Dockerfile，包含：
>    - 正確的 cache 策略
>    - 最小化 base image
>    - 非 root 使用者
>    - HEALTHCHECK
>    - 適當的 LABEL（maintainer、version、description）
>    - 信號處理（如果是 Node.js 要有 dumb-init）
> 4. 建構映像檔，確認大小在合理範圍
> 5. 啟動容器，驗證：
>    - API 正常運作
>    - 健康檢查通過
>    - 不是 root 在執行
>    - docker stop 能優雅關閉（不用等 10 秒）
> 6. （加分）推送到 Docker Hub

---

## 七、本堂課小結

好，讓我們來做一個快速的總結。

今天我們做了三件事：

**第一，打包了一個生產級的 Node.js + TypeScript 專案。** 學了 dumb-init 處理 PID 1 信號問題、學了 `npm ci --omit=dev` 只安裝生產依賴、學了 `COPY --chown` 設定檔案擁有者、學了 HEALTHCHECK 監控容器健康。每一行 Dockerfile 的「為什麼」你們都知道了。

**第二，打包了一個 Spring Boot Java 專案。** 學了 JVM 在容器裡的特殊問題——UseContainerSupport、MaxRAMPercentage——理解了為什麼不能直接用 -Xmx、為什麼 JRE 比 JDK 好、為什麼 start-period 要設得比較長。

**第三，整理了一份 Dockerfile 常見問題排查寶典。** 建構很慢怎麼查、映像太大怎麼查、容器啟動就退出怎麼查、COPY 失敗怎麼查、權限問題怎麼查。每個問題都有診斷指令，以後遇到問題翻這裡就行。

Dockerfile 三堂課到此圓滿結束。從下一堂課開始，我們學 Docker Compose，把多個容器編排在一起，讓你的整個應用系統一個指令就能跑起來。

---

## 板書 / PPT 建議

1. **Node.js Dockerfile 結構圖**：左邊 Build Stage（node:20-alpine、npm ci、tsc 編譯），右邊 Production Stage（node:20-alpine、dumb-init、npm ci --omit=dev），箭頭表示 COPY --from=builder
2. **PID 1 信號處理流程圖**：docker stop → SIGTERM → dumb-init (PID 1) → 轉發 → Node.js → 優雅關閉。對比：docker stop → SIGTERM → Node.js (PID 1) → 沒反應 → 10 秒 → SIGKILL → 強制殺掉
3. **JVM 容器記憶體示意圖**：容器限制 512MB → Heap 384MB (75%) + Metaspace + Code Cache + Thread Stacks + GC = 128MB (25%)
4. **JVM 記憶體誤判示意圖**：宿主機 32GB → 容器限制 512MB → 沒有 ContainerSupport 時 JVM 以為有 32GB → 嘗試分配 8GB → OOM Kill
5. **常見問題排查決策樹**：從「問題發生」開始，分支到建構失敗 / 啟動失敗 / 功能異常 / 映像太大
6. **Dockerfile 三堂課學習路徑**：Hour 10 能寫 → Hour 11 寫得好 → Hour 12 實際能用
7. **完整工作流程圖**：Dockerfile + 原始碼 → docker build → Image → docker push → Registry → docker pull → docker run → Container
8. **Base Image 大小對照表**：從 ubuntu:22.04 到 alpine，視覺化展示大小差異
