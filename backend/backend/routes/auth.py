from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.dependencies import CurrentUser, get_current_user
from backend.services.auth import create_token, verify_credentials

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    username: str
    token: str


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    if not verify_credentials(request.username, request.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(username=request.username)
    return LoginResponse(username=request.username, token=token)


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    return {"username": user.username}
