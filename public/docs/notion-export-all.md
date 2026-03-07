# Docker 課程完整講稿

> 適用於 Notion 匯入
> 總共 14 小時課程（Day 2 + Day 3）

---


---

# Day 2 第一小時：環境一致性問題與容器技術

---

## 一、開場（5 分鐘）

各位同學好，歡迎來到第二天的課程。

昨天我們學了 Linux 基礎操作，今天開始進入這門課的核心主題——容器技術。

在正式開始之前，我想先問大家一個問題：

你們有沒有遇過這種情況——你在自己的電腦上寫好一個程式，測試過了，跑起來完全沒問題。結果把程式碼丟到伺服器上，或是給同事跑，就壞掉了？

有遇過的舉個手。

好，我看到不少人舉手。這個問題在業界有一個非常有名的梗，叫做「It works on my machine」——在我的電腦上明明可以跑啊！

這句話已經變成工程師之間的經典笑話了。網路上還有人做了一個惡搞的認證標章，上面就寫著「Certified: Works on My Machine」，意思是「認證：在我的電腦上可以跑」。

這個問題看起來好笑，但實際上造成了非常多的困擾。開發團隊和維運團隊之間的衝突，有很大一部分就是因為這個問題。

今天這堂課，我們就是要來徹底解決這個問題。我們要學習的容器技術，就是目前業界公認最好的解決方案。

---

## 二、環境一致性問題（15 分鐘）

### 2.1 什麼是執行環境

首先，我們要理解一個概念：程式不是獨立存在的。

當你寫好一個程式，這個程式要能夠執行，它需要很多東西的配合。這些東西加在一起，我們稱之為「執行環境」。

執行環境包含哪些東西呢？讓我一個一個說明：

**第一，作業系統。**

你的程式是跑在 Windows 上還是 Linux 上？如果是 Linux，是 Ubuntu 還是 CentOS？版本是多少？Ubuntu 20.04 和 Ubuntu 22.04 雖然都是 Ubuntu，但有些細節是不一樣的。

**第二，程式語言的執行環境。**

如果你寫的是 Python 程式，你的電腦上需要裝 Python。但 Python 有很多版本——3.8、3.9、3.10、3.11、3.12。不同版本之間，有些語法是不相容的。Python 3.10 加入的 match-case 語法，在 Python 3.9 上就沒辦法跑。

如果你寫的是 Java 程式，你需要 JDK。JDK 8 和 JDK 17 的差異更大，有些 API 在新版被移除了，有些新功能在舊版不支援。

**第三，相依套件。**

現代軟體開發不可能從零開始寫所有東西，我們會用很多第三方套件。一個 Python 專案可能用到 Django、requests、numpy、pandas 等等幾十個套件。每個套件都有自己的版本，而且套件之間還有相依關係——A 套件需要 B 套件 2.0 以上，C 套件需要 B 套件 1.5 以下，這就衝突了。

**第四，系統層級的函式庫。**

有些程式需要系統層級的函式庫支援。比如說，Python 的 cryptography 套件需要 OpenSSL；一些圖像處理的套件需要 libpng、libjpeg；機器學習的套件可能需要 CUDA。這些東西的版本也都要對得上。

**第五，設定檔和環境變數。**

你的程式可能會讀取設定檔，這些設定檔放在哪裡？格式是什麼？內容是什麼？還有環境變數，像是 PATH、JAVA_HOME、資料庫連線字串等等。

這五個層面加起來，就是你的程式的「執行環境」。

現在問題來了：你的開發電腦上的執行環境，和伺服器上的執行環境，一樣嗎？

### 2.2 環境差異的真實案例

讓我舉幾個真實的案例，都是我自己或身邊同事遇過的。

**案例一：Python 版本不一致**

有一次，我在 Mac 上用 Python 3.11 開發了一個資料處理的腳本。這個腳本用到了一個很方便的語法，叫做 structural pattern matching，就是 match-case。我在本機測試，跑得很順。

結果部署到公司的 Linux 伺服器上，直接報 SyntaxError。為什麼？因為伺服器上的 Python 是 3.8，而 match-case 是 Python 3.10 才加入的語法。

**案例二：套件版本衝突**

另一個案例，我有個同事開發了一個 Django 網站。他用的是 Django 4.2。專案裡面有一個 requirements.txt，照理說照著裝就沒問題。

結果維運同事在伺服器上執行 pip install -r requirements.txt，裝好之後一跑就報錯。查了半天，發現是因為伺服器之前已經裝過其他專案需要的套件，有版本衝突。雖然 requirements.txt 裡寫了 Django==4.2，但 Django 4.2 需要的某個底層套件被其他專案綁定在舊版本，升不上去。

**案例三：系統函式庫缺失**

還有一個案例更經典。有個專案需要用 Python 的 Pillow 套件來處理圖片。開發者在 Mac 上一切正常。部署到 Linux 伺服器上，Pillow 裝不起來，報錯說找不到 libjpeg。

原來 Mac 上用 Homebrew 裝 Python 的時候，已經自動把這些圖像處理的函式庫裝好了。但 Linux 伺服器是最小化安裝，這些函式庫都沒有。

**案例四：設定檔路徑問題**

還有一種很隱蔽的問題。程式裡面寫死了設定檔的路徑，比如 /Users/john/config/settings.json。在開發者的電腦上當然存在這個檔案，但伺服器上哪來的 /Users/john？

這些案例都指向同一個問題：**開發環境和部署環境不一致**。

### 2.3 這個問題有多嚴重

你可能會想，這個問題很難解決嗎？不就是把環境弄得一樣就好了嗎？

理論上是這樣，但實際操作起來非常困難。

**首先，環境的複雜度超乎想像。**

一個中型的專案，可能有上百個直接和間接的相依套件。每個套件都有版本號，這些版本號之間的組合可能有幾萬種。要精確重現一個環境，你需要記錄所有這些細節。

**其次，環境會隨時間改變。**

今天你部署成功了，一個月後重新部署，可能就失敗了。為什麼？因為某個套件釋出了新版本，新版本有 breaking change。或者作業系統自動更新了，覆蓋了你之前的設定。

**第三，不同專案的需求會衝突。**

一台伺服器上可能跑好幾個專案。A 專案需要 Python 3.8，B 專案需要 Python 3.11。A 專案需要 Django 2.x，B 專案需要 Django 4.x。這些需求互相衝突，你怎麼辦？

**第四，團隊成員的環境各不相同。**

一個團隊五個工程師，可能用三種不同的作業系統——Mac、Windows、Linux。每個人的環境設定都不一樣。新人加入團隊，光是把開發環境設定好，可能就要花一兩天。

這個問題每天都在消耗工程師的時間和精力。據統計，工程師平均每週花 4 到 8 小時在處理環境問題上。這是非常驚人的浪費。

### 2.4 傳統的解決方案

在容器技術出現之前，我們怎麼解決這個問題呢？主要有兩種方法。

**方法一：寫一份超級詳細的安裝文件。**

把安裝步驟一步一步寫下來。先裝這個、再裝那個、這個設定檔要這樣改、那個環境變數要這樣設......

這個方法有幾個問題：

1. **文件會過時。** 軟體版本一直在更新，文件跟不上。三個月前寫的文件，現在照著做可能就不對了。

2. **文件會漏寫。** 寫文件的人覺得理所當然的東西，可能就不會寫出來。「誰不知道要先裝 Python 啊？」但新人可能真的不知道要裝哪個版本。

3. **不同人照著做結果不同。** 即使是同一份文件，不同人執行的時候，因為之前的環境狀態不同，結果可能也不同。

**方法二：使用虛擬機。**

把整個作業系統和應用程式一起打包成一個虛擬機映像檔。要部署的時候，把這個映像檔丟到伺服器上，開一台虛擬機跑起來。

這個方法確實可以解決環境一致性的問題，因為你把整個作業系統都打包了，當然一致。

但虛擬機有自己的問題：

1. **太肥。** 一個虛擬機映像檔動輒就是幾十 GB。你要傳輸、要儲存，都是負擔。

2. **太慢。** 開一台虛擬機要好幾分鐘。如果你需要頻繁地啟動和關閉，這個時間就很可觀。

3. **太吃資源。** 每一台虛擬機裡面都跑一個完整的作業系統，這個作業系統本身就要佔用 CPU 和記憶體。一台實體伺服器可能只能跑幾台虛擬機。

4. **授權費用。** 如果虛擬機裡面跑的是 Windows，每一台都要授權費。

所以虛擬機雖然能解決環境一致性的問題，但它引入了新的問題。我們需要一個更好的解決方案。

---

## 三、容器技術的誕生（20 分鐘）

### 3.1 容器的基本概念

好，現在我們來講容器。

容器是一種輕量級的虛擬化技術。它的核心思想是：**我們不需要模擬整個作業系統，我們只需要把應用程式和它的相依套件打包在一起就好。**

讓我解釋一下這是什麼意思。

當你跑一個應用程式的時候，這個應用程式需要什麼？它需要一些函式庫、一些執行檔、一些設定檔。但它不需要整個作業系統。作業系統裡面有很多東西是應用程式用不到的——什麼桌面環境、什麼印表機驅動、什麼藍牙支援，對一個跑在伺服器上的 Web 應用來說，這些都是多餘的。

容器的做法是：只打包應用程式需要的東西，其他的一律不要。

那作業系統核心呢？容器不打包核心，它共用主機的核心。

這是什麼意思？

作業系統分成兩個部分：核心（Kernel）和使用者空間（User Space）。核心負責管理硬體、分配資源、排程程序等底層工作。使用者空間是應用程式跑的地方。

虛擬機是在虛擬化層面模擬整個硬體，所以每個虛擬機裡面都要跑一個完整的作業系統，包含核心。

容器不模擬硬體，它直接使用主機的核心。每個容器只有自己的使用者空間，裡面包含應用程式和它需要的函式庫。

這樣做的好處是：

1. **輕量。** 一個容器可能只有幾十 MB，而不是幾十 GB。
2. **快速。** 啟動一個容器只要幾秒鐘，而不是幾分鐘。
3. **省資源。** 容器不需要為核心預留資源，所以同一台機器可以跑更多容器。

### 3.2 容器的技術基礎

容器聽起來很神奇，它是怎麼做到的呢？

容器利用了 Linux 核心的兩個重要功能：Namespace 和 Cgroups。

**Namespace（命名空間）**

Namespace 的作用是隔離。它讓每個容器有自己獨立的視野，看不到其他容器和主機上的東西。

Linux 提供了好幾種 Namespace：

- **PID Namespace**：程序 ID 隔離。在容器裡面，程序的 PID 從 1 開始編號，跟主機上的 PID 完全獨立。容器裡面看不到主機上的其他程序。

- **Network Namespace**：網路隔離。每個容器有自己的網路介面、IP 位址、路由表。容器之間的網路是隔離的。

- **Mount Namespace**：檔案系統隔離。每個容器有自己的檔案系統視野。容器裡面看到的根目錄，其實是主機上的某個子目錄。

- **UTS Namespace**：主機名稱隔離。每個容器可以有自己的 hostname。

- **User Namespace**：使用者隔離。容器裡面的 root 使用者，不一定是主機上的 root。

- **IPC Namespace**：行程間通訊隔離。容器之間不能直接透過共享記憶體等方式通訊。

透過這些 Namespace，一個容器看起來就像一個獨立的作業系統——它有自己的程序、自己的網路、自己的檔案系統。但實際上，它只是主機上的一組程序，被 Namespace 隔離起來而已。

**Cgroups（控制群組）**

Cgroups 的作用是限制資源。它讓你可以規定一個容器最多能用多少 CPU、多少記憶體、多少磁碟 I/O。

如果沒有 Cgroups，一個容器可能會把整台機器的資源吃光，影響到其他容器。有了 Cgroups，你可以說：這個容器最多只能用 2 個 CPU 核心、4GB 記憶體。超過這個限制就會被節流或被終止。

這兩個功能——Namespace 做隔離、Cgroups 做限制——加在一起，就是容器的技術基礎。

要注意的是，這兩個功能都是 Linux 核心原生支援的，不需要任何額外的虛擬化層。這就是為什麼容器的效能幾乎跟直接跑在主機上一樣——因為它本來就是跑在主機上，只是被隔離起來而已。

### 3.3 容器 vs 虛擬機：架構比較

讓我們來比較一下容器和虛擬機的架構。

**虛擬機的架構**

最底層是硬體。硬體上面跑一個作業系統，這是主機的作業系統（Host OS）。在 Host OS 上面有一個 Hypervisor，這是虛擬化軟體，像是 VMware、VirtualBox、KVM 這些。

Hypervisor 的工作是模擬硬體。它模擬出來的虛擬硬體上面，各自跑著一個完整的作業系統，叫做客戶作業系統（Guest OS）。每個 Guest OS 裡面，才跑著應用程式。

所以架構是這樣的：

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    App A    │ │    App B    │ │    App C    │
├─────────────┤ ├─────────────┤ ├─────────────┤
│  Libraries  │ │  Libraries  │ │  Libraries  │
├─────────────┤ ├─────────────┤ ├─────────────┤
│  Guest OS   │ │  Guest OS   │ │  Guest OS   │
└─────────────┘ └─────────────┘ └─────────────┘
┌─────────────────────────────────────────────┐
│               Hypervisor                     │
├─────────────────────────────────────────────┤
│                Host OS                       │
├─────────────────────────────────────────────┤
│               Hardware                       │
└─────────────────────────────────────────────┘
```

你看，每一個虛擬機裡面都有一個 Guest OS。這個 Guest OS 可能是 Ubuntu、CentOS、Windows Server。光是這個 Guest OS，可能就要佔掉 1-2GB 的記憶體、幾十 GB 的硬碟空間。

**容器的架構**

容器的架構簡單得多。

最底層一樣是硬體，硬體上面一樣有作業系統。但是沒有 Hypervisor，取而代之的是容器引擎（Container Engine），最常見的就是 Docker。

容器引擎上面直接就是容器，每個容器裡面只有應用程式和它需要的函式庫，沒有 Guest OS。

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    App A    │ │    App B    │ │    App C    │
├─────────────┤ ├─────────────┤ ├─────────────┤
│  Libraries  │ │  Libraries  │ │  Libraries  │
└─────────────┘ └─────────────┘ └─────────────┘
┌─────────────────────────────────────────────┐
│           Container Engine (Docker)          │
├─────────────────────────────────────────────┤
│                Host OS                       │
├─────────────────────────────────────────────┤
│               Hardware                       │
└─────────────────────────────────────────────┘
```

所有容器共用主機的核心。這就是為什麼容器這麼輕量——它沒有多餘的作業系統開銷。

### 3.4 具體數據比較

讓我給你們一些具體的數據：

**啟動時間**

- 虛擬機：分鐘級。開一台虛擬機，要載入整個作業系統，通常需要 1-3 分鐘。
- 容器：秒級。啟動一個容器，通常在 1-2 秒內完成，有時候甚至只要幾百毫秒。

**映像大小**

- 虛擬機映像：GB 級。一個包含作業系統的虛擬機映像，通常是 10-50 GB。
- 容器映像：MB 級。一個典型的應用程式容器映像，可能只有 50-200 MB。當然複雜的應用可能會大一些，但通常不會超過 1-2 GB。

**記憶體佔用**

- 虛擬機：需要為 Guest OS 預留記憶體。一個跑 Ubuntu 的虛擬機，光是作業系統就要 500MB-1GB。
- 容器：只佔用應用程式需要的記憶體。沒有作業系統的開銷。

**效能**

- 虛擬機：有一定的效能損耗，因為要經過虛擬化層。CPU 密集型任務可能會有 5-10% 的損耗。
- 容器：幾乎沒有效能損耗。因為容器裡的程序直接跑在主機核心上，沒有虛擬化層。

**單機可運行數量**

- 虛擬機：一台伺服器通常跑 10-20 個虛擬機就很吃力了。
- 容器：一台伺服器可以跑幾百甚至上千個容器（當然要看應用程式的資源需求）。

**隔離程度**

- 虛擬機：完全隔離。每個虛擬機有自己的核心，安全性很高。
- 容器：程序級隔離。所有容器共用核心，如果核心有漏洞，可能會影響到所有容器。

從這個比較可以看出，容器在資源效率上遠勝虛擬機。虛擬機的優勢是隔離程度更高，適合對安全性要求極高的場景。但對於一般的應用程式部署，容器已經足夠安全，而且效率高得多。

### 3.5 容器不是新技術

我要特別說明一點：容器不是什麼全新的技術。

早在 1979 年，Unix 就有 chroot 這個系統呼叫，可以改變程序的根目錄，這是最早的隔離概念。

2000 年，FreeBSD 推出了 Jails，這是比較完整的容器化技術。

2006 年，Google 開發了 Process Containers（後來改名叫 Cgroups），用來限制和隔離程序的資源使用。

2008 年，LXC（Linux Containers）發布，這是 Linux 上第一個完整的容器實作。

但是這些技術都有一個問題：太難用了。你要自己處理 Namespace、Cgroups、檔案系統，太複雜了。只有對 Linux 核心很熟悉的專家才會用。

直到 2013 年，Docker 出現了。Docker 把容器技術包裝得非常簡單，普通的開發者也能輕鬆使用。這才讓容器技術真正普及開來。

---

## 四、Docker 簡介（15 分鐘）

### 4.1 Docker 是什麼

好，現在我們來正式介紹 Docker。

Docker 是一個開源的容器化平台，在 2013 年由一家叫做 dotCloud 的公司開源釋出。這家公司後來直接改名叫 Docker Inc.，可見 Docker 這個產品有多成功。

Docker 是用 Go 語言開發的，遵循 Apache 2.0 開源協議。

如果要用一句話來描述 Docker，那就是：

**Docker 讓你可以把應用程式和它的執行環境打包成一個標準化的單元，這個單元可以在任何有 Docker 的機器上運行，而且保證行為一致。**

這就解決了我們開頭講的「It works on my machine」問題。現在你不只是把程式碼給別人，你是把整個執行環境一起給別人。

### 4.2 Docker 的核心概念

使用 Docker，你需要認識三個核心概念：Image、Container、Registry。

**Image（映像檔）**

Image 是一個唯讀的模板，包含了運行應用程式所需的一切：程式碼、執行環境、函式庫、環境變數、設定檔。

你可以把 Image 想像成一張光碟。光碟裡的內容是固定的、不可修改的。你可以用這張光碟在很多台電腦上安裝系統，每台電腦安裝出來的初始狀態都一樣。

Image 是分層的，這個我們之後會詳細講。現在你只要知道 Image 是一個靜態的、唯讀的模板。

**Container（容器）**

