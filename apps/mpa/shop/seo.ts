import { contactJsonLd } from "@spy4x/platform/universal/contact"
import {
  breadcrumbListJsonLd,
  type Crumb,
  itemListJsonLd,
  productJsonLd,
} from "@spy4x/platform/universal/seo"
import type { PublicContactLink } from "@domain/contact-links"
import type { PublicCatalogCategory, PublicCatalogItem } from "@domain/catalog"
import { SITE_NAME } from "../brand.ts"
import { photoAddresses, text } from "./catalog.ts"
import { isSoldOut } from "./parts.ts"
import { categoryPath, itemPath, type Lang, PATHS } from "./lang.ts"
import { SHOP_CURRENCY, WORDS } from "./words.ts"

/**
 * The shop's structured data (docs/shop/spec.md, "SEO and AEO"): the store, the site, the lists,
 * the breadcrumbs and each item as a product.
 *
 * @module
 */

/** The store's `@id`, which every product names as its seller. */
export function storeId(origin: string): string {
  return `${origin}/#organization`
}

/** The site as one node, in the page's language. */
export function websiteJsonLd(origin: string, lang: Lang): unknown {
  return {
    "@type": `WebSite`,
    "@id": `${origin}/#website`,
    url: `${origin}${PATHS.home[lang]}`,
    name: SITE_NAME,
    description: WORDS[lang].homeDescription,
    inLanguage: lang,
    publisher: { "@id": storeId(origin) },
  }
}

/**
 * The shop as a `ClothingStore`: its profiles as `sameAs`, its phone and Zalo numbers as contact
 * points, the first phone as `telephone`, from the contact links the admin panel keeps.
 */
export function storeJsonLd(
  origin: string,
  lang: Lang,
  links: readonly PublicContactLink[],
): unknown {
  return {
    "@type": `ClothingStore`,
    "@id": storeId(origin),
    name: SITE_NAME,
    url: `${origin}${PATHS.home[lang]}`,
    description: WORDS[lang].homeDescription,
    logo: `${origin}/favicon.svg`,
    currenciesAccepted: SHOP_CURRENCY,
    areaServed: { "@type": `City`, name: lang === `vi` ? `Đà Nẵng` : `Da Nang` },
    ...contactJsonLd(links),
  }
}

/** The `ItemList` of a list page: each item's page in the order the page shows them. */
export function looksJsonLd(
  origin: string,
  path: string,
  lang: Lang,
  items: readonly PublicCatalogItem[],
): unknown {
  return itemListJsonLd(
    `${origin}${path}`,
    items.map((item) => `${origin}${itemPath(lang, item.categorySlug, item.slug)}`),
  )
}

/** The breadcrumb trail of a page under the home page: the shop, then `crumbs`. */
export function crumbsJsonLd(origin: string, path: string, lang: Lang, crumbs: Crumb[]): unknown {
  return breadcrumbListJsonLd(`${origin}${path}`, [
    { name: SITE_NAME, href: `${origin}${PATHS.home[lang]}` },
    ...crumbs,
  ])
}

/**
 * The item as Google reads a product page: a `ProductGroup` with one `Product` per colour and
 * size, each with its own address (`?color=<id>&size=<label>`) and whether it is in stock, or a
 * plain `Product` for an item with neither colours nor sizes. `null` for an item with no photo
 * yet, since Google refuses a product without an image.
 */
export function itemJsonLd(
  origin: string,
  lang: Lang,
  item: PublicCatalogItem,
  category: PublicCatalogCategory,
): unknown | null {
  if (item.photos.length === 0) return null
  const url = `${origin}${itemPath(lang, item.categorySlug, item.slug)}`
  const name = text(item.name, lang)
  const colours = item.colours.length > 0 ? item.colours : [null]
  const sizes = item.sizes.length > 0 ? item.sizes : [null]
  const variants = item.colours.length === 0 && item.sizes.length === 0 ? [] : colours.flatMap(
    (colour) =>
      sizes.map((size) => {
        const query = new URLSearchParams()
        if (colour) query.set(`color`, colour.id)
        if (size) query.set(`size`, size.label)
        const photos = colour ? item.photos.filter((photo) => photo.colourId === colour.id) : []
        return {
          sku: [item.slug, colour?.id.slice(-12), size?.label].filter(Boolean).join(`-`),
          url: `${url}?${query}`,
          ...(colour ? { color: text(colour.name, lang) } : {}),
          ...(size ? { size: size.label } : {}),
          ...(photos.length > 0 ? { images: photoAddresses(photos, origin) } : {}),
          inStock: !isSoldOut(item, size, colour),
        }
      }),
  )
  const description = text(item.description, lang)
  const material = text(item.material, lang)
  return {
    ...productJsonLd({
      url,
      name,
      description: description || undefined,
      images: photoAddresses(item.photos, origin),
      sku: item.slug,
      brand: SITE_NAME,
      category: text(category.name, lang),
      price: item.price,
      currency: SHOP_CURRENCY,
      inStock: item.stock !== `sold-out`,
      seller: { id: storeId(origin) },
      variants,
    }),
    ...(material ? { material } : {}),
  }
}

/** The address of a category's page, for crumbs. */
export function categoryHref(origin: string, lang: Lang, slug: string): string {
  return `${origin}${categoryPath(lang, slug)}`
}
