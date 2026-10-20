import Link from "next/link";
import { Demo } from "@/components/app/blog/demo";
import { Callout, H2, H3 } from "@/components/app/blog/prose";
import { CodeBlock } from "@/components/app/docs/code-block";
import { BranchNavigatorPreview } from "@/components/previews/agents/branch-navigator.preview";
import { PromptSuggestionsPreview } from "@/components/previews/agents/prompt-suggestions.preview";
import type { BlogPostMeta, BlogTocItem } from "@/lib/blog";

export const meta: BlogPostMeta = {
  slug: "build-an-ai-chat-interface",
  title: "Build an AI chat interface with karaUI",
  description:
    "A step-by-step tutorial that composes karaUI's agent components into a working chat screen: a reader-aware transcript, a composer with stop, a streaming fetch backend, suggestions for the empty state, message actions, response branches, a model picker and a context meter.",
  date: "2026-10-20",
  author: "kara",
  tags: ["AI", "Chat", "Streaming", "React", "Next.js", "shadcn"],
  readingMinutes: 9,
  category: "Tutorial",
  related: [
    { category: "agents", slug: "message-scroller" },
    { category: "agents", slug: "message" },
    { category: "agents", slug: "message-bubble" },
    { category: "agents", slug: "prompt-input" },
    { category: "agents", slug: "streaming-response" },
    { category: "agents", slug: "prompt-suggestions" },
    { category: "agents", slug: "message-actions" },
    { category: "agents", slug: "branch-navigator" },
    { category: "agents", slug: "model-selector" },
    { category: "agents", slug: "context-meter" },
    { category: "agents", slug: "tool-approval" },
    { category: "agents", slug: "agent-activity" },
  ],
};

export const toc: BlogTocItem[] = [
  { id: "install", label: "Install the pieces" },
  { id: "state", label: "One array of messages" },
  { id: "transcript", label: "The transcript" },
  { id: "composer", label: "The composer" },
  {
    id: "streaming",
    label: "Wire up streaming",
    children: [
      { id: "server-route", label: "The server route" },
      { id: "client-reader", label: "Reading the stream" },
      { id: "chat-hooks", label: "Using a chat hook instead" },
    ],
  },
  { id: "empty-state", label: "The empty state" },
  { id: "actions-and-branches", label: "Actions and branches" },
  { id: "model-and-context", label: "Model and context" },
  { id: "tools", label: "Tool calls (optional)" },
  { id: "checklist", label: "Checklist" },
];

const REGISTRY_SNIPPET = `{
  "registries": {
    "@karaui": "https://karaui.kamisama-v0.my.id/r/{name}.json"
  }
}`;

const INSTALL_SNIPPET = `npx shadcn@latest add @karaui/message @karaui/message-scroller \\
  @karaui/prompt-input @karaui/streaming-response @karaui/prompt-suggestions \\
  @karaui/message-actions @karaui/branch-navigator @karaui/model-selector \\
  @karaui/context-meter`;

const STATE_SNIPPET = `export type ChatStatus = "streaming" | "complete" | "error";

export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; status: ChatStatus };`;

const TRANSCRIPT_SNIPPET = `import { Sparkles } from "lucide-react";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
  MessageTyping,
} from "@/components/agents/message";
import { MessageBubble, MessageBubbleContent } from "@/components/agents/message-bubble";
import { MessageScroller } from "@/components/agents/message-scroller";
import { StreamingResponse } from "@/components/agents/streaming-response";

<MessageScroller
  busy={loading}
  className="min-h-0 flex-1"
  viewportClassName="px-4 py-5"
  contentClassName="min-h-full"
>
  <MessageGroup spacing="default">
    {messages.map((message) =>
      message.role === "user" ? (
        <Message key={message.id} id={message.id} from="user" animateIn>
          <MessageContent>
            <MessageBubble variant="soft">
              <MessageBubbleContent>{message.content}</MessageBubbleContent>
            </MessageBubble>
          </MessageContent>
        </Message>
      ) : (
        <Message key={message.id} id={message.id} from="assistant">
          <MessageAvatar>
            <Sparkles />
          </MessageAvatar>
          <MessageContent className="gap-1">
            <StreamingResponse
              status={message.status}
              announce={false}
              showActions={message.status === "error"}
              onRetry={() => retry(message.id)}
            >
              {message.content || <MessageTyping />}
            </StreamingResponse>
          </MessageContent>
        </Message>
      ),
    )}
  </MessageGroup>
</MessageScroller>`;

