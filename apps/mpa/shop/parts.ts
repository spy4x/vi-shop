import type { CatalogCombination, CatalogStock, PublicCatalogVariant } from "@domain/catalog"
import type { ResponsiveImageVariant } from "@spy4x/platform/universal/srcset"
import type { OrderLine } from "./order.ts"

/**
 * What both the server and the item page's island use: sold-out checks, sizes by label, photo
 * addresses, and the item as the island takes it. Only types come from the catalog's domain
 * library, so the island's script carries none of its validation.
 *
 * @module
 */

/** An item's colours and what is sold out, as `isSoldOut` reads them. */
export interface StockParts {
  colours: readonly { id: string }[]
  soldOut: readonly CatalogCombination[]
}

/** Whether `colour` (or, without one, every colour) has `size` sold out. */
export function isSoldOut(
  item: StockParts,
  size: { id: string } | null,
  colour: { id: string } | null,
): boolean {
  const sold = (colourId: string | null) =>
    item.soldOut.some((combo) => combo.colourId === colourId && combo.sizeId === (size?.id ?? null))
  if (colour) return sold(colour.id)
  if (item.colours.length === 0) return sold(null)
  return item.colours.every((each) => sold(each.id))
}

/** The size of `sizes` with `label`, matched without regard to case. */
export function sizeByLabel<T extends { label: string }>(
  item: { sizes: readonly T[] },
  label: string,
): T | undefined {
  const wanted = label.trim().toLowerCase()
  return item.sizes.find((size) => size.label.toLowerCase() === wanted)
}

/** Where the website serves one width of a photo: its own host, through `routes/anh`. */
export function photoUrl(photoId: string, file: string): string {
  return `/anh/${photoId}/${file}`
}

/** A photo's widths as `responsiveImage` takes them, AVIF first as the API lists them. */
export function photoVariants(
  photo: { id: string; variants: readonly PublicCatalogVariant[] },
  origin = ``,
): ResponsiveImageVariant[] {
  return photo.variants.map((variant) => ({
    url: `${origin}${photoUrl(photo.id, variant.file)}`,
    width: variant.width,
    height: variant.height,
    type: variant.type,
  }))
}

/** An item as the item page's island takes it: every text already in the page's language. */
export interface ItemModel extends StockParts {
  slug: string
  categorySlug: string
  name: string
  price: number
  stock: CatalogStock
  colours: { id: string; name: string; swatch: string }[]
  sizes: { id: string; label: string }[]
  photos: { id: string; colourId: string | null; alt: string; variants: PublicCatalogVariant[] }[]
}

/**
 * One piece of an order: the item's name, price and page, and the colour and size
 * picked (`null` when not picked; left out when the item has none to pick).
 */
export function orderLine(
  item:
    & { colours: readonly unknown[]; sizes: readonly unknown[] }
    & Pick<
      ItemModel,
      `name` | `price` | `slug` | `categorySlug`
    >,
  colour: string | null,
  size: string | null,
): OrderLine {
  return {
    name: item.name,
    price: item.price,
    item: item.slug,
    category: item.categorySlug,
    ...(item.colours.length > 0 ? { colour } : {}),
    ...(item.sizes.length > 0 ? { size } : {}),
  }
}
