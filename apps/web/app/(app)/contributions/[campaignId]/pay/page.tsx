import { ContributionPaySurface } from "@/components/contributions/contribution-surfaces";

type ContributionPayPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function ContributionPayPage({ params }: ContributionPayPageProps) {
  const { campaignId } = await params;

  return <ContributionPaySurface campaignId={campaignId} />;
}