Container 是 Image 的執行實例。當你「運行」一個 Image，就會產生一個 Container。

繼續用光碟的比喻：如果 Image 是光碟，那 Container 就是用這張光碟安裝好的電腦。電腦開機後，你可以在上面工作、存檔案、裝軟體。這些改動發生在這台電腦上，不會影響到光碟本身。

一個 Image 可以產生很多個 Container，每個 Container 都是獨立的。就像你用同一張光碟可以裝很多台電腦，每台電腦之後的使用是獨立的。

Container 可以被啟動、停止、刪除、暫停。Container 裡面可以執行應用程式、處理請求、存取資料。

**Registry（倉庫）**

Registry 是存放 Image 的地方。

最大的公開 Registry 叫做 Docker Hub，就像 GitHub 是存程式碼的地方，Docker Hub 是存 Image 的地方。

Docker Hub 上有幾十萬個 Image，包括各種官方提供的 Image：Ubuntu、CentOS、Nginx、MySQL、Redis、Python、Node.js、Java......基本上你想得到的軟體都有現成的 Image。

除了 Docker Hub，你也可以架設私有的 Registry，用來存放公司內部的 Image。

### 4.3 Docker 如何解決環境一致性問題

回到我們一開始講的問題——「It works on my machine」。

有了 Docker 之後，工作流程變成這樣：

**第一步：開發者在自己的電腦上建立一個 Image。**

這個 Image 裡面包含了應用程式、所有的相依套件、所有的設定。開發者在本機測試這個 Image，確認一切正常。

**第二步：開發者把 Image 推送到 Registry。**

可以是 Docker Hub，也可以是公司的私有 Registry。

**第三步：維運人員從 Registry 把 Image 拉下來，直接運行。**

不需要安裝任何東西，不需要設定任何環境，直接 docker run 就可以跑。

因為 Image 裡面已經包含了所有需要的東西，所以不管在哪台機器上運行，環境都是一模一樣的。

這就是 Docker 解決環境一致性問題的方式：**不只是分享程式碼，而是連同整個執行環境一起分享。**

開發者說「在我電腦上可以跑」，現在可以直接把那個環境打包給你。你不需要自己去重建那個環境，直接用開發者打包好的環境就行了。

### 4.4 Docker 的架構

Docker 採用的是客戶端-伺服器（Client-Server）架構。

**Docker Client**

Docker Client 是你跟 Docker 互動的介面。當你在終端機輸入 docker run、docker build 這些命令，就是在使用 Docker Client。

Docker Client 本身不做事，它把你的命令送給 Docker Daemon 去執行。

**Docker Daemon（dockerd）**

Docker Daemon 是在背景運行的服務，它才是真正執行工作的。

Docker Daemon 負責：
- 管理 Image：下載、建立、儲存
- 管理 Container：啟動、停止、刪除
- 管理 Network：建立網路、連接容器
- 管理 Volume：管理資料儲存

Docker Client 和 Docker Daemon 之間透過 REST API 溝通。它們可以跑在同一台機器上，也可以跑在不同的機器上。

**Docker Registry**

如前面所說，Registry 是存放 Image 的地方。Docker Daemon 需要 Image 的時候，會從 Registry 下載；你要分享 Image 的時候，會把 Image 上傳到 Registry。

### 4.5 Docker 的生態系統

Docker 不只是一個容器引擎，它已經發展成一個完整的生態系統。

**Docker Desktop**

在 Windows 和 Mac 上，你不能直接跑 Docker（因為 Docker 需要 Linux 核心）。Docker Desktop 是一個桌面應用程式，它內建了一個輕量級的 Linux 虛擬機，讓你可以在 Windows 和 Mac 上使用 Docker。

**Docker Compose**

當你的應用程式由多個容器組成（例如一個 Web 伺服器 + 一個資料庫），你需要一種方式來定義和管理這些容器。Docker Compose 就是做這件事的，它讓你用一個 YAML 檔案定義多容器應用。

**Docker Swarm**

當你需要在多台機器上運行容器，Docker Swarm 提供了基本的容器編排功能。不過現在業界更常用的是 Kubernetes。

**Docker Hub**

最大的公開 Image 倉庫，上面有官方和社群貢獻的各種 Image。

而我們這門課之後會學到 Kubernetes，它是另一個容器編排工具，目前已經成為業界的標準。Docker 負責單機上的容器管理，Kubernetes 負責跨多台機器的容器編排。

---

## 五、Podman 簡介（5 分鐘）

在結束這堂課之前，我要簡單提一下 Podman。

Podman 是 Red Hat 推出的容器引擎，它跟 Docker 的功能幾乎一樣，指令也幾乎一樣。你可以把 docker 命令直接換成 podman，大部分情況下都能用。

Podman 和 Docker 最大的差別是：Podman 沒有 Daemon。

Docker 需要一個持續運行的 Docker Daemon，而 Podman 是 daemonless 的。每次你執行 podman 命令，它直接處理，不需要背景服務。

這有什麼好處呢？

1. **安全性**：Docker Daemon 以 root 權限運行，這是一個潛在的安全風險。Podman 可以完全以普通使用者身份運行，更安全。

2. **資源**：沒有 Daemon 就不需要額外的背景程序佔用資源。

3. **系統整合**：Podman 跟 systemd 整合得更好，可以用 systemd 來管理容器。

在 RHEL、CentOS、Fedora 這些 Red Hat 系的發行版上，Podman 是預設的容器引擎。

不過，Docker 的生態系統還是最完整的，Docker Hub 上的 Image 最多，社群資源最豐富。所以我們這門課主要還是用 Docker，但你要知道 Podman 的存在，以後可能會遇到。

---

## 六、本堂課小結（5 分鐘）

好，讓我們來總結一下今天第一個小時學到的內容。

**環境一致性問題**

- 應用程式依賴執行環境：作業系統、語言版本、套件、設定
- 開發環境和部署環境不一致，導致「在我電腦上可以跑」的困境
- 傳統解決方案：文件（會過時）、虛擬機（太肥）

**容器技術**

- 輕量級虛擬化，只打包應用程式和相依套件，不打包核心
- 利用 Linux 的 Namespace（隔離）和 Cgroups（限制資源）
- 比虛擬機更輕、更快、更省資源

**Docker**

- 最流行的容器化平台，讓容器技術變得簡單好用
- 核心三元素：Image（映像檔）、Container（容器）、Registry（倉庫）
- Client-Server 架構：Docker Client、Docker Daemon、Docker Registry

下一個小時，我們會更深入地了解 Docker 的架構和工作原理。第三個小時，我們就要開始動手安裝 Docker，正式進入實作環節。

有任何問題嗎？

（預留問答時間）

---

## 板書 / PPT 建議

1. 「It works on my machine」梗圖
2. 執行環境五層次圖（OS → 語言 → 套件 → 函式庫 → 設定）
3. 容器 vs 虛擬機架構對比圖
4. 數據比較表（啟動時間、大小、效能、數量）
5. Docker 三元素關係圖（Image → Container, Registry ↔ Image）
6. Docker 架構圖（Client → Daemon → Registry）

---

# Day 2 第二小時：Docker 架構與工作原理

---

## 一、前情提要（3 分鐘）

上一個小時我們講了為什麼需要容器技術，以及 Docker 的基本概念。

我們知道了：
- 容器解決環境一致性問題
- Docker 有三個核心元素：Image、Container、Registry
- 容器比虛擬機輕量、快速

這個小時，我們要深入了解 Docker 的架構。知道它底層怎麼運作，之後使用起來會更有信心，出問題也知道怎麼排查。

---

## 二、Docker 架構總覽（10 分鐘）

### 2.1 Client-Server 架構

Docker 採用 Client-Server 架構，有三個主要元件：

1. **Docker Client**：使用者介面，接收你的命令
2. **Docker Daemon**：背景服務，實際執行工作
3. **Docker Registry**：遠端倉庫，存放 Image

當你在終端機輸入 `docker run nginx`，發生了什麼事？

```
你 → Docker Client → Docker Daemon → (Registry) → Container
```

1. Docker Client 接收你的命令
2. Client 透過 REST API 把命令送給 Daemon
3. Daemon 檢查本機有沒有 nginx Image
4. 如果沒有，Daemon 從 Registry 下載
5. Daemon 用 Image 建立並啟動 Container

### 2.2 為什麼要分開？

你可能會問：為什麼要分成 Client 和 Daemon？直接一個程式不就好了？

分開有幾個好處：

**遠端操作**

Client 和 Daemon 可以在不同機器上。你可以在自己的筆電上操作遠端伺服器上的 Docker。

```bash
# 連接遠端 Docker
docker -H tcp://192.168.1.100:2375 ps
```

**權限分離**

Daemon 需要 root 權限才能操作容器。Client 可以以普通使用者身份運行，透過 socket 跟 Daemon 溝通。

**服務化**

Daemon 以背景服務運行，開機自動啟動。不管你有沒有開終端機，Docker 服務都在。

---

## 三、Docker Client 詳解（8 分鐘）

### 3.1 Docker CLI

Docker Client 最常見的形式就是命令列工具 `docker`。

```bash
docker version    # 查看版本
docker info       # 查看系統資訊
docker ps         # 列出容器
docker images     # 列出映像檔
docker run        # 執行容器
```

這些命令都是 Docker Client 提供的。

### 3.2 與 Daemon 的溝通方式

Docker Client 透過以下方式與 Daemon 溝通：

**Unix Socket（預設，Linux/Mac）**

```
/var/run/docker.sock
```

這是一個本機的 socket 檔案。Client 和 Daemon 在同一台機器上時，透過這個 socket 溝通。

**TCP**

```
tcp://localhost:2375    # 未加密
tcp://localhost:2376    # TLS 加密
```

用於遠端連線。生產環境務必使用 2376 + TLS。

**環境變數設定**

```bash
export DOCKER_HOST=tcp://192.168.1.100:2376
export DOCKER_TLS_VERIFY=1
export DOCKER_CERT_PATH=~/.docker/certs
```

設定後，所有 docker 命令都會送到遠端。

### 3.3 Docker API

Docker Client 底層是透過 REST API 跟 Daemon 溝通。你也可以直接呼叫 API：

```bash
# 透過 socket 呼叫 API
curl --unix-socket /var/run/docker.sock http://localhost/containers/json

# 透過 TCP 呼叫 API
curl http://localhost:2375/containers/json
```

這代表你可以用任何程式語言寫程式來操作 Docker，只要能發 HTTP 請求就行。

Python、Go、Java、Node.js 都有官方或社群維護的 Docker SDK。

---

## 四、Docker Daemon 詳解（15 分鐘）

### 4.1 dockerd

Docker Daemon 的執行檔叫做 `dockerd`。它在背景持續運行，等待 Client 的請求。

在 Linux 上，dockerd 通常由 systemd 管理：

```bash
# 查看 Docker 服務狀態
systemctl status docker

# 啟動 Docker 服務
systemctl start docker

# 停止 Docker 服務
systemctl stop docker

# 設定開機自動啟動
systemctl enable docker
```

### 4.2 Daemon 的職責

Docker Daemon 負責所有實際的工作：

**Image 管理**
- 從 Registry 下載 Image
- 在本機儲存和管理 Image
- 建立新的 Image

**Container 管理**
- 建立、啟動、停止、刪除 Container
- 監控 Container 狀態
- 收集 Container 日誌

**Network 管理**
- 建立和管理 Docker 網路
- 處理容器之間的網路連接
- 處理 Port Mapping

**Volume 管理**
- 建立和管理資料卷
- 處理資料持久化

**安全**
- 驗證 API 請求
- 管理容器的隔離和權限

### 4.3 containerd

Docker Daemon 不是直接管理容器，它把容器相關的工作委託給 containerd。

containerd 是一個獨立的容器執行環境（Container Runtime），負責：
- 容器的生命週期管理
- Image 的傳輸和儲存
- 容器的執行和監督

架構是這樣的：

```
Docker Client
     ↓
Docker Daemon (dockerd)
     ↓
containerd
     ↓
runc（實際執行容器）
```

**為什麼要這樣分層？**

歷史原因。早期 Docker 是一個單體程式，後來為了標準化，把容器執行的部分拆出來變成 containerd，再後來把最底層的執行部分拆出來變成 runc。

runc 是 OCI（Open Container Initiative）標準的參考實作。這個標準定義了容器應該怎麼執行，任何符合 OCI 標準的執行器都可以替換 runc。

**這對你有什麼影響？**

大部分時候沒影響，你只要跟 Docker Daemon 打交道就好。但了解這個架構有助於排查問題，也有助於理解為什麼 Kubernetes 可以不用 Docker。

### 4.4 Daemon 設定

Docker Daemon 的設定檔在：

```
/etc/docker/daemon.json
```

常見的設定：

```json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "registry-mirrors": [
    "https://mirror.example.com"
  ],
  "insecure-registries": [
    "192.168.1.100:5000"
  ],
  "default-address-pools": [
    {"base": "172.17.0.0/16", "size": 24}
  ]
}
```

**storage-driver**：儲存驅動，overlay2 是目前最推薦的。

**log-driver**：日誌驅動，控制容器日誌怎麼儲存。

**log-opts**：日誌選項，設定日誌檔案大小上限，避免日誌把硬碟塞爆。

**registry-mirrors**：Registry 映射站，加速 Image 下載。

**insecure-registries**：允許使用 HTTP（而非 HTTPS）連接的 Registry，用於測試環境。

修改設定後要重啟 Docker：

```bash
systemctl restart docker
```

---

## 五、Docker Registry 詳解（10 分鐘）

### 5.1 什麼是 Registry

Registry 是存放 Image 的倉庫。

你可以把 Registry 想像成 GitHub：
- GitHub 存放程式碼
- Registry 存放 Docker Image

就像 GitHub 有公開和私有 repo，Registry 也有公開和私有的 Image。

### 5.2 Docker Hub

Docker Hub 是最大的公開 Registry，網址是 hub.docker.com。

**官方映像（Official Images）**

Docker Hub 上有很多官方維護的 Image，這些 Image 經過官方審核，品質有保證：

- `nginx`：Nginx 官方映像
- `mysql`：MySQL 官方映像
- `redis`：Redis 官方映像
- `python`：Python 官方映像
- `node`：Node.js 官方映像
- `ubuntu`：Ubuntu 官方映像

官方映像的名稱沒有斜線，直接就是 `nginx`、`mysql`。

**社群映像**

其他使用者上傳的 Image，名稱格式是 `使用者名稱/映像名稱`：

- `bitnami/nginx`
- `linuxserver/nginx`

使用社群映像要注意來源可靠性。

**私有映像**

Docker Hub 也可以存放私有 Image，但免費帳號只能有一個私有 repo。

### 5.3 Image 的命名規則

完整的 Image 名稱格式：

```
[registry-host/][namespace/]repository[:tag]
```

**範例：**

```bash
nginx                              # 官方映像，預設 tag 是 latest
nginx:1.25                         # 指定版本
nginx:1.25-alpine                  # Alpine 版本（更小）

mysql:8.0                          # MySQL 8.0
python:3.11-slim                   # Python 3.11 精簡版

bitnami/nginx                      # 社群映像
bitnami/nginx:1.25                 # 社群映像指定版本

gcr.io/google-containers/nginx     # Google Container Registry 的映像
192.168.1.100:5000/myapp           # 私有 Registry 的映像
```

**Tag 的重要性**

`latest` 是預設的 tag，但它不代表最新版本——它只是一個名字叫 latest 的 tag。

**永遠不要在生產環境使用 latest tag。** 因為你不知道它實際指向哪個版本，而且可能會變。

應該使用具體的版本號：

```bash
# 不好
docker pull nginx:latest

# 好
docker pull nginx:1.25.3
```

### 5.4 私有 Registry

企業通常會架設私有 Registry，原因：

1. **安全性**：不想把公司的 Image 放在公開平台
2. **速度**：內網下載比較快
3. **合規**：某些產業法規要求資料不能離開公司

常見的私有 Registry 方案：

**Docker Registry**

Docker 官方提供的開源 Registry，最簡單：

```bash
docker run -d -p 5000:5000 --name registry registry:2
```

**Harbor**

VMware 開源的企業級 Registry，功能豐富：
- 漏洞掃描
- 存取控制
- 映像簽名
- 多租戶

**其他雲端服務**

- AWS ECR（Elastic Container Registry）
- GCP GCR（Google Container Registry）
- Azure ACR（Azure Container Registry）
- 阿里雲 ACR

### 5.5 Image 的拉取和推送

**拉取 Image**

```bash
# 從 Docker Hub 拉取
docker pull nginx:1.25

# 從私有 Registry 拉取
docker pull 192.168.1.100:5000/myapp:v1
```

**登入 Registry**

```bash
# 登入 Docker Hub
docker login

# 登入私有 Registry
docker login 192.168.1.100:5000
```

**推送 Image**

```bash
# 先用 docker tag 設定目標名稱
docker tag myapp:v1 192.168.1.100:5000/myapp:v1

# 推送
docker push 192.168.1.100:5000/myapp:v1
```

---

## 六、Image 的分層結構（12 分鐘）

### 6.1 Layer 的概念

Docker Image 不是一個單一的檔案，它是由多個層（Layer）疊加而成的。

每一層代表一組檔案系統的變更：
- 第一層可能是 Ubuntu 基礎系統
- 第二層可能是安裝 Python
- 第三層可能是安裝你的套件
- 第四層可能是複製你的程式碼

```
┌─────────────────────────┐
│   你的應用程式程式碼      │  Layer 4
├─────────────────────────┤
│   pip install 套件       │  Layer 3
├─────────────────────────┤
│   安裝 Python            │  Layer 2
├─────────────────────────┤
│   Ubuntu 基礎系統        │  Layer 1
└─────────────────────────┘
```

### 6.2 為什麼要分層？

**節省空間**

假設你有 10 個應用程式，都是用 Python 3.11 + Ubuntu 為基礎。

如果不分層，每個 Image 都要包含完整的 Ubuntu + Python，10 個 Image 就要 10 份重複的資料。

有了分層，Ubuntu 和 Python 的 Layer 只需要存一份，10 個 Image 共用這些 Layer，只有應用程式自己的部分是獨立的。

**加速下載**

當你拉取一個 Image，Docker 會檢查本機已經有哪些 Layer。已經有的就不用再下載了。

```bash
$ docker pull python:3.11

3.11: Pulling from library/python
a2abf6c4d29d: Already exists      # 本機已有
a9edb18cadd1: Already exists      # 本機已有
589b7251471a: Already exists      # 本機已有
186b1aaa4aa6: Pull complete       # 需要下載
7c55dd8f39fa: Pull complete       # 需要下載
```

**加速建構**

