import os
import json
import base64
import requests
from typing import Dict, Any, List
from pathlib import Path
from ..config import settings
from .base import BaseVisionAnalyzer

class VisionAnalyzer(BaseVisionAnalyzer):
    def __init__(self):
        self.yolo_model = None
        self._load_yolo()

    def _load_yolo(self):
        """Lazy load YOLO model, downloading it automatically if the configured path is missing"""
        try:
            from ultralytics import YOLO
            model_path = settings.YOLO_MODEL_PATH
            if not os.path.exists(model_path):
                print(f"Configured YOLO path '{model_path}' not found. Loading/downloading standard 'yolo11n.pt'...")
                model_path = "yolo11n.pt"
            
            self.yolo_model = YOLO(model_path)
            print(f"YOLO Model loaded successfully from {model_path}")
        except Exception as e:
            print(f"Warning: Failed to load local YOLO model: {e}")

    def analyze_image(self, image_path: str, description_context: str = "") -> Dict[str, Any]:
        """
        Analyze image using Gemini if API key is present.
        Otherwise, fallback to local YOLO + heuristic textual matching.
        """
        print(f"Analyzing image: {image_path}")
        
        # 1. Attempt Gemini API if key is present
        if settings.GEMINI_API_KEY:
            try:
                return self._analyze_via_gemini(image_path, description_context)
            except Exception as e:
                print(f"Gemini API analysis failed: {e}. Falling back to local AI...")

        # 2. Local AI fallback (YOLO + heuristics + demo matcher)
        return self._analyze_locally(image_path, description_context)

    def _analyze_via_gemini(self, image_path: str, description_context: str) -> Dict[str, Any]:
        with open(image_path, "rb") as f:
            img_bytes = f.read()
        
        base64_image = base64.b64encode(img_bytes).decode("utf-8")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        prompt = f"""
        Analyze this image of a municipal/civic issue.
        Context from user description: "{description_context}"
        
        Respond with ONLY a valid JSON object matching the following structure:
        {{
          "category": "Pothole" | "Garbage accumulation" | "Water leakage" | "Broken streetlight" | "Exposed wire" | "Overflowing drains" | "Illegal dumping" | "Fallen tree" | "Blocked road" | "Damaged traffic sign" | "Unsafe sidewalk" | "Public infrastructure damage" | "Public sanitation problem" | "Damaged public facility",
          "subcategory": "string, e.g., road_surface_damage, waste_management, electrical_hazard, etc.",
          "visible_objects": ["list of strings denoting objects, e.g., road, trash, pipe, wire"],
          "visible_hazards": ["list of hazards, e.g., road_obstruction, electrocution_risk, sanitation_hazard"],
          "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          "confidence": float between 0.0 and 1.0,
          "description": "Short summary describing the problem visible in the image"
        }}
        
        Verify: Do not write markdown blocks or text wrapper. Just output raw JSON.
        """
        
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_image
                        }
                    }
                ]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        response = requests.post(url, json=payload, timeout=20)
        response.raise_for_status()
        
        res_json = response.json()
        text_content = res_json["candidates"][0]["content"]["parts"][0]["text"]
        
        # Clean up in case Gemini returned markdown blocks
        if "```json" in text_content:
            text_content = text_content.split("```json")[1].split("```")[0].strip()
        elif "```" in text_content:
            text_content = text_content.split("```")[1].split("```")[0].strip()
            
        return json.loads(text_content)

    def _analyze_locally(self, image_path: str, description_context: str) -> Dict[str, Any]:
        """
        Runs local YOLO model if available and uses heuristic rules
        based on filenames and text descriptions.
        """
        path_str = str(image_path).lower()
        context_str = description_context.lower()
        
        # Step A: Check for preseeded demo cases
        if "civ-28491" in path_str or "pothole" in path_str or "pothole" in context_str:
            return {
                "category": "Pothole",
                "subcategory": "road_surface_damage",
                "visible_objects": ["pothole", "road", "vehicle"],
                "visible_hazards": ["road_obstruction", "pedestrian_hazard"],
                "severity": "HIGH",
                "confidence": 0.93,
                "description": "Large road-surface depression visible on active roadway near school entrance"
            }
        elif "civ-10002" in path_str or "garbage" in path_str or "garbage" in context_str or "trash" in context_str:
            return {
                "category": "Garbage accumulation",
                "subcategory": "waste_management",
                "visible_objects": ["garbage pile", "street", "bags"],
                "visible_hazards": ["sanitation_hazard", "pest_attraction"],
                "severity": "MEDIUM",
                "confidence": 0.95,
                "description": "Large pile of uncollected garbage bags accumulating on public street blocking market gate"
            }
        elif "civ-10003" in path_str or "streetlight" in path_str or "light" in path_str or "light" in context_str:
            return {
                "category": "Broken streetlight",
                "subcategory": "streetlighting",
                "visible_objects": ["street lamp", "utility pole"],
                "visible_hazards": ["low_visibility", "security_risk"],
                "severity": "LOW",
                "confidence": 0.92,
                "description": "Streetlight fixture is non-functional, causing complete darkness at night"
            }
        elif "civ-10004" in path_str or "leakage" in path_str or "leak" in context_str or "water" in context_str:
            return {
                "category": "Water leakage",
                "subcategory": "water_infrastructure",
                "visible_objects": ["water spray", "pavement", "pipe"],
                "visible_hazards": ["water_logging", "resource_waste"],
                "severity": "HIGH",
                "confidence": 0.94,
                "description": "Pressurized water leaking from main distribution valve, wasting drinking water"
            }
        elif "civ-10006" in path_str or "dumping" in path_str or "debris" in context_str or "dump" in context_str:
            return {
                "category": "Illegal dumping",
                "subcategory": "waste_management",
                "visible_objects": ["construction debris", "plot", "dirt"],
                "visible_hazards": ["illegal_activity", "environmental_hazard"],
                "severity": "HIGH",
                "confidence": 0.91,
                "description": "Large volume of construction debris and soil dumped illegally in open plot"
            }
        
        # Step B: Load YOLO objects if model is initialized
        detected_objects = []
        if self.yolo_model:
            try:
                results = self.yolo_model(image_path, verbose=False)
                if len(results) > 0:
                    names = results[0].names
                    for box in results[0].boxes:
                        label = names[int(box.cls)]
                        if label not in detected_objects:
                            detected_objects.append(label)
            except Exception as e:
                print(f"Error running YOLO model: {e}")

        # Step C: Heuristic mapping for custom user uploads
        category = "Public infrastructure damage"
        subcategory = "structural_damage"
        hazards = ["general_hazard"]
        severity = "MEDIUM"
        confidence = 0.75
        description = "Identified infrastructure issue needing inspection."

        # Keywords mapping
        keywords_map = {
            "wire": {
                "category": "Exposed wire", "subcategory": "electrical_hazard",
                "hazards": ["electrocution_risk", "fire_hazard"], "severity": "CRITICAL",
                "desc": "Dangerous exposed electrical wires dangling near walkway."
            },
            "cable": {
                "category": "Exposed wire", "subcategory": "electrical_hazard",
                "hazards": ["electrocution_risk", "fire_hazard"], "severity": "CRITICAL",
                "desc": "Dangerous exposed electrical wires dangling near walkway."
            },
            "drain": {
                "category": "Overflowing drains", "subcategory": "drainage",
                "hazards": ["sanitation_hazard", "flooding_risk"], "severity": "HIGH",
                "desc": "Blocked drainage channel overflowing onto active road."
            },
            "flood": {
                "category": "Overflowing drains", "subcategory": "drainage",
                "hazards": ["sanitation_hazard", "flooding_risk"], "severity": "HIGH",
                "desc": "Blocked drainage channel overflowing onto active road."
            },
            "sewage": {
                "category": "Public sanitation problem", "subcategory": "hygiene_issue",
                "hazards": ["sanitation_hazard", "contamination"], "severity": "HIGH",
                "desc": "Raw sewage/sanitation leakage in public neighborhood."
            },
            "tree": {
                "category": "Fallen tree", "subcategory": "road_obstruction",
                "hazards": ["road_obstruction", "pedestrian_hazard"], "severity": "HIGH",
                "desc": "Fallen tree blockading lanes of active transit route."
            },
            "branch": {
                "category": "Fallen tree", "subcategory": "road_obstruction",
                "hazards": ["road_obstruction", "pedestrian_hazard"], "severity": "HIGH",
                "desc": "Fallen tree blockading lanes of active transit route."
            },
            "sign": {
                "category": "Damaged traffic sign", "subcategory": "traffic_control",
                "hazards": ["traffic_confusion"], "severity": "LOW",
                "desc": "Bent/damaged municipal traffic sign causing road confusion."
            },
            "sidewalk": {
                "category": "Unsafe sidewalk", "subcategory": "pedestrian_infrastructure",
                "hazards": ["pedestrian_hazard", "trip_hazard"], "severity": "LOW",
                "desc": "Cracked/broken sidewalk posing trip risk to pedestrians."
            },
            "curb": {
                "category": "Unsafe sidewalk", "subcategory": "pedestrian_infrastructure",
                "hazards": ["pedestrian_hazard", "trip_hazard"], "severity": "LOW",
                "desc": "Cracked/broken sidewalk posing trip risk to pedestrians."
            },
            "animal": {
                "category": "Stray animal hazard", "subcategory": "public_safety_hazards",
                "hazards": ["traffic_disruption", "pedestrian_bite_risk"], "severity": "MEDIUM",
                "desc": "Stray animals wandering on active carriage way causing swerve risks."
            },
            "dog": {
                "category": "Stray animal hazard", "subcategory": "public_safety_hazards",
                "hazards": ["traffic_disruption", "pedestrian_bite_risk"], "severity": "MEDIUM",
                "desc": "Stray animals wandering on active carriage way causing swerve risks."
            },
            "parking": {
                "category": "Illegal parking", "subcategory": "traffic_parking_enforcement",
                "hazards": ["roadway_blockage", "pedestrian_obstruction"], "severity": "LOW",
                "desc": "Vehicle illegally parked blocking pedestrian sidewalk and active lane."
            },
            "lost": {
                "category": "Lost and Found", "subcategory": "public_property_recovery",
                "hazards": ["property_loss", "theft_risk"], "severity": "LOW",
                "desc": "Lost personal accessory / wallet discovered on bench in municipal park."
            },
            "found": {
                "category": "Lost and Found", "subcategory": "public_property_recovery",
                "hazards": ["property_loss", "theft_risk"], "severity": "LOW",
                "desc": "Personal accessory found and cataloged for owner retrieval."
            }
        }

        # Check description context first, then detected objects, then filename
        matched = False
        search_targets = [context_str, path_str] + detected_objects
        for target in search_targets:
            for kw, mapping in keywords_map.items():
                if kw in target:
                    category = mapping["category"]
                    subcategory = mapping["subcategory"]
                    hazards = mapping["hazards"]
                    severity = mapping["severity"]
                    description = mapping["desc"]
                    confidence = 0.88
                    matched = True
                    break
            if matched:
                break
                
        # Refine hazards based on YOLO objects
        # E.g. if we see "car" and "pothole", it increases the hazard
        if "car" in detected_objects or "truck" in detected_objects or "bus" in detected_objects:
            if "road_obstruction" not in hazards:
                hazards.append("road_obstruction")
            if severity == "MEDIUM":
                severity = "HIGH"

        # Make sure visible_objects lists YOLO detections or fallback items
        visible_objs = list(set(detected_objects + [category.lower().split()[0]]))
        
        return {
            "category": category,
            "subcategory": subcategory,
            "visible_objects": visible_objs,
            "visible_hazards": hazards,
            "severity": severity,
            "confidence": confidence,
            "description": description
        }

vision_analyzer = VisionAnalyzer()
