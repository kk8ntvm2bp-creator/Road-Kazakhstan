from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from app.database import create_tables
from app.routes import auth, detections, stats, reports
from app.config import settings
import os
import traceback

app = FastAPI(
    title="RoadScan Kazakhstan API",
    description="Road surface condition analysis API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers
app.include_router(auth.router)
app.include_router(detections.router)
app.include_router(stats.router)
app.include_router(reports.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print("UNHANDLED ERROR:", tb)
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.on_event("startup")
def startup_event():
    create_tables()
    print(f"RoadScan API started | DB: {settings.DATABASE_URL[:30]}...")


@app.get("/api")
def root():
    return {"message": "RoadScan Kazakhstan API v2.0", "status": "running", "docs": "/api/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# Serve React frontend (production build)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        return JSONResponse({"detail": "Frontend not built. Run: npm run build"}, status_code=404)
