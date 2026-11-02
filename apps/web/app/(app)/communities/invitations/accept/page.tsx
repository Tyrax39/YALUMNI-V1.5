import { CommunityInvitationAcceptPage } from "@/components/communities/community-invitation-accept-page";

type InvitationAcceptPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function InvitationAcceptPage({
  searchParams
}: InvitationAcceptPageProps) {
  const { token } = await searchParams;

  return <CommunityInvitationAcceptPage initialToken={token ?? ""} />;
}
