import { ArrowLeft, ArrowRight, ChevronRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/app/analytics/json-ld";
import { Prose } from "@/components/app/blog/prose";
import { PageNav } from "@/components/app/docs/page-nav";
import {
  formatPostDate,
  getAdjacentPosts,
  getAllPosts,
  getPost,
  postPath,
} from "@/lib/blog";
import { findComponent } from "@/lib/registry";
import { blogPostingJsonLd, breadcrumbJsonLd } from "@/lib/seo";

type Params = { slug: string };

const FEED_PATH = "/blog/rss.xml";

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

const ogImage = (slug: string) => `/api/og?post=${encodeURIComponent(slug)}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const path = postPath(post.slug);
  const image = ogImage(post.slug);

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: post.author, url: "https://github.com/kamisama-v0" }],
    alternates: {
      canonical: path,
      types: {
        "application/rss+xml": [{ url: FEED_PATH, title: "karaUI Blog" }],
      },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: path,
      type: "article",
      siteName: "karaUI",
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author],
      section: post.category,
      tags: post.tags,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [{ url: image, alt: post.title }],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const { Body } = post;
  const path = postPath(post.slug);
  const { newer, older } = getAdjacentPosts(post.slug);
  const related = (post.related ?? []).flatMap((ref) => {
    const comp = findComponent(ref.category, ref.slug);
    return comp
      ? [
          {
            href: `/components/${ref.category}/${comp.slug}`,
            name: comp.name,
            description: comp.description,
          },
        ]
      : [];
  });
  const tocItems = [
    ...post.toc,
    ...(related.length
      ? [{ id: "related-components", label: "Related components" }]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path },
          ]),
          blogPostingJsonLd(post, ogImage(post.slug)),
        ]}
      />
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-14">
        <article className="mx-auto min-w-0 max-w-3xl xl:mx-0">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm">
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Blog
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </li>
              <li className="text-muted-foreground">{post.category}</li>
            </ol>
          </nav>

          <header className="mt-5 border-b border-border pb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground md:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {post.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="grid size-6 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold uppercase text-foreground"
                >
                  {post.author.slice(0, 1)}
                </span>
                <span className="font-medium text-foreground">{post.author}</span>
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              {post.updated && post.updated !== post.date ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Updated{" "}
                    <time dateTime={post.updated}>
                      {formatPostDate(post.updated)}
                    </time>
                  </span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="size-3.5" />
                {post.readingMinutes} min read
              </span>
            </div>
            <ul aria-label="Tags" className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </header>

          <Prose className="mt-10">
            <Body />
          </Prose>

          {related.length ? (
            <section
              aria-labelledby="related-components"
              className="mt-16 border-t border-border pt-10"
            >
              <h2
                id="related-components"
                className="scroll-mt-24 text-xl font-semibold tracking-tight text-foreground"
              >
                Related components
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {related.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong"
                    >
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {item.name}
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                      <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {newer || older ? (
            <nav
              aria-label="More posts"
              className="mt-12 grid gap-3 border-t border-border pt-8 sm:grid-cols-2"
            >
              {older ? (
                <Link
                  href={postPath(older.slug)}
                  className="group flex flex-col rounded-2xl border border-border p-4 transition-colors hover:border-border-strong"
                >
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowLeft aria-hidden="true" className="size-3" />
                    Older
                  </span>
                  <span className="mt-1 text-sm font-medium text-foreground">
                    {older.title}
                  </span>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
              {newer ? (
                <Link
                  href={postPath(newer.slug)}
                  className="group flex flex-col items-end rounded-2xl border border-border p-4 text-right transition-colors hover:border-border-strong"
                >
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    Newer
                    <ArrowRight aria-hidden="true" className="size-3" />
                  </span>
                  <span className="mt-1 text-sm font-medium text-foreground">
                    {newer.title}
                  </span>
                </Link>
              ) : null}
            </nav>
          ) : null}

          <p className="mt-12">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              All posts
            </Link>
          </p>
        </article>
        {tocItems.length ? (
          <PageNav items={tocItems} placement="sticky" />
        ) : null}
      </div>
    </div>
  );
}
