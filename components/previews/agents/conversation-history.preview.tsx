"use client";

import { useEffect, useRef, useState } from "react";
import {
  type Conversation,
  ConversationHistory,
} from "@/components/agents/conversation-history";

const HOUR = 3_600_000;

// Ages in hours; timestamps are built after mount so server and client agree.
const SEED: { id: string; title: string; age: number; pinned?: boolean }[] = [
  { id: "c1", title: "Q4 launch plan", age: 30, pinned: true },
  { id: "c2", title: "Refactor auth middleware", age: 1 },
  { id: "c3", title: "Explain React server actions", age: 3 },
  { id: "c4", title: "SQL query for churned users", age: 26 },
  { id: "c5", title: "Draft release notes v2.4", age: 50 },
  { id: "c6", title: "Compare vector databases", age: 96 },
  { id: "c7", title: "Trip itinerary: Kyoto", age: 220 },
  { id: "c8", title: "Regex for ISO dates", age: 400 },
];

const NEW_TITLES = [
  "Summarize the incident report",
  "Rename columns in billing table",
  "Write a haiku about deploys",
];

export function ConversationHistoryPreview() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>("c2");
  const counter = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const now = Date.now();
    setConversations(
      SEED.map(({ age, ...c }) => ({ ...c, updatedAt: now - age * HOUR })),
    );
    return () => window.clearInterval(timer.current);
  }, []);

  // Inserts a chat at the top and streams its generated title in.
  const newChat = () => {
    window.clearInterval(timer.current);
    const title = NEW_TITLES[counter.current % NEW_TITLES.length] ?? "New chat";
    counter.current += 1;
    const id = `new-${counter.current}`;
    setConversations((list) => [
      { id, title: "", streaming: true, updatedAt: Date.now() },
      ...list.map((c) => (c.streaming ? { ...c, streaming: false } : c)),
    ]);
    setActiveId(id);
    let length = 0;
    timer.current = window.setInterval(() => {
      length += 2;
      const done = length >= title.length;
      setConversations((list) =>
        list.map((c) =>
          c.id === id ? { ...c, title: title.slice(0, length), streaming: !done } : c,
        ),
      );
      if (done) window.clearInterval(timer.current);
    }, 45);
  };

  return (
    <div className="flex w-full items-center justify-center py-4">
      <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-3 shadow-sm">
        <ConversationHistory
          conversations={conversations}
          onConversationsChange={setConversations}
          activeId={activeId}
          onActiveIdChange={setActiveId}
          onNewChat={newChat}
          maxHeight={300}
        />
      </div>
    </div>
  );
}
