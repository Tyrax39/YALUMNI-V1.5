import { EventAttendees } from "@/components/events/event-surfaces";

type EventAttendeesPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function EventAttendeesPage({ params }: EventAttendeesPageProps) {
  const { eventId } = await params;

  return <EventAttendees eventId={eventId} />;
}
