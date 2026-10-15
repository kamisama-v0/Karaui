"use client";

import { Bookmark, Flag, GitBranch, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
} from "@/components/agents/message";
import { MessageActions } from "@/components/agents/message-actions";
import {
  MessageBubble,
  MessageBubbleContent,
} from "@/components/agents/message-bubble";
import { StreamingResponse } from "@/components/agents/streaming-response";

const FIRST =
  "Use a debounce of about 250ms on the search field so typing stays responsive while the request count drops.";
const LAST =
  "Yes — cancel the in-flight request with an AbortController whenever a newer query starts, so stale results never overwrite fresh ones.";

const MORE = [
  { value: "branch", label: "Branch from here", icon: <GitBranch /> },
  { value: "save", label: "Save to notes", icon: <Bookmark /> },
  { value: "report", label: "Report", icon: <Flag />, destructive: true },
];

export function MessageActionsPreview() {
  const [notice, setNotice] = useState<string>();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flash = (text: string) => {
    setNotice(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(undefined), 1800);
  };

  const regenerate = () =>
    new Promise<void>((resolve) => {
      window.setTimeout(() => {
        flash("Regenerated a new version.");
        resolve();
      }, 1200);
    });

  const assistant = (text: string, last: boolean) => (
    <Message from="assistant">
      <MessageAvatar>
        <Sparkles />
      </MessageAvatar>
      <MessageContent className="gap-1">
        <StreamingResponse status="complete" showActions={false} announce={false}>
          {text}
        </StreamingResponse>
        <MessageActions
          visibility={last ? "always" : "hover"}
          copyText={text}
          onRegenerate={regenerate}
          onShare={() => flash("Share link copied.")}
          onFeedbackSubmit={() => flash("Feedback sent.")}
          moreActions={MORE}
          onMoreAction={(value) =>
            flash(`${MORE.find((item) => item.value === value)?.label}.`)
          }
          className="-ml-1.5"
        />
      </MessageContent>
    </Message>
  );

  const user = (text: string) => (
    <Message from="user">
      <MessageContent>
        <MessageBubble variant="soft">
          <MessageBubbleContent>{text}</MessageBubbleContent>
        </MessageBubble>
      </MessageContent>
    </Message>
  );

  return (
    <div className="flex h-[440px] w-full max-w-xl flex-col justify-center">
      <MessageGroup spacing="default">
        {user("How do I stop my search box from spamming the API?")}
        {assistant(FIRST, false)}
        {user("And if an older response arrives late?")}
        {assistant(LAST, true)}
      </MessageGroup>
      <div className="h-6 pt-2 text-center text-xs text-muted-foreground">
        <AnimatePresence mode="wait">
          {notice ? (
            <motion.p
              key={notice}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {notice}
            </motion.p>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              Hover the first answer to reveal its actions.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
