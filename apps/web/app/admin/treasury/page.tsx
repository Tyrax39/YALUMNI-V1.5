import { AdminConsoleRedirectRoutePage } from "@/components/platform/live-route-pages";

export default function AdminTreasuryPage() {
  return (
    <AdminConsoleRedirectRoutePage
      description="Treasury operations now run in the separate RBAC admin console."
      eyebrow="Treasury"
      targetPath="/treasury"
      title="Treasurer dashboard"
    />
  );
}
