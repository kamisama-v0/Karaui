import { ImageResponse } from "next/og";
import { getOgAssets } from "@/lib/og-assets";
import { getOgFonts } from "@/lib/og-fonts";
import { allComponents, findCategory } from "@/lib/registry";
import { OG_SIZE, ogImage } from "@/lib/og";
import { clampText } from "@/lib/seo";
import { getPost, postPath } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

// The card art has room for roughly this much body text before it overflows.
const OG_DESCRIPTION_LIMIT = 120;

const PAGE_CARDS = {
  openui: {
    title: "OpenUI + karaUI",
    description:
      "Register animated React components, generate OpenUI Lang, and render an interactive UI stream.",
    label: "Integration guide",
    command: "karaui.kamisama-v0.my.id/docs/openui",
  },
  mobile: {
    title: "Mobile & responsive",
    description:
      "Container queries, 44px touch targets, stacked tables and touch gestures in karaUI.",
    label: "Guide",
    command: "karaui.kamisama-v0.my.id/docs/mobile",
  },
  blog: {
    title: "karaUI Blog",
    description:
      "Notes from building karaUI: accessibility, motion, touch and the details behind the components.",
    label: "Blog",
    command: "karaui.kamisama-v0.my.id/blog",
  },
} as const;

const SITE_HOST = new URL(SITE_URL).host;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const componentSlug = searchParams.get("component");
  const categorySlug = searchParams.get("category");
  const pageSlug = searchParams.get("page");
  const postSlug = searchParams.get("post");
  // Blog posts: title + category, looked up by slug so the card only ever
  // shows published text.
  const post = postSlug ? getPost(postSlug) : undefined;
  const component = componentSlug
    ? allComponents().find((item) => item.slug === componentSlug)
    : undefined;
  const category =
    component?.category ?? (categorySlug ? findCategory(categorySlug) : undefined);
  const page =
    pageSlug && pageSlug in PAGE_CARDS
      ? PAGE_CARDS[pageSlug as keyof typeof PAGE_CARDS]
      : undefined;
  const title =
    post?.title ??
    component?.name ??
    category?.name ??
    page?.title ??
    "Animated components for React and Next.js";
  const description = clampText(
    post?.description ??
      component?.description ??
      category?.description ??
      page?.description ??
      "Free, open-source React components built with Motion and Tailwind CSS.",
    OG_DESCRIPTION_LIMIT,
  );
  const label = post
    ? post.category
    : component
      ? "Component"
      : category
        ? category.name
        : page?.label ?? "Motion components";
  const command = post
    ? `${SITE_HOST}${postPath(post.slug)}`
    : component
      ? `npx shadcn add @karaui/${component.slug}`
      : page?.command ?? "npx shadcn add @karaui/...";
  const origin = requestUrl.origin;
  const [fonts, assets] = await Promise.all([
    getOgFonts(origin),
    getOgAssets(origin),
  ]);

  return new ImageResponse(
    ogImage({ title, description, label, command, ...assets }),
    { ...OG_SIZE, fonts },
  );
}
