import { getCookies, setCookie } from "@std/http/cookie"
import type { PublicCatalogItem } from "@domain/catalog"
import type { OrderPiece } from "./catalog.ts"
import { sizeByLabel } from "./parts.ts"

/**
 * What the website remembers for a shopper, in cookies only, with no account: the size they
 * filter by and their height and weight for the visit, and their order list for a month. Every
 * cookie is `HttpOnly` and `SameSite=Lax`, since only the server reads them, and the pages work
 * the same without them.
 *
 * @module
 */

/** The cookies' names. */
export const COOKIES = { size: `size`, fit: `fit`, list: `list` } as const

/** How long the order list is kept: thirty days. */
export const LIST_MAX_AGE_S = 30 * 86_400

/** The most pieces an order list holds, so its cookie stays far below a browser's 4 KB. */
export const LIST_MAX_LINES = 12

/** The cookie values of `request`. */
export function cookiesOf(request: Request): Partial<Record<string, string>> {
  return getCookies(request.headers)
}

/**
 * Sets cookie `name` to `value` on `headers`, for the whole site; `""` removes it. Without
 * `maxAge` it lasts the visit, until the browser closes. `Secure` on an `https:` website.
 */
export function rememberCookie(
  headers: Headers,
  origin: string,
  name: string,
  value: string,
  maxAge?: number,
): void {
  setCookie(headers, {
    name,
    value: encodeURIComponent(value),
    path: `/`,
    httpOnly: true,
    sameSite: `Lax`,
    secure: origin.startsWith(`https:`),
    ...(value === `` ? { maxAge: 0 } : maxAge === undefined ? {} : { maxAge }),
  })
}

/** A cookie's value, decoded; `""` when it is missing or not encoded as {@link rememberCookie} writes. */
export function cookieValue(cookies: Partial<Record<string, string>>, name: string): string {
  try {
    return decodeURIComponent(cookies[name] ?? ``)
  } catch {
    return ``
  }
}

/** A whole number of centimetres or kilograms a size chart takes, or `null`. */
export function measure(value: string | null | undefined, top: number): number | null {
  if (!value || !/^\d{1,3}$/.test(value.trim())) return null
  const number = Number(value.trim())
  return number >= 1 && number <= top ? number : null
}

/** One piece of the order list as its cookie keeps it: the item's slug, colour id, size id. */
export interface ListEntry {
  item: string
  colour: string | null
  size: string | null
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** One entry as text: `slug.colourId.sizeId`, `-` where the piece has no colour or size. */
function entryText(entry: ListEntry): string {
  return `${entry.item}.${entry.colour ?? `-`}.${entry.size ?? `-`}`
}

/** The order list in a cookie's value; anything that is not an entry is left out. */
export function readList(value: string): ListEntry[] {
  const entries: ListEntry[] = []
  for (const part of value.split(`~`)) {
    const [item, colour, size, extra] = part.split(`.`)
    const id = (value?: string) =>
      value === `-` ? null : value !== undefined && ID.test(value) ? value : undefined
    const colourId = id(colour)
    const sizeId = id(size)
    if (
      extra !== undefined || !SLUG.test(item ?? ``) || colourId === undefined ||
      sizeId === undefined
    ) {
      continue
    }
    entries.push({ item, colour: colourId, size: sizeId })
  }
  return entries.slice(0, LIST_MAX_LINES)
}

/** The order list as a cookie's value. */
export function writeList(entries: readonly ListEntry[]): string {
  return entries.slice(0, LIST_MAX_LINES).map(entryText).join(`~`)
}

/** The list with `entry` added at the end, unless the same piece is on it already. */
export function addToList(entries: readonly ListEntry[], entry: ListEntry): ListEntry[] {
  const key = entryText(entry)
  if (entries.some((each) => entryText(each) === key)) return [...entries]
  return [...entries, entry].slice(-LIST_MAX_LINES)
}

/** The list without the piece at `index`. */
export function removeFromList(entries: readonly ListEntry[], index: number): ListEntry[] {
  return entries.filter((_, at) => at !== index)
}

/**
 * The list's entries as pieces of the catalog, with their place in the list: an entry whose item
 * is no longer published, or whose colour or size the item no longer has, is left out.
 */
export function listLines(
  entries: readonly ListEntry[],
  items: readonly PublicCatalogItem[],
): { entry: ListEntry; index: number; piece: OrderPiece }[] {
  return entries.flatMap((entry, index) => {
    const item = items.find((each) => each.slug === entry.item)
    if (!item) return []
    const colour = entry.colour === null ? null : item.colours.find((c) => c.id === entry.colour)
    const size = entry.size === null ? null : item.sizes.find((s) => s.id === entry.size)
    if (colour === undefined || size === undefined) return []
    return [{ entry, index, piece: { item, colour, size } }]
  })
}

/** The piece a form names: an item by slug, its colour by id, its size by label. */
export function pickedPiece(
  items: readonly PublicCatalogItem[],
  form: { item?: string | null; color?: string | null; size?: string | null },
): OrderPiece | null {
  const item = items.find((each) => each.slug === form.item)
  if (!item) return null
  return {
    item,
    colour: item.colours.find((colour) => colour.id === form.color) ?? null,
    size: form.size ? sizeByLabel(item, form.size) ?? null : null,
  }
}
