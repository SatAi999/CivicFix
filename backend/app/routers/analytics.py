from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List, Optional
from ..database import get_db
from .. import crud, models, schemas
from .auth import get_current_user
from ..ai.hotspot_analyzer import hotspot_analyzer

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=schemas.DashboardStatsResponse)
def get_dashboard_data(
    db: Session = Depends(get_db)
):
    stats = crud.get_dashboard_stats(db)
    return stats

@router.get("/hotspots", response_model=schemas.HotspotsResponse)
def get_hotspots_data(
    db: Session = Depends(get_db)
):
    active_issues = crud.get_active_issues(db)
    
    active_list = []
    today = datetime.utcnow()
    for issue in active_issues:
        loc = issue.location
        if not loc:
            continue
            
        created_days_ago = (today - issue.created_at).days
        active_list.append({
            "id": issue.id,
            "title": issue.title,
            "category_name": issue.category.name if issue.category else "Other",
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "ward": loc.ward,
            "created_days_ago": created_days_ago
        })
        
    hotspots = hotspot_analyzer.detect_hotspots(active_list)
    return {"hotspots": hotspots}
