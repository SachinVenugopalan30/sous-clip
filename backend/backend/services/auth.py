import hmac
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from backend.config import Settings, settings


def verify_credentials(username: str, password: str, config: Settings = settings) -> bool:
    username_match = hmac.compare_digest(username, config.app_username)
    password_match = hmac.compare_digest(password, config.app_password)
    return username_match and password_match


def create_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "username": username,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
