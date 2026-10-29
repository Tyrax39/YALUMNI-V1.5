import { CommunityDetailPage } from "@/components/communities/community-detail-page";

type CommunityPageProps = {
  params: Promise<{
    communityId: string;
  }>;
};

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { communityId } = await params;

  return <CommunityDetailPage communityId={communityId} />;
}
