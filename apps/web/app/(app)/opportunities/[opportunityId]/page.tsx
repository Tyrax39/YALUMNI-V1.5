import { OpportunityDetail } from "@/components/opportunities/opportunity-surfaces";

type OpportunityPageProps = {
  params: Promise<{
    opportunityId: string;
  }>;
};

export default async function OpportunityPage({ params }: OpportunityPageProps) {
  const { opportunityId } = await params;

  return <OpportunityDetail opportunityId={opportunityId} />;
}
