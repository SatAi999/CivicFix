import datetime
import uuid
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Index
)
from sqlalchemy.orm import relationship
from .database import Base

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True) # citizen, operator, admin
    description = Column(String(255), nullable=True)
    
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    role = relationship("Role", back_populates="users")
    reported_issues = relationship("Issue", foreign_keys="[Issue.reporter_id]", back_populates="reporter")
    status_updates = relationship("IssueStatusHistory", back_populates="changed_by")
    assigned_tasks = relationship("IssueAssignment", foreign_keys="[IssueAssignment.assigned_to_id]", back_populates="assigned_to")
    verifications = relationship("IssueVerification", back_populates="verifier")
    resolutions = relationship("IssueResolution", back_populates="resolver")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False) # e.g. ROADS, SANITATION, WATER
    description = Column(Text, nullable=True)
    
    categories = relationship("IssueCategory", back_populates="default_department")
    assignments = relationship("IssueAssignment", back_populates="department")

class IssueCategory(Base):
    __tablename__ = "issue_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False) # e.g. Pothole, Water Leakage
    subcategory = Column(String(100), nullable=True)
    default_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    severity_rules = Column(Text, nullable=True) # JSON config for dynamic scoring rules
    
    default_department = relationship("Department", back_populates="categories")
    issues = relationship("Issue", back_populates="category")

class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(String(50), primary_key=True, index=True) # e.g. CIV-28491
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("issue_categories.id"), nullable=True)
    status = Column(String(50), default="REPORTED", index=True) 
    # REPORTED, AI_VERIFIED, TRIAGED, ASSIGNED, IN_PROGRESS, RESOLUTION_SUBMITTED, CITIZEN_VERIFIED, REOPENED
    severity = Column(String(20), default="MEDIUM", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_issues")
    category = relationship("IssueCategory", back_populates="issues")
    media = relationship("IssueMedia", back_populates="issue", cascade="all, delete-orphan")
    location = relationship("IssueLocation", back_populates="issue", uselist=False, cascade="all, delete-orphan")
    status_history = relationship("IssueStatusHistory", back_populates="issue", cascade="all, delete-orphan")
    assignments = relationship("IssueAssignment", back_populates="issue", cascade="all, delete-orphan")
    supporters = relationship("IssueSupport", back_populates="issue", cascade="all, delete-orphan")
    verifications = relationship("IssueVerification", back_populates="issue", cascade="all, delete-orphan")
    resolution = relationship("IssueResolution", back_populates="issue", uselist=False, cascade="all, delete-orphan")
    ai_analysis = relationship("AIAnalysis", back_populates="issue", uselist=False, cascade="all, delete-orphan")

class IssueMedia(Base):
    __tablename__ = "issue_media"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(50), ForeignKey("issues.id"), nullable=False)
    media_path = Column(String(500), nullable=False)
    media_type = Column(String(50), default="image") # image or video
    is_resolution = Column(Boolean, default=False) # true if it is uploaded by operator as fix evidence
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    issue = relationship("Issue", back_populates="media")

class IssueLocation(Base):
    __tablename__ = "issue_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(50), ForeignKey("issues.id"), nullable=False, unique=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    ward = Column(String(100), nullable=True, index=True)
    landmarks = Column(String(255), nullable=True)
    
    issue = relationship("Issue", back_populates="location")

class IssueStatusHistory(Base):
    __tablename__ = "issue_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(50), ForeignKey("issues.id"), nullable=False)
    status = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    issue = relationship("Issue", back_populates="status_history")
    changed_by = relationship("User", back_populates="status_updates")

class IssueAssignment(Base):
    __tablename__ = "issue_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(50), ForeignKey("issues.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    issue = relationship("Issue", back_populates="assignments")
    department = relationship("Department", back_populates="assignments")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tasks")

class IssueDuplicate(Base):
    __tablename__ = "issue_duplicates"
    
    id = Column(Integer, primary_key=True, index=True)
    primary_issue_id = Column(String(50), ForeignKey("issues.id"), nullable=False)
    duplicate_issue_id = Column(String(50), ForeignKey("issues.id"), nullable=False)
    similarity_score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    primary_issue = relationship("Issue", foreign_keys=[primary_issue_id])
    duplicate_issue = relationship("Issue", foreign_keys=[duplicate_issue_id])

class IssueSupport(Base):
    __tablename__ = "issue_support"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(50), ForeignKey("issues.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    issue = relationship("Issue", back_populates="supporters")

class IssueVerification(Base):
    __tablename__ = "issue_verification"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(50), ForeignKey("issues.id"), nullable=False)
    verifier_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_fixed = Column(String(50), nullable=False) # fixed, still_exists, partially_fixed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    issue = relationship("Issue", back_populates="verifications")
    verifier = relationship("User", back_populates="verifications")

class IssueResolution(Base):
    __tablename__ = "issue_resolutions"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(50), ForeignKey("issues.id"), nullable=False, unique=True)
    resolver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=True)
    media_path = Column(String(500), nullable=True) # operator uploads after-repair image here
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    issue = relationship("Issue", back_populates="resolution")
    resolver = relationship("User", back_populates="resolutions")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    type = Column(String(50), nullable=True) # e.g. status_change, duplicate, support
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="notifications")

class AIAnalysis(Base):
    __tablename__ = "ai_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(50), ForeignKey("issues.id"), nullable=False, unique=True)
    category_detected = Column(String(100), nullable=True)
    confidence = Column(Float, nullable=True)
    objects_detected = Column(Text, nullable=True) # JSON string of detected labels
    hazards = Column(Text, nullable=True)          # JSON string of hazards
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    issue = relationship("Issue", back_populates="ai_analysis")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="audit_logs")

# Indices for quick lookup of geographical coordinates and created dates
Index('idx_location_coords', IssueLocation.latitude, IssueLocation.longitude)
Index('idx_issue_status_created', Issue.status, Issue.created_at)
