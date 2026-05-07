"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { MessageSquare, Search, Send, ShieldOff } from "lucide-react";

import {
  AlumniDirectoryProfile,
  ApiError,
  blockUser,
  Conversation,
  createDirectConversation,
  DirectMessage,
  listConversationMessages,
  listConversations,
  listUserBlocks,
  markConversationRead,
  searchAlumniDirectory,
  sendDirectMessage,
  unblockUser,
  UserBlock
} from "@/lib/api";

type MessagingPanelProps = {
  accessToken: string;
  currentUserId: string;
};

type ConversationState =
  | { status: "loading" }
  | { conversations: Conversation[]; status: "ready"; total: number }
  | { message: string; status: "error" };

type MessageState =
  | { status: "idle" }
  | { messages: DirectMessage[]; status: "ready" }
  | { message: string; status: "error" }
  | { status: "loading" };

type SearchState =
  | { status: "idle" }
  | { profiles: AlumniDirectoryProfile[]; status: "ready" }
  | { message: string; status: "error" }
  | { status: "loading" };

const conversationPageSize = 8;
const messagePageSize = 50;
const emptyConversations: Conversation[] = [];

export function MessagingPanel({ accessToken, currentUserId }: MessagingPanelProps) {
  const [conversationState, setConversationState] = useState<ConversationState>({
    status: "loading"
  });
  const [messageState, setMessageState] = useState<MessageState>({ status: "idle" });
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadConversations();
    void loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const conversations =
    conversationState.status === "ready" ? conversationState.conversations : emptyConversations;
  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );
  const selectedOtherParticipant = selectedConversation
    ? otherParticipant(selectedConversation, currentUserId)
    : null;
  const blockedUserIds = new Set(blocks.map((block) => block.blocked_user_id));

  async function loadConversations(selectConversationId?: string) {
    setConversationState({ status: "loading" });
    try {
      const response = await listConversations(accessToken, { limit: conversationPageSize });
      setConversationState({
        conversations: response.conversations,
        status: "ready",
        total: response.total
      });
      const nextSelectedId =
        selectConversationId ?? selectedConversationId ?? response.conversations[0]?.id ?? null;
      setSelectedConversationId(nextSelectedId);
      if (nextSelectedId) {
        await loadMessages(nextSelectedId);
      } else {
        setMessageState({ status: "idle" });
      }
    } catch (caught) {
      setConversationState({
        message: caught instanceof ApiError ? caught.message : "Conversations could not be loaded.",
        status: "error"
      });
    }
  }

  async function loadBlocks() {
    try {
      setBlocks(await listUserBlocks(accessToken));
    } catch {
      setBlocks([]);
    }
  }

  async function loadMessages(conversationId: string) {
    setMessageState({ status: "loading" });
    try {
      const response = await listConversationMessages(accessToken, conversationId, {
        limit: messagePageSize
      });
      setMessageState({ messages: response.messages, status: "ready" });
      await markConversationRead(accessToken, conversationId);
    } catch (caught) {
      setMessageState({
        message: caught instanceof ApiError ? caught.message : "Messages could not be loaded.",
        status: "error"
      });
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setSearchState({ status: "loading" });
    try {
      const response = await searchAlumniDirectory(accessToken, {
        limit: 5,
        q: searchQuery.trim(),
        sort: "name"
      });
      setSearchState({
        profiles: response.profiles.filter((profile) => profile.user_id !== currentUserId),
        status: "ready"
      });
    } catch (caught) {
      setSearchState({
        message: caught instanceof ApiError ? caught.message : "Member search could not be loaded.",
        status: "error"
      });
    }
  }

  async function handleStartConversation(profile: AlumniDirectoryProfile) {
    setBusyAction(`start:${profile.user_id}`);
    setNotice(null);
    try {
      const conversation = await createDirectConversation(accessToken, {
        initial_message: initialMessage,
        participant_user_id: profile.user_id
      });
      setInitialMessage("");
      setSearchState({ status: "idle" });
      setSearchQuery("");
      await loadConversations(conversation.id);
      setNotice(`Conversation ready with ${profile.display_name}.`);
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Conversation could not be started.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSelectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    await loadMessages(conversationId);
    await loadConversations(conversationId);
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConversationId || !draft.trim()) {
      return;
    }
    setBusyAction("send");
    setNotice(null);
    try {
      await sendDirectMessage(accessToken, selectedConversationId, { body: draft });
      setDraft("");
      await loadMessages(selectedConversationId);
      await loadConversations(selectedConversationId);
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Message could not be sent.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleBlockToggle(userId: string, displayName: string) {
    const existingBlock = blocks.find((block) => block.blocked_user_id === userId);
    setBusyAction(`block:${userId}`);
    setNotice(null);
    try {
      if (existingBlock) {
        await unblockUser(accessToken, userId);
        setNotice(`${displayName} unblocked.`);
      } else {
        await blockUser(accessToken, { blocked_user_id: userId });
        setNotice(`${displayName} blocked.`);
      }
      await loadBlocks();
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Block settings could not be saved.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare aria-hidden="true" size={20} />
            </span>
            <h2 className="font-display text-2xl font-semibold text-ink">Direct messages</h2>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Start private conversations with verified members, track unread replies, and block
            unwanted contact.
          </p>
        </div>
        {conversationState.status === "ready" ? (
          <p className="text-sm font-semibold text-primary">
            {conversationState.total} conversation{conversationState.total === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {notice ? (
        <p className="mt-5 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted">
          {notice}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-5">
          <form className="rounded-lg border border-border bg-surface p-4" onSubmit={handleSearch}>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Find a verified member
              <div className="flex gap-2">
                <input
                  className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search name, country, sector, or skill"
                  value={searchQuery}
                />
                <button
                  className="focus-ring inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-[#003d7d]"
                  type="submit"
                >
                  <Search aria-label="Search members" size={18} />
                </button>
              </div>
            </label>
            <label className="mt-3 grid gap-2 text-sm font-semibold text-ink">
              Optional first message
              <textarea
                className="min-h-20 rounded-lg border border-border bg-white px-4 py-3 text-sm font-normal leading-6 text-ink outline-none transition focus:border-primary"
                maxLength={2000}
                onChange={(event) => setInitialMessage(event.target.value)}
                placeholder="Send a short note when starting the conversation."
                value={initialMessage}
              />
            </label>
            <SearchResults
              busyAction={busyAction}
              onStartConversation={handleStartConversation}
              searchState={searchState}
            />
          </form>

          <div className="rounded-lg border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-ink">Conversations</p>
            </div>
            {conversationState.status === "loading" ? (
              <p className="p-4 text-sm font-semibold text-muted">Loading conversations...</p>
            ) : null}
            {conversationState.status === "error" ? (
              <p className="p-4 text-sm font-semibold text-danger">{conversationState.message}</p>
            ) : null}
            {conversationState.status === "ready" ? (
              <div className="divide-y divide-border">
                {conversationState.conversations.length === 0 ? (
                  <p className="p-4 text-sm font-semibold text-muted">
                    No direct conversations yet.
                  </p>
                ) : null}
                {conversationState.conversations.map((conversation) => (
                  <ConversationButton
                    conversation={conversation}
                    currentUserId={currentUserId}
                    isSelected={conversation.id === selectedConversationId}
                    key={conversation.id}
                    onSelect={handleSelectConversation}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-xl font-semibold text-ink">
                {selectedOtherParticipant?.display_name ?? "Select a conversation"}
              </p>
              {selectedOtherParticipant ? (
                <p className="mt-1 break-all text-sm text-muted">{selectedOtherParticipant.email}</p>
              ) : null}
            </div>
            {selectedOtherParticipant ? (
              <button
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-ink transition hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busyAction === `block:${selectedOtherParticipant.user_id}`}
                onClick={() =>
                  handleBlockToggle(
                    selectedOtherParticipant.user_id,
                    selectedOtherParticipant.display_name
                  )
                }
                type="button"
              >
                <ShieldOff aria-hidden="true" size={16} />
                {blockedUserIds.has(selectedOtherParticipant.user_id) ? "Unblock" : "Block"}
              </button>
            ) : null}
          </div>

          <div className="min-h-80 px-4 py-4">
            {messageState.status === "idle" ? (
              <p className="text-sm font-semibold text-muted">
                Choose a conversation or start one from member search.
              </p>
            ) : null}
            {messageState.status === "loading" ? (
              <p className="text-sm font-semibold text-muted">Loading messages...</p>
            ) : null}
            {messageState.status === "error" ? (
              <p className="text-sm font-semibold text-danger">{messageState.message}</p>
            ) : null}
            {messageState.status === "ready" ? (
              <div className="grid gap-3">
                {messageState.messages.length === 0 ? (
                  <p className="text-sm font-semibold text-muted">No messages yet.</p>
                ) : null}
                {messageState.messages.map((message) => (
                  <MessageBubble
                    currentUserId={currentUserId}
                    key={message.id}
                    message={message}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <form className="border-t border-border p-4" onSubmit={handleSendMessage}>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Reply
              <div className="flex gap-2">
                <textarea
                  className="min-h-12 min-w-0 flex-1 rounded-lg border border-border bg-white px-4 py-3 text-sm font-normal leading-6 text-ink outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedConversationId}
                  maxLength={2000}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message..."
                  value={draft}
                />
                <button
                  className="focus-ring inline-flex h-12 w-12 items-center justify-center self-end rounded-lg bg-primary text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedConversationId || busyAction === "send" || !draft.trim()}
                  type="submit"
                >
                  <Send aria-label="Send message" size={18} />
                </button>
              </div>
            </label>
          </form>
        </div>
      </div>
    </section>
  );
}

function SearchResults({
  busyAction,
  onStartConversation,
  searchState
}: {
  busyAction: string | null;
  onStartConversation: (profile: AlumniDirectoryProfile) => void;
  searchState: SearchState;
}) {
  if (searchState.status === "idle") {
    return null;
  }
  if (searchState.status === "loading") {
    return <p className="mt-4 text-sm font-semibold text-muted">Searching members...</p>;
  }
  if (searchState.status === "error") {
    return <p className="mt-4 text-sm font-semibold text-danger">{searchState.message}</p>;
  }
  return (
    <div className="mt-4 grid gap-2">
      {searchState.profiles.length === 0 ? (
        <p className="text-sm font-semibold text-muted">No verified members matched.</p>
      ) : null}
      {searchState.profiles.map((profile) => (
        <button
          className="focus-ring grid gap-1 rounded-lg border border-border bg-white px-3 py-3 text-left transition hover:border-primary"
          disabled={busyAction === `start:${profile.user_id}`}
          key={profile.user_id}
          onClick={() => onStartConversation(profile)}
          type="button"
        >
          <span className="font-semibold text-ink">{profile.display_name}</span>
          <span className="text-xs font-semibold text-muted">
            {[profile.country, profile.sector, profile.headline].filter(Boolean).join(" · ") ||
              "Verified member"}
          </span>
        </button>
      ))}
    </div>
  );
}

function ConversationButton({
  conversation,
  currentUserId,
  isSelected,
  onSelect
}: {
  conversation: Conversation;
  currentUserId: string;
  isSelected: boolean;
  onSelect: (conversationId: string) => void;
}) {
  const participant = otherParticipant(conversation, currentUserId);
  const preview = conversation.last_message?.body ?? "No messages yet.";
  return (
    <button
      className={`focus-ring grid w-full gap-1 px-4 py-3 text-left transition ${
        isSelected ? "bg-primary/10" : "hover:bg-surface"
      }`}
      onClick={() => onSelect(conversation.id)}
      type="button"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-semibold text-ink">
          {participant?.display_name ?? "Conversation"}
        </span>
        {conversation.unread_count > 0 ? (
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-white">
            {conversation.unread_count}
          </span>
        ) : null}
      </span>
      <span className="line-clamp-2 text-sm leading-5 text-muted">{preview}</span>
    </button>
  );
}

function MessageBubble({
  currentUserId,
  message
}: {
  currentUserId: string;
  message: DirectMessage;
}) {
  const isMine = message.sender_user_id === currentUserId;
  return (
    <article className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-lg px-4 py-3 ${
          isMine ? "bg-primary text-white" : "border border-border bg-surface text-ink"
        }`}
      >
        <p className={`text-xs font-semibold ${isMine ? "text-white/80" : "text-muted"}`}>
          {message.sender_display_name} · {new Date(message.sent_at).toLocaleString()}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
      </div>
    </article>
  );
}

function otherParticipant(conversation: Conversation, currentUserId: string) {
  return (
    conversation.participants.find((participant) => participant.user_id !== currentUserId) ??
    conversation.participants[0] ??
    null
  );
}
