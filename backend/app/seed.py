import json
import datetime
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from .models import (
    Role, User, Department, IssueCategory, Issue, IssueLocation, 
    IssueMedia, AIAnalysis, IssueSupport, IssueStatusHistory, IssueResolution, IssueDuplicate
)
from .auth_utils import hash_password

def seed_db():
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Seeding database...")
        
        # 1. Seed Roles
        roles_data = [
            {"name": "admin", "description": "System Administrator with full access"},
            {"name": "operator", "description": "Authority Operator who assigns and resolves cases"},
            {"name": "citizen", "description": "Citizen user who reports and tracks cases"}
        ]
        
        roles = {}
        for r_data in roles_data:
            role = db.query(Role).filter_by(name=r_data["name"]).first()
            if not role:
                role = Role(name=r_data["name"], description=r_data["description"])
                db.add(role)
                db.commit()
                db.refresh(role)
            roles[r_data["name"]] = role

        # 2. Seed Users
        users_data = [
            {"username": "admin", "email": "admin@civicfix.gov", "password": "password123", "role_name": "admin"},
            {"username": "operator", "email": "operator@civicfix.gov", "password": "password123", "role_name": "operator"},
            {"username": "citizen", "email": "citizen@civicfix.com", "password": "password123", "role_name": "citizen"},
            {"username": "citizen2", "email": "citizen2@civicfix.com", "password": "password123", "role_name": "citizen"},
            {"username": "citizen3", "email": "citizen3@civicfix.com", "password": "password123", "role_name": "citizen"}
        ]
        
        users = {}
        for u_data in users_data:
            user = db.query(User).filter_by(username=u_data["username"]).first()
            if not user:
                user = User(
                    username=u_data["username"],
                    email=u_data["email"],
                    password_hash=hash_password(u_data["password"]),
                    role_id=roles[u_data["role_name"]].id
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            users[u_data["username"]] = user

        # 3. Seed Departments
        depts_data = [
            {"name": "Public Works & Roads", "code": "ROADS", "description": "Responsible for road maintenance, repairs, potholes, sidewalks, and signs"},
            {"name": "Sanitation & Waste Management", "code": "SANITATION", "description": "Responsible for garbage, sewage, drainage cleaning, and public cleanliness"},
            {"name": "Water Infrastructure", "code": "WATER", "description": "Responsible for municipal water distribution, leakages, and pipes"},
            {"name": "Electrical & Street Lighting", "code": "ELECTRICAL", "description": "Responsible for streetlights, poles, and electrical line maintenance"},
            {"name": "Traffic & Road Management", "code": "TRAFFIC", "description": "Responsible for traffic signals, signage, and lane markings"}
        ]
        
        depts = {}
        for d_data in depts_data:
            dept = db.query(Department).filter_by(code=d_data["code"]).first()
            if not dept:
                dept = Department(name=d_data["name"], code=d_data["code"], description=d_data["description"])
                db.add(dept)
                db.commit()
                db.refresh(dept)
            depts[d_data["code"]] = dept

        # 4. Seed Issue Categories
        categories_data = [
            {"name": "Pothole", "subcategory": "road_surface_damage", "dept_code": "ROADS"},
            {"name": "Damaged roads", "subcategory": "road_surface_damage", "dept_code": "ROADS"},
            {"name": "Garbage accumulation", "subcategory": "waste_management", "dept_code": "SANITATION"},
            {"name": "Overflowing drains", "subcategory": "drainage", "dept_code": "SANITATION"},
            {"name": "Water leakage", "subcategory": "water_infrastructure", "dept_code": "WATER"},
            {"name": "Broken streetlight", "subcategory": "streetlighting", "dept_code": "ELECTRICAL"},
            {"name": "Damaged traffic sign", "subcategory": "traffic_control", "dept_code": "TRAFFIC"},
            {"name": "Unsafe sidewalk", "subcategory": "pedestrian_infrastructure", "dept_code": "ROADS"},
            {"name": "Illegal dumping", "subcategory": "waste_management", "dept_code": "SANITATION"},
            {"name": "Public infrastructure damage", "subcategory": "structural_damage", "dept_code": "ROADS"},
            {"name": "Fallen tree", "subcategory": "road_obstruction", "dept_code": "ROADS"},
            {"name": "Blocked road", "subcategory": "road_obstruction", "dept_code": "ROADS"},
            {"name": "Exposed wire", "subcategory": "electrical_hazard", "dept_code": "ELECTRICAL"},
            {"name": "Public sanitation problem", "subcategory": "hygiene_issue", "dept_code": "SANITATION"},
            {"name": "Damaged public facility", "subcategory": "structural_damage", "dept_code": "ROADS"}
        ]
        
        categories = {}
        for c_data in categories_data:
            cat = db.query(IssueCategory).filter_by(name=c_data["name"]).first()
            if not cat:
                rules = {
                    "base_severity": "HIGH" if c_data["name"] in ["Exposed wire", "Fallen tree", "Blocked road", "Overflowing drains"] else "MEDIUM"
                }
                cat = IssueCategory(
                    name=c_data["name"],
                    subcategory=c_data["subcategory"],
                    default_department_id=depts[c_data["dept_code"]].id,
                    severity_rules=json.dumps(rules)
                )
                db.add(cat)
                db.commit()
                db.refresh(cat)
            categories[c_data["name"]] = cat

        # 5. Seed Demo Issues (only if database has no issues to avoid duplication on re-run)
        if db.query(Issue).count() == 0:
            print("Seeding demo issues...")
            
            # Helper to create complete issue structure
            def create_demo_issue(
                issue_id, title, desc, cat_name, status, severity, 
                lat, lng, address, ward, reporter, created_days_ago,
                objects=None, hazards=None, reasoning=None, confidence=0.95
            ):
                created_date = datetime.datetime.utcnow() - datetime.timedelta(days=created_days_ago)
                
                issue = Issue(
                    id=issue_id,
                    title=title,
                    description=desc,
                    category_id=categories[cat_name].id,
                    status=status,
                    severity=severity,
                    reporter_id=reporter.id,
                    created_at=created_date,
                    updated_at=created_date
                )
                db.add(issue)
                db.commit()
                
                # Add location
                loc = IssueLocation(
                    issue_id=issue_id,
                    latitude=lat,
                    longitude=lng,
                    address=address,
                    ward=ward
                )
                db.add(loc)
                
                # Add status history
                history = IssueStatusHistory(
                    issue_id=issue_id,
                    status="REPORTED",
                    notes="Issue reported via CivicFix application.",
                    changed_by_id=reporter.id,
                    created_at=created_date
                )
                db.add(history)
                
                # Add mock image
                media = IssueMedia(
                    issue_id=issue_id,
                    media_path=f"demo_images/{issue_id}_before.jpg",
                    media_type="image",
                    is_resolution=False,
                    created_at=created_date
                )
                db.add(media)
                
                # Add AI Analysis
                ai = AIAnalysis(
                    issue_id=issue_id,
                    category_detected=cat_name,
                    confidence=confidence,
                    objects_detected=json.dumps(objects or []),
                    hazards=json.dumps(hazards or []),
                    reasoning=reasoning or "Automated detection of civic issue.",
                    created_at=created_date
                )
                db.add(ai)
                db.commit()
                return issue

            # Example 1: Active Primary Pothole in Ward 12
            civ_28491 = create_demo_issue(
                issue_id="CIV-28491",
                title="Large pothole near school entrance",
                desc="Large pothole near the school entrance. Bikes are frequently swerving around it. Very dangerous during drop-off hours.",
                cat_name="Pothole",
                status="ASSIGNED",
                severity="HIGH",
                lat=12.9720,
                lng=77.5940,
                address="12 Main Rd, near Sunrise Public School, Ward 12",
                ward="Ward 12",
                reporter=users["citizen"],
                created_days_ago=4,
                objects=["pothole", "road", "vehicle"],
                hazards=["road_obstruction", "pedestrian_hazard"],
                reasoning="Large road-surface depression visible in direct path of school entrance. High swerve-risk detected."
            )
            
            # Add status history to show ASSIGNED
            history = IssueStatusHistory(
                issue_id="CIV-28491",
                status="ASSIGNED",
                notes="Assigned automatically to Public Works & Roads department.",
                changed_by_id=users["operator"].id,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)
            )
            db.add(history)
            
            # Example 2: Garbage Accumulation in Ward 7
            civ_10002 = create_demo_issue(
                issue_id="CIV-10002",
                title="Garbage accumulation at Ward 7 Market Gate",
                desc="Huge pile of trash left rotting for three days near the municipal market gate. Strong odor and attracting stray dogs.",
                cat_name="Garbage accumulation",
                status="TRIAGED",
                severity="MEDIUM",
                lat=12.9750,
                lng=77.5960,
                address="Municipal Market Gate No. 2, Commercial St, Ward 7",
                ward="Ward 7",
                reporter=users["citizen2"],
                created_days_ago=2,
                objects=["garbage pile", "street", "bags"],
                hazards=["sanitation_hazard", "pest_attraction"],
                reasoning="Large volume of decomposing organic waste blocking public pedestrian market entrance."
            )

            # Example 3: Broken Streetlight in Ward 12
            civ_10003 = create_demo_issue(
                issue_id="CIV-10003",
                title="Streetlight out on 5th Cross Road",
                desc="Streetlight is out for 3 days. The corner is completely dark at night. Increased security concern.",
                cat_name="Broken streetlight",
                status="IN_PROGRESS",
                severity="LOW",
                lat=12.9705,
                lng=77.5920,
                address="Opposite Post Office, 5th Cross Road, Ward 12",
                ward="Ward 12",
                reporter=users["citizen"],
                created_days_ago=5,
                objects=["street lamp", "utility pole"],
                hazards=["low_visibility", "security_risk"],
                reasoning="Streetlight fixture not functioning. Night visual analysis confirms low illumination."
            )
            
            # Status histories for IN_PROGRESS
            history_triaged = IssueStatusHistory(
                issue_id="CIV-10003",
                status="TRIAGED",
                notes="Triage complete. Route determined to Electrical department.",
                changed_by_id=users["operator"].id,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=4)
            )
            history_inprogress = IssueStatusHistory(
                issue_id="CIV-10003",
                status="IN_PROGRESS",
                notes="Electrical maintenance crew dispatched to replace bulb.",
                changed_by_id=users["operator"].id,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
            )
            db.add(history_triaged)
            db.add(history_inprogress)

            # Example 4: Water Leakage in Ward 7
            civ_10004 = create_demo_issue(
                issue_id="CIV-10004",
                title="Water leak from main street valve",
                desc="Fresh water is spraying out from the pipeline connection valve on the street side. Thousands of liters of water wasted.",
                cat_name="Water leakage",
                status="REPORTED",
                severity="HIGH",
                lat=12.9730,
                lng=77.5980,
                address="Near Metro Station Pillar 121, Outer Ring Road, Ward 7",
                ward="Ward 7",
                reporter=users["citizen3"],
                created_days_ago=1,
                objects=["water spray", "pavement", "pipe"],
                hazards=["water_logging", "resource_waste"],
                reasoning="Active high-pressure water pipe leakage on public pavement."
            )

            # Example 5: Duplicate Pothole Reports pointing to CIV-28491
            # User 2 reports same pothole slightly offset
            civ_dup1 = create_demo_issue(
                issue_id="CIV-28492",
                title="Huge pothole next to school entrance",
                desc="A very deep pothole right in front of Sunrise Public School. Cars are swerving to avoid it.",
                cat_name="Pothole",
                status="REPORTED",
                severity="HIGH",
                lat=12.9721,
                lng=77.5941,
                address="14 Main Rd, Ward 12",
                ward="Ward 12",
                reporter=users["citizen2"],
                created_days_ago=3,
                objects=["pothole", "road"],
                hazards=["road_obstruction"],
                reasoning="Pothole detected near active lane."
            )
            # Add to duplicate table
            dup_relation1 = IssueDuplicate(
                primary_issue_id="CIV-28491",
                duplicate_issue_id="CIV-28492",
                similarity_score=0.91
            )
            db.add(dup_relation1)
            
            # Support mock relation
            db.add(IssueSupport(issue_id="CIV-28491", user_id=users["citizen2"].id))

            # User 3 reports same pothole
            civ_dup2 = create_demo_issue(
                issue_id="CIV-28493",
                title="Dangerous deep pothole on Main Road",
                desc="Dangerous deep pothole close to the school gate. Need fixing immediately before accidents happen.",
                cat_name="Pothole",
                status="REPORTED",
                severity="HIGH",
                lat=12.9719,
                lng=77.5939,
                address="Sunrise School Lane, Main Rd, Ward 12",
                ward="Ward 12",
                reporter=users["citizen3"],
                created_days_ago=2,
                objects=["pothole", "road"],
                hazards=["road_obstruction", "pedestrian_hazard"],
                reasoning="Depression on road surface detected."
            )
            dup_relation2 = IssueDuplicate(
                primary_issue_id="CIV-28491",
                duplicate_issue_id="CIV-28493",
                similarity_score=0.88
            )
            db.add(dup_relation2)
            db.add(IssueSupport(issue_id="CIV-28491", user_id=users["citizen3"].id))

            # Seed extra support upvotes for CIV-28491
            db.add(IssueSupport(issue_id="CIV-28491", user_id=users["citizen"].id))

            # Example 6: Resolved Issue awaiting citizen verification
            civ_10006 = create_demo_issue(
                issue_id="CIV-10006",
                title="Illegal dumping on side road",
                desc="Debris and construction waste dumped illegally overnight at the empty plot corner.",
                cat_name="Illegal dumping",
                status="RESOLUTION_SUBMITTED",
                severity="HIGH",
                lat=12.9760,
                lng=77.5950,
                address="Plot 5B, Green View layout, Ward 7",
                ward="Ward 7",
                reporter=users["citizen2"],
                created_days_ago=8,
                objects=["construction debris", "plot", "dirt"],
                hazards=["illegal_activity", "environmental_hazard"],
                reasoning="Large volume of structural debris dumped on vacant land plot."
            )
            
            # Operator resolves it
            res_history_triaged = IssueStatusHistory(
                issue_id="CIV-10006",
                status="TRIAGED",
                notes="Assigned to Sanitation enforcement.",
                changed_by_id=users["operator"].id,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=7)
            )
            res_history_inprogress = IssueStatusHistory(
                issue_id="CIV-10006",
                status="IN_PROGRESS",
                notes="Debris cleanup loader crew assigned.",
                changed_by_id=users["operator"].id,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=6)
            )
            res_history_resolved = IssueStatusHistory(
                issue_id="CIV-10006",
                status="RESOLUTION_SUBMITTED",
                notes="Construction waste removed and site cleared. Photos uploaded.",
                changed_by_id=users["operator"].id,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
            )
            db.add(res_history_triaged)
            db.add(res_history_inprogress)
            db.add(res_history_resolved)
            
            # Create resolution entry
            res = IssueResolution(
                issue_id="CIV-10006",
                resolver_id=users["operator"].id,
                notes="Dumped materials cleared using JCB loader. Site returned to safe status.",
                media_path="demo_images/CIV-10006_after.jpg",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
            )
            db.add(res)
            
            # Add resolution media
            res_media = IssueMedia(
                issue_id="CIV-10006",
                media_path="demo_images/CIV-10006_after.jpg",
                media_type="image",
                is_resolution=True,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
            )
            db.add(res_media)
            
            db.commit()

        print("Database seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
