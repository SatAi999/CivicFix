import os
import shutil
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, crud, models
from .auth import get_current_user, require_role
from ..config import settings
from ..ai.vision_analyzer import vision_analyzer
from ..ai.severity_engine import severity_engine
from ..ai.duplicate_detector import duplicate_detector
from ..ai.routing_engine import routing_engine
from ..ai.report_generator import report_generator
from ..ai.resolution_comparator import resolution_comparator

router = APIRouter(prefix="/issues", tags=["Issues"])

# Helper to save upload file
def save_upload_file(upload_file: UploadFile, destination: Path) -> str:
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return str(destination)
    finally:
        upload_file.file.close()

# Helper to format issue details response
def format_issue_detail(db: Session, issue: models.Issue, current_user_id: int) -> dict:
    has_supported = False
    if current_user_id:
        has_supported = crud.has_supported_issue(db, issue.id, current_user_id)
        
    loc = issue.location
    location_data = None
    if loc:
        location_data = {
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "address": loc.address,
            "ward": loc.ward,
            "landmarks": loc.landmarks
        }
        
    media_data = []
    for m in issue.media:
        # Serve local paths relative to upload route or use static serving
        media_data.append({
            "id": m.id,
            "media_path": f"/api/issues/media/{m.id}",
            "media_type": m.media_type,
            "is_resolution": m.is_resolution,
            "created_at": m.created_at
        })
        
    ai = issue.ai_analysis
    ai_data = None
    if ai:
        try:
            objs = json.loads(ai.objects_detected) if ai.objects_detected else []
            hazards = json.loads(ai.hazards) if ai.hazards else []
        except Exception:
            objs = []
            hazards = []
        ai_data = {
            "category_detected": ai.category_detected,
            "confidence": ai.confidence,
            "objects_detected": objs,
            "hazards": hazards,
            "reasoning": ai.reasoning
        }
        
    history_data = []
    for h in issue.status_history:
        history_data.append({
            "status": h.status,
            "notes": h.notes,
            "changed_by_username": h.changed_by.username,
            "created_at": h.created_at.isoformat()
        })
        
    res = issue.resolution
    resolution_data = None
    if res:
        resolution_data = {
            "notes": res.notes,
            "media_path": f"/api/issues/media/resolution/{issue.id}" if res.media_path else None,
            "resolver_username": res.resolver.username,
            "created_at": res.created_at.isoformat()
        }
        
    verifications_data = []
    for v in issue.verifications:
        verifications_data.append({
            "is_fixed": v.is_fixed,
            "notes": v.notes,
            "verifier_username": v.verifier.username,
            "created_at": v.created_at.isoformat()
        })
        
    # Calculate severity reasons based on engine
    dup_count = crud.get_duplicates_count(db, issue.id)
    supporters_count = crud.get_supports_count(db, issue.id)
    
    ai_dict = {
        "category": issue.category.name if issue.category else "Other",
        "description": issue.description or "",
        "visible_hazards": ai_data["hazards"] if ai_data else [],
        "visible_objects": ai_data["objects_detected"] if ai_data else []
    }
    sev_calc = severity_engine.calculate_severity(ai_dict, supporters_count, dup_count)

    return {
        "id": issue.id,
        "title": issue.title,
        "description": issue.description,
        "status": issue.status,
        "severity": issue.severity,
        "created_at": issue.created_at,
        "updated_at": issue.updated_at,
        "category_name": issue.category.name if issue.category else None,
        "reporter_username": issue.reporter.username,
        "location": location_data,
        "media": media_data,
        "supporters_count": supporters_count,
        "has_supported": has_supported,
        "ai_analysis": ai_data,
        "history": history_data,
        "resolution": resolution_data,
        "verifications": verifications_data,
        "severity_reasons": sev_calc["reasons"]
    }

# --- ENDPOINTS ---

