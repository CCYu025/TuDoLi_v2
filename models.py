from pydantic import BaseModel
from typing import List, Optional

# --- 原有的工作日誌模型 ---
class TodoItem(BaseModel):
    title: str
    content: str = ""
    tags: str = ""
    isDone: bool

class DayLog(BaseModel):
    date: str
    items: List[TodoItem]

# --- 新增：原子習慣模型 ---
class HabitCreate(BaseModel):
    title: str
    color: str = "#3B82F6" # 預設藍色
    group_id: Optional[int] = None # 組合鏈 ID

class HabitUpdate(BaseModel):
    habit_id: int
    title: Optional[str] = None
    color: Optional[str] = None
    group_id: Optional[int] = None
    is_archived: Optional[bool] = None

class HabitLogReq(BaseModel):
    date: str
    habit_id: int
    status: int # 1: 完成, 0: 失敗/反向剔除