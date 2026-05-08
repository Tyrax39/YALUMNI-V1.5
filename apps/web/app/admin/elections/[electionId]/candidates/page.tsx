import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type CandidateReviewPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function CandidateReviewPage({ params }: CandidateReviewPageProps) {
  const { electionId } = await params;

  return <PrototypeFeaturePage recordId={electionId} screenKey="adminElectionCandidates" />;
}

