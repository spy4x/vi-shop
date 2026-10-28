import type { MpaConfig } from "../config.ts"
import { define } from "../utils.ts"
import { type CatalogSource, createCatalogSource } from "./catalog.ts"
import { langOf } from "./lang.ts"
import { COOKIES, cookiesOf, cookieValue, listLines, readList } from "./visit.ts"

/** How long the API may take to answer one photo. */
const PHOTO_TIMEOUT_MS = 10_000

/**
 * Hands every page the shop's catalog snapshot, the page's language from its path, how many pieces
 * the shopper's order list holds, and the API's catalog photos. The catalog is asked once before the first page, then
 * at most once a minute in the background, as the contact links are.
 */
export function shopStateMiddleware(
  source: CatalogSource,
  catalogPhoto: (id: string, file: string) => Promise<Response>,
) {
  return define.middleware((ctx) => {
    const catalog = source.current()
    ctx.state.catalog = catalog
    ctx.state.catalogPhoto = catalogPhoto
    ctx.state.lang = langOf(ctx.url.pathname)
    const list = readList(cookieValue(cookiesOf(ctx.req), COOKIES.list))
    ctx.state.listCount = listLines(list, catalog.items).length
    return ctx.next()
  })
}

/** {@link shopStateMiddleware} on the API's catalog, read once before it is returned. */
export async function shopMiddleware(
  config: Pick<MpaConfig, `apiUrl`>,
  fetch: typeof globalThis.fetch = globalThis.fetch,
) {
  const source = createCatalogSource({ apiUrl: config.apiUrl, fetch })
  await source.refresh()
  return shopStateMiddleware(
    source,
    (id, file) =>
      fetch(new URL(`/api/catalog/photos/${id}/${file}`, config.apiUrl), {
        signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS),
      }),
  )
}