當你建構 Image 時，如果某一層沒有變化，Docker 會使用快取，不需要重新建構。

這就是為什麼 Dockerfile 的順序很重要——把不常變動的放前面，常變動的放後面。我們之後講 Dockerfile 時會詳細說明。

### 6.3 查看 Image 的 Layer

```bash
# 查看 Image 的層次
docker history nginx:1.25
```

輸出類似：

```
IMAGE          CREATED       CREATED BY                                      SIZE
a6bd71f48f68   2 weeks ago   /bin/sh -c #(nop)  CMD ["nginx" "-g" "daemon…   0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  STOPSIGNAL SIGQUIT           0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  EXPOSE 80                    0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  ENTRYPOINT ["/docker-entr…   0B
<missing>      2 weeks ago   /bin/sh -c set -x     && groupadd --system -…   112MB
<missing>      2 weeks ago   /bin/sh -c #(nop)  ENV PKG_RELEASE=1~bookworm   0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  ENV NJS_VERSION=0.8.2        0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  ENV NGINX_VERSION=1.25.3     0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  LABEL maintainer=NGINX Do…   0B
<missing>      2 weeks ago   /bin/sh -c #(nop)  CMD ["bash"]                 0B
<missing>      2 weeks ago   /bin/sh -c #(nop) ADD file:…                    74.8MB
```

每一行就是一個 Layer。`CREATED BY` 告訴你這一層是怎麼來的。

### 6.4 唯讀層與可寫層

Image 的所有 Layer 都是唯讀的。

當你用 Image 啟動一個 Container 時，Docker 會在最上面加一個可寫層（Writable Layer），也叫做 Container Layer。

```
┌─────────────────────────┐
│   Container Layer       │  可寫（Container 專屬）
├─────────────────────────┤
│   Layer 4               │  唯讀
├─────────────────────────┤
│   Layer 3               │  唯讀
├─────────────────────────┤
│   Layer 2               │  唯讀
├─────────────────────────┤
│   Layer 1               │  唯讀
└─────────────────────────┘
```

Container 裡的所有檔案操作——建立檔案、修改檔案、刪除檔案——都發生在這個可寫層。Image 本身不會被改變。

這就是為什麼同一個 Image 可以啟動多個 Container，而且互不影響——每個 Container 都有自己獨立的可寫層。

### 6.5 Copy-on-Write

如果 Container 想修改一個來自 Image Layer 的檔案，怎麼辦？

Docker 使用 Copy-on-Write（寫時複製）策略：

1. Container 想修改 /etc/nginx/nginx.conf
2. 這個檔案原本在 Layer 3（唯讀）
3. Docker 把這個檔案複製到 Container Layer
4. 修改發生在 Container Layer 的副本上
5. 原本的 Layer 3 不受影響

這個機制讓 Image 可以被多個 Container 共用，同時每個 Container 又可以有自己的修改。

---

## 七、Storage Driver（8 分鐘）

### 7.1 什麼是 Storage Driver

Storage Driver 決定了 Docker 怎麼在硬碟上儲存 Image 和 Container 的資料。

不同的 Storage Driver 有不同的特性和效能。

### 7.2 常見的 Storage Driver

**overlay2**（推薦）

目前最推薦的選擇。
- Linux 核心 4.0+ 原生支援
- 效能好、穩定
- 同時支援 ext4 和 xfs 檔案系統

**devicemapper**

Red Hat 系（RHEL、CentOS 7）早期的預設選擇。
- 現在已不推薦，應該用 overlay2

**btrfs / zfs**

這兩個需要特定的檔案系統支援。
- 功能強大，支援快照
- 但設定複雜，不常用

**vfs**

最簡單的實作，不支援 Copy-on-Write。
- 每個 Layer 都完整複製
- 效能差、浪費空間
- 只用於測試或相容性問題排查

### 7.3 查看和設定 Storage Driver

```bash
# 查看目前使用的 Storage Driver
docker info | grep "Storage Driver"
```

設定 Storage Driver（在 /etc/docker/daemon.json）：

```json
{
  "storage-driver": "overlay2"
}
```

**注意**：改變 Storage Driver 會讓既有的 Image 和 Container 無法使用（因為儲存格式不同）。通常只在初次安裝時設定，不要在有資料的系統上隨便改。

---

## 八、本堂課小結（4 分鐘）

這個小時我們深入了解了 Docker 的架構：

**Client-Server 架構**
- Docker Client：使用者介面，接收命令
- Docker Daemon：背景服務，實際執行工作
- 透過 Unix Socket 或 TCP 溝通

**Docker Daemon**
- 管理 Image、Container、Network、Volume
- 委託 containerd 執行容器
- 設定檔在 /etc/docker/daemon.json

**Docker Registry**
- 存放 Image 的倉庫
- Docker Hub 是最大的公開 Registry
- 企業通常架設私有 Registry

**Image 分層結構**
- Image 由多個唯讀 Layer 組成
- Container 有一個額外的可寫層
- Layer 共用節省空間、加速下載
- Copy-on-Write 機制

下一個小時，我們要開始動手安裝 Docker。

有問題嗎？

---

## 板書 / PPT 建議

1. Docker 架構圖（Client → Daemon → Registry）
2. Docker Daemon 元件圖（dockerd → containerd → runc）
3. Image 完整命名格式
4. Layer 分層示意圖
5. Container Layer（可寫）vs Image Layer（唯讀）
6. Copy-on-Write 流程圖

---

# Day 2 第三小時：Docker 安裝與環境設置

---

## 一、前情提要（2 分鐘）

前兩個小時我們講了容器的概念和 Docker 的架構。

現在開始動手——安裝 Docker。

這堂課會涵蓋：
- Linux（CentOS/Ubuntu）安裝 Docker
- Windows/Mac 的 Docker Desktop
- 驗證安裝
- Docker Hub 註冊與登入

---

## 二、安裝前準備（8 分鐘）

### 2.1 系統需求

**Linux**
- 64 位元系統
- 核心版本 3.10+（建議 4.0+）
- 支援的發行版：Ubuntu 20.04+、CentOS 7+、Debian 10+、Fedora

**Windows**
- Windows 10/11 64 位元專業版或企業版
- 啟用 Hyper-V 或 WSL 2
- 至少 4GB RAM

**Mac**
- macOS 12+（Intel 或 Apple Silicon）
- 至少 4GB RAM

### 2.2 為什麼需要這些系統需求

**為什麼要 64 位元？**

Docker 的映像檔絕大多數是 64 位元。32 位元系統無法執行 64 位元的容器。現在的伺服器和開發機幾乎都是 64 位元了。

**為什麼 Linux 核心要 3.10+？**

Docker 依賴 Linux 核心的兩個關鍵功能：

| 功能 | 核心版本 | 用途 |
|------|----------|------|
| Namespace | 2.6.24+ | 隔離程序的視野（PID、網路、檔案系統） |
| Cgroups | 2.6.24+ | 限制資源（CPU、記憶體） |
| OverlayFS | 3.18+ | 分層檔案系統，高效能 |

核心 3.10 是最低要求，但 4.0+ 的 OverlayFS 效能更好，穩定性更高。

**為什麼 Windows 需要專業版/企業版？**

Windows 家用版沒有 Hyper-V 功能。Docker Desktop 需要 Hyper-V 或 WSL 2 來運行 Linux 虛擬機。

```
Docker on Windows 的架構：

┌─────────────────────────────┐
│     Docker CLI（Windows）    │
├─────────────────────────────┤
│     WSL 2 / Hyper-V         │
│  ┌───────────────────────┐  │
│  │   Linux 虛擬機        │  │
│  │  ┌─────────────────┐  │  │
│  │  │ Docker Daemon   │  │  │
│  │  │ 容器、映像檔    │  │  │
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│     Windows 核心            │
└─────────────────────────────┘
```

Docker 實際上跑在 Linux 虛擬機裡，所以需要虛擬化技術。

**為什麼至少 4GB RAM？**

- Docker Desktop 本身需要約 1-2GB
- Linux 虛擬機需要記憶體
- 每個容器也會消耗記憶體
- 還要留給你的開發工具和瀏覽器

實際開發建議 8GB 以上，跑多個容器建議 16GB。

**Mac 為什麼也需要虛擬機？**

macOS 不是 Linux，Docker 同樣需要一個 Linux 環境。Docker Desktop 用輕量級虛擬化（HyperKit 或 Apple Virtualization Framework）來運行 Linux。

```
Docker on Mac 的架構：

┌─────────────────────────────┐
│     Docker CLI（macOS）      │
├─────────────────────────────┤
│  Virtualization Framework   │
│  ┌───────────────────────┐  │
│  │   Linux VM            │  │
│  │   Docker Daemon       │  │
│  │   容器、映像檔        │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│     macOS 核心              │
└─────────────────────────────┘
```

### 2.3 檢查系統資訊

```bash
# 檢查核心版本
uname -r

# 檢查發行版
cat /etc/os-release

# 檢查 CPU 架構
uname -m
```

---

## 三、Linux 安裝 Docker（20 分鐘）

### 3.1 移除舊版本

如果之前裝過舊版 Docker，先移除：

**CentOS/RHEL**
```bash
sudo yum remove docker \
                docker-client \
                docker-client-latest \
                docker-common \
                docker-latest \
                docker-latest-logrotate \
                docker-logrotate \
                docker-engine
```

**Ubuntu/Debian**
```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

### 3.2 安裝方式選擇

有三種安裝方式：
1. **官方 Repository**（推薦）：最新版本，自動更新
2. **下載 DEB/RPM 套件**：離線環境使用
3. **官方安裝腳本**：最快，但不適合生產環境

我們用官方 Repository 方式。

### 3.3 CentOS 安裝步驟

**Step 1：安裝必要工具**
```bash
sudo yum install -y yum-utils
```

**Step 2：新增 Docker Repository**
```bash
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

**Step 3：安裝 Docker Engine**
```bash
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**Step 4：啟動 Docker**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

**Step 5：驗證安裝**
```bash
sudo docker run hello-world
```

### 3.4 Ubuntu 安裝步驟

**Step 1：更新套件索引，安裝必要工具**
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
```

**Step 2：新增 Docker 官方 GPG 金鑰**
```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

**Step 3：新增 Repository**
```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

**Step 4：安裝 Docker Engine**
```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**Step 5：驗證安裝**
```bash
sudo docker run hello-world
```

### 3.5 讓非 root 使用者執行 Docker

預設只有 root 可以執行 docker 命令。要讓一般使用者也能用：

```bash
# 建立 docker 群組（通常安裝時已建立）
sudo groupadd docker

# 把使用者加入 docker 群組
sudo usermod -aG docker $USER

# 重新登入讓群組生效
# 或執行
newgrp docker

# 測試
docker run hello-world
```

**安全提醒**：docker 群組的成員等同於有 root 權限，因為他們可以啟動任何容器。只把信任的使用者加入這個群組。

---

## 四、Windows/Mac 安裝 Docker Desktop（10 分鐘）

### 4.1 為什麼需要 Docker Desktop

Docker 依賴 Linux 核心功能（Namespace、Cgroups）。Windows 和 Mac 沒有 Linux 核心，所以需要 Docker Desktop。

Docker Desktop 內含一個輕量級 Linux 虛擬機，Docker 實際上跑在這個虛擬機裡。

### 4.2 Windows 安裝

**Step 1：啟用 WSL 2**

以系統管理員身份開啟 PowerShell：
```powershell
wsl --install
```

重開機後繼續。

**Step 2：下載並安裝 Docker Desktop**

從 docker.com/products/docker-desktop 下載安裝檔，執行安裝。

**Step 3：設定**

安裝完成後啟動 Docker Desktop，確認設定中使用 WSL 2 backend。

**Step 4：驗證**

開啟 PowerShell 或 CMD：
```bash
docker --version
docker run hello-world
```

### 4.3 Mac 安裝

**Step 1：下載 Docker Desktop**

從 docker.com/products/docker-desktop 下載。
- Intel Mac：下載 Intel 版本
- Apple Silicon（M1/M2/M3）：下載 Apple Silicon 版本

**Step 2：安裝**

打開 .dmg 檔案，把 Docker 拖到 Applications。

**Step 3：啟動並驗證**

打開 Docker Desktop，等待啟動完成（選單列出現 Docker 圖示）。

開啟 Terminal：
```bash
docker --version
docker run hello-world
```

### 4.4 Docker Desktop 的資源設定

Docker Desktop → Settings → Resources

可以設定：
- **CPUs**：分配給 Docker 的 CPU 核心數
- **Memory**：分配給 Docker 的記憶體
- **Disk image size**：Docker 資料的硬碟空間上限

如果你的電腦記憶體有限，可以調低這些設定。

---

## 五、驗證安裝（8 分鐘）

### 5.1 基本驗證命令

```bash
# 查看 Docker 版本
docker --version
# 或更詳細的版本資訊
docker version

# 查看 Docker 系統資訊
docker info
```

`docker version` 會顯示 Client 和 Server（Daemon）的版本。如果 Server 那邊出錯，表示 Daemon 沒有正確運行。

### 5.2 執行 hello-world

```bash
docker run hello-world
```

這個命令會：
1. 在本機找 hello-world Image
2. 本機沒有，從 Docker Hub 下載
3. 用這個 Image 建立 Container
4. Container 執行完畢，印出訊息

如果看到歡迎訊息，Docker 安裝成功。

### 5.3 執行互動式容器

```bash
docker run -it ubuntu bash
```

這會：
1. 下載 ubuntu Image
2. 啟動一個 Container
3. 在 Container 裡面開一個 bash shell
4. 你現在「在容器裡面」了

試試看：
```bash
cat /etc/os-release   # 確認是 Ubuntu
ls /                  # 看看檔案系統
exit                  # 離開容器
```

### 5.4 常見安裝問題

**問題：Cannot connect to Docker daemon**

```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

解法：
```bash
# 確認 Docker 服務有在跑
sudo systemctl status docker

# 如果沒有，啟動它
sudo systemctl start docker
```

**問題：Permission denied**

```
Got permission denied while trying to connect to the Docker daemon socket
```

解法：
```bash
# 把使用者加入 docker 群組
sudo usermod -aG docker $USER

# 重新登入
```

**問題：Windows 上 WSL 2 相關錯誤**

確認 WSL 2 正確安裝：
```powershell
wsl --status
wsl --update
```

---

## 六、Docker Hub 註冊與登入（8 分鐘）

### 6.1 為什麼需要 Docker Hub 帳號

- 下載某些 Image 有頻率限制，登入後限制較寬鬆
- 可以推送自己的 Image
- 可以建立私有 Repository

### 6.2 註冊帳號

1. 前往 hub.docker.com
2. 點選 Sign Up
3. 填寫 Username、Email、Password
4. 完成驗證

### 6.3 命令列登入

```bash
docker login
```

輸入 Username 和 Password。

登入成功後，認證資訊存在 ~/.docker/config.json。

### 6.4 登出

```bash
docker logout
```

### 6.5 Access Token（建議）

不建議直接用密碼登入，應該使用 Access Token：

1. 登入 Docker Hub 網頁
2. 進入 Account Settings → Security → Access Tokens
3. 建立新 Token，設定權限
4. 用 Token 代替密碼登入

```bash
docker login -u your-username
# 密碼處貼上 Token
```

---

## 七、設定映像加速（5 分鐘）

### 7.1 為什麼需要加速

Docker Hub 伺服器在國外，下載 Image 可能很慢。

可以設定映像站（Mirror）加速。

### 7.2 常用映像站

- 阿里雲：需要註冊取得專屬加速地址
- 中國科技大學：https://docker.mirrors.ustc.edu.cn
- 網易：https://hub-mirror.c.163.com

### 7.3 設定方式

編輯 /etc/docker/daemon.json：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

重啟 Docker：

```bash
sudo systemctl restart docker
```

驗證：

```bash
docker info | grep -A 5 "Registry Mirrors"
```

---

## 八、本堂課小結（2 分鐘）

這個小時我們完成了 Docker 的安裝：

**Linux 安裝**
- 使用官方 Repository
- CentOS 用 yum，Ubuntu 用 apt
- 啟動 Docker 服務
- 設定非 root 使用者權限

**Windows/Mac**
- 使用 Docker Desktop
- 內含 Linux 虛擬機

**驗證**
- docker version / docker info
- docker run hello-world

**Docker Hub**
- 註冊帳號
- 命令列登入
- 建議使用 Access Token

下一個小時，我們開始學習 Docker 的基本指令。

---

## 板書 / PPT 建議

1. 系統需求表
2. Linux 安裝流程圖
3. docker run hello-world 流程圖
4. 常見錯誤與解法表

---

# Day 2 第四小時：Docker 基本指令（上）

---

## 一、前情提要（2 分鐘）

Docker 裝好了，現在開始學指令。

這堂課學「取得和執行」：
- docker pull：拉取映像檔
- docker images：列出映像檔
- docker run：執行容器
- docker ps：查看容器

下一堂課學「管理和清理」。

---

## 二、docker pull - 拉取映像檔（10 分鐘）

### 2.1 基本用法

```bash
docker pull nginx
```

從 Docker Hub 下載 nginx 映像檔。

### 2.2 指定版本

```bash
docker pull nginx:1.25
docker pull nginx:1.25.3
docker pull nginx:alpine
docker pull nginx:1.25-alpine
```

**常見 Tag 含義**

| Tag | 含義 |
|-----|-----|
| latest | 預設標籤（不一定是最新） |
| 1.25 | 主版本號 |
| 1.25.3 | 精確版本號 |
| alpine | 基於 Alpine Linux（超小） |
| slim | 精簡版 |
| bullseye/bookworm | Debian 版本代號 |

### 2.3 從其他 Registry 拉取

```bash
# Google Container Registry
docker pull gcr.io/google-containers/nginx

# 私有 Registry
docker pull 192.168.1.100:5000/myapp:v1
```

### 2.4 拉取過程解析

```bash
$ docker pull nginx:1.25

1.25: Pulling from library/nginx
a2abf6c4d29d: Pull complete      # Layer 1
a9edb18cadd1: Pull complete      # Layer 2
589b7251471a: Pull complete      # Layer 3
186b1aaa4aa6: Pull complete      # Layer 4
Digest: sha256:abc123...          # 映像檔的唯一識別碼
Status: Downloaded newer image for nginx:1.25
docker.io/library/nginx:1.25
```

每一行是一個 Layer。如果 Layer 已經存在本機，會顯示 `Already exists`。

### 2.5 查看可用版本

Docker Hub 網站搜尋映像檔名稱，可以看到所有可用的 Tag。

或用命令查詢（需安裝額外工具）：

```bash
# 使用 skopeo
skopeo list-tags docker://nginx
```

---

