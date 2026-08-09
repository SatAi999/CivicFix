from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..database import get_db
from .. import models
from .auth import get_current_user

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("")
def list_departments(db: Session = Depends(get_db)):
    depts = db.query(models.Department).all()
    return [{"id": d.id, "name": d.name, "code": d.code, "description": d.description} for d in depts]

@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(models.IssueCategory).all()
    res = []
    for c in categories:
        res.append({
            "id": c.id,
            "name": c.name,
            "subcategory": c.subcategory,
            "default_department_id": c.default_department_id,
            "default_department_name": c.default_department.name if c.default_department else None
        })
    return res
