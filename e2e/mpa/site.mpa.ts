import { expect, test } from "@playwright/test"

// The public website is plain links: a visitor needs no script to get through it.
test.use({ javaScriptEnabled: false })

test("a visitor without JavaScript reads the home page and reaches both legal pages from its footer", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mặc để chuyển động.")
  await expect(page.locator("html")).toHaveAttribute("lang", "vi")

  await page.getByRole("link", { name: "Quyền riêng tư" }).click()
  await expect(page).toHaveURL("/privacy")
  await page.getByRole("link", { name: "Điều khoản" }).click()
  await expect(page).toHaveURL("/terms")
  await page.locator("[data-e2e=site-brand]").click()
  await expect(page).toHaveURL("/")
})

test("robots.txt points crawlers at a sitemap that lists the privacy page", async ({ request, baseURL }) => {
  const robots = await request.get("/robots.txt")
  expect(robots.ok()).toBe(true)
  expect(await robots.text()).toContain(`Sitemap: ${new URL(baseURL!).origin}/sitemap.xml`)

  const sitemap = await request.get("/sitemap.xml")
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).toContain(`<loc>${new URL(baseURL!).origin}/privacy</loc>`)
})

test("every page fits a 375 px phone without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  for (const path of ["/", "/en", "/hoi-dap", "/danh-sach", "/privacy", "/terms"]) {
    await page.goto(path)
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(pageWidth, path).toBeLessThanOrEqual(375)
  }
})

test("a keyboard user skips the header: the first Tab shows the skip link and Enter lands on the content", async ({ page }) => {
  await page.goto("/privacy")

  await page.keyboard.press("Tab")
  const skip = page.getByRole("link", { name: "Bỏ qua, đến nội dung" })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/#main$/)
  await expect(page.getByRole("main")).toBeFocused()
})
