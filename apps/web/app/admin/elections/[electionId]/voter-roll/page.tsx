import { AdminConsoleRedirectRoutePage } from "@/components/platform/live-route-pages";

type VoterRollPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function VoterRollPage({ params }: VoterRollPageProps) {
  await params;

  return (
    <AdminConsoleRedirectRoutePage
      description="Voter roll management now runs in the separate RBAC admin console."
      eyebrow="Voter roll"
      targetPath="/elections"
      title="Voter roll management"
    />
  );
}
