import type { Browser } from "playwright-core";

/** Render with installed Chrome/Edge when plain fetch returns a thin SPA shell. */
export async function fetchHtmlWithBrowser(url: string): Promise<string | null> {
  let chromium: typeof import("playwright-core").chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    return null;
  }

  const channels = ["chrome", "msedge"] as const;
  for (const channel of channels) {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({
        channel,
        headless: true,
        args: ["--disable-blink-features=AutomationControlled"],
      });
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport: { width: 1440, height: 1200 },
        locale: "en-US",
      });
      const page = await context.newPage();
      await page.route("**/*", (route) => {
        const type = route.request().resourceType();
        if (type === "image" || type === "media" || type === "font") return route.abort();
        return route.continue();
      });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await new Promise((r) => setTimeout(r, 2000));
      try {
        await page.waitForSelector("article, main, [role='main']", { timeout: 6_000 });
      } catch {
        /* optional */
      }
      const html = await page.content();
      await context.close();
      if (html && html.length > 800) return html;
    } catch (e) {
      console.warn("keepr: browser fetch failed", channel, e);
    } finally {
      await browser?.close().catch(() => undefined);
    }
  }
  return null;
}
