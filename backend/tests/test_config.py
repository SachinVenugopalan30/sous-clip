from backend.config import Settings


def test_env_file_may_hold_keys_other_tools_use(tmp_path):
    # .env.example ships HF_TOKEN (download script) and OPENAI_BASE_URL (OpenAI SDK)
    env = tmp_path / ".env"
    env.write_text("HF_TOKEN=dummy\nOPENAI_BASE_URL=http://example.invalid/v1\nAI_MODEL=m\n")
    assert Settings(_env_file=env).ai_model == "m"
