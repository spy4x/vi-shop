import { llmsTxt } from "@spy4x/platform/universal/seo"
import type { PublicCatalogItem } from "@domain/catalog"
import { REPOSITORY_URL, SITE_NAME } from "../brand.ts"
import { text } from "../shop/catalog.ts"
import { isSoldOut } from "../shop/parts.ts"
import { categoryPath, itemPath, type Lang, PATHS } from "../shop/lang.ts"
import { formatPrice, WORDS } from "../shop/words.ts"
import { storyPages } from "../shop/blog-pages.tsx"
import { define } from "../utils.ts"

/** One item as an assistant reads it: its price, the sizes left and the colours. */
function itemLine(item: PublicCatalogItem, lang: Lang): string {
  const words = WORDS[lang]
  const sizes = item.sizes.filter((size) => !isSoldOut(item, size, null)).map((s) => s.label)
  const colours = item.colours.map((colour) => text(colour.name, lang))
  return [
    formatPrice(item.price, lang),
    sizes.length > 0 ? words.factsSizes(sizes.join(`, `)).slice(0, -1) : ``,
    colours.length > 0 ? words.factsColours(colours.join(`, `)).slice(0, -1) : ``,
    item.stock === `sold-out` ? words.soldOut : ``,
  ].filter(Boolean).join(`; `)
}

/**
 * The shop for AI assistants (llmstxt.org): what it sells and how ordering works, then every
 * published item with its price, sizes and colours, in English and in Vietnamese, the blog's
 * posts (Vietnamese only, while one is live), the categories, the FAQ, and where the website's code
 * lives.
 */
export const handler = define.handlers({
  async GET(ctx) {
    const origin = ctx.state.webAppOrigin
    const { categories, items } = ctx.state.catalog ?? { categories: [], items: [] }
    const section = (lang: Lang, title: string) => ({
      title,
      links: items.map((item) => ({
        title: text(item.name, lang),
        url: `${origin}${itemPath(lang, item.categorySlug, item.slug)}`,
        description: itemLine(item, lang),
      })),
    })
    const posts = await storyPages(ctx.state.api)
    const body = llmsTxt({
      title: SITE_NAME,
      summary: `${WORDS.en.homeDescription} ${WORDS.en.factsOrder}`,
      sections: [
        ...(items.length > 0
          ? [section(`en`, `Items (English)`), section(`vi`, `Sản phẩm (Tiếng Việt)`)]
          : []),
        ...(posts.length > 0
          ? [{
            title: `Bài viết (Tiếng Việt)`,
            links: posts.map((page) => ({
              title: page.title,
              url: `${origin}${page.path}`,
              description: page.description,
            })),
          }]
          : []),
        {
          title: `Pages`,
          links: [
            ...categories.map((category) => ({
              title: text(category.name, `en`),
              url: `${origin}${categoryPath(`en`, category.slug)}`,
            })),
            {
              title: WORDS.en.faqTitle,
              url: `${origin}${PATHS.faq.en}`,
              description: WORDS.en.faqDescription,
            },
            {
              title: WORDS.vi.faqTitle,
              url: `${origin}${PATHS.faq.vi}`,
              description: WORDS.vi.faqDescription,
            },
          ],
        },
        {
          title: `Source code`,
          links: [{
            title: `${SITE_NAME} on GitHub`,
            url: REPOSITORY_URL,
            description: `The website's code, built on Seed.`,
          }],
        },
      ],
    })
    return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } })
  },
})
