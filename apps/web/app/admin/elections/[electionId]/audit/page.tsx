import { AdminConsoleRedirectRoutePage } from "@/components/platform/live-route-pages";

type ElectionAuditPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function ElectionAuditPage({ params }: ElectionAuditPageProps) {
  await params;

  return (
    <AdminConsoleRedirectRoutePage
      description="Election audit export now runs in the separate RBAC admin console."
      eyebrow="Election audit"
      targetPath="/elections"
      title="Election audit results report"
    />
  );
}
