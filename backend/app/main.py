import os
from fastapi import FastAPI, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .config import settings
from .database import engine, Base, get_db
from .routers import auth, issues, departments, analytics, assistant
from . import crud, schemas
from .routers.auth import get_current_user
from .seed import seed_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon demo ease, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup DB seeding
@app.on_event("startup")
def startup_event():
    print("Database initialization starting...")
    try:
        # Create directories
        settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        (settings.UPLOAD_DIR / "temp").mkdir(exist_ok=True)
        
        # Seed DB
        seed_db()
        
        # Copy demo photos into uploads folder if they don't exist
        # This makes the before/after and initial issues look beautiful
        demo_dest = settings.UPLOAD_DIR / "demo_images"
        demo_dest.mkdir(parents=True, exist_ok=True)
        # Create empty placeholder files so visual comparison doesn't break
        for filename in ["CIV-28491_before.jpg", "CIV-10002_before.jpg", "CIV-10003_before.jpg", "CIV-10004_before.jpg", "CIV-10006_before.jpg", "CIV-10006_after.jpg"]:
            file_path = demo_dest / filename
            if not file_path.exists():
                with open(file_path, "wb") as f:
                    f.write(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x01\xFF\xC4\x00\x15\x00\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x07\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\x37\xFF\xD9") # minimal 1x1 jpeg
        print("Demo images placeholders verified.")
    except Exception as e:
        print(f"Error during startup seeding: {e}")

# Register Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(issues.router, prefix=settings.API_V1_STR)
app.include_router(departments.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(assistant.router, prefix=settings.API_V1_STR)

# Direct Notification Endpoints
@app.get(f"{settings.API_V1_STR}/notifications", response_model=list[schemas.NotificationResponse], tags=["Notifications"])
def get_user_notifications(unread_only: bool = False, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return crud.get_notifications(db, current_user.id, unread_only=unread_only)

@app.post(f"{settings.API_V1_STR}/notifications/read", tags=["Notifications"])
def mark_user_notifications_read(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    crud.mark_notifications_read(db, current_user.id)
    return {"message": "Notifications marked as read"}

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "CivicFix AI Engine API Gate",
        "api_docs": "/docs"
    }
