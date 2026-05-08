import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type SuccessStoryPageProps = {
  params: Promise<{
    storyId: string;
  }>;
};

export default async function SuccessStoryPage({ params }: SuccessStoryPageProps) {
  const { storyId } = await params;

  return <PrototypeFeaturePage recordId={storyId} screenKey="successStoryDetail" />;
}

