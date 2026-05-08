import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type OpportunityPageProps = {
  params: Promise<{
    opportunityId: string;
  }>;
};

export default async function OpportunityPage({ params }: OpportunityPageProps) {
  const { opportunityId } = await params;

  return <PrototypeFeaturePage recordId={opportunityId} screenKey="opportunityDetail" />;
}

