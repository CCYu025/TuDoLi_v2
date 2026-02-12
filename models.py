from pydantic import BaseModel
from typing import List, Optional

# --- 原有的工作日誌模型 ---
class TodoItem(BaseModel):
    item_id: Optional[str] = None  # ✅ 新增：用於增量識別的 UUID
    title: str
    content: str = ""
    tags: str = ""
    isDone: bool

class DayLog(BaseModel):
    date: str
    items: List[TodoItem]

# --- 新增：原子習慣模型 (保持不變) ---
class HabitCreate(BaseModel):
    title: str
    color: str = "#3B82F6"
    group_id: Optional[int] = None

class HabitUpdate(BaseModel):
    habit_id: int
    title: Optional[str] = None
    color: Optional[str] = None
    group_id: Optional[int] = None
    is_archived: Optional[bool] = None

class HabitLogReq(BaseModel):
    date: str
    habit_id: int
    status: int