## 三、docker images - 列出映像檔（8 分鐘）

### 3.1 基本用法

```bash
docker images
```

輸出：

```
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
nginx        1.25      a6bd71f48f68   2 weeks ago   187MB
ubuntu       22.04     ca2b0f26964c   3 weeks ago   77.9MB
python       3.11      22140cbb3b0c   1 month ago   1.01GB
```

**欄位說明**

| 欄位 | 說明 |
|-----|-----|
| REPOSITORY | 映像檔名稱 |
| TAG | 版本標籤 |
| IMAGE ID | 唯一識別碼（前 12 碼） |
| CREATED | 建立時間（映像檔本身，不是下載時間） |
| SIZE | 大小 |

### 3.2 篩選映像檔

```bash
# 只看特定映像檔
docker images nginx

# 只看特定標籤
docker images nginx:1.25
```

### 3.3 格式化輸出

```bash
# 只顯示 IMAGE ID
docker images -q

# 自訂格式
docker images --format "{{.Repository}}:{{.Tag}} - {{.Size}}"

# 輸出成 JSON
docker images --format json
```

`-q` 很常用，配合其他命令批次操作。

### 3.4 查看所有映像檔（包含中間層）

```bash
docker images -a
```

會顯示建構過程中產生的中間映像檔，通常不需要。

### 3.5 Dangling Images

沒有 Tag 的映像檔，顯示為 `<none>`：

```
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
<none>       <none>    d1234567890a   1 hour ago    150MB
```

這些通常是舊版映像檔被新版覆蓋後留下的。

查看 dangling images：

```bash
docker images -f dangling=true
```

清理：

```bash
docker image prune
```

---

## 四、docker run - 執行容器（25 分鐘）

這是最重要的指令。

### 4.1 基本用法

```bash
docker run nginx
```

用 nginx 映像檔建立並啟動一個容器。

如果本機沒有這個映像檔，會自動 pull。

### 4.2 前景執行 vs 背景執行

**前景執行（預設）**

```bash
docker run nginx
```

容器的輸出直接顯示在終端機。按 Ctrl+C 會停止容器。

終端機被佔住，不能做其他事。

**背景執行（-d）**

```bash
docker run -d nginx
```

容器在背景執行，終端機立刻回來。

輸出容器 ID。

### 4.3 互動模式（-it）

```bash
docker run -it ubuntu bash
```

- `-i`：保持 STDIN 開啟（可以輸入）
- `-t`：分配偽終端（有正常的終端介面）

通常 `-it` 一起用，進入容器的 shell。

```bash
root@abc123:/# ls
root@abc123:/# exit
```

### 4.4 指定容器名稱（--name）

```bash
docker run -d --name my-nginx nginx
```

不指定的話，Docker 會自動產生隨機名稱（like `admiring_newton`）。

名稱必須唯一，重複會報錯。

### 4.5 自動刪除（--rm）

```bash
docker run --rm nginx
```

容器停止後自動刪除。

適合一次性任務、測試用。

### 4.6 環境變數（-e）

```bash
docker run -e MYSQL_ROOT_PASSWORD=secret mysql
```

設定容器內的環境變數。

可以多次使用：

```bash
docker run -e VAR1=value1 -e VAR2=value2 myapp
```

或用檔案：

```bash
docker run --env-file ./env.list myapp
```

### 4.7 Port Mapping（-p）

```bash
docker run -d -p 8080:80 nginx
```

把主機的 8080 port 對應到容器的 80 port。

格式：`主機Port:容器Port`

現在訪問 http://localhost:8080 就能看到 Nginx。

多個 port：

```bash
docker run -d -p 8080:80 -p 8443:443 nginx
```

### 4.8 Volume 掛載（-v）

```bash
docker run -d -v /host/path:/container/path nginx
```

把主機的目錄掛載到容器內。

詳細留到 Day 3 講。

### 4.9 組合範例

```bash
docker run -d \
  --name web \
  -p 8080:80 \
  -e NGINX_HOST=example.com \
  -v /data/html:/usr/share/nginx/html \
  --restart unless-stopped \
  nginx:1.25
```

這個命令：
- 背景執行 nginx:1.25
- 容器名稱叫 web
- 主機 8080 對應容器 80
- 設定環境變數
- 掛載目錄
- 除非手動停止，否則自動重啟

### 4.10 docker run 完整流程

當你執行 `docker run nginx`：

1. Docker Client 送請求給 Daemon
2. Daemon 檢查本機有無 nginx Image
3. 沒有的話，從 Registry 下載
4. 用 Image 建立 Container
5. 分配網路、準備檔案系統
6. 啟動 Container 內的程序
7. 連接終端（如果是前景執行）

---

## 五、docker ps - 查看容器（10 分鐘）

### 5.1 查看執行中的容器

```bash
docker ps
```

輸出：

```
CONTAINER ID   IMAGE   COMMAND                  CREATED         STATUS         PORTS                  NAMES
abc123def456   nginx   "/docker-entrypoint.…"   5 minutes ago   Up 5 minutes   0.0.0.0:8080->80/tcp   my-nginx
```

**欄位說明**

| 欄位 | 說明 |
|-----|-----|
| CONTAINER ID | 容器 ID（前 12 碼） |
| IMAGE | 使用的映像檔 |
| COMMAND | 啟動命令 |
| CREATED | 建立時間 |
| STATUS | 狀態（Up、Exited 等） |
| PORTS | Port 對應關係 |
| NAMES | 容器名稱 |

### 5.2 查看所有容器（包含已停止）

```bash
docker ps -a
```

已停止的容器 STATUS 會顯示 `Exited (0) 2 hours ago`。

### 5.3 只顯示容器 ID

```bash
docker ps -q      # 執行中
docker ps -aq     # 全部
```

用於批次操作：

```bash
# 停止所有容器
docker stop $(docker ps -q)

# 刪除所有已停止的容器
docker rm $(docker ps -aq -f status=exited)
```

### 5.4 篩選容器

```bash
# 根據名稱篩選
docker ps -f name=my-nginx

# 根據狀態篩選
docker ps -f status=running
docker ps -f status=exited

# 根據映像檔篩選
docker ps -f ancestor=nginx
```

### 5.5 格式化輸出

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

常用模板變數：
- `.ID`：容器 ID
- `.Image`：映像檔
- `.Names`：名稱
- `.Status`：狀態
- `.Ports`：Port 對應
- `.CreatedAt`：建立時間

### 5.6 查看最後建立的容器

```bash
docker ps -l    # 最後一個
docker ps -n 5  # 最後五個
```

---

## 六、實作練習（3 分鐘）

現在動手試試：

1. 拉取 nginx:alpine 映像檔
2. 用這個映像檔啟動一個容器，名稱叫 test-nginx，背景執行，port 8080
3. 查看容器是否在執行
4. 用瀏覽器訪問 http://localhost:8080

```bash
# 參考答案
docker pull nginx:alpine
docker run -d --name test-nginx -p 8080:80 nginx:alpine
docker ps
# 開瀏覽器訪問 http://localhost:8080
```

---

## 七、本堂課小結（2 分鐘）

這堂課學了四個基本指令：

| 指令 | 功能 |
|-----|-----|
| docker pull | 拉取映像檔 |
| docker images | 列出本機映像檔 |
| docker run | 建立並執行容器 |
| docker ps | 查看容器 |

**docker run 重要參數**

| 參數 | 功能 |
|-----|-----|
| -d | 背景執行 |
| -it | 互動模式 |
| --name | 指定名稱 |
| --rm | 自動刪除 |
| -e | 環境變數 |
| -p | Port Mapping |
| -v | Volume 掛載 |

下一堂課學停止、刪除、日誌、進入容器。

---

## 板書 / PPT 建議

1. docker pull 流程圖（包含 Layer 下載）
2. docker run 參數表
3. docker run 執行流程圖
4. docker ps 輸出欄位說明

---

# Day 2 第五小時：Docker 基本指令（下）

---

## 一、前情提要（2 分鐘）

上一堂課學了「取得和執行」：pull、images、run、ps。

這堂課學「管理和清理」：
- docker stop/start/restart：容器啟停
- docker rm/rmi：刪除容器和映像檔
- docker logs：查看日誌
- docker exec：進入容器
- docker cp：複製檔案

---

## 二、容器生命週期操作（15 分鐘）

### 2.1 docker stop - 停止容器

```bash
docker stop my-nginx
```

送出 SIGTERM 信號，等待容器優雅關閉（預設 10 秒）。超時後送 SIGKILL 強制終止。

**指定等待時間**

```bash
docker stop -t 30 my-nginx    # 等 30 秒
docker stop -t 0 my-nginx     # 立刻 SIGKILL
```

**停止多個容器**

```bash
docker stop container1 container2 container3
```

**停止所有容器**

```bash
docker stop $(docker ps -q)
```

### 2.2 docker start - 啟動已停止的容器

```bash
docker start my-nginx
```

容器之前的設定（port、volume、環境變數）都會保留。

**互動模式啟動**

```bash
docker start -ai my-ubuntu
```

- `-a`：附加到容器的輸出
- `-i`：保持 STDIN 開啟

### 2.3 docker restart - 重啟容器

```bash
docker restart my-nginx
```

等於 stop + start。

```bash
docker restart -t 5 my-nginx    # 等 5 秒後重啟
```

### 2.4 docker kill - 強制終止

```bash
docker kill my-nginx
```

直接送 SIGKILL，不等待。

用於容器沒有回應、stop 沒反應的情況。

**指定信號**

```bash
docker kill -s SIGHUP my-nginx
```

### 2.5 docker pause/unpause - 暫停/恢復

```bash
docker pause my-nginx
docker unpause my-nginx
```

暫停容器內所有程序（使用 cgroups freezer）。

程序狀態保留，不會丟失資料。和 stop 不同，stop 會終止程序。

---

## 三、刪除容器和映像檔（12 分鐘）

### 3.1 docker rm - 刪除容器

```bash
docker rm my-nginx
```

只能刪除已停止的容器。

**強制刪除執行中的容器**

```bash
docker rm -f my-nginx
```

等於先 kill 再 rm。

**刪除多個容器**

```bash
docker rm container1 container2
```

**刪除所有已停止的容器**

```bash
docker rm $(docker ps -aq -f status=exited)
```

或使用：

```bash
docker container prune
```

會詢問確認，加 `-f` 跳過確認。

### 3.2 docker rmi - 刪除映像檔

```bash
docker rmi nginx:1.25
```

可以用名稱或 IMAGE ID。

**刪除多個映像檔**

```bash
docker rmi nginx:1.25 nginx:1.24 ubuntu:22.04
```

**強制刪除**

如果映像檔被容器使用中，需要強制刪除：

```bash
docker rmi -f nginx:1.25
```

**刪除所有未使用的映像檔**

```bash
docker image prune -a
```

**刪除 dangling images**

```bash
docker image prune
```

### 3.3 docker system prune - 全面清理

```bash
docker system prune
```

清理：
- 已停止的容器
- 未被使用的網路
- Dangling images
- Build cache

加 `-a` 清理更多：

```bash
docker system prune -a
```

也會清理所有未被使用的映像檔（不只是 dangling）。

**查看磁碟使用**

```bash
docker system df
```

