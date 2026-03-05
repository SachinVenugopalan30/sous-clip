from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from backend.dependencies import get_current_user, CurrentUser
from backend.services.auth import create_token


app = FastAPI()


@app.get("/protected")
async def protected(user: CurrentUser = Depends(get_current_user)):
    return {"username": user.username}


client = TestClient(app)


def test_protected_route_with_valid_token():
    token = create_token(username="chef")
    resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "chef"


def test_protected_route_without_token():
    resp = client.get("/protected")
    assert resp.status_code == 401


def test_protected_route_with_invalid_token():
    resp = client.get("/protected", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401
