from pydantic import BaseModel
from typing import List, Optional


# --- 工作日誌模型 (核心升級) ---
class TodoItem(BaseModel):
    item_id: Optional[str] = None  # UUID
    title: str
    content: str = ""
    tags: str = ""
    isDone: bool

    # ✅ 新增：專案進化樹欄位
    origin_id: Optional[str] = None  # [源頭] 專案家族的始祖 ID (Project Soul)
    parent_id: Optional[str] = None  # [父層] 直接繼承的來源 ID (Immediate Parent)
    relation_type: Optional[str] = None  # [關係] "inherit"(繼承) 或 "evolve"(轉職)


class DayLog(BaseModel):
    date: str
    items: List[TodoItem]


# --- 原子習慣模型 (保持不變) ---
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