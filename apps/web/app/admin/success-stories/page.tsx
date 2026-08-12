import { AdminConsoleRedirectRoutePage } from "@/components/platform/live-route-pages";

export default function AdminSuccessStoriesPage() {
  return (
    <AdminConsoleRedirectRoutePage
      description="Success story moderation now runs in the separate RBAC admin console."
      eyebrow="Admin stories"
      targetPath="/success-stories"
      title="Success story moderation queue"
    />
  );
}
