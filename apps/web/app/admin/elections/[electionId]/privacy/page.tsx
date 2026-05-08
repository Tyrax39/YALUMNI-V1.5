import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type BallotPrivacyPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function BallotPrivacyPage({ params }: BallotPrivacyPageProps) {
  const { electionId } = await params;

  return <PrototypeFeaturePage recordId={electionId} screenKey="adminElectionPrivacy" />;
}

