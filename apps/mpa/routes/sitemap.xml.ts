import { type SitemapEntry, sitemapXml } from "@spy4x/platform/universal/seo"
import type { PublicCatalogItem } from "@domain/catalog"
import { SITE_PAGES } from "../pages.ts"
import { photoAddresses } from "../shop/catalog.ts"
import { categoryPath, itemPath, LANGS, PATHS } from "../shop/lang.ts"
import { define } from "../utils.ts"

/** The latest change among `items`, or nothing for none. */
function latest(items: readonly PublicCatalogItem[]): Date | undefined {
  const newest = items.map((item) => item.updatedAt).toSorted().at(-1)
  return newest === undefined ? undefined : new Date(newest)
}

/**
 * Lists the website's public pages on its own origin, in both languages: the home page, each
 * category, each published item with its photos, and the FAQ, then the legal pages, which are in
 * Vietnamese only. A list page's date is its newest item's; an item's is its own. The order list
 * and the order pages are left out: they are the shopper's own.
 */
export const handler = define.handlers({
  GET(ctx) {
    const origin = ctx.state.webAppOrigin
    const { categories, items } = ctx.state.catalog ?? { categories: [], items: [] }
    const entries: SitemapEntry[] = LANGS.flatMap((lang) => [
      { url: `${origin}${PATHS.home[lang]}`, lastmod: latest(items) },
      ...categories.map((category) => ({
        url: `${origin}${categoryPath(lang, category.slug)}`,
        lastmod: latest(items.filter((item) => item.categorySlug === category.slug)),
      })),
      ...items.map((item) => ({
        url: `${origin}${itemPath(lang, item.categorySlug, item.slug)}`,
        lastmod: new Date(item.updatedAt),
        images: photoAddresses(item.photos, origin),
      })),
      { url: `${origin}${PATHS.faq[lang]}` },
    ])
    for (const { path, updated } of SITE_PAGES.filter(({ path }) => path !== `/`)) {
      entries.push({
        url: `${origin}${path}`,
        lastmod: updated === undefined ? undefined : new Date(`${updated}T00:00:00Z`),
      })
    }
    return new Response(sitemapXml(entries), {
      headers: { "content-type": "application/xml; charset=utf-8" },
    })
  },
})
