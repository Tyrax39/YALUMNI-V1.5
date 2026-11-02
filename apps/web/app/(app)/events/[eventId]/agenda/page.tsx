import { EventAgenda } from "@/components/events/event-surfaces";

type EventAgendaPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function EventAgendaPage({ params }: EventAgendaPageProps) {
  const { eventId } = await params;

  return <EventAgenda eventId={eventId} />;
}
