import { AdminConsoleRedirectRoutePage } from "@/components/platform/live-route-pages";

export default function AdminNewElectionPage() {
  return (
    <AdminConsoleRedirectRoutePage
      description="Election draft creation now runs in the separate RBAC admin console."
      eyebrow="Create election"
      targetPath="/elections"
      title="Create new election wizard"
    />
  );
}
