import type { ReactNode } from "react";
import { SiteChrome } from "@/components/app/chrome/site-chrome";

// Every docs page lives in this route group so it gets the site chrome; the
// group name is not part of any URL. Bare routes (app/preview) sit outside it.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
