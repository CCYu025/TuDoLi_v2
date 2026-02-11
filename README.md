# Daily Logger - 增量型專案日誌系統

這是一個基於 Python (FastAPI) + SQLite + Vanilla JS 開發的個人專案管理工具。
專為長期專案（3年以上）設計，採用「增量儲存」架構，解決傳統日誌檔案過大且難以回溯的問題。

## 🚀 功能特色

* **增量儲存 (Incremental Storage)**：資料庫僅儲存當日新增內容，匯出報告極度乾淨。
* **專案儀表板 (Project Dashboard)**：自動溯源歷史紀錄，以時間軸呈現專案脈絡。
* **視覺化優化**：去除刪除線，採用色彩弱化與綠色勾勾，提升閱讀體驗。
* **模組化架構**：後端路由與前端邏輯分離，易於維護與擴充。
* **自動備份**：每次啟動時自動備份資料庫。

## 🛠️ 安裝與執行

1.  **安裝依賴**
    ```bash
    pip install -r requirements.txt
    ```

2.  **啟動伺服器**
    ```bash
    python main.py
    ```

3.  **開啟應用**
    瀏覽器訪問：`http://127.0.0.1:8000`

## 📂 專案結構

* `main.py`: 程式進入點
* `database.py`: 資料庫連線與初始化
* `routers/`: API 路由模組 (Logs, Habits...)
* `static/`: 前端資源 (HTML, JS, CSS)
* `backups/`: 資料庫自動備份存檔 (Git 已忽略)

## 📅 未來計畫

* [ ] 實作「原子習慣」模組 (一鍵打卡、反向剔除)
* [ ] 加入專案熱點圖 (Heatmap)