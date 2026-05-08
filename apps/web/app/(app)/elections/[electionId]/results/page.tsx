import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type ElectionResultsPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function ElectionResultsPage({ params }: ElectionResultsPageProps) {
  const { electionId } = await params;

  return <PrototypeFeaturePage recordId={electionId} screenKey="electionResults" />;
}

