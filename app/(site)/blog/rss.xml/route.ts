import { getAllPosts, latestPostDate, postDate, postPath } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

// Prerendered at build time like every other blog page.
export const dynamic = "force-static";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function GET() {
  const posts = getAllPosts();
  const feedUrl = `${SITE_URL}/blog/rss.xml`;
  const latest = latestPostDate();

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}${postPath(post.slug)}`;
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${postDate(post.date).toUTCString()}</pubDate>`,
        `      <dc:creator>${escapeXml(post.author)}</dc:creator>`,
        `      <description>${escapeXml(post.description)}</description>`,
        `      <category>${escapeXml(post.category)}</category>`,
        ...post.tags
          .filter((tag) => tag !== post.category)
          .map((tag) => `      <category>${escapeXml(tag)}</category>`),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    "    <title>karaUI Blog</title>",
    `    <link>${SITE_URL}/blog</link>`,
    "    <description>Notes from building karaUI: accessibility, motion, touch and the details behind the components.</description>",
    "    <language>en</language>",
    ...(latest
      ? [`    <lastBuildDate>${postDate(latest).toUTCString()}</lastBuildDate>`]
      : []),
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
