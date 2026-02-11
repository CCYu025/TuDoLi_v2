from fastapi import APIRouter, HTTPException
from database import get_db_connection
from models import HabitCreate, HabitLogReq, HabitUpdate
import sqlite3

router = APIRouter(tags=["habits"])


# 1. 取得習慣清單
@router.get("/get-habits")
async def get_habits(date: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
                       SELECT h.id, h.title, h.color, h.group_id, l.status
                       FROM habit_definitions h
                                LEFT JOIN habit_logs l ON h.id = l.habit_id AND l.log_date = ?
                       WHERE h.is_archived = 0
                       ORDER BY h.sort_order ASC, h.created_at ASC
                       ''', (date,))
        rows = cursor.fetchall()
        return {
            "status": "success",
            "habits": [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "color": r["color"],
                    "group_id": r["group_id"],
                    "status": r["status"]
                } for r in rows
            ]
        }


# 2. 新增習慣
@router.post("/add-habit")
async def add_habit(habit: HabitCreate):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO habit_definitions (title, color, group_id) VALUES (?, ?, ?)",
            (habit.title, habit.color, habit.group_id or 0)
        )
        conn.commit()
    return {"status": "success"}


# 3. 打卡
@router.post("/toggle-habit")
async def toggle_habit(log: HabitLogReq):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
                       INSERT INTO habit_logs (log_date, habit_id, status)
                       VALUES (?, ?, ?) ON CONFLICT(log_date, habit_id) DO
                       UPDATE SET status=excluded.status
                       ''', (log.date, log.habit_id, log.status))
        conn.commit()
    return {"status": "success"}


# 4. 一鍵全亮
@router.post("/mark-all-done")
async def mark_all_done(date: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM habit_definitions WHERE is_archived = 0")
        habits = cursor.fetchall()
        for h in habits:
            cursor.execute('''
                           INSERT INTO habit_logs (log_date, habit_id, status)
                           VALUES (?, ?, 1) ON CONFLICT(log_date, habit_id) DO
                           UPDATE SET status=1
                           ''', (date, h["id"]))
        conn.commit()
    return {"status": "success"}


# 5. 修改習慣 (包含 group_id 更新)
@router.post("/update-habit")
async def update_habit(habit: HabitUpdate):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 動態建立 SQL，支援 title, color, is_archived, group_id 的更新
        fields = []
        values = []

        if habit.title is not None:
            fields.append("title = ?")
            values.append(habit.title)
        if habit.color is not None:
            fields.append("color = ?")
            values.append(habit.color)
        if habit.group_id is not None:
            fields.append("group_id = ?")
            values.append(habit.group_id)
        if habit.is_archived is not None:
            fields.append("is_archived = ?")
            values.append(1 if habit.is_archived else 0)

        if fields:
            values.append(habit.habit_id)  # WHERE 條件的參數
            sql = f"UPDATE habit_definitions SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(sql, tuple(values))
            conn.commit()

    return {"status": "success"}


# 6. 刪除習慣
@router.delete("/delete-habit/{habit_id}")
async def delete_habit(habit_id: int):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM habit_definitions WHERE id = ?", (habit_id,))
        cursor.execute("DELETE FROM habit_logs WHERE habit_id = ?", (habit_id,))
        conn.commit()
    return {"status": "success"}