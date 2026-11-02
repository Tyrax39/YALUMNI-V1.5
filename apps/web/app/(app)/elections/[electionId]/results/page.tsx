import { ElectionResultsSurface } from "@/components/elections/election-surfaces";

type ElectionResultsPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function ElectionResultsPage({ params }: ElectionResultsPageProps) {
  const { electionId } = await params;

  return <ElectionResultsSurface electionId={electionId} />;
}
