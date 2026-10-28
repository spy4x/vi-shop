import { SITE_LANG, SITE_NAME, SiteFrame, type SitePageHead } from "../site.tsx"
import { define } from "../utils.ts"
import { organizationJsonLd } from "../contact-links.ts"

/**
 * The home page's title and description, as search results, social previews and `llms.txt` show
 * them.
 */
export const HOME_HEAD = {
  title: `${SITE_NAME}: quần áo, sắp ra mắt`,
  description: `${SITE_NAME} là một cửa hàng quần áo nhỏ. Danh mục sắp ra mắt: xem từng mẫu, ` +
    `chọn màu và size, rồi đặt hàng qua Telegram hoặc Zalo.`,
} as const satisfies SitePageHead

/** The site as one JSON-LD entity, which every other page's `isPartOf` points at. */
function websiteJsonLd(origin: string): unknown {
  return {
    "@type": `WebSite`,
    "@id": `${origin}/#website`,
    url: `${origin}/`,
    name: SITE_NAME,
    description: HOME_HEAD.description,
    inLanguage: SITE_LANG,
  }
}

/**
 * The placeholder home page until the storefront lands: what the shop is and how ordering will
 * work, in Vietnamese, with one line in English for visitors who do not read it.
 */
export default define.page(function Home({ state }) {
  return (
    <SiteFrame
      state={state}
      path="/"
      head={{
        ...HOME_HEAD,
        jsonLd: [
          websiteJsonLd(state.webAppOrigin),
          organizationJsonLd(state.webAppOrigin, state.contactLinks ?? []),
        ].filter((node) => node !== null),
      }}
    >
      <section
        aria-labelledby="home-title"
        class="site-glow flex min-h-[60vh] items-center"
        data-e2e="home-placeholder"
      >
        <div class="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 px-4 py-16 sm:px-6">
          <p class="font-mono text-sm text-muted">Sắp ra mắt</p>
          <h1 id="home-title" class="text-4xl font-semibold tracking-tight text-balance">
            {SITE_NAME} đang chuẩn bị mở cửa
          </h1>
          <p class="text-lg text-muted text-pretty">
            Chúng tôi đang chụp ảnh và chuẩn bị danh mục quần áo. Sắp tới, bạn có thể xem từng mẫu,
            chọn màu và size, rồi đặt hàng qua Telegram hoặc Zalo, không cần tạo tài khoản.
          </p>
          <p lang="en" class="text-muted text-pretty" data-e2e="home-english">
            {SITE_NAME}{" "}
            is a small clothes shop. The catalog opens soon, and you will order through Telegram or
            Zalo.
          </p>
        </div>
      </section>
    </SiteFrame>
  )
})
