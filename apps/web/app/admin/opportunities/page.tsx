import { AdminConsoleRedirectRoutePage } from "@/components/platform/live-route-pages";

export default function AdminOpportunitiesPage() {
  return (
    <AdminConsoleRedirectRoutePage
      description="Opportunity moderation now runs in the separate RBAC admin console."
      eyebrow="Admin opportunities"
      targetPath="/opportunities"
      title="Opportunity moderation queue"
    />
  );
}