輸出：

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          15        3         5.2GB     4.1GB (79%)
Containers      5         2         120MB     80MB (66%)
Local Volumes   8         4         2.3GB     1.2GB (52%)
Build Cache     0         0         0B        0B
```

---

## 四、docker logs - 查看日誌（10 分鐘）

### 4.1 基本用法

```bash
docker logs my-nginx
```

顯示容器的標準輸出（stdout）和標準錯誤（stderr）。

### 4.2 即時追蹤

```bash
docker logs -f my-nginx
```

類似 `tail -f`，持續顯示新的日誌。Ctrl+C 退出。

### 4.3 顯示時間戳

```bash
docker logs -t my-nginx
```

每行前面加上時間：

```
2024-01-15T10:30:45.123456789Z 172.17.0.1 - - [15/Jan/2024...
```

### 4.4 限制輸出行數

```bash
docker logs --tail 100 my-nginx    # 最後 100 行
docker logs --tail 0 -f my-nginx   # 不顯示舊的，只追蹤新的
```

### 4.5 根據時間篩選

```bash
docker logs --since 2024-01-15 my-nginx
docker logs --since 1h my-nginx       # 最近 1 小時
docker logs --since 30m my-nginx      # 最近 30 分鐘
docker logs --until 2024-01-14 my-nginx
```

可以組合：

```bash
docker logs --since 1h --until 30m my-nginx
```

### 4.6 日誌的儲存位置

預設，日誌存在：

```
/var/lib/docker/containers/<container-id>/<container-id>-json.log
```

這個檔案會一直增長，可能把磁碟塞爆。

**設定日誌輪替**

在 /etc/docker/daemon.json：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

每個日誌檔最大 10MB，最多保留 3 個檔案。

或在 docker run 時指定：

```bash
docker run -d --log-opt max-size=10m --log-opt max-file=3 nginx
```

---

## 五、docker exec - 進入容器（10 分鐘）

### 5.1 基本用法

```bash
docker exec -it my-nginx bash
```

在執行中的容器內執行命令。

`-it` 是互動模式，通常用來開 shell。

### 5.2 執行單一命令

```bash
docker exec my-nginx ls /etc/nginx
docker exec my-nginx cat /etc/nginx/nginx.conf
docker exec my-nginx nginx -v
```

不需要 `-it`，執行完就回來。

### 5.3 以不同使用者執行

```bash
docker exec -u root my-nginx whoami
docker exec -u 1000 my-nginx whoami
docker exec -u www-data my-nginx whoami
```

### 5.4 設定環境變數

```bash
docker exec -e MY_VAR=hello my-nginx env
```

### 5.5 指定工作目錄

```bash
docker exec -w /etc/nginx my-nginx ls
```

### 5.6 常用場景

**檢查設定檔**

```bash
docker exec my-nginx cat /etc/nginx/nginx.conf
```

**查看程序**

```bash
docker exec my-nginx ps aux
```

**測試網路連線**

```bash
docker exec my-nginx curl localhost
docker exec my-nginx ping google.com
```

**進入 shell 除錯**

```bash
docker exec -it my-nginx /bin/sh
# 或
docker exec -it my-nginx bash
```

有些映像檔沒有 bash（如 Alpine），用 sh。

### 5.7 exec vs attach

`docker attach` 也能連到容器，但不同：

| | docker exec | docker attach |
|--|-------------|---------------|
| 作用 | 在容器內開新程序 | 連到容器的主程序 |
| 離開 | exit 只結束這個 shell | exit 可能停止整個容器 |
| 適用 | 除錯、檢查 | 查看主程序輸出 |

通常用 exec，很少用 attach。

---

## 六、docker cp - 複製檔案（8 分鐘）

### 6.1 從主機複製到容器

```bash
docker cp ./index.html my-nginx:/usr/share/nginx/html/
```

### 6.2 從容器複製到主機

```bash
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf
```

### 6.3 複製目錄

```bash
docker cp ./website/ my-nginx:/usr/share/nginx/html/
docker cp my-nginx:/var/log/nginx/ ./logs/
```

### 6.4 注意事項

- 容器不需要執行中也可以 cp
- 會覆蓋目標檔案
- 保留檔案權限和時間戳（加 `-a`）

```bash
docker cp -a ./files my-nginx:/data/
```

### 6.5 使用場景

**快速修改設定測試**

```bash
# 備份原設定
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf.bak

# 修改後放回去
docker cp ./nginx.conf my-nginx:/etc/nginx/nginx.conf

# 重載設定
docker exec my-nginx nginx -s reload
```

**提取日誌或資料**

```bash
docker cp my-app:/app/logs/ ./debug-logs/
```

---

## 七、其他常用指令（3 分鐘）

### 7.1 docker inspect - 查看詳細資訊

```bash
docker inspect my-nginx
```

輸出 JSON 格式的完整資訊：網路、掛載、設定、狀態...

**取得特定欄位**

```bash
# 取得 IP
docker inspect -f '{{.NetworkSettings.IPAddress}}' my-nginx

# 取得 Port Mapping
docker inspect -f '{{.NetworkSettings.Ports}}' my-nginx
```

### 7.2 docker stats - 即時監控

```bash
docker stats
```

顯示所有容器的 CPU、記憶體、網路、I/O 使用率。

```bash
docker stats my-nginx    # 只看特定容器
```

### 7.3 docker top - 查看容器內程序

```bash
docker top my-nginx
```

類似在容器內執行 ps。

---

## 八、本堂課小結（2 分鐘）

這堂課學了管理容器的指令：

| 指令 | 功能 |
|-----|-----|
| docker stop/start/restart | 啟停容器 |
| docker kill | 強制終止 |
| docker rm | 刪除容器 |
| docker rmi | 刪除映像檔 |
| docker logs | 查看日誌 |
| docker exec | 進入容器執行命令 |
| docker cp | 複製檔案 |
| docker inspect | 查看詳細資訊 |
| docker stats | 即時監控 |

**清理指令**

| 指令 | 清理對象 |
|-----|---------|
| docker container prune | 已停止的容器 |
| docker image prune | Dangling images |
| docker system prune | 全面清理 |

下一堂課：Nginx 容器實戰。

---

## 板書 / PPT 建議

1. 容器生命週期狀態圖
2. stop vs kill 比較
3. docker logs 參數表
4. docker exec vs docker attach 比較
5. 清理指令對照表

---

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

---

# Day 2 第七小時：實作練習與 Day 2 總結

---

## 一、前情提要（2 分鐘）

今天學了很多：
- 容器概念與 Docker 架構
- Docker 安裝
- 基本指令
- Nginx 實戰

這堂課：
- 綜合練習
- 常見問題排除
- Day 2 總複習
- 預告 Day 3

---

## 二、綜合練習題（30 分鐘）

### 練習一：基礎操作（5 分鐘）

**題目**

1. 拉取 `httpd:alpine` 映像檔（Apache Web Server）
2. 查看本機所有映像檔
3. 啟動一個容器，名稱 `apache`，port 9090:80
4. 用瀏覽器或 curl 驗證
5. 查看容器日誌
6. 停止並刪除容器

**參考答案**

```bash
docker pull httpd:alpine
docker images
docker run -d --name apache -p 9090:80 httpd:alpine
curl http://localhost:9090
docker logs apache
docker stop apache && docker rm apache
```

---

### 練習二：進入容器操作（5 分鐘）

**題目**

1. 啟動一個 Ubuntu 容器，互動模式
2. 在容器內執行以下操作：
   - 更新套件列表：`apt update`
   - 安裝 curl：`apt install -y curl`
   - 用 curl 存取 google.com
3. 離開容器
4. 刪除容器

**參考答案**

```bash
docker run -it --name my-ubuntu ubuntu bash
# 在容器內
apt update
apt install -y curl
curl -I https://www.google.com
exit
# 回到主機
docker rm my-ubuntu
```

---

### 練習三：Volume 掛載（10 分鐘）

**題目**

建立一個多頁靜態網站：

1. 在主機建立目錄結構：
   ```
   ~/practice-site/
   ├── index.html
   ├── about.html
   └── contact.html
   ```

2. 每個頁面包含導航連結到其他頁面

3. 啟動 Nginx 容器，掛載這個目錄

4. 瀏覽器測試所有頁面

**參考答案**

```bash
mkdir -p ~/practice-site

cat > ~/practice-site/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Home</title></head>
<body>
    <nav>
        <a href="index.html">Home</a> |
        <a href="about.html">About</a> |
        <a href="contact.html">Contact</a>
    </nav>
    <h1>Welcome to Home Page</h1>
</body>
</html>
EOF

cat > ~/practice-site/about.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>About</title></head>
<body>
    <nav>
        <a href="index.html">Home</a> |
        <a href="about.html">About</a> |
        <a href="contact.html">Contact</a>
    </nav>
    <h1>About Us</h1>
    <p>This is a Docker practice site.</p>
</body>
</html>
EOF

cat > ~/practice-site/contact.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Contact</title></head>
<body>
    <nav>
        <a href="index.html">Home</a> |
        <a href="about.html">About</a> |
        <a href="contact.html">Contact</a>
    </nav>
    <h1>Contact Us</h1>
    <p>Email: test@example.com</p>
</body>
</html>
EOF

docker run -d --name practice-web \
  -p 8888:80 \
  -v ~/practice-site:/usr/share/nginx/html:ro \
  nginx:alpine

# 測試
curl http://localhost:8888/
curl http://localhost:8888/about.html
curl http://localhost:8888/contact.html
```

---

### 練習四：多容器管理（10 分鐘）

**題目**

同時運行三個不同的 Web 伺服器：

| 名稱 | 映像檔 | 主機 Port |
|------|--------|----------|
| web-nginx | nginx:alpine | 8001 |
| web-apache | httpd:alpine | 8002 |
| web-python | python:alpine（用內建 http server）| 8003 |

Python 的啟動命令：
```bash
python -m http.server 80
```

驗證三個都能訪問後，全部停止並刪除。

**參考答案**

```bash
# 建立三個 Web 伺服器
docker run -d --name web-nginx -p 8001:80 nginx:alpine
docker run -d --name web-apache -p 8002:80 httpd:alpine

# Python 需要建立一個簡單的頁面
mkdir -p ~/python-web
echo '<h1>Python HTTP Server</h1>' > ~/python-web/index.html

docker run -d --name web-python -p 8003:80 \
  -v ~/python-web:/app \
  -w /app \
  python:alpine \
  python -m http.server 80

# 驗證
curl http://localhost:8001
curl http://localhost:8002
curl http://localhost:8003

# 查看所有
docker ps

# 停止並刪除
docker stop web-nginx web-apache web-python
docker rm web-nginx web-apache web-python
```

---

## 三、常見問題排除（10 分鐘）

### 3.1 容器無法啟動

**症狀**：docker run 後容器立刻退出

**排查步驟**

```bash
# 查看退出狀態
docker ps -a

# 查看日誌
docker logs <container>

# 常見原因
# Exit Code 0：正常結束（可能是命令執行完畢）
# Exit Code 1：一般錯誤
# Exit Code 137：被 kill（OOM 或手動）
# Exit Code 139：Segmentation fault
```

**常見原因**

1. 命令執行完就結束了
   - 解法：用 `-it` 互動模式，或加 `tail -f /dev/null` 保持運行

2. 設定錯誤
   - 查看日誌找錯誤訊息

3. 記憶體不足
   - 增加 Docker 可用記憶體

### 3.2 Port 被佔用

**症狀**：Error: Bind for 0.0.0.0:8080 failed: port is already allocated

**解法**

```bash
# 查看是什麼佔用了 port
lsof -i :8080
# 或
netstat -tulpn | grep 8080

# 停止那個程序，或換一個 port
docker run -d -p 8081:80 nginx
```

### 3.3 映像檔拉取失敗

**症狀**：Error response from daemon: pull access denied

**可能原因**

1. 映像檔名稱打錯
2. 私有映像檔，需要登入
3. 網路問題

**解法**

```bash
# 確認名稱正確
docker search nginx

# 登入
docker login

# 使用映像加速
# 編輯 /etc/docker/daemon.json
```

### 3.4 磁碟空間不足

**症狀**：no space left on device

**解法**

```bash
# 查看 Docker 磁碟使用
docker system df

# 清理
docker system prune -a

# 如果還不夠，查看大的映像檔
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -hr | head -20
```

### 3.5 容器內無法連網

**排查步驟**

```bash
# 進入容器
docker exec -it <container> sh

# 測試 DNS
ping google.com
nslookup google.com

# 測試 IP 連線
ping 8.8.8.8
```

**常見原因**

1. Docker 網路問題：重啟 Docker
2. 防火牆擋住：檢查 iptables
3. DNS 問題：在 daemon.json 設定 DNS

### 3.6 Permission Denied

**症狀**：掛載的 Volume 內檔案無法存取

**原因**：容器內的使用者 UID 和主機不同

**解法**

```bash
# 方法一：調整主機目錄權限
chmod -R 777 ~/my-data

# 方法二：指定容器使用者
docker run -u $(id -u):$(id -g) ...

# 方法三：了解映像檔內的使用者
docker exec <container> id
```

---

## 四、Day 2 總複習（12 分鐘）

### 4.1 容器基本概念

| 概念 | 說明 |
|-----|------|
| 容器 | 輕量虛擬化，共用主機核心 |
| Image | 唯讀模板，包含應用程式和環境 |
| Container | Image 的執行實例 |
| Registry | 存放 Image 的倉庫 |

### 4.2 Docker 架構

```
Docker Client
     ↓ (REST API)
Docker Daemon (dockerd)
     ↓
containerd → runc
     ↓
Container
```

### 4.3 核心指令總覽

**映像檔操作**

| 指令 | 功能 |
|-----|------|
| docker pull | 拉取映像檔 |
| docker images | 列出映像檔 |
| docker rmi | 刪除映像檔 |
| docker image prune | 清理未使用的映像檔 |

**容器操作**

| 指令 | 功能 |
|-----|------|
| docker run | 建立並執行容器 |
| docker ps | 列出容器 |
| docker stop/start | 停止/啟動 |
| docker rm | 刪除容器 |
| docker logs | 查看日誌 |
| docker exec | 進入容器 |
| docker cp | 複製檔案 |

**docker run 重要參數**

| 參數 | 功能 | 範例 |
|-----|------|------|
| -d | 背景執行 | docker run -d nginx |
| -it | 互動模式 | docker run -it ubuntu bash |
| --name | 指定名稱 | --name my-app |
| -p | Port Mapping | -p 8080:80 |
| -v | Volume 掛載 | -v ~/data:/app/data |
| -e | 環境變數 | -e DB_HOST=localhost |
| --rm | 自動刪除 | docker run --rm nginx |

### 4.4 重要路徑

| 路徑 | 說明 |
|-----|------|
| /var/run/docker.sock | Docker socket |
| /var/lib/docker | Docker 資料目錄 |
| /etc/docker/daemon.json | Daemon 設定檔 |
| ~/.docker/config.json | Client 設定（登入資訊） |

### 4.5 今日重點

1. **環境一致性**：容器打包應用程式和環境，解決「在我電腦上可以跑」

2. **輕量高效**：比 VM 更快、更小、更省資源

3. **基本工作流程**：
   - pull 映像檔
   - run 容器
   - 用 logs、exec 除錯
   - stop、rm 清理

4. **Port Mapping**：`-p 主機:容器` 讓外部可以存取容器服務

5. **Volume 掛載**：`-v 主機:容器` 讓容器可以存取主機檔案

---

## 五、預告 Day 3（3 分鐘）

下週我們繼續深入：

**上午（3 小時）**
- 映像檔的分層結構
- 容器完整生命週期
- 容器網路

**下午（4 小時）**
- Port Mapping 進階
- Volume 深入
- **Dockerfile**：自己建立映像檔

學完 Dockerfile，你就能把自己的應用程式容器化了。

有問題嗎？下週見！

---

## 六、本堂課小結（3 分鐘）

這堂課做了：

1. **四道練習題**
   - 基礎操作
   - 進入容器
   - Volume 掛載
   - 多容器管理

2. **常見問題排除**
   - 容器無法啟動 → 看 logs
   - Port 被佔用 → 換 port 或找出佔用者
   - 拉取失敗 → 檢查名稱、登入、網路
   - 磁碟滿 → docker system prune

3. **Day 2 總複習**
   - 核心概念
   - 重要指令
   - 常用參數

---

## 課後作業（自選）

1. 在自己的電腦安裝 Docker
2. 用 Docker 啟動一個 MySQL 容器（提示：需要設定 MYSQL_ROOT_PASSWORD）
3. 用另一個容器連線到 MySQL（提示：需要了解容器網路，下週會教）

```bash
# MySQL 啟動範例
docker run -d \
  --name my-mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -p 3306:3306 \
  mysql:8.0
```

---

## 板書 / PPT 建議

1. 指令速查表
2. 常見錯誤對照表
3. Docker 工作流程圖
4. Day 2 知識點心智圖

---

# Day 3 第八小時：映像檔深入理解

---

## 一、前情回顧（3 分鐘）

上週學了 Docker 基礎操作。

今天深入：映像檔、容器生命週期、網路、Volume、Dockerfile。

這堂課專門講映像檔：
- 分層結構
- Layer 運作原理
- 映像檔標籤管理
- 選擇適合的映像檔

---

## 二、映像檔分層結構（15 分鐘）

### 2.1 複習：什麼是 Layer

Docker Image 由多個 Layer 組成。每一層代表一組檔案變更。

```bash
docker pull nginx:alpine
```

輸出：

```
alpine: Pulling from library/nginx
4abcf2066143: Pull complete    # Layer 1: Alpine 基礎
6c1024b63145: Pull complete    # Layer 2: 安裝 nginx
a123cd45678b: Pull complete    # Layer 3: 設定檔
...
```

### 2.2 查看映像檔的 Layer

```bash
docker history nginx:alpine
```

輸出：

```
IMAGE          CREATED        CREATED BY                                      SIZE
a6bd71f48f68   2 weeks ago    /bin/sh -c #(nop)  CMD ["nginx" "-g" "daem...   0B
<missing>      2 weeks ago    /bin/sh -c #(nop)  STOPSIGNAL SIGQUIT           0B
<missing>      2 weeks ago    /bin/sh -c #(nop)  EXPOSE 80                    0B
<missing>      2 weeks ago    /bin/sh -c set -x && addgroup -g 101 -S ng...   7.52MB
<missing>      2 weeks ago    /bin/sh -c #(nop)  ENV PKG_RELEASE=1            0B
<missing>      3 weeks ago    /bin/sh -c #(nop)  CMD ["/bin/sh"]              0B
<missing>      3 weeks ago    /bin/sh -c #(nop) ADD file:7625ddfd589fb824...   7.34MB
```

**欄位說明**

- `IMAGE`：該層的 ID（`<missing>` 表示中間層，沒有獨立 ID）
- `CREATED BY`：建立這一層的命令
- `SIZE`：這一層的大小

### 2.3 為什麼是分層的？

**原因一：空間效率**

多個 Image 可以共用相同的 Layer。

```
Image A (Python App)     Image B (Python App)
┌─────────────────┐     ┌─────────────────┐
│  App A 程式碼   │     │  App B 程式碼   │
├─────────────────┤     ├─────────────────┤
│  pip packages   │     │  pip packages   │  ← 可能不同
├─────────────────┼─────┼─────────────────┤
│           Python 3.11 Layer             │  ← 共用
├─────────────────────────────────────────┤
│              Alpine Layer               │  ← 共用
└─────────────────────────────────────────┘
```

如果有 10 個 Python 應用，不用儲存 10 份 Python 和 Alpine。

**原因二：下載效率**

下載 Image 時，已經有的 Layer 不用重新下載。

```bash
$ docker pull python:3.11-alpine

3.11-alpine: Pulling from library/python
4abcf2066143: Already exists    # 本機已有
5de5f69f42d7: Already exists    # 本機已有
abc123def456: Pull complete     # 只下載這個
```

**原因三：建構效率**

Dockerfile 建構時，沒變化的 Layer 使用快取。

```
Step 1/5 : FROM python:3.11-alpine
 ---> Using cache
Step 2/5 : WORKDIR /app
 ---> Using cache
Step 3/5 : COPY requirements.txt .
 ---> Using cache
Step 4/5 : RUN pip install -r requirements.txt
 ---> Using cache
Step 5/5 : COPY . .
 ---> abc123def456           # 只有這步重新執行
```

### 2.4 Layer 的不可變性

每個 Layer 都是唯讀的，建立後不能修改。

如果要修改，只能在上面加新的 Layer。

**刪除檔案的真相**

假設 Layer 1 有一個 100MB 的檔案。
Layer 2 執行 `rm` 刪除這個檔案。

這個檔案真的消失了嗎？

**沒有。**

Layer 1 還是 100MB。Layer 2 只是加了一個「標記」說這個檔案被刪除了。
最終 Image 還是包含那 100MB。

這就是為什麼 Dockerfile 的寫法很重要——後面會詳細說。

---

## 三、Content Addressable Storage（10 分鐘）

### 3.1 Image ID 是什麼

```bash
docker images

REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
nginx        alpine    a6bd71f48f68   2 weeks ago   43.2MB
```

IMAGE ID 是映像檔內容的 SHA256 雜湊值（取前 12 碼）。

完整的 ID：

```bash
docker inspect nginx:alpine --format '{{.Id}}'
# sha256:a6bd71f48f6831a6...
```

### 3.2 Content Addressable 的意義

ID 由內容決定，不是隨機的。

**相同內容 = 相同 ID**

如果兩個 Image 的內容完全一樣，它們的 ID 就一樣。

這讓 Docker 可以：
- 判斷 Layer 是否已存在（比對 ID）
- 驗證下載的內容是否正確（重算 hash 比對）
- 確保不可篡改（內容變了 ID 就變了）

### 3.3 Digest

Registry 上的映像檔有 Digest：

```bash
docker pull nginx:alpine

Digest: sha256:a59278fd22a9d411121e190b8cec8aa57b306aa3332459197777583beb728f59
```

Digest 是整個 Image manifest 的 hash，可以用來精確指定版本：

```bash
docker pull nginx@sha256:a59278fd22a9d411121e190b8cec8aa57b306aa3332459197777583beb728f59
```

這比用 tag 更精確，因為 tag 可能會指向不同的 Image。

---

## 四、映像檔標籤（Tag）管理（10 分鐘）

### 4.1 Tag 是什麼

Tag 是映像檔的標籤，用來區分不同版本。

```
nginx:1.25.3
nginx:1.25
nginx:latest
nginx:alpine
nginx:1.25-alpine
```

**Tag 只是別名**

Tag 不是 Image 的一部分，它只是指向某個 Image ID 的指標。

同一個 Image ID 可以有多個 Tag。
同一個 Tag 可以在不同時間指向不同 Image ID。

### 4.2 常見的 Tag 慣例

| Tag 模式 | 意義 | 範例 |
|---------|------|------|
| latest | 預設標籤 | nginx:latest |
| 版本號 | 特定版本 | nginx:1.25.3 |
| 主版本 | 該主版本最新 | nginx:1.25 |
| alpine | 基於 Alpine Linux | nginx:alpine |
| slim | 精簡版 | python:3.11-slim |
| buster/bullseye/bookworm | Debian 版本代號 | python:3.11-bookworm |

### 4.3 docker tag 命令

給映像檔加上新的 Tag：

```bash
# 語法
docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]

# 範例
docker tag nginx:alpine my-nginx:v1
docker tag nginx:alpine registry.example.com/nginx:v1
```

這不會複製 Image，只是建立新的 Tag 指向同一個 Image。

```bash
docker images

REPOSITORY                      TAG      IMAGE ID       SIZE
nginx                           alpine   a6bd71f48f68   43.2MB
my-nginx                        v1       a6bd71f48f68   43.2MB   # 同一個 ID
registry.example.com/nginx      v1       a6bd71f48f68   43.2MB   # 同一個 ID
```

### 4.4 latest 的陷阱

**latest 不代表最新版本。**

latest 只是一個名字叫 latest 的 tag，不會自動更新。

```bash
# 今天
docker pull nginx:latest  # 拉到 1.25.3

# 一個月後
docker pull nginx:latest  # 可能還是本機的 1.25.3，不會自動變成 1.26
```

**生產環境永遠不要用 latest：**

```bash
# 不好
docker run nginx:latest

# 好
docker run nginx:1.25.3
```

### 4.5 刪除 Tag

```bash
# 刪除 tag
docker rmi my-nginx:v1

# 如果 Image 只有這一個 tag，Image 本身也會被刪除
# 如果還有其他 tag 指向同一個 Image，只刪除這個 tag
```

---

## 五、選擇適合的映像檔（15 分鐘）

### 5.1 官方映像檔 vs 社群映像檔

**官方映像檔**

- 由 Docker 官方或軟體官方維護
- 名稱沒有斜線：`nginx`、`mysql`、`python`
- 品質有保證，定期更新安全修補

**社群映像檔**

- 由一般使用者上傳
- 名稱有斜線：`bitnami/nginx`、`linuxserver/nginx`
- 品質參差不齊，要看維護者信譽

**建議**

- 優先用官方映像檔
- 如果用社群映像檔，選知名維護者（如 bitnami、linuxserver）
- 檢查 Docker Hub 上的星星數、下載數、更新頻率

### 5.2 Base Image 的選擇

同一個軟體通常有多種 Base Image 版本：

| 類型 | 範例 | 大小 | 特點 |
|-----|------|------|------|
| 預設 | python:3.11 | ~1GB | 完整 Debian，含編譯工具 |
| slim | python:3.11-slim | ~150MB | 精簡 Debian，移除非必要套件 |
| alpine | python:3.11-alpine | ~50MB | 基於 Alpine Linux，最小 |

**Alpine 的優缺點**

優點：
- 超小（基礎只有 5MB）
- 安全（攻擊面小）
- 啟動快

缺點：
- 用 musl libc 而非 glibc，某些套件可能不相容
- 套件管理用 apk 而非 apt，生態較小
- 除錯工具較少

**選擇建議**

| 場景 | 建議 |
|-----|------|
| 開發/測試 | 預設版本，方便除錯 |
| 生產環境（一般） | slim 版本 |
| 生產環境（極致優化） | alpine 版本 |
| 需要編譯原生套件 | 預設版本（有編譯工具） |

### 5.3 查看映像檔資訊

**Docker Hub 頁面**

https://hub.docker.com/_/nginx

可以看到：
- 支援的 Tag
- Dockerfile 內容
- 使用說明
- 漏洞掃描結果

**命令列查看**

```bash
# 查看映像檔詳細資訊
docker inspect nginx:alpine

