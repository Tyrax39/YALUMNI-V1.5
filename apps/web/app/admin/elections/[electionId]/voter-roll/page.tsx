import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type VoterRollPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function VoterRollPage({ params }: VoterRollPageProps) {
  const { electionId } = await params;

  return <PrototypeFeaturePage recordId={electionId} screenKey="adminElectionVoterRoll" />;
}

