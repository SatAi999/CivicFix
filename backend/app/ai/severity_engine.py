import math
from typing import Dict, Any, List
from .base import BaseSeverityEngine

class SeverityEngine(BaseSeverityEngine):
    def calculate_severity(self, issue_data: Dict[str, Any], supporters_count: int = 0, duplicates_count: int = 0) -> Dict[str, Any]:
        """
        Calculate transparent severity priority based on category, hazards, location sensitivity, and support signal.
        """
        category = issue_data.get("category", "Other")
        description = issue_data.get("description", "").lower()
        hazards = issue_data.get("visible_hazards", [])
        objects = issue_data.get("visible_objects", [])
        
        # 1. Base Score by Category
        base_scores = {
            "Exposed wire": 75,
            "Fallen tree": 65,
            "Blocked road": 70,
            "Overflowing drains": 60,
            "Water leakage": 50,
            "Pothole": 45,
            "Damaged roads": 45,
            "Illegal dumping": 40,
            "Public sanitation problem": 45,
            "Damaged public facility": 30,
            "Unsafe sidewalk": 25,
            "Broken streetlight": 20,
            "Damaged traffic sign": 20
        }
        
        base_score = base_scores.get(category, 30)
        reasons = [f"Base severity for category '{category}': {base_score} pts"]
        
        # 2. Hazard Factor
        hazard_points = len(hazards) * 10
        if hazard_points > 0:
            reasons.append(f"Visible hazards detected ({', '.join(hazards)}): +{hazard_points} pts")
            
        # 3. Location Sensitivity (School, Hospital, High Traffic)
        loc_points = 0
        loc_triggers = []
        if "school" in description or "college" in description or "student" in description or "kid" in description:
            loc_points += 15
            loc_triggers.append("school proximity")
        if "hospital" in description or "clinic" in description or "doctor" in description or "patient" in description:
            loc_points += 15
            loc_triggers.append("medical facility proximity")
        if "swerving" in description or "swerve" in description or "traffic" in description or "highway" in description or "main road" in description:
            loc_points += 15
            loc_triggers.append("high traffic danger")
            
        # YOLO object detections reinforcing traffic exposure
        yolo_traffic = [obj for obj in objects if obj in ["car", "truck", "bus", "motorcycle"]]
        if yolo_traffic and "high traffic danger" not in loc_triggers:
            loc_points += 10
            loc_triggers.append("active vehicles visible in frame")
            
        if loc_points > 0:
            reasons.append(f"Location sensitivity triggers ({', '.join(loc_triggers)}): +{loc_points} pts")

        # 4. Community Signal (Supporters & Duplicates)
        community_points = 0
        if supporters_count > 0:
            # Logarithmic scaling to avoid overflow, e.g. +3 pts per supporter up to +15
            supporter_bonus = min(15, int(supporters_count * 3))
            community_points += supporter_bonus
            reasons.append(f"{supporters_count} community supporters: +{supporter_bonus} pts")
            
        if duplicates_count > 0:
            duplicate_bonus = min(20, duplicates_count * 5)
            community_points += duplicate_bonus
            reasons.append(f"{duplicates_count} duplicate reports merged: +{duplicate_bonus} pts")

        # Compile Total Score
        total_score = base_score + hazard_points + loc_points + community_points
        
        # Clamp score between 0 and 100
        total_score = max(0, min(100, total_score))
        
        # Determine Severity Level
        if total_score >= 85:
            severity = "CRITICAL"
        elif total_score >= 60:
            severity = "HIGH"
        elif total_score >= 30:
            severity = "MEDIUM"
        else:
            severity = "LOW"
            
        return {
            "score": total_score,
            "severity": severity,
            "reasons": reasons
        }

severity_engine = SeverityEngine()
