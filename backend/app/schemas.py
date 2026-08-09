from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Optional, Any

# Authentication
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role_name: str = "citizen" # citizen, operator, admin

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role_name: str
    created_at: datetime

    class Config:
        from_attributes = True

# Location
class IssueLocationCreate(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    ward: Optional[str] = None
    landmarks: Optional[str] = None

class IssueLocationResponse(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    ward: Optional[str] = None
    landmarks: Optional[str] = None

    class Config:
        from_attributes = True

# Media
class IssueMediaResponse(BaseModel):
    id: int
    media_path: str
    media_type: str
    is_resolution: bool
    created_at: datetime

    class Config:
        from_attributes = True

# AI Analysis
class AIAnalysisResponse(BaseModel):
    category_detected: Optional[str] = None
    confidence: Optional[float] = None
    objects_detected: Optional[List[str]] = []
    hazards: Optional[List[str]] = []
    reasoning: Optional[str] = None

    class Config:
        from_attributes = True

# Verification
class IssueVerificationCreate(BaseModel):
    is_fixed: str # fixed, still_exists, partially_fixed
    notes: Optional[str] = None

class IssueVerificationResponse(BaseModel):
    id: int
    is_fixed: str
    notes: Optional[str] = None
    verifier_username: str
    created_at: datetime

class IssueResolutionCreate(BaseModel):
    notes: str
    
# Issue Response/Create
class IssueCreate(BaseModel):
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    ward: Optional[str] = None
    landmarks: Optional[str] = None
    is_demo: bool = False

class IssueDetailResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    severity: str
    created_at: datetime
    updated_at: datetime
    category_name: Optional[str] = None
    reporter_username: str
    location: Optional[IssueLocationResponse] = None
    media: List[IssueMediaResponse] = []
    supporters_count: int
    has_supported: bool = False
    ai_analysis: Optional[AIAnalysisResponse] = None
    history: List[Any] = []
    resolution: Optional[Any] = None
    verifications: List[Any] = []

    class Config:
        from_attributes = True

class IssueListResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    severity: str
    created_at: datetime
    category_name: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    supporters_count: int
    media_url: Optional[str] = None

    class Config:
        from_attributes = True

# Duplicate info
class DuplicateInfo(BaseModel):
    primary_issue_id: str
    title: str
    distance_meters: float
    similarity_score: float
    status: str
    category_match: bool
    media_url: Optional[str] = None

class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    suggestions: List[DuplicateInfo] = []

# Notification
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Chatbot assistant schemas
class ChatMessage(BaseModel):
    message: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ChatResponse(BaseModel):
    reply: str
    intent: Optional[str] = None
    suggested_issues: List[IssueListResponse] = []

# Analytics & Hotspot Schemas
class HotspotDetail(BaseModel):
    ward: str
    center_lat: float
    center_lng: float
    report_count: int
    main_categories: List[str]
    growth_rate: float
    recommendation: str

class HotspotsResponse(BaseModel):
    hotspots: List[HotspotDetail] = []
    
class CategoryStat(BaseModel):
    category: str
    count: int

class StatusStat(BaseModel):
    status: str
    count: int

class SeverityStat(BaseModel):
    severity: str
    count: int

class TrendStat(BaseModel):
    date: str
    count: int

class DashboardStatsResponse(BaseModel):
    total_open: int
    critical_count: int
    high_count: int
    in_progress_count: int
    total_resolved: int
    avg_resolution_days: float
    by_category: List[CategoryStat] = []
    by_status: List[StatusStat] = []
    by_severity: List[SeverityStat] = []
    timeline_trend: List[TrendStat] = []
