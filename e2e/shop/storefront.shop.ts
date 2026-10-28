import { AxeBuilder } from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

/**
 * The storefront on the sample shop: ordering on Telegram reaches the chat, the item page passes
 * axe-core in both themes, a phone sees the order message in short, and the size calculator lands
 * on its answer with the colour picked.
 */

const JACKET = `/ao-khoac/ao-khoac-zip-nau`

/** The WCAG A and AA rules axe-core checks the page against. */
const WCAG_TAGS = [`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`]

// Telegram is never asked: its host resolves nowhere in this browser. Playwright's routes do not
// see the request a redirect leads to, so the request is watched and fails here instead.
test.use({ launchOptions: { args: [`--host-resolver-rules=MAP t.me ~NOTFOUND`] } })

for (const javaScriptEnabled of [true, false]) {
  test.describe(javaScriptEnabled ? `with JavaScript` : `without JavaScript`, () => {
    test.use({ javaScriptEnabled })

    test(`"Order on Telegram" opens the shop's chat with the order typed in`, async ({ page }) => {
      await page.goto(JACKET)
      await page.locator(`[data-e2e="item-order-form"]`).getByText(`M`, { exact: true }).click()

      const sent = page.waitForRequest((request) => request.url().startsWith(`https://t.me/`), {
        timeout: 5_000,
      })
      await page.getByRole(`button`, { name: `Đặt qua Telegram` }).click()

      const url = new URL((await sent).url())
      expect(url.pathname).toBe(`/vi_shop_sample`)
      expect(url.searchParams.get(`text`)).toContain(`Áo khoác zip, màu Nâu, size M`)
    })

    test(`the calculator names the nearest size in stock, picks it and keeps the colour`, async ({ page }) => {
      await page.goto(JACKET)
      await page.getByText(`Xám`, { exact: true }).click()
      await page.getByText(`Chưa biết size? Tính size`).click()
      await page.getByLabel(`Chiều cao (cm)`).fill(`158`)
      await page.getByLabel(`Cân nặng (kg)`).fill(`62`)

      await page.getByRole(`button`, { name: `Tính size`, exact: true }).click()

      await expect(page).toHaveURL(/#size-calculator$/)
      await expect(page.locator(`[data-e2e="size-advice"]`)).toHaveText(
        `Size của bạn ở giữa S và L. L đang hết hàng, chọn M: size gần nhất còn hàng.`,
      )
      await expect(page.getByRole(`radio`, { name: `M`, exact: true })).toBeChecked()
      await expect(page.getByRole(`radio`, { name: `Xám` })).toBeChecked()
    })
  })
}

for (const colorScheme of [`light`, `dark`] as const) {
  test(`the item page passes axe-core in the ${colorScheme} theme`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme })
    try {
      const page = await context.newPage()
      await page.goto(JACKET)
      // Open the size calculator, so axe sees its fields too.
      await page.getByText(`Chưa biết size? Tính size`).click()

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

      expect(results.violations.map((violation) => violation.id)).toEqual([])
    } finally {
      await context.close()
    }
  })
}

test(`a phone sees the order message in two lines at most, without the link`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  try {
    const page = await context.newPage()
    await page.goto(`${JACKET}?size=M`)
    const preview = page.locator(`[data-e2e="order-bar-preview"]`)

    await expect(preview).toBeVisible()
    await expect(preview).not.toContainText(JACKET)
    // A long message is cut at the second line, and a short one never reaches a third.
    const { clamp, height, line } = await preview.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        clamp: style.webkitLineClamp,
        height: element.getBoundingClientRect().height,
        line: parseFloat(style.lineHeight),
      }
    })
    expect(clamp).toBe(`2`)
    expect(height).toBeLessThanOrEqual(2 * line + 1)
    await expect(page.getByText(`127.0.0.1:48420${JACKET}`, { exact: false })).toBeHidden()
  } finally {
    await context.close()
  }
})
