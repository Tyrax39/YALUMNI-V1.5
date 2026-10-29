from urllib.parse import urlencode

from app.core.email import EmailMessage, build_web_url, send_email
from app.modules.auth.models import User
from app.modules.communities.models import Community, CommunityInvitation


def send_community_invitation_email(
    *,
    community: Community,
    invitation: CommunityInvitation,
    invitation_token: str,
    invited_by: User,
) -> None:
    invitation_url = build_web_url(
        f"/communities/invitations/accept?{urlencode({'token': invitation_token})}"
    )
    send_email(
        EmailMessage(
            to_email=invitation.invited_email,
            subject=f"Invitation to {community.name}",
            text_body=(
                f"Hello,\n\n"
                f"{invited_by.display_name} invited you to join {community.name} as "
                f"{invitation.invited_role.lower()}.\n\n"
                f"Accept the invitation here:\n{invitation_url}\n\n"
                "If you were not expecting this invitation, you can ignore this message."
            ),
        )
    )