const COMPOSER_SNIPPET = `import { PromptInput } from "@/components/agents/prompt-input";

<div className="flex h-dvh flex-col">
  {/* MessageScroller from the previous step */}
  <div className="shrink-0 p-3">
    <PromptInput
      minRows={1}
      maxRows={6}
      loading={loading}
      onSubmit={(prompt) => send(prompt)}
      onStop={stop}
      placeholder="Ask anything…"
    />
  </div>
</div>`;

const ROUTE_SNIPPET = `// app/api/chat/route.ts
export async function POST(request: Request) {
  const { messages, model } = await request.json();

  // Any provider SDK that yields text deltas as an AsyncIterable<string>.
  const deltas = await streamFromYourProvider({ messages, model });
  const iterator = deltas[Symbol.asyncIterator]();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(value));
    },
    // The browser aborted (Stop button, navigation): stop the upstream call too.
    async cancel() {
      await iterator.return?.();
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}`;

const READER_SNIPPET = `export async function streamReply(
  history: { role: "user" | "assistant"; content: string }[],
  model: string,
  signal: AbortSignal,
  onDelta: (text: string) => void,
) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history, model }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error("Chat request failed: " + response.status);
  }

  // TextDecoderStream keeps multi-byte characters intact across chunk edges.
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) return;
    onDelta(value);
  }
}`;

const HOOK_SNIPPET = `"use client";

import { useRef, useState } from "react";
import type { ChatMessage } from "./types";
import { streamReply } from "./stream-reply";

export function useChatState(model: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const patch = (id: string, update: (content: string) => Partial<ChatMessage>) =>
    setMessages((list) =>
      list.map((m) => (m.id === id ? ({ ...m, ...update(m.content) } as ChatMessage) : m)),
    );

  const run = async (history: ChatMessage[], replyId: string) => {
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    try {
      await streamReply(
        history.map(({ role, content }) => ({ role, content })),
        model,
        abort.signal,
        (delta) => patch(replyId, (content) => ({ content: content + delta })),
      );
      patch(replyId, () => ({ status: "complete" }));
    } catch {
      // A user-initiated stop keeps the partial answer; anything else is an error.
      patch(replyId, () => ({ status: abort.signal.aborted ? "complete" : "error" }));
    } finally {
      controller.current = null;
      setLoading(false);
    }
  };

  const send = (prompt: string) => {
    const user: ChatMessage = { id: crypto.randomUUID(), role: "user", content: prompt };
    const reply: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      status: "streaming",
    };
    const history = [...messages, user];
    setMessages([...history, reply]);
    void run(history, reply.id);
  };

  const retry = (replyId: string) => {
    const at = messages.findIndex((m) => m.id === replyId);
    if (at < 0) return;
    setMessages((list) =>
      list.map((m) =>
        m.id === replyId ? { ...m, content: "", status: "streaming" as const } : m,
      ),
    );
    void run(messages.slice(0, at), replyId);
  };

  const stop = () => controller.current?.abort();

  return { messages, loading, send, retry, stop };
}`;

const SUGGESTIONS_SNIPPET = `import { PromptSuggestions } from "@/components/agents/prompt-suggestions";

const [draft, setDraft] = useState("");

{messages.length === 0 ? (
  <PromptSuggestions
    suggestions={SUGGESTIONS}
    query={draft}
    limit={4}
    onSelect={(prompt) => setDraft(prompt)}
  />
) : (
  <MessageScroller>{/* … */}</MessageScroller>
)}

<PromptInput
  value={draft}
  onValueChange={setDraft}
  loading={loading}
  onSubmit={(prompt) => {
    send(prompt);
    setDraft(""); // controlled: clearing is your job
  }}
  onStop={stop}
/>`;

