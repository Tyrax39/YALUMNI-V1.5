import { CommunityLeaderDashboardPage } from "@/components/communities/community-leader-dashboard-page";

type CommunityLeaderPageProps = {
  params: Promise<{
    communityId: string;
  }>;
};

export default async function CommunityLeaderPage({ params }: CommunityLeaderPageProps) {
  const { communityId } = await params;

  return <CommunityLeaderDashboardPage communityId={communityId} />;
}
