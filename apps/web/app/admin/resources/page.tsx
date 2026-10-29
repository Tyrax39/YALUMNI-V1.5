import { AdminConsoleRedirectRoutePage } from "@/components/platform/live-route-pages";

export default function AdminResourcesPage() {
  return (
    <AdminConsoleRedirectRoutePage
      description="Resource moderation now runs in the separate RBAC admin console."
      eyebrow="Admin resources"
      targetPath="/resources"
      title="Resource management console"
    />
  );
}
