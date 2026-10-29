import { ChapterAnalyticsPage } from "@/components/communities/chapter-analytics-page";

type ChapterAnalyticsPageProps = {
  params: Promise<{
    chapterId: string;
  }>;
};

export default async function ChapterAnalyticsRoute({ params }: ChapterAnalyticsPageProps) {
  const { chapterId } = await params;

  return <ChapterAnalyticsPage chapterId={chapterId} />;
}
