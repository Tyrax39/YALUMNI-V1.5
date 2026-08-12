import { AdminConsoleRedirectRoutePage } from "@/components/platform/live-route-pages";

export default function AdminElectionsPage() {
  return (
    <AdminConsoleRedirectRoutePage
      description="Election administration now runs in the separate RBAC admin console."
      eyebrow="Admin elections"
      targetPath="/elections"
      title="Election admin dashboard"
    />
  );
}
