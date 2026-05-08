import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type ContributionCampaignPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function ContributionCampaignPage({ params }: ContributionCampaignPageProps) {
  const { campaignId } = await params;

  return <PrototypeFeaturePage recordId={campaignId} screenKey="contributionCampaign" />;
}

