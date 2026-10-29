import { ElectionVoteSurface } from "@/components/elections/election-surfaces";

type ElectionVotePageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function ElectionVotePage({ params }: ElectionVotePageProps) {
  const { electionId } = await params;

  return <ElectionVoteSurface electionId={electionId} />;
}
