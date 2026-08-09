from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, crud, auth_utils, models

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> models.User:
    token = credentials.credentials
    payload = auth_utils.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_411_LENGTH_REQUIRED, # using standard auth error status (or 401 Unauthorized)
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Using 401 Unauthorized
    username: str = payload.get("sub")
    user_id: int = payload.get("user_id")
    if username is None or user_id is None:
         raise HTTPException(status_code=401, detail="Invalid authentication credentials")
         
    user = crud.get_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_role(allowed_roles: list[str]):
    def dependency(current_user: models.User = Depends(get_current_user)):
        role_name = current_user.role.name
        if role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: {role_name} role is not authorized. Required: {allowed_roles}"
            )
        return current_user
    return dependency

@router.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_username = crud.get_user_by_username(db, username=user.username)
    if db_username:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    db_email = crud.get_user_by_email(db, email=user.email)
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_user = crud.create_user(db=db, user=user)
    return {
        "id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
        "role_name": db_user.role.name,
        "created_at": db_user.created_at
    }

@router.post("/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user_credentials.username)
    if not db_user:
        db_user = crud.get_user_by_email(db, email=user_credentials.username)
        
    if not db_user or not auth_utils.verify_password(user_credentials.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    access_token = auth_utils.create_access_token(
        subject=db_user.username,
        role=db_user.role.name,
        user_id=db_user.id
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": db_user.role.name,
        "user_id": db_user.id,
        "username": db_user.username
    }

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role_name": current_user.role.name,
        "created_at": current_user.created_at
    }
