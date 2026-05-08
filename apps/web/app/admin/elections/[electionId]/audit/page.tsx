import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type ElectionAuditPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function ElectionAuditPage({ params }: ElectionAuditPageProps) {
  const { electionId } = await params;

  return <PrototypeFeaturePage recordId={electionId} screenKey="adminElectionAudit" />;
}