@router.get("", response_model=List[schemas.IssueListResponse])
def list_issues(
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    severity: Optional[str] = None,
    ward: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user)
):
    issues = crud.get_issues(db, status=status, category_id=category_id, severity=severity, ward=ward)
    
    res = []
    for issue in issues:
        supp_count = crud.get_supports_count(db, issue.id)
        # Find first non-resolution image to serve as cover photo
        cover_media = next((m for m in issue.media if not m.is_resolution), None)
        media_url = f"/api/issues/media/{cover_media.id}" if cover_media else None
        
        loc = issue.location
        res.append({
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
            "media_url": media_url
        })
    return res

@router.post("/check-duplicates", response_model=schemas.DuplicateCheckResponse)
def check_duplicates(
    latitude: float = Form(...),
    longitude: float = Form(...),
    description: str = Form(""),
    category_name: str = Form(""),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Retrieve active issues
    active_issues = crud.get_active_issues(db)
    active_list = []
    
    # Process file to compute temporary visual hash if provided
    temp_path = None
    if file:
        temp_dir = settings.UPLOAD_DIR / "temp"
        temp_dir.mkdir(exist_ok=True)
        temp_path = temp_dir / f"temp_{int(datetime.utcnow().timestamp())}_{file.filename}"
        save_upload_file(file, temp_path)
        
    for issue in active_issues:
        loc = issue.location
        if not loc:
            continue
            
        cover_media = next((m for m in issue.media if not m.is_resolution), None)
        active_list.append({
            "id": issue.id,
            "title": issue.title,
            "description": issue.description or "",
            "category_name": issue.category.name if issue.category else "",
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "status": issue.status,
            "image_path": cover_media.media_path if cover_media else None,
            "media_url": f"/api/issues/media/{cover_media.id}" if cover_media else None
        })
        
    query_data = {
        "latitude": latitude,
        "longitude": longitude,
        "description": description,
        "category_name": category_name,
        "image_path": str(temp_path) if temp_path else None
    }
    
    res = duplicate_detector.find_duplicates(query_data, active_list)
    
    # Clean up temp file
    if temp_path and temp_path.exists():
        try:
            os.remove(temp_path)
        except Exception:
            pass
            
    return res

@router.post("", response_model=schemas.IssueDetailResponse)
def create_new_issue(
    title: str = Form(...),
    description: str = Form(""),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: str = Form(""),
    ward: str = Form(""),
    landmarks: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Save File to Temporary Path for Vision Analysis
    temp_dir = settings.UPLOAD_DIR / "temp"
    temp_dir.mkdir(exist_ok=True)
    temp_path = temp_dir / f"temp_{int(datetime.utcnow().timestamp())}_{file.filename}"
    save_upload_file(file, temp_path)
    
    # 2. Run Vision Classification
    try:
        ai_res = vision_analyzer.analyze_image(str(temp_path), description)
    except Exception as e:
        print(f"AI Vision error: {e}")
        # Soft fallback if model crashes
        ai_res = {
            "category": "Public infrastructure damage",
            "subcategory": "structural_damage",
            "visible_objects": ["road"],
            "visible_hazards": ["general_hazard"],
            "severity": "MEDIUM",
            "confidence": 0.50,
            "description": "Fallback analysis due to processing exception."
        }
        
    # 3. Resolve Category
    category = db.query(models.IssueCategory).filter(
        models.IssueCategory.name == ai_res.get("category")
    ).first()
    if not category:
        category = db.query(models.IssueCategory).filter(
            models.IssueCategory.name == "Public infrastructure damage"
        ).first()

    # 4. Create Issue in Database
    issue_id = crud.generate_issue_id(db)
    db_issue = models.Issue(
        id=issue_id,
        title=title,
        description=description,
        reporter_id=current_user.id,
        category_id=category.id if category else None,
        status="REPORTED",
        severity=ai_res.get("severity", "MEDIUM")
    )
    db.add(db_issue)
    
    # Save Location
    db_loc = models.IssueLocation(
        issue_id=issue_id,
        latitude=latitude,
        longitude=longitude,
        address=address or f"{latitude}, {longitude}",
        ward=ward or "Ward Unknown",
        landmarks=landmarks
    )
    db.add(db_loc)
    
    # 5. Move Temporary File to permanent issue folder
    permanent_filename = f"before_{file.filename}"
    permanent_dest = settings.UPLOAD_DIR / issue_id / permanent_filename
    permanent_dest.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        shutil.move(str(temp_path), str(permanent_dest))
    except Exception:
        # Fallback copy if cross-drive move fails on Windows
        shutil.copy(str(temp_path), str(permanent_dest))
        os.remove(temp_path)
        
    # Add Media Entry
    db_media = models.IssueMedia(
        issue_id=issue_id,
        media_path=str(permanent_dest),
        media_type="image",
        is_resolution=False
    )
    db.add(db_media)
    
    # Save AI Analysis Result
    crud.create_ai_analysis(db, issue_id, ai_res)
    
    # Log Triage status history
    db_history_reported = models.IssueStatusHistory(
        issue_id=issue_id,
        status="REPORTED",
        notes="Citizen submitted report.",
        changed_by_id=current_user.id
    )
    db.add(db_history_reported)
    
    db_history_ai = models.IssueStatusHistory(
        issue_id=issue_id,
        status="AI_VERIFIED",
        notes=f"AI Vision verified issue as '{ai_res.get('category')}' with {int(ai_res.get('confidence', 0.0) * 100)}% confidence.",
        changed_by_id=current_user.id
    )
    db.add(db_history_ai)
    
    # 6. Automatic Department Routing
    routing_info = routing_engine.route_issue(category.id if category else 1, db, ward=ward)
    crud.assign_issue(db, issue_id, routing_info["department_id"], current_user.id)
    
    db.commit()
    db.refresh(db_issue)
    
    # Notify admins/operators (simulate)
    operator_role = db.query(models.Role).filter(models.Role.name == "operator").first()
    if operator_role:
        operators = db.query(models.User).filter(models.User.role_id == operator_role.id).all()
        for op in operators:
            crud.create_notification(
                db, op.id, 
                f"New Case {issue_id}", 
                f"A new {ai_res.get('category')} has been reported at {address} and auto-routed to your queue.",
                "routing"
            )
            
    return format_issue_detail(db, db_issue, current_user.id)

@router.get("/{issue_id}", response_model=schemas.IssueDetailResponse)
def get_issue_details(
    issue_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user)
):
    issue = crud.get_issue(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    user_id = current_user.id if current_user else 0
    return format_issue_detail(db, issue, user_id)

@router.post("/{issue_id}/support")
def support_issue(
    issue_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    issue = crud.get_issue(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    crud.add_support(db, issue_id, current_user.id)
    
    # Recalculate Severity priority dynamically based on support count
    dup_count = crud.get_duplicates_count(db, issue_id)
    supporters_count = crud.get_supports_count(db, issue_id)
    
    ai = issue.ai_analysis
    hazards = []
    objects = []
    if ai:
        try:
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
    
    # Update severity in DB if changed
    if issue.severity != sev_calc["severity"]:
        issue.severity = sev_calc["severity"]
        crud.create_notification(
            db, issue.reporter_id,
            f"Case Priority Raised: {issue_id}",
            f"Priority for your reported case {issue_id} has been raised to {sev_calc['severity']} due to community support.",
            "severity"
        )
        db.commit()
        
    return {"message": "Supported successfully", "supporters_count": supporters_count, "severity": issue.severity}

@router.delete("/{issue_id}/support")
def unsupport_issue(
    issue_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    success = crud.remove_support(db, issue_id, current_user.id)
    if not success:
         raise HTTPException(status_code=400, detail="User was not supporting this issue")
    return {"message": "Support removed"}

@router.post("/{issue_id}/assign")
def assign_issue_department(
    issue_id: str,
    department_id: int,
    assigned_to_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["operator", "admin"]))
):
    issue = crud.get_issue(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    crud.assign_issue(db, issue_id, department_id, current_user.id, assigned_to_id)
    return {"message": "Department assigned successfully"}

@router.patch("/{issue_id}/status")
def patch_issue_status(
    issue_id: str,
    status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    issue = crud.get_issue(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    crud.update_issue_status(db, issue_id, status, current_user.id)
    return {"message": f"Status updated to {status}", "status": issue.status}


@router.post("/{issue_id}/resolve")
def resolve_issue(
    issue_id: str,
    notes: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["operator", "admin"]))
):
    issue = crud.get_issue(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    # Save resolution file
    resolution_filename = f"after_{file.filename}"
    resolution_dest = settings.UPLOAD_DIR / issue_id / resolution_filename
    save_upload_file(file, resolution_dest)
    
    # Save resolution entry
    crud.add_resolution(db, issue_id, current_user.id, notes, str(resolution_dest))
    
    # Run resolution image comparison verification
    cover_media = next((m for m in issue.media if not m.is_resolution), None)
    comp_result = {"similarity_score": 0.0, "message": "No original image available for visual comparison."}
    if cover_media:
        comp_result = resolution_comparator.compare_resolution(cover_media.media_path, str(resolution_dest))
        
    # Notify reporter
    crud.create_notification(
        db, issue.reporter_id,
        f"Resolution Filed: {issue_id}",
        f"An operator has marked your case {issue_id} as resolved. Please review and verify the fix.",
        "resolution"
    )
    
    return {
        "message": "Resolution submitted successfully. Pending citizen verification.",
        "visual_similarity_score": comp_result.get("similarity_score"),
        "visual_comparison": comp_result.get("message")
    }

@router.post("/{issue_id}/verify")
def verify_resolution(
    issue_id: str,
    verification: schemas.IssueVerificationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    issue = crud.get_issue(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    if issue.status != "RESOLUTION_SUBMITTED":
        raise HTTPException(status_code=400, detail="Cannot verify a case that is not in RESOLUTION_SUBMITTED state")
        
    crud.add_verification(db, issue_id, current_user.id, verification)
    
    # Notify assignees / operator if disputed
    if verification.is_fixed != "fixed":
        operator_role = db.query(models.Role).filter(models.Role.name == "operator").first()
        if operator_role:
            operators = db.query(models.User).filter(models.User.role_id == operator_role.id).all()
            for op in operators:
                crud.create_notification(
                    db, op.id,
                    f"Resolution Disputed: {issue_id}",
                    f"Citizen has disputed the resolution for {issue_id}. The case is automatically reopened.",
                    "dispute"
                )
    else:
        # Notify resolver
        res = issue.resolution
        if res:
             crud.create_notification(
                 db, res.resolver_id,
                 f"Resolution Verified: {issue_id}",
                 f"Citizen has verified your fix for {issue_id}. Case is successfully closed.",
                 "verification"
             )
             
    return {"message": "Verification submitted successfully", "final_status": issue.status}

@router.get("/{issue_id}/report", response_class=HTMLResponse)
def download_issue_report(issue_id: str, db: Session = Depends(get_db)):
    issue = crud.get_issue(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    formatted = format_issue_detail(db, issue, 0)
    html_content = report_generator.generate_html_report(formatted)
    return html_content

# --- STATIC FILES / MEDIA SERVING ENDPOINTS ---
@router.get("/media/{media_id}")
def serve_issue_media(media_id: int, db: Session = Depends(get_db)):
    m = db.query(models.IssueMedia).filter(models.IssueMedia.id == media_id).first()
    if not m or not os.path.exists(m.media_path):
        # Serve dummy pixel fallback if file missing
        raise HTTPException(status_code=404, detail="Media file not found")
    
    # Read file content and return as image response
    with open(m.media_path, "rb") as f:
        img_data = f.read()
    return Response(content=img_data, media_type="image/jpeg")

@router.get("/media/resolution/{issue_id}")
def serve_resolution_media(issue_id: str, db: Session = Depends(get_db)):
    res = db.query(models.IssueResolution).filter(models.IssueResolution.issue_id == issue_id).first()
    if not res or not res.media_path or not os.path.exists(res.media_path):
        raise HTTPException(status_code=404, detail="Resolution media not found")
        
    with open(res.media_path, "rb") as f:
        img_data = f.read()
    return Response(content=img_data, media_type="image/jpeg")
