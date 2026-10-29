import { ElectionPrivacySurface } from "@/components/elections/election-surfaces";

type BallotPrivacyPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function BallotPrivacyPage({ params }: BallotPrivacyPageProps) {
  const { electionId } = await params;

  return <ElectionPrivacySurface electionId={electionId} />;
}
