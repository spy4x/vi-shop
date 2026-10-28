import {
  type CatalogColour,
  type CatalogCombination,
  type CatalogSize,
  catalogStock,
  type PublicCatalogCategory,
  type PublicCatalogItem,
  type PublicCatalogItemSummary,
  type PublicCatalogPhoto,
} from "@domain/catalog"
import type { PublicContactLink } from "@domain/contact-links"

/**
 * A small sample of the shop for the Lighthouse run, the page tests and local screenshots: four
 * categories and six items in Vietnamese and English, with colours, sizes with height and weight
 * ranges, a sold-out size, a sold-out item and an item in one free size. The photos are generated
 * placeholders in each colour (`photos/`, made by `photos/make.sh`), never the owner's photos.
 *
 * @module
 */

/** Sample id number `n` of kind `kind`: a fixed UUID v7, so every run reads the same ids. */
function id(kind: number, n: number): string {
  return `019a3000-0000-7000-8000-${String(kind).padStart(4, `0`)}${String(n).padStart(8, `0`)}`
}

export const SAMPLE_CATEGORIES: PublicCatalogCategory[] = [
  { slug: `ao-khoac`, name: { vi: `Áo khoác`, en: `Jackets` } },
  { slug: `ao`, name: { vi: `Áo`, en: `Tops` } },
  { slug: `quan`, name: { vi: `Quần`, en: `Bottoms` } },
  { slug: `bo-do`, name: { vi: `Bộ đồ`, en: `Sets` } },
]

/** Sizes S to XL, with the heights (cm) and weights (kg) each fits. */
const CHART = [
  { label: `S`, heightCm: { min: 150, max: 160 }, weightKg: { min: 40, max: 50 } },
  { label: `M`, heightCm: { min: 161, max: 168 }, weightKg: { min: 51, max: 60 } },
  { label: `L`, heightCm: { min: 169, max: 176 }, weightKg: { min: 61, max: 72 } },
  { label: `XL`, heightCm: { min: 177, max: 188 }, weightKg: { min: 73, max: 88 } },
] as const

function sizes(item: number, count: number): CatalogSize[] {
  return CHART.slice(0, count).map((size, n) => ({
    id: id(20 + item, n + 1),
    label: size.label,
    heightCm: { ...size.heightCm },
    weightKg: { ...size.weightKg },
  }))
}

/** The widths every placeholder photo is stored at. */
const WIDTHS = [480, 960] as const

function photo(n: number, colourId: string | null, alt: { vi: string; en: string }) {
  return {
    id: id(30, n),
    colourId,
    alt,
    variants: WIDTHS.map((width) => ({
      file: `${width}.webp`,
      width,
      height: (width * 4) / 3,
      type: `image/webp`,
    })),
  } satisfies PublicCatalogPhoto
}

interface SampleInput {
  slug: string
  categorySlug: string
  name: { vi: string; en: string }
  price: number
  days: number
  description: { vi: string; en: string }
  material: { vi: string; en: string }
  fit: { vi: string; en: string }
  care: { vi: string; en: string }
  colours: CatalogColour[]
  sizes: CatalogSize[]
  soldOut: CatalogCombination[]
  photos: PublicCatalogPhoto[]
}

/** A sample item, published `days` days before 2026-10-28. */
function item(input: SampleInput): PublicCatalogItem {
  const { days, ...rest } = input
  const published = new Date(Date.UTC(2026, 9, 28) - days * 86_400_000).toISOString()
  return {
    ...rest,
    stock: catalogStock(input),
    cover: input.photos[0] ?? null,
    publishedAt: published,
    updatedAt: published,
  }
}

const CARE = {
  vi: `Giặt máy nước lạnh, lộn trái. Không sấy nóng.`,
  en: `Machine wash cold, inside out. No tumble dry.`,
}

