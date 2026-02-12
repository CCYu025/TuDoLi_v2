# Daily Logger - 增量型專案日誌與原子習慣系統 (v2.3)

這是一個專為開發者與追求「極致物理感」的使用者設計的生產力系統。
結合了 Python (FastAPI) 後端與 Vanilla JS 前端，本產品專注於「無感操作」與「成就轉化」的設計哲學。

## 🌟 核心開發進度

### 📝 智慧專案日誌 (Smart Project Log)
* **UUID 增量同步技術**：每一筆紀錄具備唯一 UUID。後端採用 UPSERT 機制，僅同步變動項，徹底解決傳統系統「全覆寫」帶來的數據風險。
* **無感防抖自動儲存 (Zero-friction Sync)**：1.2 秒智慧防抖儲存，配備「去字化呼吸燈號」即時回饋同步狀態。
* **物理膠囊設計語言 (Capsule Morphing)**：
    * **全方位標籤系統**：支援「空白鍵」、「Enter 鍵」及「移開游標 (Blur)」三重觸發機制，實現文字到膠囊的無縫轉換。
    * **成就變身動畫**：完成任務後，卡片會優雅收摺為「白色、綠邊、無刪除線」的成就膠囊，營造「紀錄資產」而非「毀壞任務」的視覺感。
* **動態優先權排序 (Smart Sorting)**：
    * **沉底邏輯**：勾選完成後，項目自動滑動至列表最下方，讓視覺焦點集中在待辦事項。
    * **浮頂邏輯 (Top Priority)**：取消勾選後，該項目視為當前主要對象，自動彈升至列表最頂端。
* **安全鎖定機制**：收摺後的成就膠囊自動隱藏「垃圾桶」圖案，防止誤刪已完成的寶貴紀錄。

### ⚛️ 原子習慣模組 (Atomic Habits)
* **融合膠囊 (Fusion Bar)**：首創托盤化設計，將多個習慣橫向堆疊成能量條。
* **物理互動設定**：透過「丟入托盤」與「拖回池子」進行行為組合，達成 0 文字的操作門檻。

---

## 🛠 技術規格
* **Backend**: FastAPI, SQLite (Incremental Logic)
* **Frontend**: Vanilla JS, Tailwind CSS, Sortable.js
* **UX Strategy**: 肌肉記憶導向、物理直覺回饋、成就鎖定邏輯。

---

## 🎯 設計哲學 (Design Philosophy)

1.  **極簡主義 (Minimalism)**：盡可能減少文字提示，依賴顏色、Icon 與物理直覺進行溝通。
2.  **去字化 (Text-free Experience)**：讓介面呼吸，移除冗餘的按鈕與說明。
3.  **絲滑體驗 (Frictionless)**：減少使用者的決策成本（例如不需要思考要不要存檔）。

---

## 📦 安裝與啟動
1.  `pip install -r requirements.txt`
2.  `python main.py`
3.  訪問 `http://127.0.0.1:8000`

## 📂 專案結構

* `main.py`
* `database.py`
* `routers/`
    * `logs.py`
    * `habits.py`
* `static/`: 
    * `js/habit_mod.js`
    * `css/style.css`