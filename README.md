# Daily Logger - 增量型專案日誌與原子習慣系統 (v2.2)

這是一個專為開發者與高效能人士設計的「心智輔助系統」。
結合了 **Python (FastAPI)** 的高效後端與 **Vanilla JS** 的極簡物理感介面。本專案不僅是一個工具，更是對「極簡主義」與「資料完整性」的極致實踐。

## 🌟 核心開發進度：增量儲存與統一膠囊語言

### 📝 增量型專案日誌 (Project Log 2.0)
* **UUID 增量識別技術**：捨棄傳統「覆蓋式更新」，為每一筆紀錄配置唯一 UUID。後端採用 `UPSERT` 邏輯，即便在高頻率同步下，也能確保資料絕對不遺失。
* **無感防抖自動儲存 (Zero-click Sync)**：實現「不用點擊儲存按鈕」的體驗。透過防抖 (Debounce) 機制，當使用者停止輸入 1.2 秒後，系統自動安靜地完成資料同步。
* **狀態呼吸燈 (Sync Status UI)**：去字化設計。透過右上角的呼吸燈號（黃燈：編輯中 / 藍燈：同步中 / 綠燈：已存檔）即時回饋系統狀態。
* **物理膠囊變身 (Morphing UI)**：
    * **標籤膠囊化**：輸入標籤後按空白鍵或 Enter，文字會立即「砰」地一聲變身為可交互的物理膠囊。
    * **任務變身動畫**：勾選完成後，卡片會自動收摺、變形為與「原子習慣」模組相同的窄長膠囊。實現全系統設計語彙統一。
* **足跡回顧與專案繼承**：增強的歷史抽屜，支援「一鍵繼承 (Continue)」功能，讓過去的專案脈絡能無縫銜接到今天的任務中。

### ⚛️ 原子習慣模組 (Atomic Habits)
* **融合膠囊 (Fusion Bar)**：首創托盤化堆疊設計。將多個習慣橫向堆疊成一組能量條，視覺化呈現行為的連續性。
* **物理互動設定頁**：
    * **托盤拖曳**：將習慣「丟入」托盤即可完成群組，變身縮圖。
    * **自動解散機制**：智慧判斷無效群組（少於 2 項時），在關閉彈窗後自動還原，維持數據庫簡潔。

---

## 🛠 技術規格 (Technical Stack)

* **後端 (Backend)**: 
    * FastAPI (高效能異步框架)
    * SQLAlchemy + SQLite (支援 UUID UNIQUE 索引與 UPSERT 衝突處理)
* **前端 (Frontend)**:
    * Vanilla JavaScript (ES6+)
    * Tailwind CSS (極簡 UI 框架)
    * Sortable.js (實現物理拖拽與磁吸感)
* **核心邏輯**:
    * 防抖儲存 (Debounced Persistence)
    * DOM Morphing (狀態切換動畫)
    * Incremental Sync (UUID 增量同步)

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