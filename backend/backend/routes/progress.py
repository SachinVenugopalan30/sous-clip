import asyncio
import json

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query
from sse_starlette.sse import EventSourceResponse

from backend.config import settings
from backend.services.auth import decode_token

router = APIRouter(prefix="/api", tags=["progress"])


async def _progress_generator(user_id: str):
    client = aioredis.from_url(settings.valkey_url)
    pubsub = client.pubsub()
    await pubsub.subscribe(f"progress:{user_id}")

    try:
        while True:
            message = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=1.0
            )
            if message and message["type"] == "message":
                data = json.loads(message["data"])
                yield {"event": "progress", "data": json.dumps(data)}
            else:
                # Send keepalive comment every second
                yield {"comment": "keepalive"}
            await asyncio.sleep(0.1)
    finally:
        await pubsub.unsubscribe(f"progress:{user_id}")
        await client.aclose()


@router.get("/progress/{user_id}")
async def progress_stream(user_id: str, token: str = Query(...)):
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return EventSourceResponse(_progress_generator(user_id))
