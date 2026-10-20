import { afterEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { DashboardShell, type DashboardNavGroup } from "@/components/motion/dashboard-shell";

const NAV: DashboardNavGroup[] = [
  { id: "main", items: [{ id: "home", label: "Home", icon: null }] },
];

const shell = (mobileBelow?: number) => (
  <DashboardShell
    nav={NAV}
    brand={{ name: "Acme" }}
    user={{ name: "Ada Lovelace" }}
    mobileBelow={mobileBelow}
  />
);

const roots: Array<ReturnType<typeof hydrateRoot>> = [];
const containers: HTMLDivElement[] = [];

afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount();
  });
  for (const c of containers.splice(0)) c.remove();
});

describe("DashboardShell layout switch", () => {
  test("server HTML carries a container query on the shell's own width", () => {
    const html = renderToString(shell());
    const css = html.match(/<style>(.*?)<\/style>/)?.[1] ?? "";
    expect(css).toContain("not (min-width: 768px)");
    expect(css).toContain("(min-width: 768px)");
    // Nothing the server escapes, so the rule survives into the HTML intact.
    expect(css).not.toContain("&");
    const scope = css.match(/@container (\S+) /)?.[1];
    expect(scope).toBeTruthy();
    expect(html).toContain(`container-name:shell ${scope}`);
    expect(html).toContain(`data-shell-desktop="${scope}"`);
    expect(html).toContain(`data-shell-mobile="${scope}"`);
  });

  test("mobileBelow moves the breakpoint", () => {
    const html = renderToString(shell(560));
    expect(html).toContain("not (min-width: 560px)");
    expect(html).not.toContain("768px");
  });

  test("hydrates without mismatches", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(shell(600));
    document.body.appendChild(container);
    containers.push(container);
    const errors: unknown[] = [];
    await act(async () => {
      roots.push(
        hydrateRoot(container, shell(600), {
          onRecoverableError: (error) => errors.push(error),
        }),
      );
    });
    expect(errors).toEqual([]);
  });
});
