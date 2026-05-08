import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type ContributionPayPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function ContributionPayPage({ params }: ContributionPayPageProps) {
  const { campaignId } = await params;

  return <PrototypeFeaturePage recordId={campaignId} screenKey="contributionPay" />;
}

