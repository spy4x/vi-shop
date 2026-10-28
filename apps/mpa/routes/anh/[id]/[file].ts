import { HttpError } from "fresh"
import { isUuid } from "@spy4x/platform/universal/uuid"
import { define } from "../../../utils.ts"

/** A width's file name, such as `960.webp`, as the catalog API names them. */
const VARIANT_FILE = /^[1-9][0-9]{0,4}\.(avif|webp)$/

/** The headers of the API's answer that pass on to the browser. */
const PASSED = [`content-type`, `cache-control`, `content-length`, `etag`, `last-modified`]

/**
 * One width of a published item's photo (`/anh/<photo id>/960.webp`), from Seed's public catalog
 * API, served from the website's own host: the API has no address on it, and the pages' content
 * security policy loads images from this origin. An address that is no photo width answers 404
 * without asking the API.
 */
export const handler = define.handlers({
  async GET(ctx) {
    const { id, file } = ctx.params
    if (!isUuid(id) || !VARIANT_FILE.test(file)) throw new HttpError(404)
    const answer = await ctx.state.catalogPhoto?.(id.toLowerCase(), file).catch(() => null)
    if (!answer) throw new HttpError(502)
    if (!answer.ok) {
      await answer.body?.cancel()
      throw new HttpError(answer.status === 404 ? 404 : 502)
    }
    const headers = new Headers({ "x-content-type-options": `nosniff` })
    for (const name of PASSED) {
      const value = answer.headers.get(name)
      if (value !== null) headers.set(name, value)
    }
    return new Response(answer.body, { headers })
  },
})
