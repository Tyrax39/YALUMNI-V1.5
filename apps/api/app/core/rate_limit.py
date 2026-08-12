from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock

from fastapi import HTTPException, status


@dataclass(frozen=True)
class RateLimitRule:
    attempts: int
    window_seconds: int


_attempts: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def clear_rate_limits() -> None:
    with _lock:
        _attempts.clear()


def _prune_attempts(bucket: deque[float], rule: RateLimitRule, now: float) -> None:
    window_start = now - rule.window_seconds
    while bucket and bucket[0] <= window_start:
        bucket.popleft()


def check_rate_limit(key: str, rule: RateLimitRule) -> None:
    if rule.attempts <= 0 or rule.window_seconds <= 0:
        return

    now = time.monotonic()
    with _lock:
        bucket = _attempts[key]
        _prune_attempts(bucket, rule, now)

        if len(bucket) >= rule.attempts:
            retry_after = max(1, int(rule.window_seconds - (now - bucket[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )



def record_rate_limit_attempt(key: str, rule: RateLimitRule) -> None:
    if rule.attempts <= 0 or rule.window_seconds <= 0:
        return

    now = time.monotonic()
    with _lock:
        bucket = _attempts[key]
        _prune_attempts(bucket, rule, now)
        bucket.append(now)


def clear_rate_limit(key: str) -> None:
    with _lock:
        _attempts.pop(key, None)


def enforce_rate_limit(key: str, rule: RateLimitRule) -> None:
    check_rate_limit(key, rule)
    record_rate_limit_attempt(key, rule)
