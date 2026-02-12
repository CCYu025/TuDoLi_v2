# routers/project.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from database import get_db_connection

# 設定路由前綴為 /project，這樣 API 路徑就會是 /project/tree/...
router = APIRouter(prefix="/project", tags=["project"])


# --- Request Models ---
class RelationUpdateReq(BaseModel):
    item_id: str
    target_parent_id: Optional[str] = None  # 新的父節點 (可為空，代表變成孤兒或是第一代)
    relation_type: str  # 'inherit' (繼承) 或 'evolve' (轉職)


# --- APIs ---

@router.get("/tree/{origin_id}")
async def get_project_tree(origin_id: str):
    """
    獲取整個專案家族的進化樹數據
    邏輯：找出所有 origin_id 相同的任務，並依照時間排序
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 我們需要找出：
        # 1. 自己就是這個 origin_id 的始祖任務 (item_id = origin_id)
        # 2. 繼承自這個 origin_id 的所有後代 (origin_id = origin_id)
        # 並且連結 daily_logs 取得日期
        query = '''
                SELECT li.item_id, \
                       li.title, \
                       li.is_done, \
                       li.tags, \
                       li.origin_id, \
                       li.parent_id, \
                       li.relation_type, \
                       dl.log_date
                FROM log_items li
                         JOIN daily_logs dl ON li.log_id = dl.id
                WHERE li.origin_id = ? \
                   OR li.item_id = ?
                ORDER BY dl.log_date ASC, li.sort_order ASC \
                '''

        cursor.execute(query, (origin_id, origin_id))
        rows = cursor.fetchall()

        if not rows:
            return {"status": "success", "tree": []}

        # 整理數據
        tree_nodes = []
        for r in rows:
            tree_nodes.append({
                "item_id": r["item_id"],
                "title": r["title"],
                "date": r["log_date"],
                "isDone": bool(r["is_done"]),
                "tags": r["tags"],
                "parent_id": r["parent_id"],
                "relation_type": r["relation_type"] or "root"  # 如果沒有 relation，通常是始祖
            })

        return {"status": "success", "origin_id": origin_id, "tree": tree_nodes}


@router.patch("/update-relation")
async def update_task_relation(req: RelationUpdateReq):
    """
    [拖曳修正專用] 只更新任務的父子關係，不影響內容
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # 驗證 item_id 是否存在
            cursor.execute("SELECT id FROM log_items WHERE item_id = ?", (req.item_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Item not found")

            # 更新 parent_id 與 relation_type
            cursor.execute('''
                           UPDATE log_items
                           SET parent_id     = ?,
                               relation_type = ?
                           WHERE item_id = ?
                           ''', (req.target_parent_id, req.relation_type, req.item_id))

            conn.commit()

        return {"status": "success", "message": "Relation updated"}

    except Exception as e:
        print(f"Error updating relation: {e}")
        raise HTTPException(status_code=500, detail=str(e))