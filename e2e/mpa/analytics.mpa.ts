import { expect, type Page, test } from "@playwright/test"
import { watchCspViolations } from "../fixtures/csp.ts"

/**
 * The website's analytics against the stand-in tracker `spa-shell.ts` serves at
 * `MPA_UMAMI_ORIGIN` (`e2e/mpa/run.sh`), which keeps every `umami.track` call in `__umamiEvents`.
 */

const UMAMI = Deno.env.get("MPA_UMAMI_ORIGIN")!

interface Tracked {
  name: string
  data?: Record<string, unknown>
}

function events(page: Page): Promise<Tracked[]> {
  return page.evaluate(() =>
    (globalThis as unknown as { __umamiEvents?: Tracked[] }).__umamiEvents ?? []
  )
}

test("a page loads the tracker from the Umami origin and the website's own events, with no refusal", async ({ context, page }) => {
  const violations = await watchCspViolations(context)
  await page.goto("/")

  const tracker = page.locator(`script[src="${UMAMI}/script.js"]`)
  await expect(tracker).toHaveAttribute("data-do-not-track", "true")
  await expect(tracker).toHaveAttribute("data-domains", new URL(page.url()).hostname)
  await expect(page.locator(`script[src="/analytics.js"]`)).toHaveCount(1)
  // The stand-in ran, so the policy let the tracker in.
  await expect.poll(() =>
    page.evaluate(() => typeof (globalThis as unknown as { umami?: unknown }).umami)
  ).toBe("object")
  expect(violations).toEqual([])
})

test("counts the 404 page once it has loaded", async ({ page }) => {
  await page.goto("/no-such-page")

  await expect.poll(() => events(page)).toEqual([
    { name: "not-found", data: { path: "/no-such-page" } },
  ])
})
