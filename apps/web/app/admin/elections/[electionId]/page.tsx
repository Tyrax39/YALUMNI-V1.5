import { AdminConsoleRedirectRoutePage } from "@/components/platform/live-route-pages";

type AdminElectionPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function AdminElectionPage({ params }: AdminElectionPageProps) {
  await params;

  return (
    <AdminConsoleRedirectRoutePage
      description="Election operations now run in the separate RBAC admin console."
      eyebrow="Election console"
      targetPath="/elections"
      title="Admin election console"
    />
  );
}
