import { Hono } from "hono"
import { createPublicCatalogRoute } from "../../api/routes/catalog.ts"
import {
  SAMPLE_CATEGORIES,
  SAMPLE_CONTACT_LINKS,
  SAMPLE_ITEMS,
  sampleSummaries,
} from "./sample-shop.ts"
import { postFeedItem, postSummary, SAMPLE_POSTS } from "./sample-blog.ts"

/**
 * The shop's public API for the Lighthouse run (run.sh) and local screenshots, on the port given
 * as the first argument: the sample shop (sample-shop.ts) through the API's own public catalog
 * routes, with its placeholder photos, the sample contact links, and the sample blog
 * (sample-blog.ts) as the API's public blog routes answer it, so every shop page is measured with
 * content and without a database. The newsletter is on: a sign-up with an address that has an `@`
 * is taken (202), any other is refused (400), as the API's own check would. Every other API
 * address answers 404, which the website reads as "no answer".
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
    .get(`/api/blog/posts`, (c) => c.json({ posts: SAMPLE_POSTS.map(postSummary) }))
    .get(`/api/blog/posts/:slug`, (c) => {
      const post = SAMPLE_POSTS.find((each) => each.slug === c.req.param(`slug`))
      if (!post) return c.json({ error: { code: `not_found`, message: `Not found` } }, 404)
      const readNext = SAMPLE_POSTS.filter((each) => each !== post).map(postSummary)
      return c.json({ post, readNext })
    })
    .get(`/api/blog/feed`, (c) => c.json({ posts: SAMPLE_POSTS.map(postFeedItem) }))
    .get(`/api/subscribers`, (c) => c.json({ enabled: true }))
    .post(`/api/subscribers`, async (c) => {
      const { email } = await c.req.json<{ email?: string }>()
      return email?.includes(`@`)
        ? c.json({}, 202)
        : c.json({ error: { code: `bad_request`, message: `Invalid address` } }, 400)
    })
    .fetch,
)
