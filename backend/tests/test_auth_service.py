from backend.services.auth import create_token, decode_token, verify_credentials


def test_verify_credentials_valid(monkeypatch):
    monkeypatch.setenv("APP_USERNAME", "chef")
    monkeypatch.setenv("APP_PASSWORD", "secret123")

    from backend.config import Settings
    s = Settings()

    assert verify_credentials("chef", "secret123", s) is True


def test_verify_credentials_wrong_password(monkeypatch):
    monkeypatch.setenv("APP_USERNAME", "chef")
    monkeypatch.setenv("APP_PASSWORD", "secret123")

    from backend.config import Settings
    s = Settings()

    assert verify_credentials("chef", "wrongpass", s) is False


def test_verify_credentials_wrong_username(monkeypatch):
    monkeypatch.setenv("APP_USERNAME", "chef")
    monkeypatch.setenv("APP_PASSWORD", "secret123")

    from backend.config import Settings
    s = Settings()

    assert verify_credentials("hacker", "secret123", s) is False


def test_create_and_decode_token():
    token = create_token(username="chef")
    payload = decode_token(token)
    assert payload is not None
    assert payload["username"] == "chef"


def test_decode_invalid_token():
    assert decode_token("invalid.token.here") is None
