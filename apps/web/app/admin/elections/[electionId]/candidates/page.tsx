import { AdminConsoleRedirectRoutePage } from "@/components/platform/live-route-pages";

type CandidateReviewPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function CandidateReviewPage({ params }: CandidateReviewPageProps) {
  await params;

  return (
    <AdminConsoleRedirectRoutePage
      description="Candidate review now runs in the separate RBAC admin console."
      eyebrow="Candidate review"
      targetPath="/elections"
      title="Candidate review queue"
    />
  );
}
