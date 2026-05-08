import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type EventAgendaPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function EventAgendaPage({ params }: EventAgendaPageProps) {
  const { eventId } = await params;

  return <PrototypeFeaturePage recordId={eventId} screenKey="eventAgenda" />;
}

