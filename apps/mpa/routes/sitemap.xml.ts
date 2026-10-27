import { sitemapXml } from "@spy4x/platform/universal/seo"
import { SITE_PAGES } from "../pages.ts"
import { define } from "../utils.ts"

/**
 * Lists the website's public pages, each at its address on this website's own origin, with the
 * day it last changed where the page states one.
 */
export const handler = define.handlers({
  GET(ctx) {
    const origin = ctx.state.webAppOrigin
    const body = sitemapXml(
      SITE_PAGES.map(({ path, updated }) => ({
        url: `${origin}${path}`,
        lastmod: updated === undefined ? undefined : new Date(`${updated}T00:00:00Z`),
      })),
    )
    return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } })
  },
})
