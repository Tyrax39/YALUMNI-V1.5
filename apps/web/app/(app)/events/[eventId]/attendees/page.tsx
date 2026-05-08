import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type EventAttendeesPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function EventAttendeesPage({ params }: EventAttendeesPageProps) {
  const { eventId } = await params;

  return <PrototypeFeaturePage recordId={eventId} screenKey="eventAttendees" />;
}

