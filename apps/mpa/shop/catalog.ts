import {
  type CatalogColour,
  type CatalogSize,
  catalogText,
  type PublicCatalogCategory,
  type PublicCatalogItem,
  type PublicCatalogPhoto,
  type PublicCatalogResponse,
} from "@domain/catalog"
import { isRecord } from "@spy4x/platform/universal/is-record"
import type { Lang } from "./lang.ts"
import { type ItemModel, orderLine, photoUrl } from "./parts.ts"
import type { OrderLine } from "./order.ts"

/**
 * The catalog as the website shows it: Seed's public catalog API (`/api/catalog`, Seed
 * docs/catalog.md) read into one snapshot, every published item with its colours, sizes, sold-out
 * combinations and photos, so a list page can filter by size and draw each item's sizes without a
 * call per item.
 *
 * @module
 */

/** Every published item, in the API's order (by category, newest first), and its categories. */
export interface ShopCatalog {
  categories: PublicCatalogCategory[]
  items: PublicCatalogItem[]
}

/** The catalog before the API has answered: nothing to show. */
export const EMPTY_CATALOG: ShopCatalog = { categories: [], items: [] }

/** How long a snapshot is used before the API is asked again: the contact links' minute. */
export const CATALOG_TTL_MS = 60_000

/** How long one API call may take. */
export const CATALOG_TIMEOUT_MS = 5_000

/** How many item pages the snapshot asks the API for at once. */
const ITEM_CALLS_AT_ONCE = 8

/** A snapshot kept from the API, refreshed in the background at most once a ttl. */
export interface CatalogSource {
  /** The last snapshot, at once; one older than the ttl starts a refresh in the background. */
  current(): ShopCatalog
  /** Asks the API now and resolves when the snapshot is in. The website does this once at start. */
  refresh(): Promise<void>
}

/** Where the snapshot comes from, and its clock. */
export interface CatalogSourceOptions {
  apiUrl: string
  fetch?: typeof globalThis.fetch
  now?: () => number
  ttlMs?: number
  timeoutMs?: number
}

/**
 * Reads the catalog from the API at most once a ttl. The list comes first, then each item's own
 * page, a few at a time. When any call fails, or an answer is not the shape the API writes, the
 * last snapshot stands, so one bad minute never empties the shop.
 */
export function createCatalogSource(
  {
    apiUrl,
    fetch = globalThis.fetch,
    now = Date.now,
    ttlMs = CATALOG_TTL_MS,
    timeoutMs = CATALOG_TIMEOUT_MS,
  }: CatalogSourceOptions,
): CatalogSource {
  let snapshot = EMPTY_CATALOG
  let askedAt = -Infinity
  let pending: Promise<void> | null = null

  const get = async (path: string): Promise<unknown> => {
    const response = await fetch(new URL(path, apiUrl), { signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) throw new Error(`${path} answered ${response.status}`)
    return await response.json()
  }

  const ask = async () => {
    try {
      const list = await get(`/api/catalog`) as PublicCatalogResponse
      if (!isRecord(list) || !Array.isArray(list.items) || !Array.isArray(list.categories)) return
      const items: PublicCatalogItem[] = []
      for (let start = 0; start < list.items.length; start += ITEM_CALLS_AT_ONCE) {
        const batch = list.items.slice(start, start + ITEM_CALLS_AT_ONCE)
        const answers = await Promise.all(
          batch.map((summary) => get(`/api/catalog/items/${encodeURIComponent(summary.slug)}`)),
        )
        for (const answer of answers) {
          const item = isRecord(answer) ? answer.item : undefined
          if (!isRecord(item) || !Array.isArray(item.sizes) || !Array.isArray(item.photos)) return
          items.push(item as unknown as PublicCatalogItem)
        }
      }
      snapshot = { categories: list.categories, items }
    } catch {
      // The last snapshot stands.
    } finally {
      askedAt = now()
    }
  }

  const refresh = () => {
    pending ??= ask().finally(() => {
      pending = null
    })
    return pending
  }

  return {
    current() {
      if (now() - askedAt >= ttlMs) void refresh()
      return snapshot
    },
    refresh,
  }
}

/** An item's text in `lang`, else in Vietnamese. */
export function text(value: Record<string, string>, lang: Lang): string {
  return catalogText(value, [`vi`, `en`], lang)
}

/** The size labels of `items`, each once, in the order the items list them. */
export function sizeLabels(items: readonly PublicCatalogItem[]): string[] {
  const labels: string[] = []
  for (const item of items) {
    for (const size of item.sizes) {
      if (!labels.some((label) => label.toLowerCase() === size.label.toLowerCase())) {
        labels.push(size.label)
      }
    }
  }
  return labels
}

/** A colour's key in a filter's address: its Vietnamese name, lower case, without diacritics. */
export function colourKey(colour: Pick<CatalogColour, `name`>): string {
  return text(colour.name, `vi`).normalize(`NFD`).replace(/\p{Diacritic}/gu, ``)
    .replaceAll(`đ`, `d`).replaceAll(`Đ`, `d`).toLowerCase().trim().replace(/[^a-z0-9]+/g, `-`)
}

/** The widest variant's full address of each photo, for structured data and the sitemap. */
export function photoAddresses(photos: readonly PublicCatalogPhoto[], origin: string): string[] {
  return photos.flatMap((photo) => {
    const widest = photo.variants.filter((variant) => variant.type === `image/webp`)
      .toSorted((a, b) => b.width - a.width)[0] ?? photo.variants.at(-1)
    return widest ? [`${origin}${photoUrl(photo.id, widest.file)}`] : []
  })
}

/** The item as the item page's island takes it, in `lang`. */
export function itemModel(item: PublicCatalogItem, lang: Lang): ItemModel {
  return {
    slug: item.slug,
    categorySlug: item.categorySlug,
    name: text(item.name, lang),
    price: item.price,
    stock: item.stock,
    colours: item.colours.map(({ id, name, swatch }) => ({ id, name: text(name, lang), swatch })),
    sizes: item.sizes.map(({ id, label }) => ({ id, label })),
    soldOut: item.soldOut,
    photos: item.photos.map(({ id, colourId, alt, variants }) => ({
      id,
      colourId,
      alt: text(alt, lang),
      variants,
    })),
  }
}

/** A piece of an order as the catalog holds it: the item, and the colour and size picked. */
export interface OrderPiece {
  item: PublicCatalogItem
  colour: CatalogColour | null
  size: CatalogSize | null
}

/** The piece as a line of the order message, in `lang`. */
export function pieceLine({ item, colour, size }: OrderPiece, lang: Lang): OrderLine {
  return orderLine(
    { ...item, name: text(item.name, lang) },
    colour ? text(colour.name, lang) : null,
    size?.label ?? null,
  )
}
