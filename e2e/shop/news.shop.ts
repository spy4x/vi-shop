import { AxeBuilder } from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

/**
 * The blog and the newsletter on the sample shop (apps/mpa/lighthouse/sample-blog.ts): a post's
 * sign-up reaches "Kiểm tra hộp thư" and a topic chip filters the index, with and without
 * JavaScript, and the new pages pass axe-core in both themes.
 */

const POST = `/bai-viet/chon-size-ao-khoac`

/** The WCAG A and AA rules axe-core checks the page against. */
const WCAG_TAGS = [`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`]

for (const javaScriptEnabled of [true, false]) {
  test.describe(javaScriptEnabled ? `with JavaScript` : `without JavaScript`, () => {
    test.use({ javaScriptEnabled })

    test(`signing up under a post shows "Kiểm tra hộp thư" with the address`, async ({ page }) => {
      await page.goto(POST)
      const form = page.locator(`[data-e2e="signup-form"]`)
      await form.getByLabel(`Email`).fill(`lan.nguyen@example.com`)
      await form.getByRole(`button`, { name: `Đăng ký nhận tin` }).click()

      await expect(page).toHaveURL(/\/nhan-tin$/)
      await expect(page.getByRole(`heading`, { level: 1 })).toHaveText(`Kiểm tra hộp thư`)
      await expect(page.getByRole(`status`)).toContainText(`lan.nguyen@example.com`)
    })

    test(`a topic chip lists only that topic's posts`, async ({ page }) => {
      await page.goto(`/bai-viet`)
      await page.locator(`[data-e2e="topic-filter"]`).getByText(`Chọn size`, { exact: true })
        .click()
      if (!javaScriptEnabled) {
        await page.locator(`[data-e2e="topic-filter"]`).getByRole(`button`).click()
      }

      await expect(page).toHaveURL(/topic=Ch%E1%BB%8Dn\+size|topic=Ch%E1%BB%8Dn%20size/)
      await expect(page.getByRole(`link`, { name: /Chọn size áo khoác/ })).toBeVisible()
      await expect(page.getByRole(`link`, { name: /Vải dù hai lớp/ })).toHaveCount(0)
    })
  })
}

for (const colorScheme of [`light`, `dark`] as const) {
  for (const path of [`/bai-viet`, POST, `/nhan-tin`]) {
    test(`${path} passes axe-core in the ${colorScheme} theme`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme })
      try {
        const page = await context.newPage()
        await page.goto(path)

        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

        expect(results.violations.map((violation) => violation.id)).toEqual([])
      } finally {
        await context.close()
      }
    })
  }
}
