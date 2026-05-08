import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type ChapterAnalyticsPageProps = {
  params: Promise<{
    chapterId: string;
  }>;
};

export default async function ChapterAnalyticsPage({ params }: ChapterAnalyticsPageProps) {
  const { chapterId } = await params;

  return <PrototypeFeaturePage recordId={chapterId} screenKey="adminChapterAnalytics" />;
}

