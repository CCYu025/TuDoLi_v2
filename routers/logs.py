from fastapi import APIRouter, HTTPException
from typing import Optional
from database import get_db_connection, DB_NAME
from models import DayLog
import sqlite3

router = APIRouter(tags=["logs"])


# --- 輔助函數：匯出 TXT ---
def export_month_to_txt(date_str: str):
    month_prefix = date_str[:7]
    filename = f"{date_str.replace('-', '')[:6]}.txt"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
                       SELECT dl.log_date, li.title, li.content, li.tags, li.is_done
                       FROM daily_logs dl
                                JOIN log_items li ON dl.id = li.log_id
                       WHERE dl.log_date LIKE ?
                       ORDER BY dl.log_date DESC, li.sort_order ASC
                       ''', (f"{month_prefix}%",))
        rows = cursor.fetchall()

    if not rows: return

    logs_by_date = {}
    for r in rows:
        d = r['log_date']
        if d not in logs_by_date: logs_by_date[d] = []
        logs_by_date[d].append(r)

    txt_content = ""
    header = "=" * 50
    for d, items in logs_by_date.items():
        txt_content += f"{header}\nDATE: {d}\n{header}\n\n"
        for i, itm in enumerate(items, 1):
            status = "[已完成]" if itm['is_done'] else "[待處理]"
            tags_formatted = f" #{itm['tags'].replace(' ', ' #')}" if itm['tags'] else ""
            txt_content += f"{i}. {status} {itm['title']}{tags_formatted}\n"
            if itm['content'].strip():
                for line in itm['content'].strip().split('\n'):
                    txt_content += f"   > {line}\n"
            txt_content += "\n"
        txt_content += "-" * 50 + "\n\n"

    with open(filename, "w", encoding="utf-8-sig") as f:
        f.write(txt_content)


# --- API Endpoints ---

@router.post("/save-log")
async def save_log(data: DayLog):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT OR IGNORE INTO daily_logs (log_date) VALUES (?)", (data.date,))
            cursor.execute("SELECT id FROM daily_logs WHERE log_date = ?", (data.date,))
            log_id = cursor.fetchone()[0]
            cursor.execute("DELETE FROM log_items WHERE log_id = ?", (log_id,))

            for idx, item in enumerate(data.items):
                cursor.execute('''INSERT INTO log_items (log_id, title, content, tags, is_done, sort_order)
                                  VALUES (?, ?, ?, ?, ?, ?)''',
                               (log_id, item.title.strip(), item.content.strip(), item.tags.strip(),
                                1 if item.isDone else 0, idx))
            conn.commit()
        export_month_to_txt(data.date)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get-log/{date}")
async def get_log(date: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''SELECT li.title, li.content, li.tags, li.is_done
                          FROM daily_logs dl
                                   JOIN log_items li ON dl.id = li.log_id
                          WHERE dl.log_date = ?
                          ORDER BY li.sort_order ASC''', (date,))
        rows = cursor.fetchall()
        return {"status": "success", "items": [
            {"title": r["title"], "content": r["content"], "tags": r["tags"] or "", "isDone": bool(r["is_done"])} for r
            in rows]}


@router.get("/get-all-logs")
async def get_all_logs():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''SELECT dl.log_date, li.title, li.content, li.tags, li.is_done
                          FROM daily_logs dl
                                   JOIN log_items li ON dl.id = li.log_id
                          ORDER BY dl.log_date DESC, li.sort_order ASC''')
        rows = cursor.fetchall()
        logs_dict = {}
        for r in rows:
            d = r['log_date']
            if d not in logs_dict: logs_dict[d] = []
            logs_dict[d].append(
                {"title": r['title'], "content": r['content'], "tags": r['tags'] or "", "isDone": bool(r['is_done'])})
        return {"status": "success", "logs": [{"date": d, "items": items} for d, items in logs_dict.items()]}


@router.get("/get-project-history")
async def get_project_history(title: str, tags: Optional[str] = None):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = '''
                SELECT dl.log_date, li.content, li.tags
                FROM log_items li
                         JOIN daily_logs dl ON li.log_id = dl.id
                WHERE li.title = ? \
                '''
        params = [title]
        if tags:
            query += " AND li.tags LIKE ?"
            params.append(f"%{tags}%")
        query += " ORDER BY dl.log_date ASC"

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()

        history = [{"date": r["log_date"], "content": r["content"], "tags": r["tags"]}
                   for r in rows if r["content"].strip() != ""]

        return {"status": "success", "project": title, "total_days": len(history), "history": history}