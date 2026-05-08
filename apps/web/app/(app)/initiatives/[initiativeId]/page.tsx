import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type InitiativePageProps = {
  params: Promise<{
    initiativeId: string;
  }>;
};

export default async function InitiativePage({ params }: InitiativePageProps) {
  const { initiativeId } = await params;

  return <PrototypeFeaturePage recordId={initiativeId} screenKey="initiativeDetail" />;
}

