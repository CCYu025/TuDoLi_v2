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

    if not os.path.exists(backup_filename) and os.path.exists(DB_NAME):
        try:
            shutil.copy2(DB_NAME, backup_filename)
            print(f"📦 自動備份完成: {backup_filename}")
        except Exception as e:
            print(f"⚠️ 備份失敗: {e}")


def init_db():
    """初始化資料庫：建立所有必要的資料表與結構遷移"""
    backup_db()

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # --- 1. 工作日誌系統 ---
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
            is_done
            INTEGER,
            sort_order
            INTEGER,
            tags
            TEXT
            DEFAULT
            '',
            item_id
            TEXT,
            origin_id
            TEXT, -- ✅ 新增：源頭 ID
            parent_id
            TEXT, -- ✅ 新增：父層 ID
            relation_type
            TEXT, -- ✅ 新增：關係類型 (inherit/evolve)
            FOREIGN
            KEY
                          (
            log_id
                          ) REFERENCES daily_logs
                          (
                              id
                          )
            )''')

        # --- 資料庫遷移檢測 (Migration) ---

        # 1. 檢查 tags 欄位
        try:
            cursor.execute("SELECT tags FROM log_items LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE log_items ADD COLUMN tags TEXT DEFAULT ''")
            print("🔧 資料庫更新：已新增 tags 欄位")

        # 2. 檢查 item_id 欄位
        try:
            cursor.execute("SELECT item_id FROM log_items LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE log_items ADD COLUMN item_id TEXT")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_log_items_item_id ON log_items(item_id)")
            print("🔧 資料庫更新：已新增 item_id 欄位")

        # 3. 檢查專案進化樹欄位 (本次新增)
        try:
            cursor.execute("SELECT origin_id FROM log_items LIMIT 1")
        except sqlite3.OperationalError:
            # 依序新增三個欄位
            cursor.execute("ALTER TABLE log_items ADD COLUMN origin_id TEXT")
            cursor.execute("ALTER TABLE log_items ADD COLUMN parent_id TEXT")
            cursor.execute("ALTER TABLE log_items ADD COLUMN relation_type TEXT")

            # ✅ 建立索引：這對未來的「專案脈絡地圖」查詢至關重要
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_log_items_origin_id ON log_items(origin_id)")
            print("🔧 資料庫更新：已啟用專案進化樹 (origin/parent/relation)")

        # --- 2. 原子習慣定義表 ---
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

        # --- 3. 原子習慣紀錄表 ---
        cursor.execute('''CREATE TABLE IF NOT EXISTS habit_logs
        (
            id
            INTEGER
            PRIMARY
            KEY
            AUTOINCREMENT,
            date
            TEXT,
            habit_id
            INTEGER,
            status
            INTEGER,
            FOREIGN
            KEY
                          (
            habit_id
                          ) REFERENCES habit_definitions
                          (
                              id
                          ))''')

        # --- 4. 習慣群組表 ---
        cursor.execute('''CREATE TABLE IF NOT EXISTS habit_groups
                          (
                              id
                              INTEGER
                              PRIMARY
                              KEY
                              AUTOINCREMENT,
                              name
                              TEXT
                              DEFAULT
                              'New Chain',
                              sort_order
                              INTEGER
                              DEFAULT
                              0
                          )''')

        conn.commit()