const BRANCH_SNIPPET = `import { BranchContent, BranchNavigator, Branches } from "@/components/agents/branch-navigator";
import { MessageFooter } from "@/components/agents/message";
import { MessageActions } from "@/components/agents/message-actions";

// Assistant messages now keep every version and which one is showing:
// { id, role: "assistant", versions: string[], active: number, status }

<MessageContent className="gap-1">
  <Branches
    count={message.versions.length}
    index={message.active}
    onIndexChange={(active) => select(message.id, active)}
  >
    <BranchContent>
      {message.versions.map((text, version) => (
        <StreamingResponse
          key={version}
          status={version === message.versions.length - 1 ? message.status : "complete"}
          showActions={false}
          announce={false}
        >
          {text || <MessageTyping />}
        </StreamingResponse>
      ))}
    </BranchContent>
    {message.status !== "streaming" ? (
      <MessageFooter className="-ml-1.5 gap-1 px-0">
        <BranchNavigator label="response" hideWhenSingle />
        <MessageActions
          visibility={isLast ? "always" : "hover"}
          copyText={message.versions[message.active]}
          onRegenerate={() => regenerate(message.id)}
          onFeedbackSubmit={(details) => sendFeedback(message.id, details)}
        />
      </MessageFooter>
    ) : null}
  </Branches>
</MessageContent>`;

const MODEL_SNIPPET = `import { type ContextSegment, ContextMeter } from "@/components/agents/context-meter";
import { type ModelOption, ModelSelector } from "@/components/agents/model-selector";

const MODELS: ModelOption[] = [
  {
    value: "nw-swift",
    name: "Swift 3",
    provider: "northwind",
    description: "Balanced everyday model",
    capabilities: ["vision", "tools", "fast"],
    contextWindow: 200_000,
    cost: 2,
  },
  // …
];

const [model, setModel] = useState("nw-swift");
const limit = MODELS.find((m) => m.value === model)?.contextWindow ?? 200_000;
const segments: ContextSegment[] = [
  { id: "system", label: "System prompt", tokens: usage.system },
  { id: "conversation", label: "Conversation", tokens: usage.conversation },
  { id: "files", label: "Files", tokens: usage.files },
];

<PromptInput
  /* …as before */
  leadingAction={
    <>
      <ModelSelector
        models={MODELS}
        value={model}
        onValueChange={setModel}
        side="top"
        disabled={loading}
      />
      <ContextMeter segments={segments} limit={limit} side="top" onCompact={compact} />
    </>
  }
/>`;

const TOOLS_SNIPPET = `import { AgentActivity } from "@/components/agents/agent-activity";
import { ToolApproval, ToolApprovalCode } from "@/components/agents/tool-approval";

<AgentActivity
  status={run.done ? "complete" : "working"}
  items={[
    { id: "s1", type: "search", query: "bun test watch mode flags" },
    { id: "t1", type: "tool", action: "read", target: "package.json" },
  ]}
/>

<ToolApproval
  tool="terminal.run"
  title="Allow this tool to run?"
  description="The agent wants to run the test suite in this workspace."
  status={approval.status} // "pending" → "approving" → "approved" → "running" → "complete"
  parameters={[
    {
      id: "command",
      label: "Command",
      value: <ToolApprovalCode code="bun test" language="bash" />,
    },
  ]}
  onApprove={() => respond(approval.id, "allow")}
  onAlwaysAllow={() => respond(approval.id, "always")}
  onDeny={() => respond(approval.id, "deny")}
/>`;

