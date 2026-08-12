import { SuccessStoryDetail } from "@/components/success-stories/success-story-surfaces";

type SuccessStoryPageProps = {
  params: Promise<{
    storyId: string;
  }>;
};

export default async function SuccessStoryPage({ params }: SuccessStoryPageProps) {
  const { storyId } = await params;

  return <SuccessStoryDetail storyId={storyId} />;
}
