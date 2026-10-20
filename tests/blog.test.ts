import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type BlogTocItem,
  formatPostDate,
  getAdjacentPosts,
  getAllPosts,
  getPost,
} from "@/lib/blog";
import { findComponent } from "@/lib/registry";

const posts = getAllPosts();
const flatToc = (items: BlogTocItem[]): BlogTocItem[] =>
  items.flatMap((item) => [item, ...flatToc(item.children ?? [])]);

describe("blog registry", () => {
  test("has posts, newest first, with unique slugs", () => {
    expect(posts.length).toBeGreaterThan(0);
    const slugs = posts.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const dates = posts.map((post) => post.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  for (const post of posts) {
    describe(post.slug, () => {
      const file = join(process.cwd(), "content", "blog", `${post.slug}.tsx`);

      test("slug matches its module file and is URL-safe", () => {
        expect(post.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(existsSync(file)).toBe(true);
        expect(getPost(post.slug)).toBe(post);
      });

      test("metadata is complete", () => {
        expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        if (post.updated) {
          expect(post.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(post.updated >= post.date).toBe(true);
        }
        expect(Number.isNaN(new Date(`${post.date}T00:00:00Z`).getTime())).toBe(false);
        expect(post.title.length).toBeGreaterThan(0);
        expect(post.description.length).toBeGreaterThan(0);
        expect(post.category.length).toBeGreaterThan(0);
        expect(post.tags.length).toBeGreaterThan(0);
        expect(post.readingMinutes).toBeGreaterThan(0);
      });

      test("every toc entry points at a heading in the body", () => {
        const source = readFileSync(file, "utf8");
        const ids = flatToc(post.toc).map((item) => item.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) {
          expect(source).toMatch(new RegExp(`<H[23] id="${id}"`));
        }
      });

      test("related components exist in the registry", () => {
        for (const ref of post.related ?? []) {
          expect(findComponent(ref.category, ref.slug)).toBeDefined();
        }
      });
    });
  }
});

describe("blog helpers", () => {
  test("formats dates in en-US, UTC", () => {
    expect(formatPostDate("2026-10-20")).toBe("October 20, 2026");
    expect(formatPostDate("2026-01-01")).toBe("January 1, 2026");
  });

  test("adjacent posts follow the newest-first order", () => {
    const first = posts[0];
    if (!first) throw new Error("no posts");
    expect(getAdjacentPosts(first.slug).newer).toBeUndefined();
    expect(getAdjacentPosts(first.slug).older).toBe(posts[1]);
    expect(getAdjacentPosts("does-not-exist")).toEqual({});
  });
});