export default function BuildAnAiChatInterfacePost() {
  return (
    <>
      <p>
        A chat screen looks simple until you build one. The transcript has to
        follow a streaming answer without yanking the reader back down when
        they scroll up. The composer needs a Stop button that actually stops
        the request. Answers need copy, retry, feedback and a way to compare
        regenerations. And none of it should care which model provider sits
        behind it. This tutorial puts karaUI&apos;s agent components together
        into a working chat screen, one piece at a time, with a plain{" "}
        <code>fetch</code> stream as the backend.
      </p>

      <H2 id="install">Install the pieces</H2>
      <p>
        karaUI ships as source through a shadcn-compatible registry. The{" "}
        <code>@karaui</code> namespace isn&apos;t in shadcn&apos;s public
        registry directory yet, so add it to <code>components.json</code>{" "}
        once:
      </p>
      <CodeBlock code={REGISTRY_SNIPPET} lang="json" filename="components.json" />
      <p>Then add the components this tutorial uses:</p>
      <CodeBlock code={INSTALL_SNIPPET} lang="bash" filename="terminal" />
      <p>
        Each item brings the files it imports, so <code>message</code> pulls
        in <code>message-bubble</code> and the shared motion tokens, and{" "}
        <code>prompt-input</code> brings its own Select and popover. You end up
        with plain files under <code>components/agents/</code> that you own and
        can edit.
      </p>

      <H2 id="state">One array of messages</H2>
      <p>
        Everything on screen derives from one array. User messages are text.
        Assistant messages are text plus a status, which is exactly the shape{" "}
        <code>StreamingResponse</code> wants:
      </p>
      <CodeBlock code={STATE_SNIPPET} lang="ts" filename="types.ts" />
      <p>
        Keep ids stable and create them when a message is created, in the event
        handler, never during render. The scroller, the message rail and React
        reconciliation all key off them.
      </p>

      <H2 id="transcript">The transcript</H2>
      <p>
        <code>MessageScroller</code> is the viewport. It follows new output
        only while the reader is at the live edge; scroll up to reread
        something and it lets go until you come back. It also renders the
        transcript as a polite <code>role=&quot;log&quot;</code> region, and{" "}
        <code>busy</code> sets <code>aria-busy</code> on it while a reply is
        in flight.
      </p>
      <p>
        Inside it, <code>MessageGroup</code> spaces the rows and{" "}
        <code>Message</code> sets the side with <code>from</code>. User text
        goes in a <code>MessageBubble</code>; assistant text goes in a{" "}
        <code>StreamingResponse</code>, which marks itself busy while{" "}
        <code>status</code> is <code>&quot;streaming&quot;</code> and doesn&apos;t
        remount as text grows:
      </p>
      <CodeBlock code={TRANSCRIPT_SNIPPET} lang="tsx" filename="transcript.tsx" />
      <p>A few details that matter:</p>
      <ul>
        <li>
          <strong>
            <code>announce={"{false}"}</code>
          </strong>{" "}
          on the response. The scroller is already a live log, so letting the
          response announce too would make screen readers read every chunk
          twice.
        </li>
        <li>
          <strong>
            <code>MessageTyping</code>
          </strong>{" "}
          fills the gap between sending and the first token, so the reply row
          exists from the start and doesn&apos;t pop in late.
        </li>
        <li>
          <strong>
            <code>animateIn</code>
          </strong>{" "}
          on user rows plays a one-time pop when a message is sent. Leave it off
          for assistant rows; their content grows in place.
        </li>
        <li>
          <strong>
            <code>showActions</code>
          </strong>{" "}
          only on error, so the built-in Retry appears for a failed reply while
          the richer <code>MessageActions</code> (below) handle the happy path.
        </li>
      </ul>
      <p>
        Want a jump-to-message rail for long threads? Add{" "}
        <code>navigation=&quot;rail&quot;</code> to the scroller. It previews
        and scrolls to the rendered <code>Message</code> rows.
      </p>

      <H2 id="composer">The composer</H2>
      <p>
        <code>PromptInput</code> is an auto-growing textarea with a send
        button. Enter sends, Shift+Enter adds a line, and IME composition is
        respected. While <code>loading</code> is true the send button becomes
        a stop button that calls <code>onStop</code>, so those two props are
        the whole contract with your request lifecycle:
      </p>
      <CodeBlock code={COMPOSER_SNIPPET} lang="tsx" filename="chat.tsx" />
      <p>
        Uncontrolled, it clears itself after <code>onSubmit</code>. Give the
        flex column a definite height (<code>h-dvh</code> here) and the
        scroller <code>min-h-0 flex-1</code>, or the transcript will push the
        composer off screen instead of scrolling.
      </p>

      <H2 id="streaming">Wire up streaming</H2>
      <p>
        The components only need two things from the network: text deltas
        appended to the last assistant message, and a status change when the
        stream ends. Here is the smallest backend that gives you both.
      </p>
      <H3 id="server-route">The server route</H3>
      <p>
        A route handler that turns whatever your provider SDK yields into a
        plain-text <code>ReadableStream</code>. Using <code>pull</code> rather
        than pushing in a loop means the stream only reads upstream as fast as
        the client consumes, and <code>cancel</code> runs when the browser
        aborts, so Stop really stops the model:
      </p>
      <CodeBlock code={ROUTE_SNIPPET} lang="ts" filename="app/api/chat/route.ts" />
      <p>
        <code>streamFromYourProvider</code> stands in for your provider call.
        Most SDKs expose an async iterable of text deltas, or an event stream
        you can map to one.
      </p>
      <H3 id="client-reader">Reading the stream</H3>
      <p>
        On the client, <code>fetch</code> takes an <code>AbortSignal</code>,
        and the body is read chunk by chunk:
      </p>
      <CodeBlock code={READER_SNIPPET} lang="ts" filename="stream-reply.ts" />
      <p>
        Then a small hook owns the array. It appends an empty streaming reply
        right away, patches deltas into it, and settles the status at the end:
      </p>
      <CodeBlock code={HOOK_SNIPPET} lang="tsx" filename="use-chat-state.ts" />
      <p>
        <code>stop</code> aborts the fetch, the reader throws, and because the
        signal was aborted the partial answer is kept as{" "}
        <code>&quot;complete&quot;</code> rather than flagged as an error. Pass{" "}
        <code>loading</code>, <code>send</code> and <code>stop</code> to{" "}
        <code>PromptInput</code>, and <code>retry</code> to{" "}
        <code>StreamingResponse</code>&apos;s <code>onRetry</code>.
      </p>
      <Callout tone="tip" title="Server-sent events instead of plain text">
        <p>
          If your route returns <code>text/event-stream</code>, the reader
          loop is the same; buffer the decoded text, split it on blank lines
          and read each event&apos;s <code>data:</code> line before calling{" "}
          <code>onDelta</code>. Keep the remainder of a split for the next
          chunk, since an event can arrive in two pieces.
        </p>
      </Callout>
      <H3 id="chat-hooks">Using a chat hook instead</H3>
      <p>
        If you already use a chat hook such as the Vercel AI SDK&apos;s{" "}
        <code>useChat</code>, skip the hand-rolled state. The components are
        driven by props, so the mapping is direct: the hook&apos;s message list
        feeds the transcript, its send function goes to{" "}
        <code>onSubmit</code>, its stop function to <code>onStop</code>, and
        its request status becomes <code>loading</code> (submitted or
        streaming) plus each reply&apos;s <code>status</code> (streaming for
        the last message while the request runs, error when it failed,
        complete otherwise). Check your version&apos;s docs for how it shapes
        message content; recent versions split it into typed parts, and you
        would render the text parts inside <code>StreamingResponse</code>.
      </p>

      <H2 id="empty-state">The empty state</H2>
      <p>
        A blank transcript with a blinking cursor is a poor first screen.{" "}
        <code>PromptSuggestions</code> fills it with starting points and, given
        the composer&apos;s text as <code>query</code>, filters them as the
        user types, highlighting the matching words. Picking one hands its{" "}
        <code>prompt</code> to <code>onSelect</code>. For that, the composer
        has to be controlled:
      </p>
      <CodeBlock code={SUGGESTIONS_SNIPPET} lang="tsx" filename="chat.tsx" />
      <Demo caption="Live PromptSuggestions over a controlled PromptInput. Type “email” to filter, or pick a card to fill the composer.">
        <PromptSuggestionsPreview />
      </Demo>
      <p>
        The cards reveal with a short stagger on first render only, arrow keys
        move between them, and the match count is announced politely. Use{" "}
        <code>variant=&quot;chip&quot;</code> for a compact row of pills above
        the composer once a conversation has started.
      </p>

      <H2 id="actions-and-branches">Actions and branches</H2>
      <p>
        Once a reply finishes, put <code>MessageActions</code> under it: copy
        (with <code>copyText</code>), regenerate, thumbs up and down, and an
        optional share button and overflow menu. Thumbs-down opens a small
        reason form and reports through <code>onFeedbackSubmit</code>. If{" "}
        <code>onRegenerate</code> returns a promise, its icon spins until it
        settles.
      </p>
      <p>
        Regenerating is where most chat UIs lose information: the old answer
        is just replaced. Keep it instead. Store an array of versions on each
        assistant message, append to it on regenerate, and let{" "}
        <code>Branches</code> show one at a time. <code>BranchNavigator</code>{" "}
        reads the same context and renders the ‹ 2 / 3 › control:
      </p>
      <CodeBlock code={BRANCH_SNIPPET} lang="tsx" filename="assistant-message.tsx" />
      <Demo caption="BranchNavigator and MessageActions under one reply. Regenerate to add a version, then page back through earlier ones.">
        <BranchNavigatorPreview />
      </Demo>
      <p>
        <code>BranchContent</code> slides the incoming version in from the side
        you navigated toward, and the navigator announces &ldquo;Response 2 of
        3&rdquo;. <code>visibility=&quot;hover&quot;</code> keeps older
        replies quiet: their actions appear on hover or focus, and always on
        devices without hover.
      </p>

      <H2 id="model-and-context">Model and context</H2>
      <p>
        <code>PromptInput</code> has a simple built-in model menu (its{" "}
        <code>models</code> prop) and a <code>leadingAction</code> slot for
        anything richer. Put a <code>ModelSelector</code> there for a
        searchable picker with providers, capability badges, context window
        and cost, and a <code>ContextMeter</code> beside it so people can see
        how full the window is before the model starts forgetting:
      </p>
      <CodeBlock code={MODEL_SNIPPET} lang="tsx" filename="composer.tsx" />
      <p>
        Take the meter&apos;s numbers from the token usage your provider
        reports with each response, not from a character count. The meter
        changes color at <code>warnAt</code> (80% by default) and{" "}
        <code>criticalAt</code> (95%), and shows a Compact conversation button
        when you pass <code>onCompact</code>, typically a request that
        summarizes older turns into one message. Send the selected{" "}
        <code>model</code> with each request so the route can pick it.
      </p>

      <H2 id="tools">Tool calls (optional)</H2>
      <p>
        If your agent calls tools, two more components slot into the
        assistant row above the response. <code>AgentActivity</code> streams
        searches, file reads and steps while the run is working, then
        collapses into a one-line summary. <code>ToolApproval</code> asks
        before anything risky runs and reports back through{" "}
        <code>onApprove</code>, <code>onAlwaysAllow</code> and{" "}
        <code>onDeny</code>; you drive its <code>status</code> as the call
        progresses.
      </p>
      <CodeBlock code={TOOLS_SNIPPET} lang="tsx" filename="assistant-message.tsx" />
      <Callout tone="warning" title="Approval is a server decision">
        <p>
          The card only collects the answer. The tool must not run until your
          backend receives an explicit allow for that call, so a stale tab or
          a crafted request can&apos;t skip the prompt.
        </p>
      </Callout>
      <p>
        For a complete reference that also includes navigation, plans, diffs
        and generated media, see the{" "}
        <Link href="/components/agents/chat-app">Chat App</Link> usage
        example.
      </p>

      <H2 id="checklist">Checklist</H2>
      <ul>
        <li>
          Add the <code>@karaui</code> registry to{" "}
          <code>components.json</code> once, then install by name.
        </li>
        <li>
          One message array; ids created in event handlers, never during
          render.
        </li>
        <li>
          <code>MessageScroller</code> with <code>busy</code>, inside a column
          of definite height; <code>announce={"{false}"}</code> on each{" "}
          <code>StreamingResponse</code>.
        </li>
        <li>
          Wire <code>loading</code> and <code>onStop</code> to an{" "}
          <code>AbortController</code>, and cancel upstream in the route.
        </li>
        <li>
          Suggestions for the empty state, with the composer controlled.
        </li>
        <li>Keep regenerations as branches instead of overwriting them.</li>
        <li>
          Real token usage in <code>ContextMeter</code>; the selected model in
          every request.
        </li>
      </ul>
    </>
  );
}
