import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type EventPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;

  return <PrototypeFeaturePage recordId={eventId} screenKey="eventDetail" />;
}

