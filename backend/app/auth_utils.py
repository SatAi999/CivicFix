import hashlib
from datetime import datetime, timedelta
from typing import Any, Union
import jwt
from passlib.context import CryptContext
from .config import settings

# Attempt to configure passlib, fallback to hashlib if bcrypt is not compiled properly on Windows
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception:
    pwd_context = None

def hash_password(password: str) -> str:
    if pwd_context:
        try:
            return pwd_context.hash(password)
        except Exception:
            pass
    # Fallback secure pbkdf2 hash
    salt = b"civicfix_salt_2026"
    db_val = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"pbkdf2_sha256${100000}${salt.decode('latin1')}${db_val.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if pwd_context and not hashed_password.startswith("pbkdf2"):
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            pass
    if hashed_password.startswith("pbkdf2"):
        parts = hashed_password.split("$")
        if len(parts) == 4:
            iterations = int(parts[1])
            salt = parts[2].encode('latin1')
            hash_val = parts[3]
            test_val = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, iterations)
            return test_val.hex() == hash_val
    # If all else fails, do a direct comparison of a fallbacked hash
    test_hash = hash_password(plain_password)
    return test_hash == hashed_password

def create_access_token(subject: Union[str, Any], role: str, user_id: int, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {
        "exp": expire, 
        "sub": str(subject), 
        "role": role, 
        "user_id": user_id
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict | None:
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return decoded
    except Exception:
        return None
