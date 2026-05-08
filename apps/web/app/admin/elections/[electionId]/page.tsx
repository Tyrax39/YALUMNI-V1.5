import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type AdminElectionPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function AdminElectionPage({ params }: AdminElectionPageProps) {
  const { electionId } = await params;

  return <PrototypeFeaturePage recordId={electionId} screenKey="adminElectionConsole" />;
}

