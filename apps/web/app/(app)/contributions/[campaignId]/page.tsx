import { ContributionCampaignDetail } from "@/components/contributions/contribution-surfaces";

type ContributionCampaignPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function ContributionCampaignPage({ params }: ContributionCampaignPageProps) {
  const { campaignId } = await params;

  return <ContributionCampaignDetail campaignId={campaignId} />;
}
