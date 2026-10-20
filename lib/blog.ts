/**
 * Blog registry.
 *
 * Posts are TSX modules, not MDX: one file per post at
 * `content/blog/<slug>.tsx` (outside `app/`, so a post file can never become a
 * route by accident). Each module exports:
 *
 * - `meta: BlogPostMeta` — `meta.slug` must equal the file name.
 * - `toc?: BlogTocItem[]` — optional "On this page" entries. Every `id` must
 *   match a heading rendered by the body (`<H2 id>` / `<H3 id>` from
 *   `components/app/blog/prose`); `tests/blog.test.ts` checks this.
 * - `default` — a server component that renders the body (wrap nothing: the
 *   post page puts it inside `<Prose>`). Client components (live demos) can be
 *   imported and rendered inside it as usual.
 *
 * To publish a post: create the module, import it below as a namespace
 * (`import * as myPost from "@/content/blog/my-post"`) and add it to
 * `MODULES`. Order does not matter — posts are sorted newest first. The post
 * page, index, sitemap, RSS feed and OG card all read from this list, and the
 * build prerenders every post (`dynamicParams = false`), so nothing else needs
 * registering.
 *
 * Do not import this file from client components: it pulls in every post body.
 */
import type { ComponentType } from "react";
import * as buildAnAiChatInterface from "@/content/blog/build-an-ai-chat-interface";
import * as choosingAnAnimatedReactComponentLibrary from "@/content/blog/choosing-an-animated-react-component-library";
import * as touchTargetsWithoutRedesign from "@/content/blog/touch-targets-without-redesign";

export type BlogAuthor = "kara";

/** A library component a post links to, as in `/components/<category>/<slug>`. */
export type BlogRelatedComponent = {
  category: "motion" | "agents" | "blocks";
  slug: string;
};

export type BlogPostMeta = {
  /** URL segment; must equal the module's file name. */
  slug: string;
  title: string;
  /** One or two sentences. Used for the index excerpt, meta description and RSS. */
  description: string;
  /** Publish date, `YYYY-MM-DD` (read as UTC). */
  date: string;
  /** Last meaningful revision, `YYYY-MM-DD`. */
  updated?: string;
  author: BlogAuthor;
  tags: string[];
  readingMinutes: number;
  /** One category per post; drives the index filter chips and the OG label. */
  category: string;
  /** Components shown under "Related components". Unknown entries fail the tests. */
  related?: BlogRelatedComponent[];
};

export type BlogTocItem = {
  id: string;
  label: string;
  children?: BlogTocItem[];
};

export type BlogPostModule = {
  meta: BlogPostMeta;
  toc?: BlogTocItem[];
  default: ComponentType;
};

export type BlogPost = BlogPostMeta & {
  toc: BlogTocItem[];
  Body: ComponentType;
};

const MODULES: BlogPostModule[] = [buildAnAiChatInterface, choosingAnAnimatedReactComponentLibrary, touchTargetsWithoutRedesign];

const POSTS: BlogPost[] = MODULES.map((mod) => ({
  ...mod.meta,
  toc: mod.toc ?? [],
  Body: mod.default,
})).sort(
  (a, b) =>
    b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
);

/** Every post, newest first. */
export function getAllPosts(): BlogPost[] {
  return POSTS;
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((post) => post.slug === slug);
}

/** Neighbours in the newest-first list: `newer` is the next post published after this one. */
export function getAdjacentPosts(slug: string): {
  newer?: BlogPost;
  older?: BlogPost;
} {
  const index = POSTS.findIndex((post) => post.slug === slug);
  if (index < 0) return {};
  return { newer: POSTS[index - 1], older: POSTS[index + 1] };
}

export function postPath(slug: string) {
  return `/blog/${slug}`;
}

/** `YYYY-MM-DD` → Date at UTC midnight. */
export function postDate(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "October 20, 2026". Fixed locale and time zone, so server and client agree. */
export function formatPostDate(day: string) {
  return DATE_FORMAT.format(postDate(day));
}

/** Newest publish-or-update date across all posts, for sitemap/feed freshness. */
export function latestPostDate(): string | undefined {
  return POSTS.map((post) => post.updated ?? post.date)
    .sort()
    .at(-1);
}
