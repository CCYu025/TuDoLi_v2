from pydantic import BaseModel
from typing import List, Optional

class TodoItem(BaseModel):
    title: str
    content: str = ""
    tags: str = ""
    isDone: bool

class DayLog(BaseModel):
    date: str
    items: List[TodoItem]