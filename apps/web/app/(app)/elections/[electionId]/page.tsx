import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type ElectionPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function ElectionPage({ params }: ElectionPageProps) {
  const { electionId } = await params;

  return <PrototypeFeaturePage recordId={electionId} screenKey="electionDetail" />;
}

