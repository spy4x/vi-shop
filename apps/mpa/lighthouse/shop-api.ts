import { Hono } from "hono"
import { createPublicCatalogRoute } from "../../api/routes/catalog.ts"
import {
  SAMPLE_CATEGORIES,
  SAMPLE_CONTACT_LINKS,
  SAMPLE_ITEMS,
  sampleSummaries,
} from "./sample-shop.ts"

/**
 * The shop's public API for the Lighthouse run (run.sh) and local screenshots, on the port given
 * as the first argument: the sample shop (sample-shop.ts) through the API's own public catalog
 * routes, with its placeholder photos, and the sample contact links, so every shop page is
 * measured with content and without a database. Every other API address answers 404, which the
 * website reads as "no answer".
 */
const PHOTOS = new URL(`./photos/`, import.meta.url)

const catalog = createPublicCatalogRoute({
  catalog: () =>
    Promise.resolve({
      settings: { currency: `VND`, languages: [`vi`, `en`] },
      categories: SAMPLE_CATEGORIES,
      items: sampleSummaries(),
    }),
  item: (slug) => Promise.resolve(SAMPLE_ITEMS.find((item) => item.slug === slug) ?? null),
  async photo(id, file) {
    try {
      const bytes = await Deno.readFile(new URL(`${id}/${file}`, PHOTOS))
      return { bytes, contentType: `image/webp` }
    } catch {
      return null
    }
  },
  // The sample shop has no tracking links.
  link: () => Promise.resolve(null),
})

Deno.serve(
  { port: Number(Deno.args[0]), hostname: `127.0.0.1` },
  new Hono()
    .route(`/api/catalog`, catalog)
    .get(`/api/contact-links`, (c) => c.json({ links: SAMPLE_CONTACT_LINKS }))
    .fetch,
)
