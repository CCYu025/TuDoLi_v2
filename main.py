from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response # <--- 新增
from database import init_db
from routers import logs, habits

app = FastAPI()

# 初始化資料庫
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 新增：靜音 favicon 路由，防止終端機報錯
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)

# 掛載路由
app.include_router(logs.router)
app.include_router(habits.router)

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)