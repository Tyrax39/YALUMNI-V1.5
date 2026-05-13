import { ElectionDetail } from "@/components/elections/election-surfaces";

type ElectionPageProps = {
  params: Promise<{
    electionId: string;
  }>;
};

export default async function ElectionPage({ params }: ElectionPageProps) {
  const { electionId } = await params;

  return <ElectionDetail electionId={electionId} />;
}
