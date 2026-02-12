from fastapi import APIRouter, HTTPException
from typing import Optional
from database import get_db_connection
from models import DayLog
import sqlite3
import uuid

router = APIRouter(tags=["logs"])


# --- 輔助函數：匯出 TXT (保持不變) ---
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
        txt_content += f"{header}\nDATE: {d}\n{header}\n"
        for idx, item in enumerate(items, 1):
            status = "[v]" if item['is_done'] else "[ ]"
            tag_str = f" (#{item['tags']})" if item['tags'] else ""
            txt_content += f"{idx}. {status} {item['title']}{tag_str}\n"
            if item['content']:
                txt_content += f"   Note: {item['content']}\n"
        txt_content += "\n"

    with open(f"static/{filename}", "w", encoding="utf-8") as f:
        f.write(txt_content)


@router.get("/get-log/{date_str}")
async def get_log(date_str: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM daily_logs WHERE log_date = ?", (date_str,))
        row = cursor.fetchone()

        # ✅ 修正：這裡也要補上 status: success，雖然 items 是空的
        if not row:
            return {"status": "success", "date": date_str, "items": []}

        log_id = row['id']
        # 讀取時包含專案進化樹欄位
        cursor.execute('''
                       SELECT item_id,
                              title,
                              content,
                              is_done,
                              tags,
                              origin_id,
                              parent_id,
                              relation_type
                       FROM log_items
                       WHERE log_id = ?
                       ORDER BY sort_order ASC
                       ''', (log_id,))
        items = cursor.fetchall()

        return {
            "status": "success",  # ✅✅✅ 關鍵修正：補上這行通關密語！
            "date": date_str,
            "items": [
                {
                    "item_id": i["item_id"],
                    "title": i["title"],
                    "content": i["content"],
                    "isDone": bool(i["is_done"]),
                    "tags": i["tags"],
                    "origin_id": i["origin_id"],
                    "parent_id": i["parent_id"],
                    "relation_type": i["relation_type"]
                }
                for i in items
            ]
        }


@router.post("/save-log")
async def save_log(request: DayLog):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # 1. 確保 Daily Log 存在
            cursor.execute("INSERT OR IGNORE INTO daily_logs (log_date) VALUES (?)", (request.date,))
            cursor.execute("SELECT id FROM daily_logs WHERE log_date = ?", (request.date,))
            log_id = cursor.fetchone()['id']

            # 2. 獲取現有 item_ids 以便清理刪除項
            cursor.execute("SELECT item_id FROM log_items WHERE log_id = ?", (log_id,))
            existing_ids = {row['item_id'] for row in cursor.fetchall() if row['item_id']}
            incoming_ids = {item.item_id for item in request.items if item.item_id}

            # 3. 刪除前端已移除的項目
            ids_to_delete = existing_ids - incoming_ids
            if ids_to_delete:
                cursor.execute(f"DELETE FROM log_items WHERE item_id IN ({','.join(['?'] * len(ids_to_delete))})",
                               tuple(ids_to_delete))

            # 4. UPSERT 更新或插入
            for idx, item in enumerate(request.items):
                uid = item.item_id or str(uuid.uuid4())

                cursor.execute('''
                    INSERT OR REPLACE INTO log_items 
                    (item_id, log_id, title, content, is_done, sort_order, tags, origin_id, parent_id, relation_type) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    uid,
                    log_id,
                    item.title,
                    item.content,
                    item.isDone,
                    idx,
                    item.tags,
                    item.origin_id,
                    item.parent_id,
                    item.relation_type
                ))

            conn.commit()

        export_month_to_txt(request.date)
        return {"status": "success", "message": "Log saved"}

    except Exception as e:
        print(f"Error saving log: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get-all-logs")
async def get_all_logs():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''SELECT dl.log_date,
                                 li.title,
                                 li.content,
                                 li.is_done,
                                 li.tags,
                                 li.item_id,
                                 li.origin_id,
                                 li.relation_type
                          FROM daily_logs dl
                                   JOIN log_items li ON dl.id = li.log_id
                          ORDER BY dl.log_date DESC, li.sort_order ASC''')
        rows = cursor.fetchall()

        logs_dict = {}
        for r in rows:
            d = r['log_date']
            if d not in logs_dict: logs_dict[d] = []
            logs_dict[d].append({
                "title": r['title'],
                "content": r['content'],
                "tags": r['tags'] or "",
                "isDone": bool(r['is_done']),
                "item_id": r['item_id'],
                "origin_id": r['origin_id'],
                "relation_type": r['relation_type']
            })

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

        history = [{"date": r['log_date'], "content": r['content'] or "", "tags": r['tags']} for r in rows]
        total_days = len(set(h['date'] for h in history))

        return {"status": "success", "total_days": total_days, "history": history}