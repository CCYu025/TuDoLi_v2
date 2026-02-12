# Daily Logger - 增量型專案日誌與原子習慣系統 (v2.6)

這是一個將「專案管理」與「RPG 成長機制」完美融合的生產力系統。
本版本核心突破在於建立了專案的「血緣脈絡」，讓每一項任務都能回溯其演化過程。

## 🌟 核心開發進度

### 🧬 專案進化樹 (Project Evolution Tree) - RPG 模式
* **雙軌演進邏輯**：
    * **繼承 (Inherit)**：線性任務延續，保留專案靈魂並承接前日進度。
    * **轉職 (Evolve)**：專案里程碑躍遷，標記新的開發階段，建立分歧路徑。
* **專案 DNA 脈絡地圖 (Project DNA Map)**：
    * **視覺化畫布**：點擊標題旁的 DNA 按鈕，召喚基於毛玻璃效果的演化地圖。
    * **里程碑托盤 (Milestone Trays)**：採用原子習慣設計語彙，將專案階段化分組，搭配垂直時間軸線。
    * **物理重整 (Drag-to-Reparent)**：支援在地圖中直接「跨里程碑」拖曳任務，視覺化修正專案歸屬關係，後端即時同步血緣 ID。

### 📝 智慧日誌優化 (Refined Logs)
* **關係鎖定**：資料庫新增 `origin_id` (始祖)、`parent_id` (父層) 與 `relation_type`，確保專案脈絡即便在修改標題後仍能精準追蹤。
* **去字化狀態指示**：整合 Favicon 品牌識別與呼吸燈同步回饋，打造極致安靜的編輯體驗。

### ⚛️ 原子習慣模組 (Atomic Habits)
* **設計語彙統一**：全系統膠囊語言 (Capsule Language) 同步，從日誌成就到習慣能量條，提供一致的物理手感。

---

## 🛠 技術架構 (Low Coupling)
* **Backend**: FastAPI 模組化路由 (`logs.py`, `habits.py`, `project.py`)。
* **Database**: SQLite 具備自動遷移 (Auto-migration) 功能，支援關係索引加速。
* **Frontend**: Vanilla JS 與 Sortable.js 驅動的低耦合模組系統。

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