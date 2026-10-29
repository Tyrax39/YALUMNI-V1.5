import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage as SmtpEmailMessage
from threading import Lock

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmailMessage:
    to_email: str
    subject: str
    text_body: str
    html_body: str | None = None


@dataclass(frozen=True)
class EmailDeliveryResult:
    provider: str
    delivered: bool
    error: str | None = None


_outbox_lock = Lock()
_outbox: list[EmailMessage] = []


def email_outbox() -> list[EmailMessage]:
    with _outbox_lock:
        return list(_outbox)


def clear_email_outbox() -> None:
    with _outbox_lock:
        _outbox.clear()


def send_email(message: EmailMessage) -> EmailDeliveryResult:
    settings = get_settings()
    provider = settings.email_provider.strip().lower()
    if provider in {"disabled", "none", "off"}:
        logger.info("Email delivery disabled for %s", message.to_email)
        return EmailDeliveryResult(provider=provider, delivered=False)

    if provider == "console":
        with _outbox_lock:
            _outbox.append(message)
        logger.info("Console email queued to %s: %s", message.to_email, message.subject)
        return EmailDeliveryResult(provider=provider, delivered=True)

    if provider == "smtp":
        return _send_smtp_email(message)

    error = f"Unsupported email provider: {settings.email_provider}"
    logger.error(error)
    return EmailDeliveryResult(provider=provider, delivered=False, error=error)


def _send_smtp_email(message: EmailMessage) -> EmailDeliveryResult:
    settings = get_settings()
    if not settings.smtp_host:
        error = "SMTP_HOST is required when EMAIL_PROVIDER=smtp"
        logger.error(error)
        return EmailDeliveryResult(provider="smtp", delivered=False, error=error)

    smtp_message = SmtpEmailMessage()
    smtp_message["From"] = f"{settings.email_from_name} <{settings.email_from_address}>"
    smtp_message["To"] = message.to_email
    smtp_message["Subject"] = message.subject
    smtp_message.set_content(message.text_body)
    if message.html_body:
        smtp_message.add_alternative(message.html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user and settings.smtp_password:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(smtp_message)
    except Exception as exc:
        logger.exception("SMTP email delivery failed for %s", message.to_email)
        return EmailDeliveryResult(provider="smtp", delivered=False, error=str(exc))

    return EmailDeliveryResult(provider="smtp", delivered=True)


def build_web_url(path: str) -> str:
    settings = get_settings()
    normalized_base = settings.web_base_url.rstrip("/")
    normalized_path = path if path.startswith("/") else f"/{path}"
    return f"{normalized_base}{normalized_path}"
