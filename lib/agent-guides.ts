export interface AgentGuidePrinciple {
  title: string;
  description: string;
}

export interface AgentGuideStage {
  title: string;
  description: string;
}

export interface AgentGuideConnection {
  slug: string;
  name: string;
  description: string;
}

export interface AgentGuide {
  seo: {
    title: string;
    description: string;
  };
  introduction: string;
  composition: {
    description: string;
    tree: string;
  };
  lifecycle: [AgentGuideStage, AgentGuideStage, AgentGuideStage];
  principles: [
    AgentGuidePrinciple,
    AgentGuidePrinciple,
    AgentGuidePrinciple,
  ];
  implementation: {
    title: string;
    description: string;
  };
  connections: AgentGuideConnection[];
  contract: {
    owns: string;
    leaves: string;
  };
  guidance: {
    useWhen: string;
    avoidWhen: string;
  };
}

export const agentGuides = {
  combobox: {
    seo: {
      title: "Animated Combobox · React Component",
      description:
        "Searchable React picker: type in the field to narrow grouped options, step through them with arrow keys, press Enter to choose. Custom filter supported.",
    },
    introduction:
      "Use it when a plain select has too many options to scroll. The text field is the trigger, so people type to shrink the list and never leave the field. The component tracks the query, the highlighted row and the chosen value; your app supplies the options and whatever form wraps them.",
    composition: {
      description:
        "The trigger wraps the text field. Items, groups, labels, separators and the empty message go in the content, which renders through a body portal.",
      tree: "Combobox\n├── ComboboxTrigger\n│   └── ComboboxInput\n└── ComboboxContent\n    └── ComboboxList\n        ├── ComboboxEmpty\n        ├── ComboboxGroup\n        │   ├── ComboboxLabel\n        │   └── ComboboxItem\n        └── ComboboxSeparator",
    },
    lifecycle: [
      {
        title: "Open",
        description:
          "Focus or pointer input opens the detached listbox and activates the selected or first available option.",
      },
      {
        title: "Filter",
        description:
          "Typing narrows registered options while arrow keys move the active descendant without moving DOM focus.",
      },
      {
        title: "Select",
        description:
          "Choosing an option updates the value, clears the query, closes the listbox, and restores the selected label in the input.",
      },
    ],
    principles: [
      {
        title: "Keep focus in the input",
        description:
          "Options expose active state through aria-activedescendant so typing and keyboard navigation remain one continuous interaction.",
      },
      {
        title: "Separate data from presentation",
        description:
          "Composable item and group primitives register searchable metadata while callers retain ownership of labels, icons, and option data.",
      },
      {
        title: "Keep the popup anchored",
        description:
          "The listbox renders in a body portal and follows trigger geometry across scrolling, resizing, and collision-aware side changes.",
      },
    ],
    implementation: {
      title: "Treat input focus as the interaction anchor",
      description:
        "Keep DOM focus on the input from open through selection. Pointer interaction with options should preserve that focus while active option state and scrolling update independently.",
    },
    connections: [],
    contract: {
      owns: "Query state, option registration, filtering, active-option navigation, selection presentation, popup positioning, and open-state motion.",
      leaves:
        "Option data, form submission, async loading, validation, and persisted value state to the application.",
    },
    guidance: {
      useWhen:
        "A selection list is long enough to benefit from typing, grouped discovery, or keyboard search.",
      avoidWhen:
        "A short list is easier to scan in a standard select, or the user is entering unrestricted text rather than choosing a known option.",
    },
  },
  "animated-sidebar": {
    seo: {
      title: "Animated Sidebar · React Component",
      description:
        "Shadcn-style app sidebar for React: folds to icons or off-canvas on desktop, becomes a sheet on phones, toggles with Ctrl/Cmd+B and nested menus morph open.",
    },
    introduction:
      "Reach for this when an app needs a navigation column that works at every screen size. A provider keeps desktop and mobile open state apart, the sidebar picks how it collapses, and the inset beside it holds your page. Menu contents and the active item stay with your app.",
    composition: {
      description:
        "Wrap the layout in the provider. Header, menu groups, footer and an optional rail live in the sidebar; your page goes in the inset next to it.",
      tree: "AnimatedSidebarProvider\n├── AnimatedSidebar\n│   ├── AnimatedSidebarHeader\n│   ├── AnimatedSidebarContent\n│   │   └── AnimatedSidebarMenu\n│   ├── AnimatedSidebarFooter\n│   └── AnimatedSidebarRail\n└── AnimatedSidebarInset",
    },
    lifecycle: [
      {
        title: "Compose the shell",
        description:
          "Header, navigation groups, footer, rail, and inset establish one responsive application frame.",
      },
      {
        title: "Change presentation",
        description:
          "Desktop navigation folds into an icon rail while mobile navigation becomes a focus-managed sheet.",
      },
      {
        title: "Preserve the destination",
        description:
          "Active and expanded navigation state remains application-owned while the shell changes shape around it.",
      },
    ],
    principles: [
      {
        title: "Keep state composable",
        description:
          "Controlled and uncontrolled provider state lets the shell fit both local layouts and routed applications.",
      },
      {
        title: "Keep content independent",
        description:
          "The inset responds to sidebar width without coupling page content to menu implementation details.",
      },
      {
        title: "Protect mobile focus",
        description:
          "The mobile sheet traps focus, closes on Escape, and restores focus to the trigger when dismissed.",
      },
    ],
    implementation: {
      title: "Keep navigation state outside visual motion",
      description:
        "Let routing or application state decide the active destination. The sidebar should animate presentation changes without replacing links, remounting content, or inferring navigation state from motion.",
    },
    connections: [
      {
        slug: "ai-sidebar",
        name: "AI Sidebar",
        description:
          "Builds a workspace navigator on top of this shell, holding projects, folders, bookmarks and files.",
      },
    ],
    contract: {
      owns: "Responsive sidebar presentation, desktop collapse, mobile disclosure, navigation composition, rail behavior, and inset layout.",
      leaves:
        "Routing, destination data, authorization, resource editing, and inset content to the application or composed components.",
    },
    guidance: {
      useWhen:
        "An application needs responsive persistent navigation with a coordinated content inset and mobile sheet.",
      avoidWhen:
        "A short static link list needs no responsive shell, collapsed rail, mobile focus management, or inset coordination.",
    },
  },
  "ai-sidebar": {
    seo: {
      title: "AI Sidebar for Agent Workspaces · React Component",
      description: "React sidebar for AI workspaces: a tree of folders and projects holding files and bookmarks, with drag to move, keyboard moves, inline rename and rollback on failed saves.",
    },
    introduction: "This sidebar manages workspace resources that keep changing, not just links to fixed pages. Folders and projects open to show what is inside; picking a file or bookmark makes it the active item, and any row can be moved or renamed without the rest of the workspace shifting.",
    composition: {
      description: "Mount the tree in the Animated Sidebar content area and show the selected item in the inset next to it.",
      tree: `AnimatedSidebarProvider
├── AnimatedSidebar
│   ├── AnimatedSidebarContent
│   │   └── AISidebar
│   │       ├── Folder or project
│   │       └── File or bookmark
│   └── AnimatedSidebarRail
└── AnimatedSidebarInset`,
    },
    lifecycle: [
      {
        title: "Disclose",
        description: "Folders and projects reveal children without becoming active destinations.",
      },
      {
        title: "Interact",
        description: "Files select, rename, and move through distinct pointer and keyboard paths.",
      },
      {
        title: "Persist",
        description: "Moves render immediately, then settle or roll back after persistence responds.",
      },
    ],
    principles: [
      {
        title: "Separate disclosure from selection",
        description: "Folder clicks only expand or collapse. Files and bookmarks own active-resource selection.",
      },
      {
        title: "Resolve gesture conflicts",
        description: "Whole-row dragging suppresses the following click, and double-click rename applies only to leaf resources.",
      },
      {
        title: "Keep the frame stable",
        description: "Only the resource list scrolls, leaving utility actions, the section heading, and inset content fixed while folders open.",
      },
    ],
    implementation: {
      title: "Treat movement as an optimistic transaction",
      description: "Update the local tree first and persist the normalized source, target, and position. Restore the captured tree and announce the rollback when saving fails.",
    },
    connections: [
      {
        slug: "message-scroller",
        name: "Message Scroller",
        description: "Shows the chosen conversation in the inset.",
      },
      {
        slug: "prompt-input",
        name: "Prompt Input",
        description: "Sits under the active content as the composer.",
      },
    ],
    contract: {
      owns: "Resource disclosure, leaf selection, keyboard focus, drag targets, rename presentation, overflow labels, and optimistic rollback.",
      leaves: "Sidebar shell behavior, authorization, persistence, resource fetching, and inset content to the application.",
    },
    guidance: {
      useWhen: "An agent workspace needs editable folders, projects, files, bookmarks, or conversations inside a collapsible sidebar.",
      avoidWhen: "The sidebar contains only fixed application destinations with no hierarchy, editing, movement, or optimistic state.",
    },
  },
  "message-bubble": {
    seo: {
      title: "AI Chat Message Bubble · React Component",
      description: "React chat bubble for AI conversations: six tones, start or end alignment, grouped rows, clickable content and a show-more toggle for long replies.",
    },
    introduction: "Think of the bubble as paint, not plumbing. It shapes how one message reads, while who sent it, whether it arrived and where the transcript scrolls are settled by the components around it.",
    composition: {
      description: "Nest MessageBubble within MessageContent, so the row keeps avatar and alignment while the bubble only styles what is said.",
      tree: `Message
├── MessageAvatar
└── MessageContent
    └── MessageBubble
        └── MessageBubbleContent`,
    },
    lifecycle: [
      {
        title: "Shape the content",
        description: "The surface takes its width and alignment from the message it contains.",
      },
      {
        title: "Update in place",
        description: "Streaming content grows inside the same geometry without replaying the entrance.",
      },
      {
        title: "Disclose overflow",
        description: "Long content can open downward while the original reading position stays clear.",
      },
    ],
    principles: [
      {
        title: "Size around the content",
        description: "Short replies stay compact while longer responses gain a comfortable measure. The surface should never force every message to the same width.",
      },
      {
        title: "Keep geometry stable",
        description: "Streaming text updates inside the final surface. Backgrounds and neighboring rows should not chase every arriving word.",
      },
      {
        title: "Disclose with intent",
        description: "Collapse only content that benefits from a preview. Keep the control outside the clipped text so opening the message always moves downward.",
      },
    ],
    implementation: {
      title: "Do not animate the bubble on every content update",
      description: "Mount motion belongs to the new message event. Streaming should update only the inner content; replaying scale or layout motion for every token makes the surface flicker and causes nearby messages to drift.",
    },
    connections: [
      {
        slug: "message",
        name: "Message",
        description: "Supplies the row: sender side, header details and the avatar slot.",
      },
      {
        slug: "streaming-response",
        name: "Streaming Response",
        description: "Handles the answer while it streams and after it finishes.",
      },
    ],
    contract: {
      owns: "Surface tone, content width, alignment, grouping, and optional disclosure.",
      leaves: "Sender metadata, streaming state, transcript order, and message transport to surrounding components.",
    },
    guidance: {
      useWhen: "One conversational item needs a distinct surface, alignment, tone, or optional expansion.",
      avoidWhen: "The content is an execution log, permission request, or structured agent event with its own semantics.",
    },
  },
  message: {
    seo: {
      title: "Message for AI Chat · React Component",
      description: "React message primitives for AI chat transcripts: user or assistant sides, avatars, header and footer slots, grouped rows, typing dots and a one-time arrival pop.",
    },
    introduction: "Each Message is one turn in the transcript. It lines up the avatar, the header and footer details and the content slot, and it does not care whether that slot holds a bubble, a tool result, an activity log or a full answer.",
    composition: {
      description: "Assemble a row from separate pieces for who spoke, what was said and the details around it.",
      tree: `MessageGroup
└── Message
    ├── MessageAvatar
    └── MessageContent
        ├── MessageHeader
        ├── MessageBubble
        └── MessageFooter`,
    },
    lifecycle: [
      {
        title: "Establish the sender",
        description: "Alignment, avatar, and metadata locate the row in the conversation.",
      },
      {
        title: "Compose the payload",
        description: "A bubble, response, activity stream, or tool surface fills the content slot.",
      },
      {
        title: "Hold its position",
        description: "The row stays stable while its inner content streams or changes state.",
      },
    ],
    principles: [
      {
        title: "Compose the row",
        description: "Keep identity and metadata outside the message surface. This preserves alignment when the visible content changes shape.",
      },
      {
        title: "Group by speaker",
        description: "Consecutive messages can share rhythm and avatar placement without losing their individual semantic boundaries.",
      },
      {
        title: "Animate only arrivals",
        description: "A newly sent row may pop into place once. Existing rows remain still when text streams or the composer updates.",
      },
    ],
    implementation: {
      title: "Keep the row identity stable",
      description: "Use a durable message id as the React key and keep arrival state separate from render state. Typing in the composer or appending streamed content should not remount a message that already exists.",
    },
    connections: [
      {
        slug: "message-bubble",
        name: "Message Bubble",
        description: "Paints the content slot with a tone and shape.",
      },
      {
        slug: "message-scroller",
        name: "Message Scroller",
        description: "Hosts the rows in a transcript that keeps up with new output.",
      },
      {
        slug: "agent-activity",
        name: "Agent Activity",
        description: "Fills a row with live reasoning, searches and tool calls.",
      },
    ],
    contract: {
      owns: "Row alignment, avatar placement, metadata slots, grouping, and one-time entrance motion.",
      leaves: "Bubble styling, transcript scrolling, response parsing, and persistence to composed primitives and application state.",
    },
    guidance: {
      useWhen: "Content needs sender alignment, identity, metadata, or grouping inside a conversation.",
      avoidWhen: "You only need a visual content surface with no conversation-level identity or row layout.",
    },
  },
  "message-scroller": {
    seo: {
      title: "Message Scroller for Streaming AI Chat · React Component",
      description: "React scroll container for streaming AI chat: sticks to the bottom while you read the latest output, releases the view once you scroll back, and can add a rail for jumping between messages.",
    },
    introduction: "Streaming chat breaks the usual rules of overflow. While someone is reading the newest line, the view should keep up with it; once they scroll back to check something, it must stop pulling them down.",
    composition: {
      description: "Wrap the message rows with the scroller instead of building scrolling into the rows.",
      tree: `MessageScroller
└── MessageGroup
    └── Message
        └── MessageContent`,
    },
    lifecycle: [
      {
        title: "Follow",
        description: "While the reader remains at the end, each content update stays in view.",
      },
      {
        title: "Release",
        description: "A deliberate scroll or rail jump transfers control back to the reader immediately.",
      },
      {
        title: "Resume",
        description: "Returning to the live edge restores automatic following for later output.",
      },
    ],
    principles: [
      {
        title: "Follow the live edge",
        description: "New output remains visible only while the reader is already following it. Returning to the end re-enables that behavior.",
      },
      {
        title: "Respect reader intent",
        description: "Wheel, touch, and keyboard navigation release automatic following so incoming content never fights deliberate reading.",
      },
      {
        title: "Protect the transcript",
        description: "Scroll behavior stays outside message state. An optional rail derives navigation and hover excerpts from Message rows without rewriting their streamed content.",
      },
    ],
    implementation: {
      title: "Treat auto-follow as a reader state",
      description: "Do not call scroll-to-end for every render. Follow only while the viewport is already near the live edge, release on deliberate navigation, and let an explicit return to the end resume following.",
    },
    connections: [
      {
        slug: "message",
        name: "Message",
        description: "Gives the transcript consistent, labelled rows.",
      },
      {
        slug: "prompt-input",
        name: "Prompt Input",
        description: "Starts the next turn but leaves scrolling to the scroller.",
      },
      {
        slug: "streaming-response",
        name: "Streaming Response",
        description: "Produces the growing text that the view keeps in sight.",
      },
    ],
    contract: {
      owns: "The scroll viewport, live-edge following, optional message navigation, reader release, and transcript accessibility state.",
      leaves: "Message data, transport, persistence, branching, and content rendering to the application.",
    },
    guidance: {
      useWhen: "A transcript grows through streamed responses and should follow output without trapping the reader at the bottom.",
      avoidWhen: "The content is a static list, a short non-streaming exchange, or a virtualized feed with its own scroll engine.",
    },
  },
  "prompt-input": {
    seo: {
      title: "AI Prompt Input · React Component",
      description: "React chat composer for AI apps: a textarea that grows with the draft, model picker and prompt action menu; it sends on Enter and shows a stop button during replies.",
    },
    introduction: "This is where a person hands work to the agent. The draft should stay editable, the tools on offer should be easy to find, and sending a new request must never be confused with stopping the current one.",
    composition: {
      description: "Keep the composer next to the transcript, outside it, so a half-written prompt never scrolls away with old messages.",
      tree: `Chat
├── MessageScroller
│   └── MessageGroup
└── PromptInput`,
    },
    lifecycle: [
      {
        title: "Compose",
        description: "The draft grows within a bounded editor while secondary controls stay available.",
      },
      {
        title: "Submit",
        description: "Keyboard or button submission sends one trimmed instruction and clears the draft.",
      },
      {
        title: "Continue or stop",
        description: "Focus remains ready for the next turn while the primary action reflects active work.",
      },
    ],
    principles: [
      {
        title: "Keep writing primary",
        description: "Model and attachment controls stay secondary to the prompt. The text area gets the space and focus behavior needed for uninterrupted input.",
      },
      {
        title: "Show the current mode",
        description: "The selected model and available prompt actions remain visible before submission, not hidden after the request starts.",
      },
      {
        title: "Preserve momentum",
        description: "Submission clears the draft and returns focus without moving the surrounding conversation. Loading swaps the action from send to stop.",
      },
    ],
    implementation: {
      title: "Measure auto-growth without shifting the page",
      description: "A fixed-row composer should skip the reset-and-measure cycle entirely. For auto-growing input, cap the measured height and preserve focus after submission so the transcript does not jump when the next draft begins.",
    },
    connections: [
      {
        slug: "message-scroller",
        name: "Message Scroller",
        description: "Holds the transcript steady above the composer.",
      },
      {
        slug: "tool-approval",
        name: "Tool Approval",
        description: "Asks for a yes or no on one tool before free typing resumes.",
      },
      {
        slug: "approval-card",
        name: "Approval Card",
        description: "Gathers structured answers while the run waits.",
      },
    ],
    contract: {
      owns: "Draft input, model and action selection, keyboard submission, focus, and send or stop controls.",
      leaves: "Uploads, request transport, conversation state, and model availability to supplied handlers and data.",
    },
    guidance: {
      useWhen: "People need to compose agent instructions with optional models, attachments, or prompt actions.",
      avoidWhen: "The interaction is a fixed command, a single structured field, or a form that requires validation across many inputs.",
    },
  },
  "todo-list": {
    seo: {
      title: "Agent Todo List · React Component",
      description: "React checklist for the plan an AI agent follows: pending, running, done and cancelled marks, per-task progress and detail, a done count, and auto-collapse once the plan wraps up.",
    },
    introduction: "Use a plan to show the person what is left to do, not to narrate every passing thought. Only work items whose status someone watching the run actually cares about belong here.",
    composition: {
      description: "When the plan comes from a chat-based run, render it inside that turn's message content.",
      tree: `Message
└── MessageContent
    └── TodoList`,
    },
    lifecycle: [
      {
        title: "Plan",
        description: "Durable tasks enter in a readable order with one clear active item.",
      },
      {
        title: "Execute",
        description: "Status marks advance in place as the agent completes meaningful work.",
      },
      {
        title: "Summarize",
        description: "The final count and completed icon reduce the plan to a compact record.",
      },
    ],
    principles: [
      {
        title: "Show durable steps",
        description: "Items represent meaningful work that can be pending, active, or complete—not every token-level action the agent performs.",
      },
      {
        title: "Advance in place",
        description: "Status marks morph without replacing the row, so labels and metadata remain easy to track as work progresses.",
      },
      {
        title: "Summarize progress",
        description: "The heading carries a compact completed count and the list can collapse once the plan no longer needs attention.",
      },
    ],
    implementation: {
      title: "Update status without replacing the task",
      description: "Keep each task keyed by a durable id and morph only its status mark. Replacing the complete row breaks reading continuity, replays text motion, and makes progress feel less trustworthy.",
    },
    connections: [
      {
        slug: "agent-activity",
        name: "Agent Activity",
        description: "Logs what happens between one task and the next.",
      },
      {
        slug: "loading-states",
        name: "Agent Loading States",
        description: "Fills the gap before any plan exists.",
      },
      {
        slug: "tool-result",
        name: "Tool Result",
        description: "Shows the output a task produced.",
      },
    ],
    contract: {
      owns: "Task presentation, status marks, completion count, disclosure, and list transitions.",
      leaves: "Planning logic, task execution, ordering decisions, and persistence to the agent runtime.",
    },
    guidance: {
      useWhen: "A multi-step run has durable tasks whose progress helps the reader understand what remains.",
      avoidWhen: "The events are transient reasoning, tool output, or an execution trace better represented chronologically.",
    },
  },
  "code-block": {
    seo: {
      title: "Streaming Code Block for AI Agents · React Component",
      description: "React code viewer for streamed AI output: highlighting for six languages, line numbers, emphasized lines, a height cap that trails new lines, and a copy button.",
    },
    introduction: "Code from a model arrives line by line, unlike a snippet pasted into docs. It has to stay legible mid-stream, keep its highlighting intact and give people one obvious way to copy the finished file.",
    composition: {
      description: "Put the generated code inside whichever response decides when streaming starts and stops.",
      tree: `StreamingResponse
└── CodeBlock`,
    },
    lifecycle: [
      {
        title: "Receive",
        description: "Source text may arrive incrementally without changing the surrounding block.",
      },
      {
        title: "Highlight",
        description: "Tokens, line numbers, and focused ranges update as stable visual layers.",
      },
      {
        title: "Finalize",
        description: "Following stops at completion and the complete source becomes ready to copy.",
      },
    ],
    principles: [
      {
        title: "Highlight complete units",
        description: "Token colors should update without flashing the entire block. Partial input remains legible until the current language structure is complete.",
      },
      {
        title: "Keep lines addressable",
        description: "Line numbers and focused ranges give discussions a stable reference even when only part of the file is emphasized.",
      },
      {
        title: "Follow without flicker",
        description: "A bounded viewport follows appended lines smoothly while the code background and existing rows remain fixed.",
      },
    ],
    implementation: {
      title: "Separate source updates from highlighted output",
      description: "Do not rebuild and crossfade the entire highlighted tree for every character. Preserve the container and existing lines, then update the smallest complete source unit the highlighter can render reliably.",
    },
    connections: [
      {
        slug: "file-diff",
        name: "File Diff",
        description: "Marks which lines were added or removed.",
      },
      {
        slug: "tool-result",
        name: "Tool Result",
        description: "Frames returned code as the output of a run.",
      },
      {
        slug: "streaming-response",
        name: "Streaming Response",
        description: "Hosts code alongside prose in a full answer.",
      },
    ],
    contract: {
      owns: "Highlighted presentation, line numbers, focused ranges, streaming follow behavior, and copy feedback.",
      leaves: "Code generation, language detection policy, execution, and file persistence to the application.",
    },
    guidance: {
      useWhen: "Generated or retrieved source needs syntax highlighting, line references, streaming, or focused ranges.",
      avoidWhen: "You need to explain file changes with additions and removals; use a file diff for that relationship.",
    },
  },
  "approval-card": {
    seo: {
      title: "Agent Approval Card · Human-in-the-Loop React Component",
      description: "React card that pauses an AI agent for a human decision: stepped questions, write-in answers, approve, request changes or reject, with the outcome kept in the thread.",
    },
    introduction: "Asking a person mid-run hands control back to them for a moment. Say plainly what needs deciding, ask only for what the agent needs, and give the paused run an answer it can rely on.",
    composition: {
      description: "Render the card in the message where the agent stopped to wait.",
      tree: `Message
└── MessageContent
    └── ApprovalCard`,
    },
    lifecycle: [
      {
        title: "Pause",
        description: "The run exposes the exact question or review that prevents safe continuation.",
      },
      {
        title: "Decide",
        description: "The person selects, writes, revises, approves, or rejects the requested input.",
      },
      {
        title: "Resume",
        description: "The completed decision replaces the controls and returns a stable result to the run.",
      },
    ],
    principles: [
      {
        title: "Ask one decision at a time",
        description: "Each step has a focused question and mutually understandable choices. Selecting a single answer can advance immediately.",
      },
      {
        title: "Keep context attached",
        description: "The request, options, and custom response field stay in one surface so the decision never becomes detached from its reason.",
      },
      {
        title: "Record the outcome",
        description: "Completion replaces the input state with a concise summary that remains readable in the conversation history.",
      },
    ],
    implementation: {
      title: "Model the pause as durable workflow state",
      description: "The selected answer must survive remounts and reconnects because the agent run is waiting on it. Record the completed decision before resuming work, then render that record in place of the controls.",
    },
    connections: [
      {
        slug: "tool-approval",
        name: "Tool Approval",
        description: "Covers the simpler yes or no on a single tool.",
      },
      {
        slug: "message",
        name: "Message",
        description: "Keeps the decision in the transcript next to its turn.",
      },
      {
        slug: "todo-list",
        name: "Todo List",
        description: "Shows which planned steps are waiting on the answer.",
      },
    ],
    contract: {
      owns: "Question flow, choice state, freeform input, review controls, and completed decision summary.",
      leaves: "Authorization policy, workflow suspension, side effects, and resumption to the agent runtime.",
    },
    guidance: {
      useWhen: "An agent cannot continue responsibly without a human choice, clarification, revision, or approval.",
      avoidWhen: "The question is optional, can be inferred safely, or concerns permission to execute one specific tool.",
    },
  },
  "file-diff": {
    seo: {
      title: "Streaming File Diff for AI Agents · React Component",
      description: "React diff view for code an AI agent edits: original and updated line numbers, highlighted rows that stream in, running plus and minus counts, copy, and collapse when done.",
    },
    introduction: "A diff tells someone what an edit did, or is about to do, to a file. Keep original and updated line numbers side by side, and let the size of the change and whether it has landed be readable in one glance.",
    composition: {
      description: "Show the patch inside the result of the tool call that edited the file.",
      tree: `ToolResult
└── ToolResultOutput
    └── FileDiff`,
    },
    lifecycle: [
      {
        title: "Open the change",
        description: "Filename, language, and live counts establish the scope of the edit.",
      },
      {
        title: "Append rows",
        description: "Context, additions, and removals arrive without reanimating earlier lines.",
      },
      {
        title: "Reduce to summary",
        description: "Completion collapses the patch while keeping the full change one action away.",
      },
    ],
    principles: [
      {
        title: "Keep both line spaces",
        description: "Original and updated line numbers remain distinct so additions, removals, and unchanged context can be discussed precisely.",
      },
      {
        title: "Stream by row",
        description: "New diff rows arrive as stable units. Existing syntax and backgrounds do not reanimate when another row is appended.",
      },
      {
        title: "Collapse to the result",
        description: "After completion, the disclosure can reduce to the filename and change counts while preserving access to the full patch.",
      },
    ],
    implementation: {
      title: "Append complete diff rows",
      description: "A streamed patch should reveal one parsed row at a time. Character-level updates can change diff markers, line numbers, and syntax classification mid-frame, producing visible flicker and incorrect alignment.",
    },
    connections: [
      {
        slug: "code-block",
        name: "Code Block",
        description: "Shares the same syntax colors for each line.",
      },
      {
        slug: "tool-result",
        name: "Tool Result",
        description: "Wraps the patch in the run that made it.",
      },
      {
        slug: "agent-activity",
        name: "Agent Activity",
        description: "Lists the edit in order with the rest of the run.",
      },
    ],
    contract: {
      owns: "Diff rows, original and updated line numbers, syntax presentation, change counts, and completion disclosure.",
      leaves: "Diff generation, patch application, conflict handling, and repository state to the application.",
    },
    guidance: {
      useWhen: "A person needs to inspect how an agent changed a file, including old and new line relationships.",
      avoidWhen: "The content is a standalone snippet, a complete file, or raw terminal output with no before-and-after structure.",
    },
  },
  "tool-result": {
    seo: {
      title: "AI Tool Result · React Component",
      description: "React panel for AI tool call output: terminal logs or request bodies, live status, a capped view that tracks new lines, retry, copy and a compact finished state.",
    },
    introduction: "Treat a tool result as a receipt from something that ran, not as one more chat message. A short summary sits on top; the output underneath is there for anyone who needs to check, retry or reuse it.",
    composition: {
      description: "Feed the output primitive whatever the tool produced: shell text, request details, code or other structured data.",
      tree: `ToolResult
└── ToolResultOutput`,
    },
    lifecycle: [
      {
        title: "Run",
        description: "The header identifies the action, target, duration, and current execution state.",
      },
      {
        title: "Stream evidence",
        description: "Output follows inside a bounded viewport while the summary remains readable.",
      },
      {
        title: "Resolve",
        description: "Success or failure replaces the active state and exposes relevant recovery actions.",
      },
    ],
    principles: [
      {
        title: "Lead with the outcome",
        description: "The title and colored status explain success, failure, or progress before the reader inspects raw output.",
      },
      {
        title: "Keep output bounded",
        description: "Long terminal or response bodies stream inside a capped area instead of expanding the entire conversation indefinitely.",
      },
      {
        title: "Keep recovery nearby",
        description: "Retry and copy actions appear with the result they affect, then the completed disclosure can return to a compact row.",
      },
    ],
    implementation: {
      title: "Keep status separate from raw output",
      description: "The execution state should remain readable even when output is empty, malformed, or extremely long. Derive the summary from the tool lifecycle, not from strings found inside the result body.",
    },
    connections: [
      {
        slug: "tool-approval",
        name: "Tool Approval",
        description: "Asks permission before anything runs.",
      },
      {
        slug: "code-block",
        name: "Code Block",
        description: "Highlights code that a tool hands back.",
      },
      {
        slug: "agent-activity",
        name: "Agent Activity",
        description: "Logs the call as one step in a longer run.",
      },
    ],
    contract: {
      owns: "Execution summary, status presentation, streamed output viewport, disclosure, and result actions.",
      leaves: "Tool invocation, retries, cancellation, response parsing, and error policy to supplied callbacks.",
    },
    guidance: {
      useWhen: "A tool execution produces output that may need inspection, copying, retrying, or a durable completion record.",
      avoidWhen: "The tool is still awaiting permission, the output is a file patch, or only a transient activity label is needed.",
    },
  },
  "streaming-response": {
    seo: {
      title: "Streaming AI Response · React Component",
      description: "React wrapper for streamed AI answers: renders text or Markdown as it arrives, then adds copy, retry, thumbs up or down and a collapsible list of sources.",
    },
    introduction: "Every answer lives through two stages: first the text is still coming in, then it is done and ready to act on. Nothing should jump at that handoff, and rich formatting keeps rendering as usual throughout.",
    composition: {
      description: "Hold the answer's streaming state in the message surface and leave the surrounding row untouched.",
      tree: `Message
└── MessageContent
    └── MessageBubble
        └── StreamingResponse`,
    },
    lifecycle: [
      {
        title: "Receive",
        description: "Partial content enters the same semantic response container used by the final answer.",
      },
      {
        title: "Render",
        description: "Markdown, links, lists, and code remain styled as the body grows.",
      },
      {
        title: "Complete",
        description: "The settled answer reveals only the actions and sources that are now usable.",
      },
    ],
    principles: [
      {
        title: "Render real content",
        description: "Links, lists, code, and other rendered Markdown remain part of the response instead of being flattened into a streaming-only text effect.",
      },
      {
        title: "Separate phase from content",
        description: "Streaming state controls announcements and completion affordances without replacing the response body or adding a cursor artifact.",
      },
      {
        title: "Reveal actions on completion",
        description: "Copy, retry, feedback, and sources appear only when they are meaningful, leaving the active response visually quiet.",
      },
    ],
    implementation: {
      title: "Stream source content, not presentation fragments",
      description: "Keep one canonical response value and pass its current slice through the same renderer used at completion. Swapping between separate streaming and final trees causes Markdown, links, and backgrounds to shift at the phase boundary.",
    },
    connections: [
      {
        slug: "message",
        name: "Message",
        description: "Anchors the answer in an assistant row.",
      },
      {
        slug: "citations",
        name: "Citations",
        description: "Links finished claims to their sources.",
      },
      {
        slug: "code-block",
        name: "Code Block",
        description: "Shows code blocks inside the answer.",
      },
    ],
    contract: {
      owns: "Response phase, rendered-content styling, completion actions, feedback state, and source disclosure.",
      leaves: "Token transport, Markdown parsing, retry implementation, and citation data to the application.",
    },
    guidance: {
      useWhen: "An assistant answer arrives incrementally and may finish with actions, feedback, or supporting sources.",
      avoidWhen: "The content is an opaque loading state, a structured tool event, or a short message with no response lifecycle.",
    },
  },
  "image-generation": {
    seo: {
      title: "AI Image Generation Animation · React Component",
      description: "React placeholder for AI-generated images: fixed aspect ratio, queued, generating and refining stages, a dithered progress field, a clean reveal and retry on error.",
    },
    introduction: "Reserve the space for generated media before any pixels exist. One frame stays put while each stage brings the picture closer to finished, and at the end it is just a normal image people can look at closely.",
    composition: {
      description: "Put the image in the assistant row that holds the prompt and knows when generation completes.",
      tree: `Message
└── MessageContent
    └── ImageGeneration
        └── GeneratedMedia`,
    },
    lifecycle: [
      {
        title: "Reserve",
        description: "The final aspect ratio is present before generated media becomes available.",
      },
      {
        title: "Resolve",
        description: "A single dither cluster responds to fine-pointer movement while the result resolves.",
      },
      {
        title: "Settle",
        description: "The veil and blur clear without remounting or resizing the completed image.",
      },
    ],
    principles: [
      {
        title: "Keep one canvas",
        description: "Generation phases update visual treatment inside a fixed aspect ratio so nearby transcript content never shifts.",
      },
      {
        title: "Reveal progressively",
        description: "The responsive particle field, focus, and saturation communicate refinement without pretending to expose model progress as a percentage.",
      },
      {
        title: "Preserve the result",
        description: "Completion removes generation effects and leaves the supplied media as the primary, stable content.",
      },
    ],
    implementation: {
      title: "Keep generated media mounted across status changes",
      description: "Drive the veil and media treatment from generation status instead of replacing the canvas at every phase. Remounting can replay loading motion, flash the background, and shift the surrounding conversation.",
    },
    connections: [
      {
        slug: "message",
        name: "Message",
        description: "Ties the image to the assistant turn that made it.",
      },
      {
        slug: "streaming-response",
        name: "Streaming Response",
        description: "Carries the prose that comes with the image.",
      },
      {
        slug: "prompt-input",
        name: "Prompt Input",
        description: "Takes the instruction that kicks off generation.",
      },
    ],
    contract: {
      owns: "Canvas geometry, generation-state presentation, progressive media reveal, status messaging, and retry affordance.",
      leaves: "Prompt submission, generation transport, progress interpretation, media loading, persistence, and moderation to the application.",
    },
    guidance: {
      useWhen: "Generated visual media needs a stable place in a conversation while work moves through queued, active, refining, complete, or failed states.",
      avoidWhen: "The result is already available, the media has no generation lifecycle, or the application needs an editable image workspace rather than a status surface.",
    },
  },
  "tool-approval": {
    seo: {
      title: "AI Tool Approval · React Component",
      description: "React permission prompt for AI tool calls: review parameters and code, then approve a single run, grant standing access or deny, and follow the call until it finishes.",
    },
    introduction: "Approving a tool draws a line around what the agent may do. People need to see what will execute, what it can touch, and whether saying yes covers this call only or every call after it.",
    composition: {
      description: "When the choice depends on reading the code, show that code within the request itself.",
      tree: `Message
└── MessageContent
    └── ToolApproval
        └── ToolApprovalCode`,
    },
    lifecycle: [
      {
        title: "Inspect",
        description: "The pending card exposes the tool, command, target, and relevant risk context.",
      },
      {
        title: "Choose scope",
        description: "The person allows once, remembers access, or denies the requested execution.",
      },
      {
        title: "Resolve",
        description: "The card records the permission outcome before the host decides what runs next.",
      },
    ],
    principles: [
      {
        title: "Name the action",
        description: "Show the tool, command, target, or request details before presenting the approval controls.",
      },
      {
        title: "Separate permission scope",
        description: "Allow once and remember access are different commitments. Their labels and outcomes should never be interchangeable.",
      },
      {
        title: "Make denial complete",
        description: "Denying is a first-class outcome with the same clarity as approval, not a quiet dismissal of the card.",
      },
    ],
    implementation: {
      title: "Return a permission decision, not a button event",
      description: "Model allow-once, remembered access, and denial as explicit outcomes. The host can then enforce scope consistently instead of inferring security policy from whichever control happened to fire.",
    },
    connections: [
      {
        slug: "approval-card",
        name: "Approval Card",
        description: "Takes on open questions and wider reviews.",
      },
      {
        slug: "agent-activity",
        name: "Agent Activity",
        description: "Shows the run that is waiting and what resumes.",
      },
      {
        slug: "tool-result",
        name: "Tool Result",
        description: "Shows what the tool returned once it ran.",
      },
    ],
    contract: {
      owns: "Permission details, pending and resolved states, scope choices, and approval or denial controls.",
      leaves: "Security policy, credential access, tool execution, and remembered permissions to the host application.",
    },
    guidance: {
      useWhen: "One tool call crosses a permission boundary and the person must review its exact scope before execution.",
      avoidWhen: "The workflow needs a product decision, clarification, or multi-step review rather than execution permission.",
    },
  },
  citations: {
    seo: {
      title: "AI Citations · React Component",
      description: "React citations for grounded AI answers: numbered inline markers, linked source rows with favicons and domains, and a list of references that opens and closes.",
    },
    introduction: "A citation ties one claim to its evidence and stays out of the reader's way. Markers in the text should be small; the source list carries enough detail for someone to go and check.",
    composition: {
      description: "Keep the inline markers and the source list in the same answer so their ids match.",
      tree: `StreamingResponse
├── Citation
└── Citations
    ├── CitationStack
    └── CitationList`,
    },
    lifecycle: [
      {
        title: "Mark the claim",
        description: "A compact inline reference stays attached to the statement it supports.",
      },
      {
        title: "Collect sources",
        description: "Repeated references resolve into a concise source summary below the response.",
      },
      {
        title: "Inspect evidence",
        description: "The disclosure opens real destinations without replacing or obscuring the answer.",
      },
    ],
    principles: [
      {
        title: "Keep claims readable",
        description: "Markers sit with the relevant text and remain compact enough that they do not become the dominant visual element.",
      },
      {
        title: "Use real destinations",
        description: "Source labels, hosts, and favicons derive from the supplied URLs rather than a fixed catalog of known websites.",
      },
      {
        title: "Disclose the collection",
        description: "A compact source summary opens into the complete list while preserving the response layout above it.",
      },
    ],
    implementation: {
      title: "Use stable source identities",
      description: "Deduplicate citations by a normalized source id rather than their rendered index. Inline marker numbers may change as content streams, but the link between a claim and its destination must remain stable.",
    },
    connections: [
      {
        slug: "streaming-response",
        name: "Streaming Response",
        description: "Opens the source summary after the answer finishes.",
      },
      {
        slug: "message",
        name: "Message",
        description: "Keeps the cited answer in a proper transcript row.",
      },
    ],
    contract: {
      owns: "Inline markers, source identity presentation, favicon resolution, and collection disclosure.",
      leaves: "Retrieval, ranking, citation correctness, and URL trust decisions to the application.",
    },
    guidance: {
      useWhen: "A generated answer makes grounded claims that readers may need to verify against supplied URLs.",
      avoidWhen: "Links are ordinary navigation, sources cannot be tied to claims, or the application has not validated the destinations.",
    },
  },
  "agent-activity": {
    seo: {
      title: "AI Agent Activity · React Component",
      description: "React feed for AI agent work: reasoning text, steps, tool calls, searches on the web and trace entries in order, collapsing to a short summary when the run ends.",
    },
    introduction: "Show people how the work is going without handing them the raw internal transcript. Events land in order, are quick to skim, and boil down to a short summary once the run is over.",
    composition: {
      description: "Render the feed inside the message content of the turn that produced the work.",
      tree: `Message
└── MessageContent
    └── AgentActivity`,
    },
    lifecycle: [
      {
        title: "Start with intent",
        description: "The active label explains the kind of work before the first event arrives.",
      },
      {
        title: "Append evidence",
        description: "Reasoning, searches, tools, and messages enter in their true execution order.",
      },
      {
        title: "Collapse the run",
        description: "Completion replaces the live label with a reopenable summary of recorded work.",
      },
    ],
    principles: [
      {
        title: "Begin at the beginning",
        description: "Reasoning, searches, messages, and tool calls append in execution order. A replay never appears to begin halfway through the run.",
      },
      {
        title: "Adapt to the event",
        description: "Freeform text, structured steps, search results, and tool calls keep their own readable shapes inside one shared disclosure.",
      },
      {
        title: "Summarize completed work",
        description: "The active viewport follows new events, then collapses into a reopenable label that describes what actually happened.",
      },
    ],
    implementation: {
      title: "Normalize events before rendering",
      description: "Convert transport-specific chunks into durable text, step, search, tool, and message events first. A shared chronological model lets mixed activity render consistently and prevents the UI from starting in the middle of a replay.",
    },
    connections: [
      {
        slug: "loading-states",
        name: "Agent Loading States",
        description: "Fills the time before the first event arrives.",
      },
      {
        slug: "todo-list",
        name: "Todo List",
        description: "Keeps planned tasks apart from passing events.",
      },
      {
        slug: "tool-result",
        name: "Tool Result",
        description: "Opens one finished call into its full output.",
      },
    ],
    contract: {
      owns: "Chronological event presentation, live summary, bounded following, completion collapse, and replay behavior.",
      leaves: "Reasoning generation, event transport, tool execution, and trace storage to the agent runtime.",
    },
    guidance: {
      useWhen: "A run contains multiple progressive events whose order and completion help explain what the agent is doing.",
      avoidWhen: "You only need a simple wait signal, a durable task plan, or the final output from one tool invocation.",
    },
  },
  "loading-states": {
    seo: {
      title: "AI Agent Loading States · React Components",
      description: "React loading indicators for AI agents: a shimmering status line, an elapsed-time progress row and rotating reasoning phrases, all reduced-motion aware.",
    },
    introduction: "A busy indicator should say work is happening without faking how far along it is. Pick the lightest signal the system can back up with what it really knows, and keep the wording steady until the state changes.",
    composition: {
      description: "Pick the primitive that shows only as much progress as the agent can honestly report.",
      tree: `Message
└── MessageContent
    ├── ThinkingShimmer
    ├── AgentProgress
    └── ReasoningText`,
    },
    lifecycle: [
      {
        title: "Signal",
        description: "A truthful label appears immediately when work begins or the interface must wait.",
      },
      {
        title: "Sustain",
        description: "Quiet motion confirms activity without implying unavailable progress or steps.",
      },
      {
        title: "Resolve",
        description: "The indicator leaves cleanly when content, an error, or a richer progress state replaces it.",
      },
    ],
    principles: [
      {
        title: "Match the available signal",
        description: "Use a shimmer for an unknown wait, elapsed time for sustained work, and changing phrases only when the label reflects a real stage.",
      },
      {
        title: "Keep motion secondary",
        description: "Animation confirms activity but never makes the status harder to read. Reduced motion keeps the same meaning with a calmer treatment.",
      },
      {
        title: "Avoid false precision",
        description: "Do not show percentages, steps, or promises that the underlying process cannot measure reliably.",
      },
    ],
    implementation: {
      title: "Choose labels from known state",
      description: "A phrase such as “Searching” should come from an actual stage or event, not a decorative timer. When only elapsed work is known, keep the language general and let motion communicate continued activity.",
    },
    connections: [
      {
        slug: "agent-activity",
        name: "Agent Activity",
        description: "Takes over as soon as real events stream in.",
      },
      {
        slug: "todo-list",
        name: "Todo List",
        description: "Shows concrete progress once a plan exists.",
      },
      {
        slug: "streaming-response",
        name: "Streaming Response",
        description: "Steps in when the first words of the answer appear.",
      },
    ],
    contract: {
      owns: "Readable activity signals, elapsed presentation, phrase transitions, and reduced-motion behavior.",
      leaves: "Progress calculation, stage selection, timeout policy, and cancellation to the application.",
    },
    guidance: {
      useWhen: "The interface knows work is active but has little or no structured progress to display yet.",
      avoidWhen: "Real tasks, execution events, elapsed stages, or tool output are available and can communicate progress more honestly.",
    },
  },
  "voice-input": {
    seo: {
      title: "AI Voice Input · React Component",
      description:
        "A React voice input for AI apps: a mic button that morphs into a recording pill with a live waveform, timer, cancel and confirm actions, and delegated speech-to-text.",
    },
    introduction:
      "Voice input lets a person speak an instruction instead of typing it. It owns microphone access, recording feedback, and the handoff to transcription, while the application decides which speech-to-text service turns audio into the prompt.",
    composition: {
      description:
        "Place the voice control beside or inside the composer so a finished transcript lands in the same draft the person would otherwise type.",
      tree: "Chat\n├── MessageScroller\n└── PromptInput\n    └── VoiceInput",
    },
    lifecycle: [
      {
        title: "Request",
        description:
          "Pressing the mic asks for microphone access once, and a blocked or missing device resolves into a readable error instead of a silent failure.",
      },
      {
        title: "Record",
        description:
          "The button grows into a pill with a live waveform and elapsed time, so the person can see they are being heard and cancel or confirm at any point.",
      },
      {
        title: "Transcribe",
        description:
          "Confirming stops capture, releases the microphone, and shows a processing shimmer until the supplied transcriber or the browser speech API returns text.",
      },
    ],
    principles: [
      {
        title: "Show that it is listening",
        description:
          "Waveform bars follow the actual input level and a pulsing dot marks live capture. A recording that looks frozen makes people repeat themselves or give up.",
      },
      {
        title: "Always offer a way out",
        description:
          "Cancel discards audio at every stage, including mid-transcription, and returns focus to the mic so a false start costs nothing.",
      },
      {
        title: "Release hardware promptly",
        description:
          "Streams, audio contexts, recorders, and animation frames stop on confirm, cancel, error, and unmount so the browser's recording indicator never lingers.",
      },
    ],
    implementation: {
      title: "Keep the waveform off the React render path",
      description:
        "Read analyser levels in a requestAnimationFrame loop and write bar transforms directly to the DOM. Re-rendering per frame would cost the composer its responsiveness, and the timer only needs a state update once per second.",
    },
    connections: [
      {
        slug: "prompt-input",
        name: "Prompt Input",
        description: "Receives the transcript as an editable draft.",
      },
      {
        slug: "loading-states",
        name: "Loading States",
        description: "Matches the shimmer used while transcription runs.",
      },
      {
        slug: "message",
        name: "Message",
        description: "Displays the spoken prompt once it is sent.",
      },
    ],
    contract: {
      owns: "Microphone permission, recording state, live level visualization, elapsed time, cancel and confirm controls, transcription progress, and resource cleanup.",
      leaves:
        "Speech-to-text transport, language models, draft insertion, and submission to the application through onTranscribe and onTranscript.",
    },
    guidance: {
      useWhen:
        "People dictate prompts on mobile or hands-busy contexts, or longer instructions are faster to say than type.",
      avoidWhen:
        "The product can't send audio to a transcription service, or input must stay silent in shared spaces where typing is the expected default.",
    },
  },
} satisfies Record<string, AgentGuide>;
