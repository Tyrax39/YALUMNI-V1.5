import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

from cryptography.fernet import Fernet

from app.core.config import get_settings

TOTP_DIGITS = 6
TOTP_PERIOD_SECONDS = 30
TOTP_SECRET_BYTES = 20
TOTP_WINDOW = 1
RECOVERY_CODE_COUNT = 8


def generate_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(TOTP_SECRET_BYTES)).decode("ascii").rstrip("=")


def _decode_secret(secret: str) -> bytes:
    normalized = secret.strip().replace(" ", "").upper()
    padding = "=" * ((8 - len(normalized) % 8) % 8)
    return base64.b32decode(f"{normalized}{padding}", casefold=True)


def generate_totp_code(secret: str, for_time: int | None = None) -> str:
    timestamp = int(time.time() if for_time is None else for_time)
    counter = timestamp // TOTP_PERIOD_SECONDS
    digest = hmac.new(
        _decode_secret(secret),
        struct.pack(">Q", counter),
        hashlib.sha1,
    ).digest()
    offset = digest[-1] & 0x0F
    truncated = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return str(truncated % (10**TOTP_DIGITS)).zfill(TOTP_DIGITS)


def verify_totp_code(secret: str, code: str) -> bool:
    normalized_code = "".join(character for character in code if character.isdigit())
    if len(normalized_code) != TOTP_DIGITS:
        return False

    now = int(time.time())
    for offset in range(-TOTP_WINDOW, TOTP_WINDOW + 1):
        candidate_time = now + offset * TOTP_PERIOD_SECONDS
        if hmac.compare_digest(generate_totp_code(secret, candidate_time), normalized_code):
            return True

    return False


def _fernet() -> Fernet:
    key = base64.urlsafe_b64encode(
        hashlib.sha256(get_settings().jwt_secret_key.encode("utf-8")).digest()
    )
    return Fernet(key)


def encrypt_totp_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode("utf-8")).decode("utf-8")


def decrypt_totp_secret(encrypted_secret: str) -> str:
    return _fernet().decrypt(encrypted_secret.encode("utf-8")).decode("utf-8")


def build_otpauth_url(secret: str, account_name: str) -> str:
    issuer = get_settings().app_name
    return (
        "otpauth://totp/"
        f"{quote(issuer)}:{quote(account_name)}"
        f"?secret={secret}&issuer={quote(issuer)}&algorithm=SHA1&digits={TOTP_DIGITS}"
        f"&period={TOTP_PERIOD_SECONDS}"
    )


def normalize_recovery_code(code: str) -> str:
    return "".join(character for character in code.strip().upper() if character.isalnum())


def generate_recovery_codes(count: int = RECOVERY_CODE_COUNT) -> list[str]:
    recovery_codes: list[str] = []
    for _ in range(count):
        raw_code = secrets.token_hex(4).upper()
        recovery_codes.append(f"{raw_code[:4]}-{raw_code[4:]}")

    return recovery_codes


def hash_recovery_code(code: str) -> str:
    normalized = normalize_recovery_code(code)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def hash_recovery_codes(codes: list[str]) -> list[str]:
    return [hash_recovery_code(code) for code in codes]


def consume_recovery_code(stored_hashes: list[str] | None, code: str) -> list[str] | None:
    normalized = normalize_recovery_code(code)
    if not normalized:
        return None

    candidate_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    hashes = list(stored_hashes or [])
    for index, stored_hash in enumerate(hashes):
        if hmac.compare_digest(stored_hash, candidate_hash):
            return hashes[:index] + hashes[index + 1 :]

    return None
