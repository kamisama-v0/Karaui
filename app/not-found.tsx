import type { Metadata } from "next";
import { SiteChrome } from "@/components/app/chrome/site-chrome";
import { NotFoundGlitch } from "@/components/motion/not-found/glitch";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you are looking for does not exist.",
};

// The root not-found renders inside the bare root layout (outside the (site)
// group, for unmatched URLs and notFound() calls alike), so it brings the
// site chrome itself.
export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundGlitch />
    </SiteChrome>
  );
}
