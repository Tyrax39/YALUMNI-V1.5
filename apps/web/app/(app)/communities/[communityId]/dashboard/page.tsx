import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type CommunityLeaderPageProps = {
  params: Promise<{
    communityId: string;
  }>;
};

export default async function CommunityLeaderPage({ params }: CommunityLeaderPageProps) {
  const { communityId } = await params;

  return <PrototypeFeaturePage recordId={communityId} screenKey="communityLeader" />;
}

