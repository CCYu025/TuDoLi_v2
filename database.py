import sqlite3
import os
import shutil
from datetime import datetime

DB_NAME = "work_logs.db"


def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def backup_db():
    """啟動時自動備份資料庫"""
    if not os.path.exists("backups"):
        os.makedirs("backups")

    today_str = datetime.now().strftime("%Y-%m-%d")
    backup_filename = f"backups/work_logs_backup_{today_str}.db"

    # 如果今天還沒備份過，且資料庫存在，就執行備份
    if not os.path.exists(backup_filename) and os.path.exists(DB_NAME):
        try:
            shutil.copy2(DB_NAME, backup_filename)
            print(f"📦 自動備份完成: {backup_filename}")
        except Exception as e:
            print(f"⚠️ 備份失敗: {e}")


def init_db():
    """初始化資料庫：建立所有必要的資料表"""
    backup_db()  # 啟動時先備份，安全第一

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # --- 1. 原有的工作日誌系統 ---
        cursor.execute('''CREATE TABLE IF NOT EXISTS daily_logs
                          (
                              id
                              INTEGER
                              PRIMARY
                              KEY
                              AUTOINCREMENT,
                              log_date
                              TEXT
                              UNIQUE
                          )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS log_items
        (
            id
            INTEGER
            PRIMARY
            KEY
            AUTOINCREMENT,
            log_id
            INTEGER,
            title
            TEXT,
            content
            TEXT,
            tags
            TEXT,
            is_done
            INTEGER,
            sort_order
            INTEGER,
            FOREIGN
            KEY
                          (
            log_id
                          ) REFERENCES daily_logs
                          (
                              id
                          ))''')

        # 檢查舊資料庫相容性 (tags 欄位)
        try:
            cursor.execute("SELECT tags FROM log_items LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE log_items ADD COLUMN tags TEXT DEFAULT ''")

        # --- 2. 新增：原子習慣定義表 (Habit Definitions) ---
        # 儲存習慣的名稱、顏色、組合與建立時間
        cursor.execute('''CREATE TABLE IF NOT EXISTS habit_definitions
                          (
                              id
                              INTEGER
                              PRIMARY
                              KEY
                              AUTOINCREMENT,
                              title
                              TEXT,
                              color
                              TEXT
                              DEFAULT
                              '#3B82F6',
                              group_id
                              INTEGER
                              DEFAULT
                              0,
                              created_at
                              TEXT
                              DEFAULT
                              CURRENT_DATE,
                              is_archived
                              INTEGER
                              DEFAULT
                              0,
                              sort_order
                              INTEGER
                              DEFAULT
                              0
                          )''')

        # --- 3. 新增：原子習慣紀錄表 (Habit Logs) ---
        # 儲存每天的打卡狀態 (1=完成, 0=失敗/反向剔除)
        # 複合主鍵 UNIQUE(log_date, habit_id) 確保每天每個習慣只有一筆紀錄
        cursor.execute('''CREATE TABLE IF NOT EXISTS habit_logs
        (
            id
            INTEGER
            PRIMARY
            KEY
            AUTOINCREMENT,
            log_date
            TEXT,
            habit_id
            INTEGER,
            status
            INTEGER,
            UNIQUE
                          (
            log_date,
            habit_id
                          ))''')

        conn.commit()