# 取得特定欄位
docker inspect -f '{{.Config.Env}}' nginx:alpine
docker inspect -f '{{.Config.ExposedPorts}}' nginx:alpine
docker inspect -f '{{.Config.Cmd}}' nginx:alpine
```

### 5.4 映像檔大小優化

```bash
# 查看映像檔大小
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -hr
```

**為什麼要在意大小？**

- 下載更快
- 部署更快
- 儲存成本更低
- 攻擊面更小

**大小比較範例**

| Image | 大小 |
|-------|------|
| python:3.11 | 1.01GB |
| python:3.11-slim | 155MB |
| python:3.11-alpine | 52MB |
| nginx | 187MB |
| nginx:alpine | 43MB |

---

## 六、映像檔的匯出與匯入（5 分鐘）

### 6.1 儲存成檔案（docker save）

```bash
docker save -o nginx.tar nginx:alpine
```

產生一個 tar 檔案，包含映像檔的所有 Layer。

可以用來：
- 備份
- 傳輸到沒有網路的機器
- 分享給他人

### 6.2 從檔案載入（docker load）

```bash
docker load -i nginx.tar
```

還原映像檔到本機。

### 6.3 使用場景

**離線環境部署**

```bash
# 在有網路的機器
docker pull nginx:alpine
docker save -o nginx.tar nginx:alpine

# 把 nginx.tar 傳到離線機器（USB、SCP...）

# 在離線機器
docker load -i nginx.tar
docker images  # 確認已載入
```

**備份重要映像檔**

```bash
docker save -o backup/my-app-v1.tar my-app:v1
```

---

## 七、本堂課小結（2 分鐘）

這堂課深入了解了映像檔：

**分層結構**
- Image 由多個唯讀 Layer 組成
- Layer 共用節省空間和下載時間
- 用 `docker history` 查看 Layer

**Content Addressable**
- Image ID 是內容的 hash
- Digest 精確指定版本

**Tag 管理**
- Tag 是指向 Image 的別名
- latest 不等於最新版
- 生產環境用具體版本號

**選擇映像檔**
- 優先用官方映像檔
- 根據需求選擇 base image（預設/slim/alpine）
- 考慮大小和相容性

下一堂：容器生命週期管理。

---

## 板書 / PPT 建議

1. Layer 堆疊示意圖
2. Layer 共用示意圖
3. Tag 指向 Image ID 關係圖
4. 不同 Base Image 大小比較表
5. docker history 輸出解析

---

# Day 3 第九小時：容器生命週期管理

---

## 一、前情提要（2 分鐘）

上堂課講了映像檔的分層結構。

這堂課講容器本身：
- 容器的完整生命週期
- 容器狀態轉換
- 資源限制
- 重啟策略
- 監控與健康檢查

---

## 二、容器生命週期（12 分鐘）

### 2.1 容器狀態

容器有以下狀態：

| 狀態 | 說明 |
|-----|------|
| created | 已建立，尚未啟動 |
| running | 執行中 |
| paused | 暫停 |
| restarting | 重啟中 |
| exited | 已停止 |
| dead | 無法移除的錯誤狀態 |

### 2.2 狀態轉換圖

```
                docker create
        ┌──────────────────────────┐
        │                          ▼
        │                      [created]
        │                          │
        │                    docker start
        │                          │
        │                          ▼
        │    ┌───────────────► [running] ◄───────────────┐
        │    │                     │                     │
        │    │        ┌────────────┼────────────┐        │
        │    │        │            │            │        │
        │    │   docker pause  docker stop  docker kill  │
        │    │        │            │            │        │
        │    │        ▼            │            │        │
        │    │    [paused]         │            │        │
        │    │        │            │            │        │
        │    │  docker unpause     │            │        │
        │    │        │            │            │        │
        │    └────────┘            ▼            │        │
        │                      [exited] ────────┘        │
        │                          │                     │
        │                    docker start                │
        │                          │                     │
        │                          └─────────────────────┘
        │
        │                    docker rm
   docker run ◄──────────────────────
   (= create + start)
```

### 2.3 各狀態的詳細說明

**created**

```bash
docker create --name my-nginx nginx
```

容器被建立，但程序沒有啟動。
- 分配了 ID
- 準備了檔案系統
- 但沒有執行任何程序

**running**

```bash
docker start my-nginx
# 或
docker run nginx
```

容器的主程序正在執行。

**paused**

```bash
docker pause my-nginx
```

所有程序被暫停（使用 cgroups freezer）。
- 程序狀態保留在記憶體
- 不消耗 CPU
- 恢復後從暫停點繼續

```bash
docker unpause my-nginx
```

**exited**

```bash
docker stop my-nginx
```

主程序已經結束。
- Exit code 0 表示正常結束
- 非 0 表示錯誤

```bash
# 查看 exit code
docker inspect -f '{{.State.ExitCode}}' my-nginx
```

**dead**

這是錯誤狀態，通常是 Docker 嘗試刪除容器但失敗。
可能原因：檔案系統忙碌、資源被鎖定。

### 2.4 docker run = create + start

```bash
docker run nginx
```

等同於：

```bash
docker create nginx
docker start <container_id>
```

用 `create` 的場景：
- 想先建立，之後再啟動
- 需要在啟動前修改設定

---

## 三、docker inspect 詳解（10 分鐘）

### 3.1 基本用法

```bash
docker inspect my-nginx
```

輸出 JSON 格式的完整資訊，非常長。

### 3.2 常用資訊提取

**容器狀態**

```bash
docker inspect -f '{{.State.Status}}' my-nginx
docker inspect -f '{{.State.Running}}' my-nginx
docker inspect -f '{{.State.StartedAt}}' my-nginx
docker inspect -f '{{.State.FinishedAt}}' my-nginx
docker inspect -f '{{.State.ExitCode}}' my-nginx
```

**網路資訊**

```bash
docker inspect -f '{{.NetworkSettings.IPAddress}}' my-nginx
docker inspect -f '{{.NetworkSettings.Ports}}' my-nginx
docker inspect -f '{{.NetworkSettings.Gateway}}' my-nginx
```

**掛載資訊**

```bash
docker inspect -f '{{.Mounts}}' my-nginx
docker inspect -f '{{json .Mounts}}' my-nginx | jq
```

**環境變數**

```bash
docker inspect -f '{{.Config.Env}}' my-nginx
```

**啟動命令**

```bash
docker inspect -f '{{.Config.Cmd}}' my-nginx
docker inspect -f '{{.Config.Entrypoint}}' my-nginx
```

### 3.3 格式化輸出

用 Go template 語法：

```bash
# 多個欄位
docker inspect -f 'Name: {{.Name}}, Status: {{.State.Status}}' my-nginx

# 迴圈
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my-nginx

# JSON 輸出
docker inspect -f '{{json .Config}}' my-nginx | jq
```

### 3.4 比較多個容器

```bash
docker inspect container1 container2
```

---

## 四、資源限制（15 分鐘）

### 4.1 為什麼要限制資源

- 防止單一容器吃光所有資源
- 多容器環境的公平分配
- 避免 OOM（Out of Memory）影響系統

### 4.2 記憶體限制

```bash
docker run -d --name limited-app \
  --memory 512m \
  --memory-swap 1g \
  nginx
```

**參數說明**

| 參數 | 說明 |
|-----|------|
| --memory, -m | 最大記憶體 |
| --memory-swap | 記憶體+swap 總和（-1 表示無限制） |
| --memory-reservation | 軟限制（優先被回收） |
| --oom-kill-disable | 禁止 OOM killer（危險，不建議） |

**單位**

- b, k, m, g（bytes, kilobytes, megabytes, gigabytes）

**查看容器記憶體使用**

```bash
docker stats my-nginx
```

### 4.3 CPU 限制

**方法一：CPU 份額（相對權重）**

```bash
docker run -d --cpu-shares 512 nginx
```

預設值是 1024。512 表示只有預設的一半權重。

只在 CPU 競爭時生效。如果系統不忙，還是可以用到更多 CPU。

**方法二：CPU 核心數**

```bash
docker run -d --cpus 1.5 nginx
```

最多使用 1.5 個 CPU 核心。

**方法三：指定 CPU 核心**

```bash
docker run -d --cpuset-cpus 0,1 nginx
```

只在 CPU 0 和 1 上執行。

適用於 NUMA 架構優化。

### 4.4 磁碟 I/O 限制

```bash
docker run -d \
  --device-read-bps /dev/sda:10mb \
  --device-write-bps /dev/sda:10mb \
  nginx
```

限制每秒讀寫 10MB。

### 4.5 修改執行中容器的資源限制

```bash
docker update --memory 1g --cpus 2 my-nginx
```

不需要重啟容器。

### 4.6 查看資源限制

```bash
docker inspect -f '{{.HostConfig.Memory}}' my-nginx
docker inspect -f '{{.HostConfig.NanoCpus}}' my-nginx
```

---

## 五、重啟策略（10 分鐘）

### 5.1 什麼是重啟策略

當容器停止時，Docker 該怎麼處理？

- 什麼都不做
- 自動重啟
- 只在錯誤時重啟

### 5.2 四種重啟策略

| 策略 | 說明 |
|-----|------|
| no | 不重啟（預設） |
| on-failure[:max-retries] | 只在非 0 exit code 時重啟 |
| always | 總是重啟，包括 Docker daemon 重啟後 |
| unless-stopped | 總是重啟，除非手動停止 |

### 5.3 使用範例

```bash
# 總是重啟
docker run -d --restart always nginx

# 失敗時重啟，最多 3 次
docker run -d --restart on-failure:3 my-app

# 除非手動停止，否則重啟
docker run -d --restart unless-stopped nginx
```

### 5.4 always vs unless-stopped

兩者的差別在手動停止後 Docker daemon 重啟的行為：

| 場景 | always | unless-stopped |
|-----|--------|----------------|
| 容器 crash | 重啟 | 重啟 |
| Docker daemon 重啟 | 重啟 | 重啟 |
| 手動 stop 後 Docker 重啟 | **重啟** | **不重啟** |

`unless-stopped` 比較合理——你手動停的容器，重開機後應該保持停止。

### 5.5 修改執行中容器的重啟策略

```bash
docker update --restart unless-stopped my-nginx
```

### 5.6 查看重啟策略

```bash
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' my-nginx
```

---

## 六、docker stats 監控（5 分鐘）

### 6.1 即時監控

```bash
docker stats
```

輸出：

```
CONTAINER ID   NAME       CPU %     MEM USAGE / LIMIT   MEM %   NET I/O          BLOCK I/O   PIDS
abc123def456   my-nginx   0.00%     7.934MiB / 512MiB   1.55%   1.45kB / 0B      0B / 0B     5
```

**欄位說明**

| 欄位 | 說明 |
|-----|------|
| CPU % | CPU 使用率 |
| MEM USAGE / LIMIT | 記憶體使用 / 限制 |
| MEM % | 記憶體使用率 |
| NET I/O | 網路輸入/輸出 |
| BLOCK I/O | 磁碟讀/寫 |
| PIDS | 程序數 |

### 6.2 監控特定容器

```bash
docker stats my-nginx
docker stats my-nginx my-mysql
```

### 6.3 單次輸出（不持續更新）

```bash
docker stats --no-stream
```

適合寫腳本收集數據。

### 6.4 自訂格式

```bash
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

---

## 七、健康檢查（5 分鐘）

### 7.1 什麼是健康檢查

容器在跑不代表服務正常。

健康檢查讓 Docker 定期測試容器內的服務是否正常。

### 7.2 docker run 設定健康檢查

```bash
docker run -d \
  --name web \
  --health-cmd "curl -f http://localhost/ || exit 1" \
  --health-interval 30s \
  --health-timeout 10s \
  --health-retries 3 \
  --health-start-period 40s \
  nginx
```

**參數說明**

| 參數 | 說明 | 預設 |
|-----|------|-----|
| --health-cmd | 健康檢查命令 | - |
| --health-interval | 檢查間隔 | 30s |
| --health-timeout | 超時時間 | 30s |
| --health-retries | 連續失敗幾次算不健康 | 3 |
| --health-start-period | 啟動緩衝時間 | 0s |

### 7.3 查看健康狀態

```bash
docker ps
```

STATUS 欄會顯示：`Up 5 minutes (healthy)` 或 `(unhealthy)`

```bash
docker inspect -f '{{.State.Health.Status}}' web
```

### 7.4 查看健康檢查日誌

```bash
docker inspect -f '{{json .State.Health}}' web | jq
```

會顯示最近幾次檢查的結果。

---

## 八、本堂課小結（1 分鐘）

這堂課學了容器生命週期管理：

**容器狀態**
- created → running → paused/exited → dead
- docker run = create + start

**docker inspect**
- 取得容器完整資訊
- 用 Go template 格式化輸出

**資源限制**
- 記憶體：--memory
- CPU：--cpus, --cpu-shares
- 可用 docker update 動態調整

**重啟策略**
- no / on-failure / always / unless-stopped
- 生產環境建議 unless-stopped

**監控**
- docker stats：即時監控
- 健康檢查：--health-cmd

下一堂：容器網路基礎。

---

## 板書 / PPT 建議

1. 容器狀態轉換圖
2. 資源限制參數表
3. 重啟策略比較表
4. docker stats 輸出範例

---

# Day 3 第十小時：容器網路基礎

---

## 一、前情提要（2 分鐘）

上堂課講了容器生命週期管理。

這堂課講容器網路：
- Docker 網路模式
- 容器之間的通訊
- 自訂網路
- DNS 與服務發現

---

## 二、Docker 網路概述（8 分鐘）

### 2.1 為什麼需要理解容器網路

- 容器之間要能互相通訊（如 Web 連資料庫）
- 外部要能存取容器內的服務
- 需要隔離不同應用的網路

### 2.2 查看現有網路

```bash
docker network ls
```

輸出：

```
NETWORK ID     NAME      DRIVER    SCOPE
abc123def456   bridge    bridge    local
def456abc123   host      host      local
789xyz123abc   none      null      local
```

Docker 預設建立三個網路：bridge、host、none。

### 2.3 三種網路驅動

| 驅動 | 說明 |
|-----|------|
| bridge | 預設，容器透過虛擬橋接器連接 |
| host | 容器直接使用主機網路 |
| none | 沒有網路 |
| overlay | 跨主機網路（用於 Swarm） |
| macvlan | 給容器分配 MAC 位址 |

---

## 三、Bridge 網路（15 分鐘）

### 3.1 Bridge 網路原理

Bridge 是預設的網路模式。

```
┌─────────────────────────────────────────────┐
│                    Host                      │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │Container│  │Container│  │Container│     │
│  │   A     │  │   B     │  │   C     │     │
│  │172.17.  │  │172.17.  │  │172.17.  │     │
│  │  0.2    │  │  0.3    │  │  0.4    │     │
│  └────┬────┘  └────┬────┘  └────┬────┘     │
│       │            │            │          │
│       └────────────┼────────────┘          │
│                    │                        │
│            ┌───────┴───────┐                │
│            │  docker0      │                │
│            │  172.17.0.1   │                │
│            └───────┬───────┘                │
│                    │                        │
│            ┌───────┴───────┐                │
│            │    eth0       │──────► 外部網路
│            │  192.168.1.x  │                │
│            └───────────────┘                │
└─────────────────────────────────────────────┘
```

- Docker 建立虛擬橋接器 `docker0`
- 每個容器連接到這個橋接器
- 容器取得 172.17.0.x 的 IP
- 容器之間可以互相通訊
- 外部存取需要 Port Mapping

### 3.2 查看 docker0 介面

```bash
ip addr show docker0
```

或在 Mac/Windows：

```bash
docker network inspect bridge
```

### 3.3 查看容器 IP

```bash
# 方法一
docker inspect -f '{{.NetworkSettings.IPAddress}}' my-nginx

# 方法二：進入容器
docker exec my-nginx ip addr
docker exec my-nginx cat /etc/hosts
```

### 3.4 容器之間通訊（預設 bridge）

```bash
# 啟動兩個容器
docker run -d --name web nginx:alpine
docker run -d --name app alpine sleep 3600

# 取得 web 的 IP
docker inspect -f '{{.NetworkSettings.IPAddress}}' web
# 假設是 172.17.0.2

# 從 app 連接 web
docker exec app ping 172.17.0.2
docker exec app wget -qO- 172.17.0.2
```

用 IP 可以通，但有問題：
- IP 是動態分配的，重啟可能改變
- 不好維護

### 3.5 預設 bridge 的限制

預設的 bridge 網路：
- **沒有 DNS 解析**：不能用容器名稱互連
- 需要用 `--link`（已廢棄）

所以我們需要自訂網路。

---

## 四、自訂 Bridge 網路（15 分鐘）

### 4.1 建立自訂網路

```bash
docker network create my-network
```

### 4.2 查看網路詳情

```bash
docker network inspect my-network
```

輸出包含：
- 子網路範圍
- 閘道
- 連接的容器

### 4.3 容器加入自訂網路

**方法一：啟動時指定**

```bash
docker run -d --name web --network my-network nginx:alpine
docker run -d --name app --network my-network alpine sleep 3600
```

**方法二：動態連接**

```bash
docker network connect my-network my-container
docker network disconnect my-network my-container
```

### 4.4 自訂網路的 DNS

**這是重點：自訂網路有內建 DNS！**

```bash
# 用容器名稱連接
docker exec app ping web
docker exec app wget -qO- http://web
```

不需要知道 IP，直接用容器名稱。

這就是為什麼要用自訂網路。

### 4.5 網路別名

```bash
docker run -d --name web-server \
  --network my-network \
  --network-alias web \
  --network-alias nginx \
  nginx:alpine
```

現在可以用 `web-server`、`web`、`nginx` 三個名稱連接這個容器。

### 4.6 實作：Web + Database

```bash
# 建立網路
docker network create app-network

# 啟動 MySQL
docker run -d \
  --name db \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  mysql:8.0

# 等待 MySQL 啟動
sleep 30

# 啟動應用（用 db 作為資料庫主機名）
docker run -d \
  --name web \
  --network app-network \
  -e DATABASE_HOST=db \
  -e DATABASE_PORT=3306 \
  -p 8080:80 \
  my-web-app
```

