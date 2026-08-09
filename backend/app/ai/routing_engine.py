from typing import Dict, Any
from sqlalchemy.orm import Session
from ..models import IssueCategory, Department
from .base import BaseRoutingEngine

class RoutingEngine(BaseRoutingEngine):
    def route_issue(self, category_id: int, db: Session, ward: str = None) -> Dict[str, Any]:
        """
        Retrieves the department responsible for resolving issues of the given category.
        Can be extended with ward overrides or escalation rules.
        """
        # Query category
        category = db.query(IssueCategory).filter(IssueCategory.id == category_id).first()
        if not category:
            # Fallback to Public Works
            default_dept = db.query(Department).filter(Department.code == "ROADS").first()
            return {
                "department_id": default_dept.id if default_dept else 1,
                "department_name": default_dept.name if default_dept else "Public Works & Roads",
                "department_code": default_dept.code if default_dept else "ROADS",
                "routing_rule": "Fallback default (ROADS)"
            }
            
        # Ward level routing override checks (Example: Ward 7 might have a special water maintenance division)
        if ward == "Ward 7" and category.name == "Water leakage":
            # Just an illustrative rule
            dept = db.query(Department).filter(Department.code == "WATER").first()
            return {
                "department_id": dept.id,
                "department_name": dept.name,
                "department_code": dept.code,
                "routing_rule": f"Special Ward 7 overrides for Water leakage"
            }
            
        # Standard default routing mapping
        dept = db.query(Department).filter(Department.id == category.default_department_id).first()
        if not dept:
            dept = db.query(Department).filter(Department.code == "ROADS").first()
            
        return {
            "department_id": dept.id,
            "department_name": dept.name,
            "department_code": dept.code,
            "routing_rule": f"Category default routing mapping for {category.name}"
        }

routing_engine = RoutingEngine()
