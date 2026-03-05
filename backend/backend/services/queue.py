import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum

import redis


class QueueStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class QueueItem:
    id: str
    user_id: str
    url: str
    status: QueueStatus
    position: int = 0
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    error: str | None = None

    def to_json(self) -> str:
        return json.dumps({
            "id": self.id,
            "user_id": self.user_id,
            "url": self.url,
            "status": self.status.value,
            "position": self.position,
            "created_at": self.created_at,
            "error": self.error,
        })

    @classmethod
    def from_json(cls, data: str) -> "QueueItem":
        d = json.loads(data)
        return cls(
            id=d["id"],
            user_id=d["user_id"],
            url=d["url"],
            status=QueueStatus(d["status"]),
            position=d.get("position", 0),
            created_at=d["created_at"],
            error=d.get("error"),
        )


def _queue_key(user_id: str) -> str:
    return f"queue:{user_id}"


def _item_key(item_id: str) -> str:
    return f"queue_item:{item_id}"


class ExtractionQueue:
    def __init__(self, redis_url: str):
        self.client = redis.Redis.from_url(redis_url, decode_responses=False)

    def enqueue(self, user_id: str, url: str) -> QueueItem:
        item = QueueItem(
            id=f"q-{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            url=url,
            status=QueueStatus.PENDING,
        )
        self.client.hset("queue_items", item.id, item.to_json())
        self.client.rpush(_queue_key(user_id), item.id)
        return item

    def list_items(self, user_id: str) -> list[QueueItem]:
        item_ids = self.client.lrange(_queue_key(user_id), 0, -1)
        items = []
        for i, item_id in enumerate(item_ids):
            raw = self.client.hget("queue_items", item_id)
            if raw:
                item = QueueItem.from_json(raw)
                item.position = i
                items.append(item)
        return items

    def cancel(self, user_id: str, item_id: str) -> bool:
        raw = self.client.hget("queue_items", item_id)
        if not raw:
            return False
        item = QueueItem.from_json(raw)
        if item.status != QueueStatus.PENDING:
            return False
        item.status = QueueStatus.CANCELLED
        self.client.hset("queue_items", item_id, item.to_json())
        self.client.lrem(_queue_key(user_id), 1, item_id.encode() if isinstance(item_id, str) else item_id)
        return True

    def mark_in_progress(self, item_id: str) -> None:
        raw = self.client.hget("queue_items", item_id)
        if raw:
            item = QueueItem.from_json(raw)
            if item.status == QueueStatus.PENDING:
                item.status = QueueStatus.IN_PROGRESS
                self.client.hset("queue_items", item_id, item.to_json())

    def dequeue(self, user_id: str) -> QueueItem | None:
        item_ids = self.client.lrange(_queue_key(user_id), 0, -1)
        for item_id in item_ids:
            raw = self.client.hget("queue_items", item_id)
            if raw:
                item = QueueItem.from_json(raw)
                if item.status == QueueStatus.PENDING:
                    item.status = QueueStatus.IN_PROGRESS
                    self.client.hset("queue_items", item.id, item.to_json())
                    return item
        return None

    def complete(self, item_id: str, user_id: str) -> None:
        raw = self.client.hget("queue_items", item_id)
        if raw:
            item = QueueItem.from_json(raw)
            item.status = QueueStatus.COMPLETED
            self.client.hset("queue_items", item_id, item.to_json())
            self.client.lrem(_queue_key(user_id), 1, item_id.encode() if isinstance(item_id, str) else item_id)

    def fail(self, item_id: str, user_id: str, error: str) -> None:
        raw = self.client.hget("queue_items", item_id)
        if raw:
            item = QueueItem.from_json(raw)
            item.status = QueueStatus.FAILED
            item.error = error
            self.client.hset("queue_items", item_id, item.to_json())

    def retry(self, user_id: str, item_id: str) -> bool:
        raw = self.client.hget("queue_items", item_id)
        if not raw:
            return False
        item = QueueItem.from_json(raw)
        if item.status != QueueStatus.FAILED:
            return False
        item.status = QueueStatus.PENDING
        item.error = None
        self.client.hset("queue_items", item_id, item.to_json())
        return True

    def get_all_active_items(self) -> list[QueueItem]:
        """Return all PENDING or IN_PROGRESS items across all users."""
        all_raw = self.client.hgetall("queue_items")
        active = []
        for raw in all_raw.values():
            item = QueueItem.from_json(raw)
            if item.status in (QueueStatus.PENDING, QueueStatus.IN_PROGRESS):
                active.append(item)
        return active

    def publish_progress(
        self,
        user_id: str,
        item_id: str,
        step: str,
        status: str,
        percent: int | None = None,
        meta: dict | None = None,
    ) -> None:
        message: dict = {
            "item_id": item_id,
            "step": step,
            "status": status,
        }
        if percent is not None:
            message["percent"] = percent
        if meta is not None:
            message["meta"] = meta
        self.client.publish(f"progress:{user_id}", json.dumps(message))