Web 容器可以用 `db` 這個名稱連接 MySQL。

---

## 五、Host 網路（5 分鐘）

### 5.1 什麼是 Host 網路

容器直接使用主機的網路 stack，沒有隔離。

```bash
docker run -d --network host nginx
```

### 5.2 特點

- 沒有 Port Mapping，容器直接監聽主機 port
- 效能最好（沒有 NAT 轉換）
- 沒有網路隔離

### 5.3 使用場景

- 需要最高網路效能
- 需要存取主機網路功能
- 在 Linux 上運行（Mac/Windows 的 Docker Desktop 不完全支援）

### 5.4 注意事項

- 容器的 port 和主機 port 可能衝突
- 安全性較低
- Mac/Windows 上 host 模式行為不同

---

## 六、None 網路（3 分鐘）

### 6.1 什麼是 None 網路

容器完全沒有網路連接。

```bash
docker run -d --network none alpine sleep 3600
```

### 6.2 使用場景

- 處理敏感資料，不想讓容器連網
- 批次處理任務，不需要網路
- 自己手動設定網路

---

## 七、網路管理命令（5 分鐘）

### 7.1 完整命令列表

```bash
# 列出網路
docker network ls

# 建立網路
docker network create my-network
docker network create --driver bridge --subnet 172.20.0.0/16 my-network

# 查看網路詳情
docker network inspect my-network

# 連接/斷開容器
docker network connect my-network my-container
docker network disconnect my-network my-container

# 刪除網路
docker network rm my-network

# 清理未使用的網路
docker network prune
```

### 7.2 建立自訂子網路

```bash
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  my-custom-network
```

### 7.3 查看容器連接的網路

```bash
docker inspect -f '{{json .NetworkSettings.Networks}}' my-container | jq
```

### 7.4 一個容器多個網路

```bash
docker run -d --name multi-net --network network1 nginx
docker network connect network2 multi-net
```

現在這個容器同時在兩個網路上。

---

## 八、容器通訊總結（5 分鐘）

### 8.1 同一台主機上的容器

| 情況 | 方法 |
|-----|------|
| 同一個自訂網路 | 用容器名稱或別名 |
| 預設 bridge 網路 | 用 IP（不推薦） |
| 不同網路 | 無法通訊，除非容器加入多個網路 |

### 8.2 最佳實踐

1. **不要用預設的 bridge 網路**
   - 沒有 DNS
   - 所有容器混在一起

2. **為每個應用/專案建立獨立網路**
   - 網路隔離
   - 方便管理

3. **用容器名稱通訊，不要用 IP**
   - IP 會變
   - 名稱容易理解

4. **敏感服務不要暴露 port**
   - MySQL 不需要 `-p 3306:3306`
   - 只讓同網路的容器存取

### 8.3 範例架構

```
┌─────────────────────────────────────────┐
│            frontend-network             │
│  ┌─────────┐                           │
│  │  nginx  │ ◄─────── Port 80 ─────► 外部
│  │(reverse │                           │
│  │ proxy)  │                           │
│  └────┬────┘                           │
└───────┼─────────────────────────────────┘
        │
┌───────┼─────────────────────────────────┐
│       │       backend-network           │
│  ┌────┴────┐  ┌─────────┐  ┌─────────┐ │
│  │   api   │  │   db    │  │  redis  │ │
│  │ server  │──│  mysql  │  │         │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                  不暴露 port            │
└─────────────────────────────────────────┘
```

nginx 同時在兩個網路，可以連到 api。
db 和 redis 只在 backend-network，外部無法存取。

---

## 九、本堂課小結（2 分鐘）

這堂課學了容器網路：

**三種網路模式**
- bridge：預設，透過虛擬橋接器
- host：直接用主機網路
- none：無網路

**自訂網路的優點**
- 內建 DNS（用容器名稱通訊）
- 網路隔離
- 容易管理

**網路管理命令**
- docker network create/ls/inspect/rm
- docker network connect/disconnect

**最佳實踐**
- 為每個應用建立獨立網路
- 用容器名稱通訊
- 只暴露必要的 port

下一堂：Port Mapping 進階。

---

## 板書 / PPT 建議

1. Bridge 網路架構圖
2. 預設 bridge vs 自訂 bridge 比較
3. 三種網路模式比較表
4. 多網路架構範例圖

---

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

---

# Day 3 第十二小時：Volume 資料持久化

---

## 一、前情提要（2 分鐘）

上堂課講了 Port Mapping。

這堂課講 Volume：
- 為什麼需要 Volume
- 三種資料掛載方式
- Volume 管理
- 備份與還原

---

## 二、為什麼需要 Volume（8 分鐘）

### 2.1 容器的檔案系統是暫時的

還記得容器的分層結構嗎？

```
┌─────────────────────────┐
│   Container Layer       │  ← 可寫，但容器刪除就沒了
├─────────────────────────┤
│   Image Layers          │  ← 唯讀
└─────────────────────────┘
```

容器內的所有寫入都在 Container Layer。
**容器刪除後，這些資料就消失了。**

### 2.2 實驗：資料會消失

```bash
# 建立容器，寫入資料
docker run -it --name test alpine sh
# 在容器內
echo "important data" > /data.txt
exit

# 查看資料
docker start test
docker exec test cat /data.txt
# important data（還在）

# 刪除容器
docker rm -f test

# 重新建立
docker run -it --name test alpine sh
cat /data.txt
# cat: can't open '/data.txt': No such file or directory（不見了）
```

### 2.3 Volume 解決這個問題

Volume 把資料存在容器外部：

```
主機檔案系統
      │
      ▼
┌─────────────────────────┐
│      Volume             │  ← 持久化，容器刪除資料還在
└─────────────────────────┘
      │
      ▼
┌─────────────────────────┐
│   Container             │
└─────────────────────────┘
```

容器來來去去，Volume 裡的資料不受影響。

### 2.4 Volume 的用途

- 資料庫檔案（MySQL、PostgreSQL）
- 上傳的檔案
- 日誌
- 設定檔
- 多容器共享資料

---

## 三、三種掛載方式（15 分鐘）

### 3.1 概覽

| 類型 | 說明 | 適用場景 |
|-----|------|---------|
| Volumes | Docker 管理的儲存區域 | 生產環境資料 |
| Bind Mounts | 掛載主機目錄 | 開發環境、設定檔 |
| tmpfs | 記憶體中的暫存 | 敏感資料、暫存 |

### 3.2 Volumes（Docker 管理）

**建立 Volume**

```bash
docker volume create my-data
```

**使用 Volume**

```bash
docker run -d --name db \
  -v my-data:/var/lib/mysql \
  mysql:8.0
```

**特點**

- 儲存在 `/var/lib/docker/volumes/`
- Docker 完全管理
- 可以跨容器共享
- 容易備份
- 支援 Volume Driver（存到遠端）

**查看 Volume 資訊**

```bash
docker volume inspect my-data
```

輸出：

```json
[
    {
        "Name": "my-data",
        "Mountpoint": "/var/lib/docker/volumes/my-data/_data",
        ...
    }
]
```

### 3.3 Bind Mounts（掛載主機目錄）

**語法**

```bash
docker run -d \
  -v /host/path:/container/path \
  nginx
```

**範例**

```bash
docker run -d --name web \
  -v ~/website:/usr/share/nginx/html \
  -p 8080:80 \
  nginx
```

**特點**

- 直接使用主機檔案系統
- 路徑必須是絕對路徑
- 修改立即生效
- 適合開發環境

**和 Volumes 的差異**

| 方面 | Volumes | Bind Mounts |
|-----|---------|-------------|
| 儲存位置 | Docker 管理的目錄 | 任意主機目錄 |
| 可攜性 | 高（Volume 名稱） | 低（依賴主機路徑） |
| 權限 | Docker 管理 | 依主機設定 |
| 適用場景 | 生產環境 | 開發環境 |

### 3.4 tmpfs（記憶體掛載）

```bash
docker run -d \
  --tmpfs /tmp \
  nginx
```

或：

```bash
docker run -d \
  --mount type=tmpfs,destination=/tmp,tmpfs-size=100m \
  nginx
```

**特點**

- 資料存在記憶體
- 容器停止就消失
- 不會寫入硬碟
- 速度快

**使用場景**

- 敏感資料（不想留在硬碟）
- 需要高速讀寫的暫存檔
- Session 資料

---

## 四、-v 與 --mount 語法（8 分鐘）

### 4.1 兩種語法

Docker 支援兩種掛載語法：

**傳統 -v 語法**

```bash
docker run -v my-vol:/app/data nginx
docker run -v /host/path:/container/path nginx
```

**新 --mount 語法（推薦）**

```bash
docker run --mount type=volume,source=my-vol,target=/app/data nginx
docker run --mount type=bind,source=/host/path,target=/container/path nginx
```

### 4.2 --mount 參數說明

| 參數 | 說明 |
|-----|------|
| type | volume / bind / tmpfs |
| source / src | Volume 名稱或主機路徑 |
| target / dst | 容器內路徑 |
| readonly / ro | 唯讀 |
| volume-opt | Volume 選項 |

### 4.3 範例對照

**Volumes**

```bash
# -v 語法
docker run -v my-data:/app/data nginx

# --mount 語法
docker run --mount type=volume,source=my-data,target=/app/data nginx
```

**Bind Mounts**

```bash
# -v 語法
docker run -v /home/user/data:/app/data nginx

# --mount 語法
docker run --mount type=bind,source=/home/user/data,target=/app/data nginx
```

**唯讀掛載**

```bash
# -v 語法
docker run -v /config:/app/config:ro nginx

# --mount 語法
docker run --mount type=bind,source=/config,target=/app/config,readonly nginx
```

### 4.4 差異與建議

| 方面 | -v | --mount |
|-----|-----|---------|
| 語法 | 簡潔 | 明確 |
| 路徑不存在 | -v 會自動建立 | bind mount 會報錯 |
| 可讀性 | 較差 | 較好 |
| 推薦 | 簡單場景 | 複雜場景 |

官方建議用 `--mount`，因為更明確、不容易出錯。

---

## 五、Volume 管理命令（10 分鐘）

### 5.1 完整命令列表

```bash
# 建立 Volume
docker volume create my-vol

# 列出所有 Volume
docker volume ls

# 查看詳情
docker volume inspect my-vol

# 刪除 Volume
docker volume rm my-vol

# 清理未使用的 Volume
docker volume prune
```

### 5.2 建立 Volume 的選項

```bash
# 使用特定的 driver
docker volume create --driver local my-vol

# 設定選項
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.1,rw \
  --opt device=:/path/to/dir \
  nfs-vol
```

### 5.3 查看 Volume 使用情況

```bash
# 哪些容器使用這個 Volume
docker ps -a --filter volume=my-vol

# Volume 大小（需要進入實際目錄）
sudo du -sh /var/lib/docker/volumes/my-vol/_data
```

### 5.4 匿名 Volume

```bash
docker run -v /app/data nginx
```

沒有指定 Volume 名稱，Docker 會自動建立匿名 Volume（隨機名稱）。

```bash
docker volume ls
# DRIVER    VOLUME NAME
# local     a3b2c1d4e5f6...  ← 匿名 Volume
```

匿名 Volume 難以管理，建議永遠給名稱。

### 5.5 清理 Volume

```bash
# 刪除未被使用的 Volume（危險！）
docker volume prune

# 強制刪除，不詢問
docker volume prune -f
```

**注意**：刪除 Volume 資料就沒了，要謹慎。

---

## 六、資料備份與還原（10 分鐘）

### 6.1 備份 Volume 資料

**方法一：直接複製**

```bash
# 找到 Volume 路徑
docker volume inspect my-data --format '{{.Mountpoint}}'
# /var/lib/docker/volumes/my-data/_data

# 複製資料
sudo cp -r /var/lib/docker/volumes/my-data/_data /backup/
```

**方法二：用容器備份（推薦）**

```bash
docker run --rm \
  -v my-data:/data \
  -v $(pwd):/backup \
  alpine \
  tar cvf /backup/my-data-backup.tar /data
```

這個命令：
1. 建立一個臨時容器
2. 掛載要備份的 Volume 到 /data
3. 掛載主機當前目錄到 /backup
4. 用 tar 打包資料
5. 完成後自動刪除容器

### 6.2 還原 Volume 資料

```bash
docker run --rm \
  -v my-data:/data \
  -v $(pwd):/backup \
  alpine \
  sh -c "cd /data && tar xvf /backup/my-data-backup.tar --strip 1"
```

### 6.3 備份資料庫容器

**MySQL 範例**

```bash
# 備份
docker exec my-mysql mysqldump -u root -p'secret' mydb > backup.sql

# 還原
docker exec -i my-mysql mysql -u root -p'secret' mydb < backup.sql
```

**PostgreSQL 範例**

```bash
# 備份
docker exec my-postgres pg_dump -U postgres mydb > backup.sql

# 還原
docker exec -i my-postgres psql -U postgres mydb < backup.sql
```

---

## 七、實戰：MySQL 資料持久化（5 分鐘）

### 7.1 啟動 MySQL

```bash
# 建立 Volume
docker volume create mysql-data

# 啟動 MySQL
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  -v mysql-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0
```

### 7.2 驗證持久化

```bash
# 建立資料
docker exec -it mysql mysql -uroot -psecret -e "
  USE myapp;
  CREATE TABLE users (id INT, name VARCHAR(50));
  INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');
  SELECT * FROM users;
"

# 刪除容器
docker rm -f mysql

# 重新建立容器（使用同一個 Volume）
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -v mysql-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0

# 資料還在！
docker exec mysql mysql -uroot -psecret -e "SELECT * FROM myapp.users"
```

---

## 八、本堂課小結（2 分鐘）

這堂課學了 Volume：

**為什麼需要 Volume**
- 容器刪除資料就消失
- Volume 讓資料持久化

**三種掛載方式**

| 類型 | 命令 | 用途 |
|-----|------|------|
| Volumes | -v vol-name:/path | 生產環境 |
| Bind Mounts | -v /host:/container | 開發環境 |
| tmpfs | --tmpfs /path | 暫存、敏感資料 |

**Volume 管理**
- docker volume create/ls/inspect/rm
- docker volume prune（清理）

**備份還原**
- 用容器 + tar 備份 Volume
- 資料庫用 mysqldump/pg_dump

下一堂：Dockerfile 入門。

---

## 板書 / PPT 建議

1. 容器檔案系統 vs Volume 示意圖
2. 三種掛載方式比較表
3. -v vs --mount 語法對照
4. 備份指令範例

---

# Day 3 第十三小時：Dockerfile 入門

---

## 一、前情提要（2 分鐘）

前面我們都是用別人做好的映像檔。

這堂課學怎麼自己做映像檔：
- Dockerfile 是什麼
- 基本指令
- 建構映像檔
- 最佳實踐

---

## 二、什麼是 Dockerfile（5 分鐘）

### 2.1 Dockerfile 的定義

Dockerfile 是一個文字檔案，包含一系列指令，描述如何建構 Docker 映像檔。

就像食譜：
- 從什麼基礎材料開始（FROM）
- 需要哪些配料（RUN apt install）
- 怎麼組合（COPY, ADD）
- 最後怎麼呈現（CMD, ENTRYPOINT）

### 2.2 為什麼需要 Dockerfile

**方法一：手動建構（不推薦）**

```bash
docker run -it ubuntu bash
# 在容器內安裝東西...
apt update && apt install -y python3
# 退出
docker commit <container_id> my-image
```

問題：
- 不可重複
- 不知道做了什麼
- 不好維護

**方法二：Dockerfile（推薦）**

```dockerfile
FROM ubuntu
RUN apt update && apt install -y python3
```

優點：
- 版本控制
- 可重複
- 自動化
- 可追蹤變更

### 2.3 基本結構

```dockerfile
# 基礎映像
FROM ubuntu:22.04

# 維護者資訊
LABEL maintainer="you@example.com"

# 執行命令
RUN apt update && apt install -y python3

# 設定工作目錄
WORKDIR /app

# 複製檔案
COPY . .

# 暴露 port
EXPOSE 8080

# 預設命令
CMD ["python3", "app.py"]
```

---

## 三、Dockerfile 指令詳解（25 分鐘）

### 3.1 FROM - 基礎映像

每個 Dockerfile 必須以 FROM 開始。

```dockerfile
FROM ubuntu:22.04
FROM python:3.11-slim
FROM node:20-alpine
FROM scratch  # 空映像，用於靜態編譯的程式
```

**選擇基礎映像的原則**

- 官方映像優先
- 選擇適合的大小（alpine < slim < 預設）
- 指定版本，不要用 latest

### 3.2 RUN - 執行命令

在建構時執行命令。

```dockerfile
# Shell 格式
RUN apt update && apt install -y python3

# Exec 格式
RUN ["apt", "update"]
```

**重要：合併 RUN 減少 Layer**

```dockerfile
# 不好：每個 RUN 產生一個 Layer
RUN apt update
RUN apt install -y python3
RUN apt install -y pip
RUN apt clean

# 好：合併成一個 Layer
RUN apt update && \
    apt install -y python3 pip && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*
```

### 3.3 COPY - 複製檔案

從主機複製檔案到映像。

```dockerfile
# 複製單一檔案
COPY app.py /app/

# 複製目錄
COPY src/ /app/src/

# 複製多個檔案
COPY package.json package-lock.json /app/

# 使用萬用字元
COPY *.py /app/
```

### 3.4 ADD - 複製檔案（進階）

和 COPY 類似，但有額外功能：

```dockerfile
# 自動解壓縮 tar
ADD app.tar.gz /app/

# 支援 URL（不推薦）
ADD https://example.com/file.tar.gz /app/
```

**建議：優先用 COPY，除非需要解壓功能。**

### 3.5 WORKDIR - 設定工作目錄

```dockerfile
WORKDIR /app

# 之後的命令都在 /app 下執行
RUN npm install
COPY . .
```

可以多次設定，路徑會累加：

```dockerfile
WORKDIR /app
WORKDIR src
# 現在在 /app/src
```

### 3.6 ENV - 環境變數

```dockerfile
ENV NODE_ENV=production
ENV APP_HOME=/app
ENV PATH=$APP_HOME/bin:$PATH
```

容器執行時這些環境變數會存在。

### 3.7 ARG - 建構時的參數

```dockerfile
ARG VERSION=1.0
ARG BASE_IMAGE=python:3.11

FROM ${BASE_IMAGE}
RUN echo "Building version ${VERSION}"
```

建構時可以覆蓋：

```bash
docker build --build-arg VERSION=2.0 .
```

**ARG vs ENV**

