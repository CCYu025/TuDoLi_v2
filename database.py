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
    if not os.path.exists("backups"):
        os.makedirs("backups")
    today_str = datetime.now().strftime("%Y-%m-%d")
    backup_filename = f"backups/work_logs_backup_{today_str}.db"
    if not os.path.exists(backup_filename) and os.path.exists(DB_NAME):
        try:
            shutil.copy2(DB_NAME, backup_filename)
            print(f"📦 自動備份完成: {backup_filename}")
        except Exception as e:
            print(f"⚠️ 備份失敗: {e}")

def init_db():
    backup_db() # 啟動時先備份
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS daily_logs 
                          (id INTEGER PRIMARY KEY AUTOINCREMENT, log_date TEXT UNIQUE)''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS log_items 
                          (id INTEGER PRIMARY KEY AUTOINCREMENT, log_id INTEGER, 
                           title TEXT, content TEXT, tags TEXT, is_done INTEGER, sort_order INTEGER,
                           FOREIGN KEY (log_id) REFERENCES daily_logs (id))''')
        # 檢查舊欄位相容性
        try:
            cursor.execute("SELECT tags FROM log_items LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE log_items ADD COLUMN tags TEXT DEFAULT ''")
        conn.commit()