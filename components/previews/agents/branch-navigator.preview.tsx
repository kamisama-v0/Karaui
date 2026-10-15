"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  BranchContent,
  BranchNavigator,
  Branches,
} from "@/components/agents/branch-navigator";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from "@/components/agents/message";
import { MessageActions } from "@/components/agents/message-actions";
import {
  MessageBubble,
  MessageBubbleContent,
} from "@/components/agents/message-bubble";
import { StreamingResponse } from "@/components/agents/streaming-response";

const VERSIONS = [
  "A haiku about deploys:\n\nGreen checks line the path —\nthe pipeline hums, then goes still.\nFriday, shipped at five.",
  "A haiku about deploys:\n\nOne small config flag,\na thousand servers wake up.\nRollback stays unused.",
  "A haiku about deploys:\n\nLogs scroll like spring rain,\ncanary sings in the mine —\nall regions are green.",
  "A haiku about deploys:\n\nMerge, build, test, release;\nthe dashboard barely flickers.\nUsers never knew.",
  "A haiku about deploys:\n\nNight shift, quiet queue,\nblue turns green without a sound.\nCoffee, still warm. Done.",
];

export function BranchNavigatorPreview() {
  const [count, setCount] = useState(3);
  const [index, setIndex] = useState(2);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Regenerating appends a version and jumps to it, like a real chat.
  const regenerate = () =>
    new Promise<void>((resolve) => {
      timer.current = window.setTimeout(() => {
        const next = Math.min(count + 1, VERSIONS.length);
        setCount(next);
        setIndex(next - 1);
        resolve();
      }, 900);
    });

  const versions = VERSIONS.slice(0, count);

  return (
    <div className="flex h-[400px] w-full max-w-xl flex-col justify-center">
      <MessageGroup spacing="default">
        <Message from="user">
          <MessageContent>
            <MessageBubble variant="soft">
              <MessageBubbleContent>Write a haiku about deploys.</MessageBubbleContent>
            </MessageBubble>
          </MessageContent>
        </Message>
        <Message from="assistant">
          <MessageAvatar>
            <Sparkles />
          </MessageAvatar>
          <MessageContent className="gap-1">
            <Branches count={count} index={index} onIndexChange={setIndex}>
              <BranchContent className="min-h-[7.5rem]">
                {versions.map((text) => (
                  <StreamingResponse
                    key={text}
                    status="complete"
                    showActions={false}
                    announce={false}
                    contentClassName="whitespace-pre-line"
                  >
                    {text}
                  </StreamingResponse>
                ))}
              </BranchContent>
              <MessageFooter className="-ml-1.5 gap-1 px-0">
                <BranchNavigator label="response" />
                <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
                <MessageActions
                  visibility="always"
                  copyText={versions[index]}
                  onRegenerate={count < VERSIONS.length ? regenerate : undefined}
                />
              </MessageFooter>
            </Branches>
          </MessageContent>
        </Message>
      </MessageGroup>
    </div>
  );
}
