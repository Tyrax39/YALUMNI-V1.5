import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type ElectionVotePageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function ElectionVotePage({ params }: ElectionVotePageProps) {
  const { electionId } = await params;

  return <PrototypeFeaturePage recordId={electionId} screenKey="electionVote" />;
}

