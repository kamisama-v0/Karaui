import { Rss } from "lucide-react";
import type { Metadata } from "next";
import { JsonLd } from "@/components/app/analytics/json-ld";
import { BlogList, type BlogPost } from "@/components/motion/blog-list";
import { getAllPosts, postPath } from "@/lib/blog";
import { blogJsonLd, breadcrumbJsonLd } from "@/lib/seo";

const PAGE_TITLE = "Blog";
const PAGE_DESCRIPTION =
  "Notes from building karaUI: accessibility, motion, touch and the details behind the components.";
const PAGE_IMAGE = "/api/og?page=blog";
const FEED_PATH = "/blog/rss.xml";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": [{ url: FEED_PATH, title: "karaUI Blog" }] },
  },
  openGraph: {
    title: `${PAGE_TITLE} · karaUI`,
    description: PAGE_DESCRIPTION,
    url: "/blog",
    type: "website",
    siteName: "karaUI",
    images: [{ url: PAGE_IMAGE, width: 1200, height: 630, alt: "karaUI Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} · karaUI`,
    description: PAGE_DESCRIPTION,
    images: [{ url: PAGE_IMAGE, alt: "karaUI Blog" }],
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const listPosts: BlogPost[] = posts.map((post, index) => ({
    id: post.slug,
    title: post.title,
    excerpt: post.description,
    category: post.category,
    author: { name: post.author },
    date: post.date,
    readTime: post.readingMinutes,
    href: postPath(post.slug),
    featured: index === 0,
  }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 md:py-16">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: PAGE_TITLE, path: "/blog" },
          ]),
          blogJsonLd(posts),
        ]}
      />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Blog
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
            Notes from the workbench
          </h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            {PAGE_DESCRIPTION}
          </p>
        </div>
        <a
          href={FEED_PATH}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Rss aria-hidden="true" className="size-3.5" />
          RSS feed
        </a>
      </header>
      <div className="mt-10">
        <BlogList posts={listPosts} />
      </div>
    </div>
  );
}