| 指令 | 何時可用 | 容器內可用 |
|-----|---------|-----------|
| ARG | 建構時 | 否 |
| ENV | 建構時 + 執行時 | 是 |

### 3.8 EXPOSE - 宣告 Port

```dockerfile
EXPOSE 80
EXPOSE 443
EXPOSE 8080/tcp
EXPOSE 53/udp
```

**注意**：EXPOSE 只是宣告，不會真的開啟 port。執行時還是要 `-p`。

### 3.9 CMD - 預設命令

容器啟動時執行的預設命令。

```dockerfile
# Exec 格式（推薦）
CMD ["python3", "app.py"]

# Shell 格式
CMD python3 app.py
```

**特點**

- 只能有一個 CMD
- 可以被 docker run 覆蓋

```bash
docker run my-image            # 執行 CMD
docker run my-image bash       # 覆蓋 CMD
```

### 3.10 ENTRYPOINT - 入口點

定義容器的主程式。

```dockerfile
ENTRYPOINT ["python3", "app.py"]
```

**ENTRYPOINT vs CMD**

```dockerfile
ENTRYPOINT ["python3"]
CMD ["app.py"]
```

- ENTRYPOINT：固定的執行程式
- CMD：提供預設參數，可被覆蓋

```bash
docker run my-image              # 執行 python3 app.py
docker run my-image other.py     # 執行 python3 other.py
```

### 3.11 USER - 執行使用者

```dockerfile
# 建立使用者
RUN useradd -m appuser

# 切換使用者
USER appuser

# 之後的命令都用 appuser 執行
```

**安全最佳實踐**：不要用 root 跑應用程式。

### 3.12 VOLUME - 宣告資料卷

```dockerfile
VOLUME /data
VOLUME ["/data", "/config"]
```

Docker 會自動建立匿名 Volume。

### 3.13 HEALTHCHECK - 健康檢查

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

---

## 四、建構映像檔（10 分鐘）

### 4.1 docker build 基本用法

```bash
docker build -t my-app:v1 .
```

- `-t`：指定名稱和 tag
- `.`：Dockerfile 所在目錄（build context）

### 4.2 指定 Dockerfile

```bash
# 預設找 ./Dockerfile
docker build -t my-app .

# 指定其他檔案
docker build -t my-app -f Dockerfile.prod .
docker build -t my-app -f docker/Dockerfile .
```

### 4.3 Build Context

`.` 是 build context，會把這個目錄的內容送給 Docker Daemon。

大目錄會很慢，用 `.dockerignore` 排除不需要的檔案。

### 4.4 .dockerignore

```
# .dockerignore
node_modules
.git
*.log
.env
Dockerfile
.dockerignore
```

就像 .gitignore，但用於 Docker build。

### 4.5 查看建構過程

```bash
docker build -t my-app .

# 輸出
Step 1/5 : FROM python:3.11-slim
 ---> abc123
Step 2/5 : WORKDIR /app
 ---> Running in def456
 ---> 789xyz
Step 3/5 : COPY requirements.txt .
 ---> Using cache        # 快取命中
 ---> 111aaa
...
Successfully built bbb222
Successfully tagged my-app:latest
```

### 4.6 不使用快取

```bash
docker build --no-cache -t my-app .
```

強制重新建構所有 Layer。

---

## 五、實作：打包 Python 應用（8 分鐘）

### 5.1 準備檔案

**app.py**

```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello from Docker!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**requirements.txt**

```
flask==3.0.0
```

### 5.2 撰寫 Dockerfile

```dockerfile
# 基礎映像
FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 先複製依賴檔案（利用快取）
COPY requirements.txt .

# 安裝依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製程式碼
COPY app.py .

# 暴露 port
EXPOSE 5000

# 啟動命令
CMD ["python", "app.py"]
```

### 5.3 建構和執行

```bash
# 建構
docker build -t my-flask-app:v1 .

# 執行
docker run -d -p 5000:5000 my-flask-app:v1

# 測試
curl http://localhost:5000
# Hello from Docker!
```

---

## 六、Dockerfile 最佳實踐（8 分鐘）

### 6.1 減少 Layer 數量

```dockerfile
# 不好
RUN apt update
RUN apt install -y python3
RUN apt clean

# 好
RUN apt update && \
    apt install -y python3 && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*
```

### 6.2 善用快取

把不常變動的放前面：

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# 先複製依賴檔案（不常變）
COPY requirements.txt .
RUN pip install -r requirements.txt

# 最後複製程式碼（常變）
COPY . .

CMD ["python", "app.py"]
```

這樣改程式碼時，pip install 那層可以用快取。

### 6.3 不要用 root

```dockerfile
FROM python:3.11-slim

RUN useradd -m appuser

WORKDIR /app
COPY --chown=appuser:appuser . .

USER appuser

CMD ["python", "app.py"]
```

### 6.4 清理暫存檔案

```dockerfile
RUN apt update && \
    apt install -y build-essential && \
    pip install -r requirements.txt && \
    apt purge -y build-essential && \
    apt autoremove -y && \
    rm -rf /var/lib/apt/lists/*
```

在同一個 RUN 裡安裝、編譯、清理，避免中間層留下垃圾。

### 6.5 使用具體版本

```dockerfile
# 不好
FROM python
RUN pip install flask

# 好
FROM python:3.11.7-slim
RUN pip install flask==3.0.0
```

---

## 七、本堂課小結（2 分鐘）

這堂課學了 Dockerfile：

**核心指令**

| 指令 | 功能 |
|-----|------|
| FROM | 基礎映像 |
| RUN | 執行命令 |
| COPY | 複製檔案 |
| WORKDIR | 工作目錄 |
| ENV | 環境變數 |
| EXPOSE | 宣告 port |
| CMD | 預設命令 |
| ENTRYPOINT | 入口點 |

**建構指令**

```bash
docker build -t name:tag .
```

**最佳實踐**
- 合併 RUN 減少 Layer
- 善用快取（不常變的放前面）
- 不用 root
- 清理暫存檔
- 使用具體版本

下一堂：Dockerfile 實戰與課程總結。

---

## 板書 / PPT 建議

1. Dockerfile 指令列表
2. 建構流程圖
3. Layer 快取原理
4. CMD vs ENTRYPOINT 比較

---

# Day 3 第十四小時：Dockerfile 實戰與課程總結

---

## 一、前情提要（2 分鐘）

上堂課學了 Dockerfile 基本指令。

這堂課進入實戰：
- Multi-stage Build
- 完整專案打包
- 常見問題排解
- 課程總回顧
- 銜接 Kubernetes

---

## 二、Multi-stage Build（15 分鐘）

### 2.1 為什麼需要 Multi-stage

傳統 Dockerfile 的問題：

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

這個映像檔會包含：
- 原始碼
- 開發依賴（devDependencies）
- 建構工具（TypeScript、Webpack 等）

結果：映像檔很大，而且有不必要的檔案。

### 2.2 Multi-stage Build 原理

```
Stage 1: Build Stage          Stage 2: Production Stage
┌─────────────────────┐       ┌─────────────────────┐
│ Node.js + npm       │       │ Node.js（精簡）      │
│ 原始碼              │  ──►  │ 編譯後的程式碼       │
│ 編譯工具            │ COPY  │ 生產依賴            │
│ devDependencies     │       │                     │
│ 編譯後的程式碼       │       │                     │
└─────────────────────┘       └─────────────────────┘
     1.2 GB                        200 MB
```

只把需要的東西複製到最終映像檔。

### 2.3 Multi-stage Dockerfile

```dockerfile
# ===== Stage 1: Build =====
FROM node:20 AS builder

WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm ci

# 複製原始碼並建構
COPY . .
RUN npm run build

# ===== Stage 2: Production =====
FROM node:20-slim

WORKDIR /app

# 只複製需要的檔案
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 非 root 使用者
RUN useradd -m appuser
USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 2.4 關鍵語法

**命名 Stage**

```dockerfile
FROM node:20 AS builder
```

**從其他 Stage 複製**

```dockerfile
COPY --from=builder /app/dist ./dist
```

**從外部映像檔複製**

```dockerfile
COPY --from=nginx:alpine /etc/nginx/nginx.conf /etc/nginx/
```

### 2.5 Go 語言範例

Go 可以編譯成靜態二進位，Multi-stage 效果更明顯：

```dockerfile
# Build stage
FROM golang:1.21 AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# 靜態編譯
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Production stage - 使用空映像！
FROM scratch

COPY --from=builder /app/main /main

ENTRYPOINT ["/main"]
```

最終映像檔只有幾 MB，因為 `scratch` 是空的。

### 2.6 Java 範例

```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn package -DskipTests

# Production stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 三、完整專案打包實戰（15 分鐘）

### 3.1 專案結構

假設有一個 Node.js + TypeScript 專案：

```
my-api/
├── src/
│   ├── index.ts
│   ├── routes/
│   └── services/
├── package.json
├── package-lock.json
├── tsconfig.json
├── .dockerignore
└── Dockerfile
```

### 3.2 .dockerignore

```
# .dockerignore
node_modules
npm-debug.log
dist
.git
.gitignore
.env
.env.*
*.md
.vscode
.idea
coverage
tests
__tests__
*.test.ts
*.spec.ts
Dockerfile
docker-compose.yml
```

### 3.3 完整 Dockerfile

```dockerfile
# ===== Build Stage =====
FROM node:20-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝所有依賴（包含 devDependencies）
RUN npm ci

# 複製原始碼
COPY tsconfig.json ./
COPY src ./src

# 建構 TypeScript
RUN npm run build

# 移除 devDependencies，只留生產依賴
RUN npm ci --only=production

# ===== Production Stage =====
FROM node:20-alpine

# 安裝 dumb-init（正確處理信號）
RUN apk add --no-cache dumb-init

# 設定環境變數
ENV NODE_ENV=production

# 建立非 root 使用者
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 設定工作目錄
WORKDIR /app

# 從 builder 複製檔案
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# 切換使用者
USER appuser

# 暴露 port
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 使用 dumb-init 啟動
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### 3.4 為什麼用 dumb-init

Node.js（和大多數應用程式）不善於處理 Linux 信號。

問題：
- `docker stop` 發送 SIGTERM
- Node.js 可能不正確處理
- 導致強制 kill（資料可能遺失）

`dumb-init` 是一個輕量的 init 系統，正確轉發信號。

### 3.5 建構和測試

```bash
# 建構
docker build -t my-api:v1 .

# 查看大小
docker images my-api:v1

# 執行
docker run -d --name my-api \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  my-api:v1

# 查看日誌
docker logs -f my-api

# 測試健康檢查
docker inspect --format='{{.State.Health.Status}}' my-api

# 停止（測試優雅關閉）
docker stop my-api
```

### 3.6 映像檔大小優化

**優化前後比較**

| 版本 | 大小 |
|-----|------|
| node:20 + 所有檔案 | ~1.2 GB |
| node:20-slim + Multi-stage | ~300 MB |
| node:20-alpine + Multi-stage | ~150 MB |

**優化技巧**

1. 使用 alpine 基礎映像
2. Multi-stage build
3. 只安裝生產依賴
4. 清理快取
5. 合併 RUN 指令

---

## 四、常見問題排解（10 分鐘）

### 4.1 建構緩慢

**問題**：每次建構都重新安裝依賴

**原因**：COPY . . 在 npm install 之前，任何檔案變動都導致快取失效

**解決**：先複製 package.json

```dockerfile
# 好
COPY package*.json ./
RUN npm install
COPY . .

# 不好
COPY . .
RUN npm install
```

### 4.2 映像檔太大

**診斷**

```bash
docker history my-image:latest
```

查看每一層的大小。

**常見原因**

- 沒用 Multi-stage
- 基礎映像太大（用 alpine）
- 沒清理快取
- 複製了不需要的檔案（用 .dockerignore）

### 4.3 容器無法啟動

**診斷步驟**

```bash
# 1. 查看日誌
docker logs my-container

# 2. 互動式執行
docker run -it my-image sh

# 3. 檢查 CMD/ENTRYPOINT
docker inspect my-image --format='{{.Config.Cmd}}'
docker inspect my-image --format='{{.Config.Entrypoint}}'
```

**常見原因**

- 命令不存在
- 權限問題
- 缺少依賴
- 環境變數未設定

### 4.4 COPY 失敗

**錯誤訊息**

```
COPY failed: file not found in build context
```

**原因**

- 檔案不在 build context
- 被 .dockerignore 排除
- 路徑錯誤

**診斷**

```bash
# 查看 build context 裡有什麼
docker build -t test --progress=plain .
```

### 4.5 權限問題

**問題**：容器內無法寫入檔案

**原因**：使用非 root 使用者，但目錄屬於 root

**解決**

```dockerfile
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data
USER appuser
```

或用 COPY --chown：

```dockerfile
COPY --chown=appuser:appgroup . .
```

---

## 五、Docker 課程總回顧（10 分鐘）

### 5.1 兩天學習內容

**Day 2：Docker 基礎**

| 小時 | 主題 | 重點 |
|-----|------|------|
| 1 | 環境一致性問題 | 為什麼需要容器 |
| 2 | Docker 架構 | Client-Daemon-Registry |
| 3 | Docker 安裝 | CentOS、Ubuntu、Desktop |
| 4 | 基本指令（上） | pull、images、run、ps |
| 5 | 基本指令（下） | stop、rm、logs、exec |
| 6 | Nginx 實戰 | Port mapping、Volume |
| 7 | 實作練習 | 綜合應用 |

**Day 3：Docker 進階**

| 小時 | 主題 | 重點 |
|-----|------|------|
| 8 | 映像檔深入 | 分層、儲存、快取 |
| 9 | 容器生命週期 | 狀態、資源限制、重啟 |
| 10 | 容器網路 | Bridge、Host、自訂網路 |
| 11 | Port Mapping | -p 語法、綁定策略 |
| 12 | Volume | 三種掛載、備份還原 |
| 13 | Dockerfile | 指令、建構 |
| 14 | Dockerfile 實戰 | Multi-stage、完整範例 |

### 5.2 核心概念回顧

**容器 vs 虛擬機**

```
容器                        虛擬機
┌─────────────────┐        ┌─────────────────┐
│    App A        │        │    App A        │
├─────────────────┤        ├─────────────────┤
│   Container     │        │   Guest OS      │
├─────────────────┤        ├─────────────────┤
│   Docker Engine │        │   Hypervisor    │
├─────────────────┤        ├─────────────────┤
│   Host OS       │        │   Host OS       │
└─────────────────┘        └─────────────────┘
     輕量、快速                  完全隔離
```

**Docker 三元素**

```
Registry (Docker Hub)
        │
        │ docker pull
        ▼
      Image ──────────► Container
              docker run
```

**Dockerfile 流程**

```
Dockerfile ──► docker build ──► Image ──► docker run ──► Container
```

### 5.3 重要指令速查

**映像檔**

```bash
docker pull nginx:alpine
docker images
docker rmi nginx
docker build -t myapp:v1 .
```

**容器**

```bash
docker run -d --name web -p 8080:80 nginx
docker ps -a
docker logs -f web
docker exec -it web sh
docker stop web
docker rm web
```

**網路**

```bash
docker network create mynet
docker run --network mynet ...
docker network ls
```

**Volume**

```bash
docker volume create mydata
docker run -v mydata:/data ...
docker volume ls
```

### 5.4 最佳實踐回顧

1. **映像檔**
   - 指定版本，不用 latest
   - 使用官方映像
   - 選擇 alpine 或 slim

2. **Dockerfile**
   - Multi-stage build
   - 合併 RUN 減少 Layer
   - 不常變的放前面（利用快取）
   - 不用 root

3. **容器**
   - 一個容器一個程序
   - 設定資源限制
   - 使用健康檢查
   - 使用 restart policy

4. **網路**
   - 使用自訂網路（有 DNS）
   - 只暴露必要的 port
   - 敏感服務不要對外

5. **Volume**
   - 重要資料用 Volume
   - 定期備份
   - 給 Volume 有意義的名稱

---

## 六、銜接 Kubernetes（6 分鐘）

### 6.1 Docker 的限制

單機 Docker 可以管理幾個、幾十個容器。

但當你有：
- 數百個容器
- 多台主機
- 需要高可用性
- 需要自動擴展
- 需要滾動更新

單機 Docker 不夠用了。

### 6.2 為什麼需要 Kubernetes

Kubernetes 解決的問題：

| 問題 | Kubernetes 解決方案 |
|-----|---------------------|
| 多主機管理 | 叢集（Cluster） |
| 容器調度 | Scheduler |
| 高可用 | ReplicaSet |
| 負載均衡 | Service |
| 滾動更新 | Deployment |
| 設定管理 | ConfigMap、Secret |
| 儲存管理 | PersistentVolume |

### 6.3 Docker 到 Kubernetes

Docker 的概念在 Kubernetes 裡的對應：

| Docker | Kubernetes |
|--------|------------|
| Container | Pod |
| docker run | kubectl create |
| docker-compose | Deployment + Service |
| 手動擴展 | ReplicaSet 自動擴展 |
| 手動健康檢查 | Liveness/Readiness Probe |

### 6.4 下一步學習

Kubernetes 課程將包含：

- Kubernetes 架構（Master、Node）
- Pod 基本操作
- Deployment 部署
- Service 網路
- Ingress 入口
- ConfigMap 和 Secret
- 持久化儲存
- Helm 套件管理

### 6.5 Docker 技能的延續

你在 Docker 學到的：
- 容器化思維
- Dockerfile 撰寫
- 映像檔管理
- 網路和 Volume 概念

這些在 Kubernetes 都會用到！

Kubernetes 是 Docker 的延伸，不是替代。

---

## 七、課程總結與問答（2 分鐘）

### 7.1 學習成果

完成這兩天的課程，你應該能夠：

- 理解容器化的價值
- 使用 Docker 指令管理容器
- 撰寫 Dockerfile 打包應用程式
- 設定網路和資料持久化
- 為 Kubernetes 做好準備

### 7.2 課後練習建議

1. 把自己的專案容器化
2. 用 Multi-stage Build 優化映像檔
3. 設定適當的健康檢查
4. 嘗試多容器應用（資料庫 + 應用）
5. 練習備份和還原 Volume

### 7.3 推薦資源

- Docker 官方文件：docs.docker.com
- Docker Hub：hub.docker.com
- Play with Docker：labs.play-with-docker.com
- Kubernetes 官方文件：kubernetes.io/docs

### 7.4 下次見

下一堂課，我們將進入 Kubernetes 的世界！

---

## 板書 / PPT 建議

1. Multi-stage Build 流程圖
2. 完整 Dockerfile 範例
3. 兩天課程內容總覽表
4. Docker 到 Kubernetes 對應表
