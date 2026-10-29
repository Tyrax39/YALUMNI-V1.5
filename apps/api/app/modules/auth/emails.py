from urllib.parse import urlencode

from app.core.email import EmailMessage, build_web_url, send_email
from app.modules.auth.models import User


def send_email_verification_email(user: User, token: str) -> None:
    verification_url = build_web_url(f"/verify-email?{urlencode({'token': token})}")
    send_email(
        EmailMessage(
            to_email=user.email,
            subject="Verify your YALUMNI email",
            text_body=(
                f"Hello {user.display_name},\n\n"
                "Use the link below to verify your YALUMNI account email.\n\n"
                f"{verification_url}\n\n"
                "If you did not create this account, you can ignore this message."
            ),
        )
    )


def send_password_reset_email(user: User, token: str) -> None:
    reset_url = build_web_url(f"/reset-password?{urlencode({'token': token})}")
    send_email(
        EmailMessage(
            to_email=user.email,
            subject="Reset your YALUMNI password",
            text_body=(
                f"Hello {user.display_name},\n\n"
                "Use the link below to reset your YALUMNI password.\n\n"
                f"{reset_url}\n\n"
                "If you did not request this reset, you can ignore this message."
            ),
        )
    )
