import { MessagesRoutePage } from "@/components/platform/live-route-pages";

type ConversationPageProps = {
  params: Promise<{
    conversationId: string;
  }>;
};

export default async function ConversationPage({ params }: ConversationPageProps) {
  await params;

  return <MessagesRoutePage mode="conversation" />;
}