const BROWN = { id: id(10, 1), name: { vi: `Nâu`, en: `Brown` }, swatch: `#7a5230` }
const GREY = { id: id(10, 2), name: { vi: `Xám`, en: `Grey` }, swatch: `#6b6f76` }
const BLACK = { id: id(10, 3), name: { vi: `Đen`, en: `Black` }, swatch: `#1f2023` }
const WHITE = { id: id(10, 4), name: { vi: `Trắng`, en: `White` }, swatch: `#f2f0eb` }
const NAVY = { id: id(10, 5), name: { vi: `Xanh than`, en: `Navy` }, swatch: `#23324a` }
const RED = { id: id(10, 6), name: { vi: `Đỏ`, en: `Red` }, swatch: `#a1302b` }
const MOSS = { id: id(10, 7), name: { vi: `Xanh rêu`, en: `Moss` }, swatch: `#4b5a3a` }
const SAND = { id: id(10, 8), name: { vi: `Be`, en: `Sand` }, swatch: `#d9c7a7` }

const JACKET_SIZES = sizes(1, 3)
const SHORTS_SIZES = sizes(3, 3)
const MOSS_SIZES = sizes(5, 3)

/** The sample items, newest first. */
export const SAMPLE_ITEMS: PublicCatalogItem[] = [
  item({
    slug: `ao-khoac-zip-nau`,
    categorySlug: `ao-khoac`,
    name: { vi: `Áo khoác zip`, en: `Zip jacket` },
    price: 590_000,
    days: 1,
    description: {
      vi:
        `Áo khoác nhẹ có khoá kéo, mặc khi chạy sáng sớm hay đi làm. Đường may phủ kín, không cọ ` +
        `vào da.`,
      en: `A light zip jacket for early runs or the commute. Covered seams that never rub.`,
    },
    material: { vi: `Vải dù 2 lớp, chống gió`, en: `Two-layer windproof nylon` },
    fit: { vi: `Form vừa, mặc size quen thuộc`, en: `Regular fit; take your usual size` },
    care: CARE,
    colours: [BROWN, GREY],
    sizes: JACKET_SIZES,
    soldOut: [
      { colourId: BROWN.id, sizeId: JACKET_SIZES[2].id },
      { colourId: GREY.id, sizeId: JACKET_SIZES[2].id },
    ],
    photos: [
      photo(1, BROWN.id, { vi: `Áo khoác zip màu nâu`, en: `The zip jacket in brown` }),
      photo(2, GREY.id, { vi: `Áo khoác zip màu xám`, en: `The zip jacket in grey` }),
    ],
  }),
  item({
    slug: `ao-thun-tap`,
    categorySlug: `ao`,
    name: { vi: `Áo thun tập`, en: `Training tee` },
    price: 290_000,
    days: 2,
    description: {
      vi: `Áo thun mỏng, khô nhanh, cho buổi tập nóng ở Đà Nẵng.`,
      en: `A thin, quick-drying tee for hot training days in Da Nang.`,
    },
    material: { vi: `Sợi poly tái chế, thoáng khí`, en: `Breathable recycled polyester` },
    fit: { vi: `Form ôm nhẹ`, en: `Slim fit` },
    care: CARE,
    colours: [BLACK, WHITE],
    sizes: sizes(2, 4),
    soldOut: [],
    photos: [
      photo(3, BLACK.id, { vi: `Áo thun tập màu đen`, en: `The training tee in black` }),
      photo(4, WHITE.id, { vi: `Áo thun tập màu trắng`, en: `The training tee in white` }),
    ],
  }),
  item({
    slug: `quan-short-chay-bo`,
    categorySlug: `quan`,
    name: { vi: `Quần short chạy bộ`, en: `Running shorts` },
    price: 250_000,
    days: 3,
    description: {
      vi: `Quần short có lót trong và túi giữ điện thoại.`,
      en: `Lined running shorts with a phone pocket.`,
    },
    material: { vi: `Vải dệt co giãn 4 chiều`, en: `Four-way stretch weave` },
    fit: { vi: `Dài trên gối`, en: `Above the knee` },
    care: CARE,
    colours: [NAVY],
    sizes: SHORTS_SIZES,
    soldOut: [{ colourId: NAVY.id, sizeId: SHORTS_SIZES[2].id }],
    photos: [photo(5, NAVY.id, { vi: `Quần short xanh than`, en: `The navy running shorts` })],
  }),
  item({
    slug: `bo-do-tap-do`,
    categorySlug: `bo-do`,
    name: { vi: `Bộ đồ tập đỏ`, en: `Red training set` },
    price: 390_000,
    days: 4,
    description: {
      vi: `Áo bra và quần legging cùng màu, bán theo bộ.`,
      en: `A sports bra and leggings in one colour, sold as a set.`,
    },
    material: { vi: `Thun lạnh dày, không lộ`, en: `Dense, squat-proof jersey` },
    fit: { vi: `Ôm sát`, en: `Compression fit` },
    care: CARE,
    colours: [RED],
    sizes: sizes(4, 3),
    soldOut: [],
    photos: [photo(6, RED.id, { vi: `Bộ đồ tập màu đỏ`, en: `The red training set` })],
  }),
  item({
    slug: `bo-do-tap-xanh-reu`,
    categorySlug: `bo-do`,
    name: { vi: `Bộ đồ tập xanh rêu`, en: `Moss training set` },
    price: 390_000,
    days: 5,
    description: {
      vi: `Bộ đồ tập màu xanh rêu, cùng form với bộ đỏ.`,
      en: `The training set in moss, cut like the red one.`,
    },
    material: { vi: `Thun lạnh dày, không lộ`, en: `Dense, squat-proof jersey` },
    fit: { vi: `Ôm sát`, en: `Compression fit` },
    care: CARE,
    colours: [MOSS],
    sizes: MOSS_SIZES,
    soldOut: MOSS_SIZES.map((size) => ({ colourId: MOSS.id, sizeId: size.id })),
    photos: [photo(7, MOSS.id, { vi: `Bộ đồ tập xanh rêu`, en: `The moss training set` })],
  }),
  item({
    slug: `ao-ba-lo-free-size`,
    categorySlug: `ao`,
    name: { vi: `Áo ba lỗ`, en: `Tank top` },
    price: 220_000,
    days: 6,
    description: {
      vi: `Áo ba lỗ rộng, một size cho mọi dáng.`,
      en: `A loose tank top in one size for every build.`,
    },
    material: { vi: `Cotton 100%`, en: `100% cotton` },
    fit: { vi: `Form rộng`, en: `Relaxed fit` },
    care: CARE,
    colours: [SAND],
    sizes: [{ id: id(26, 1), label: `Free size`, heightCm: null, weightKg: null }],
    soldOut: [],
    photos: [photo(8, SAND.id, { vi: `Áo ba lỗ màu be`, en: `The tank top in sand` })],
  }),
]

/** The list the catalog API answers: each item without its page's fields. */
export function sampleSummaries(): PublicCatalogItemSummary[] {
  return SAMPLE_ITEMS.map((
    { slug, categorySlug, name, price, stock, cover, publishedAt, updatedAt },
  ) => ({ slug, categorySlug, name, price, stock, cover, publishedAt, updatedAt }))
}

/** The shop's sample chats. */
export const SAMPLE_CONTACT_LINKS: PublicContactLink[] = [
  { kind: `telegram`, value: `vi_shop_sample`, label: null },
  { kind: `zalo`, value: `0901234567`, label: null },
]

/** Every photo of the sample with the swatch it is drawn in, for `photos/make.sh`. */
export function samplePhotoColours(): { id: string; swatch: string }[] {
  return SAMPLE_ITEMS.flatMap((each) =>
    each.photos.map((photo) => ({
      id: photo.id,
      swatch: each.colours.find((colour) => colour.id === photo.colourId)?.swatch ?? `#888888`,
    }))
  )
}
