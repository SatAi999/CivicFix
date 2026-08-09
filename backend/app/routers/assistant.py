import re
import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from ..database import get_db
from .. import crud, models, schemas
from .auth import get_current_user
from ..ai.severity_engine import severity_engine

router = APIRouter(prefix="/assistant", tags=["Civic AI Assistant"])

def haversine(lat1, lon1, lat2, lon2):
    # great circle distance in meters
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return c * 6371000

@router.post("", response_model=schemas.ChatResponse)
def ask_assistant(
    payload: schemas.ChatMessage,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = payload.message.lower().strip()
    lat = payload.latitude
    lng = payload.longitude
    
    reply = ""
    intent = "general"
    suggested_issues = []

    # 1. INTENT: Specific Issue Priority Query (e.g., "Why is CIV-28491 marked high priority?")
    id_match = re.search(r'civ-\d{5}', query)
    if id_match:
        issue_id = id_match.group(0).upper()
        issue = crud.get_issue(db, issue_id)
        if issue:
            intent = "why_priority"
            dup_count = crud.get_duplicates_count(db, issue.id)
            supporters_count = crud.get_supports_count(db, issue.id)
            
            ai = issue.ai_analysis
            hazards = []
            objects = []
            if ai:
                try:
                    import json
                    hazards = json.loads(ai.hazards) if ai.hazards else []
                    objects = json.loads(ai.objects_detected) if ai.objects_detected else []
                except Exception:
                    pass
            
            ai_dict = {
                "category": issue.category.name if issue.category else "Other",
                "description": issue.description or "",
                "visible_hazards": hazards,
                "visible_objects": objects
            }
            sev_calc = severity_engine.calculate_severity(ai_dict, supporters_count, dup_count)
            
            reasons_bullets = "\n".join([f"• {r}" for r in sev_calc["reasons"]])
            reply = (
                f"**Case {issue_id}** ({issue.title}) is prioritized as **{issue.severity}** (Score: {int(sev_calc['score'])}/100).\n\n"
                f"Here are the specific factors calculated by my AI Severity Engine:\n{reasons_bullets}\n\n"
                f"Current Status: **{issue.status}** assigned to **{issue.assignments[0].department.name if issue.assignments else 'Unassigned'}**."
            )
            return {"reply": reply, "intent": intent, "suggested_issues": []}
        else:
            reply = f"I searched my registry but could not find any issue with ID: **{issue_id}**. Please double-check the ID."
            return {"reply": reply, "intent": "error", "suggested_issues": []}

    # 2. INTENT: "Near me" (e.g., "What issues have been reported near me?")
    if "near" in query or "close" in query or "around" in query or "nearby" in query:
        intent = "near_me"
        if lat is None or lng is None:
            reply = "To show issues near you, I need your location access. Please enable location permissions or type in your coordinates."
            return {"reply": reply, "intent": intent, "suggested_issues": []}
            
        active_issues = crud.get_active_issues(db)
        nearby = []
        
        for issue in active_issues:
            loc = issue.location
            if not loc:
                continue
            dist = haversine(lat, lng, loc.latitude, loc.longitude)
            if dist <= 500.0: # within 500 meters
                cover_media = next((m for m in issue.media if not m.is_resolution), None)
                nearby.append((dist, issue, loc, cover_media))
                
        # Sort by distance
        nearby.sort(key=lambda x: x[0])
        
        if not nearby:
            reply = f"I scanned the area within 500 meters of your coordinates ({round(lat, 4)}, {round(lng, 4)}) and found no active issues. The neighborhood is clear!"
            return {"reply": reply, "intent": intent, "suggested_issues": []}
            
        reply = f"I found **{len(nearby)}** active issue(s) within 500 meters of your location:\n\n"
        for dist, issue, loc, cover in nearby[:5]:
            reply += f"• **{issue.id}** ({issue.title}) — **{issue.severity}** priority, located **{round(dist)}m** away. Status: *{issue.status}*\n"
            supp_count = crud.get_supports_count(db, issue.id)
            suggested_issues.append({
                "id": issue.id,
                "title": issue.title,
                "description": issue.description,
                "status": issue.status,
                "severity": issue.severity,
                "created_at": issue.created_at,
                "category_name": issue.category.name if issue.category else None,
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "address": loc.address,
                "supporters_count": supp_count,
                "media_url": f"/api/issues/media/{cover.id}" if cover else None
            })
        return {"reply": reply, "intent": intent, "suggested_issues": suggested_issues}

    # 3. INTENT: "My reports" (e.g., "Show me my open reports.")
    if "my open" in query or "my reports" in query or "my cases" in query or "my issues" in query:
        intent = "my_reports"
        my_issues = db.query(models.Issue).filter(models.Issue.reporter_id == current_user.id).all()
        if not my_issues:
            reply = f"Hi {current_user.username}, you haven't submitted any reports yet. Tap the 'Report a Problem' button to make your first report!"
            return {"reply": reply, "intent": intent, "suggested_issues": []}
            
        reply = f"Here are your reported cases, {current_user.username}:\n\n"
        for issue in my_issues:
            loc = issue.location
            cover_media = next((m for m in issue.media if not m.is_resolution), None)
            reply += f"• **{issue.id}** — **{issue.title}** ({issue.status}) | Severity: {issue.severity}\n"
            supp_count = crud.get_supports_count(db, issue.id)
            suggested_issues.append({
                "id": issue.id,
                "title": issue.title,
                "description": issue.description,
                "status": issue.status,
                "severity": issue.severity,
                "created_at": issue.created_at,
                "category_name": issue.category.name if issue.category else None,
                "latitude": loc.latitude if loc else 0.0,
                "longitude": loc.longitude if loc else 0.0,
                "address": loc.address if loc else None,
                "supporters_count": supp_count,
                "media_url": f"/api/issues/media/{cover_media.id}" if cover_media else None
            })
        return {"reply": reply, "intent": intent, "suggested_issues": suggested_issues}

    # 4. INTENT: Category filtering (e.g., "Show unresolved road problems" or "potholes")
    category_keywords = {
        "road": "Pothole",
        "pothole": "Pothole",
        "garbage": "Garbage accumulation",
        "trash": "Garbage accumulation",
        "waste": "Garbage accumulation",
        "light": "Broken streetlight",
        "lamp": "Broken streetlight",
        "water": "Water leakage",
        "leak": "Water leakage",
        "wire": "Exposed wire",
        "drain": "Overflowing drains",
        "dumping": "Illegal dumping",
        "tree": "Fallen tree",
        "sign": "Damaged traffic sign",
        "sidewalk": "Unsafe sidewalk"
    }
    
    matched_cat = None
    for kw, cat in category_keywords.items():
        if kw in query:
            matched_cat = cat
            break
            
    if matched_cat:
        intent = "filter_category"
        db_cat = db.query(models.IssueCategory).filter(models.IssueCategory.name == matched_cat).first()
        if db_cat:
            issues = db.query(models.Issue).filter(
                models.Issue.category_id == db_cat.id,
                models.Issue.status.notin_(["RESOLVED", "CITIZEN_VERIFIED"])
            ).all()
            
            if not issues:
                reply = f"I checked and there are currently no active/unresolved **{matched_cat}** issues reported."
                return {"reply": reply, "intent": intent, "suggested_issues": []}
                
            reply = f"Here are the active **{matched_cat}** reports in the city:\n\n"
            for issue in issues:
                loc = issue.location
                cover_media = next((m for m in issue.media if not m.is_resolution), None)
                reply += f"• **{issue.id}**: {issue.title} (Severity: {issue.severity}, Location: {loc.ward if loc else 'Unknown'})\n"
                supp_count = crud.get_supports_count(db, issue.id)
                suggested_issues.append({
                    "id": issue.id,
                    "title": issue.title,
                    "description": issue.description,
                    "status": issue.status,
                    "severity": issue.severity,
                    "created_at": issue.created_at,
                    "category_name": matched_cat,
                    "latitude": loc.latitude if loc else 0.0,
                    "longitude": loc.longitude if loc else 0.0,
                    "address": loc.address if loc else None,
                    "supporters_count": supp_count,
                    "media_url": f"/api/issues/media/{cover_media.id}" if cover_media else None
                })
            return {"reply": reply, "intent": intent, "suggested_issues": suggested_issues}

    # 5. INTENT: Department check (e.g. "What department handles water leaks?")
    if "department" in query or "who handles" in query or "who routes" in query or "who is responsible" in query:
        intent = "routing_check"
        categories = db.query(models.IssueCategory).all()
        matched_cat = None
        for c in categories:
            if c.name.lower() in query or c.subcategory.lower() in query:
                matched_cat = c
                break
                
        if matched_cat:
            reply = (
                f"Issues of category **'{matched_cat.name}'** ({matched_cat.subcategory}) "
                f"are automatically routed to the **{matched_cat.default_department.name}** department "
                f"({matched_cat.default_department.code})."
            )
            return {"reply": reply, "intent": intent, "suggested_issues": []}
        else:
            reply = (
                "By default, our system maps issue categories directly to municipal departments:\n"
                "• Potholes, Damaged Roads & Sidewalks → **Public Works & Roads**\n"
                "• Garbage, Drains & Sanitation → **Sanitation & Waste Management**\n"
                "• Pipe Leakages → **Water Infrastructure**\n"
                "• Streetlights & Wires → **Electrical & Street Lighting**\n"
                "• Signs & Markings → **Traffic & Road Management**"
            )
            return {"reply": reply, "intent": intent, "suggested_issues": []}

    # 6. Default Fallback response
    reply = (
        f"Hello {current_user.username}! I am your Civic AI Assistant.\n\n"
        "Here are some examples of what you can ask me:\n"
        "• *'What issues have been reported near me?'* (requires location share)\n"
        "• *'Show unresolved road problems.'*\n"
        "• *'Why is CIV-28491 marked high priority?'*\n"
        "• *'What department handles water leakage?'*\n"
        "• *'Show me my open reports.'*\n\n"
        "How can I assist you with civic resolution today?"
    )
    return {"reply": reply, "intent": intent, "suggested_issues": []}
