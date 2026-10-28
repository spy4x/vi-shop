import { AxeBuilder } from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

/**
 * The storefront on the sample shop: ordering on Telegram reaches the chat, the item page passes
 * axe-core in both themes, a phone sees the order message in short, the size calculator answers
 * with the colour picked (in place with JavaScript, on a new page without), a swipe moves the
 * photos by one, the photos open full size, the size table's cells share one padding, and a short
 * page keeps its footer at the bottom.
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

      // A reload would drop this mark: the answer must arrive without one when scripts run.
      await page.evaluate(() => Object.assign(globalThis, { stayed: true }))
      await page.getByRole(`button`, { name: `Tính size`, exact: true }).click()

      await expect(page).toHaveURL(/height=158&weight=62#size-calculator$/)
      await expect(page.locator(`[data-e2e="size-advice"]`)).toHaveText(
        `Size của bạn ở giữa S và L. L đang hết hàng, chọn M: size gần nhất còn hàng.`,
      )
      await expect(page.getByRole(`radio`, { name: `M`, exact: true })).toBeChecked()
      await expect(page.getByRole(`radio`, { name: `Xám` })).toBeChecked()
      expect(await page.evaluate(() => `stayed` in globalThis)).toBe(javaScriptEnabled)
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

test(`a swipe on a phone stops with one photo centred, never between two`, async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  })
  try {
    const page = await context.newPage()
    await page.goto(JACKET)
    const strip = page.locator(`[data-e2e="item-photos"]`)
    await expect(strip.locator(`li`)).toHaveCount(2)
    const box = (await strip.boundingBox())!

    /** How far each photo's centre sits from the strip's centre, in whole pixels. */
    const offsets = () =>
      strip.evaluate((element) => {
        const frame = element.getBoundingClientRect()
        const middle = frame.left + frame.width / 2
        return [...element.querySelectorAll(`li`)].map((photo) => {
          const own = photo.getBoundingClientRect()
          return Math.round(own.left + own.width / 2 - middle)
        })
      })
    // Sideways scrolls, as a swipe sends them. Each alone would leave two photos partly in view.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(120, 0)
    await expect.poll(offsets).toEqual([0, 350])
    await page.mouse.wheel(200, 0)
    await expect.poll(offsets).toEqual([-350, 0])
  } finally {
    await context.close()
  }
})

test(`a photo opens full size, the arrow keys page through, and Escape returns to the photo`, async ({ page }) => {
  await page.goto(JACKET)
  const first = page.getByRole(`button`, { name: `Xem ảnh lớn: Áo khoác zip màu nâu` })
  await first.click()

  const viewer = page.getByRole(`dialog`, { name: `Xem ảnh` })
  await expect(viewer).toBeVisible()
  await expect(viewer.locator(`img`)).toHaveAttribute(`src`, /\/960\.webp(\?|$)/)
  await expect(viewer).toContainText(`1/2`)
  await page.keyboard.press(`ArrowRight`)
  await expect(viewer).toContainText(`2/2`)
  await expect(viewer).toContainText(`Áo khoác zip màu xám`)

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations.map((violation) => violation.id)).toEqual([])

  await page.keyboard.press(`Escape`)
  await expect(viewer).toBeHidden()
  await expect(first).toBeFocused()
})

test(`the size table pads every cell alike, header included`, async ({ page }) => {
  await page.goto(JACKET)
  const paddings = await page.locator(`[data-e2e="size-table"]`).evaluate((table) =>
    [...table.querySelectorAll(`th, td`)].map((cell) => {
      const style = getComputedStyle(cell)
      return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].join(
        ` `,
      )
    })
  )
  expect(paddings.length).toBeGreaterThan(3)
  expect(new Set(paddings)).toEqual(new Set([`12px 16px 12px 16px`]))
})

for (const width of [390, 1440]) {
  test(`a short page keeps its footer at the bottom of a ${width} px screen`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 2000 } })
    try {
      const page = await context.newPage()
      await page.goto(`/hoi-dap`)
      const bottom = await page.locator(`footer`).evaluate((footer) =>
        footer.getBoundingClientRect().bottom
      )
      expect(Math.round(bottom)).toBe(2000)
    } finally {
      await context.close()
    }
  })
}
