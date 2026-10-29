import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewFrameBridge } from "@/components/app/preview/preview-frame-bridge";
import { previews } from "@/components/previews";

/*
 * Bare preview pages: /preview/<category>/<slug> renders one preview from
 * components/previews/index.tsx with no site chrome (this route sits outside
 * the (site) route group). Component pages embed it in an <iframe> at tablet
 * and phone widths so media queries and matchMedia see a real viewport.
 * Not indexed and not in the sitemap.
 */

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(previews).map((previewKey) => ({ key: previewKey.split("/") }));
}

type Params = { params: Promise<{ key: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { key } = await params;
  return {
    title: `${key.join("/")} preview`,
    robots: { index: false, follow: false },
    // Drop the root layout's canonical "/" so these never claim to be the home page.
    alternates: {},
  };
}

export default async function PreviewPage({ params }: Params) {
  const { key } = await params;
  const Preview = previews[key.join("/")];
  if (!Preview) notFound();

  return (
    <main>
      <PreviewFrameBridge>
        <Preview />
      </PreviewFrameBridge>
    </main>
  );
}
