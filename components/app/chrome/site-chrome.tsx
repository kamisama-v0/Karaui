import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@/components/app/analytics/google-analytics";
import { JsonLd } from "@/components/app/analytics/json-ld";
import { KeyboardShortcuts } from "@/components/app/chrome/keyboard-shortcuts";
import { SiteDock } from "@/components/app/chrome/site-dock";
import { SiteFrame } from "@/components/app/chrome/site-frame";
import { SiteHeader } from "@/components/app/chrome/site-header";
import { PreferencesPanel } from "@/components/app/preferences/preferences-panel";
import { getGithubStarCount } from "@/lib/github";
import { siteJsonLd } from "@/lib/seo";

/**
 * Everything the docs site draws around a page: header, sidebar frame, dock,
 * preferences panel, structured data and analytics. The root layout only owns
 * <html>/<head> and the providers, so bare routes (the /preview iframe pages)
 * render without any of this. Used by app/(site)/layout.tsx and by the root
 * not-found page, which renders outside the (site) group.
 */
export async function SiteChrome({ children }: { children: ReactNode }) {
  const githubStarCount = await getGithubStarCount();
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

  return (
    <>
      <JsonLd data={siteJsonLd()} />
      {process.env.NODE_ENV === "production" && (
        <script
          defer
          src="https://collect.tracwell.app/script.js"
          data-project-key="tw_live_b83ebcb2a50b4e3b82f65ca32c086623"
          data-collection-mode="private"
          data-consent="granted"
          data-respect-do-not-track="true"
        />
      )}
      <KeyboardShortcuts />
      <SiteHeader githubStarCount={githubStarCount} />
      <main className="pt-14 pb-32">
        <SiteFrame>{children}</SiteFrame>
      </main>
      <SiteDock />
      <PreferencesPanel />
      {process.env.NODE_ENV === "production" && <Analytics />}
      {process.env.NODE_ENV === "production" && <SpeedInsights />}
      <GoogleAnalytics measurementId={googleAnalyticsId} />
    </>
  );
}
