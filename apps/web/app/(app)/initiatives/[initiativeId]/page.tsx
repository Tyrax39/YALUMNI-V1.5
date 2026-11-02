import { InitiativeDetail } from "@/components/initiatives/initiative-surfaces";

type InitiativePageProps = {
  params: Promise<{
    initiativeId: string;
  }>;
};

export default async function InitiativePage({ params }: InitiativePageProps) {
  const { initiativeId } = await params;

  return <InitiativeDetail initiativeId={initiativeId} />;
}
