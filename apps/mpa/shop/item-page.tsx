import { HttpError, page } from "fresh"
import { Head } from "fresh/runtime"
import {
  CATALOG_HEIGHT_MAX_CM,
  CATALOG_WEIGHT_MAX_KG,
  type CatalogSize,
  type PublicCatalogCategory,
  type PublicCatalogItem,
  recommendSize,
} from "@domain/catalog"
import { responsiveImage } from "@spy4x/platform/universal/srcset"
import ItemView, { type CalculatorState } from "../islands/item-view.tsx"
import { define } from "../utils.ts"
import { itemModel, photoAddresses, text } from "./catalog.ts"
import { orderChannels } from "./channels.ts"
import { ShopFrame } from "./frame.tsx"
import { categoryPath, itemPath, type Lang } from "./lang.ts"
import { deliveryLine, trackingSource } from "./order.ts"
import { isSoldOut, photoVariants, sizeByLabel } from "./parts.ts"
import { categoryHref, crumbsJsonLd, itemJsonLd } from "./seo.ts"
import { COOKIES, cookiesOf, cookieValue, measure, rememberCookie } from "./visit.ts"
import { formatPrice, type ShopWords, WORDS } from "./words.ts"

/** What the item page renders. */
interface ItemData {
  item: PublicCatalogItem
  category: PublicCatalogCategory
  colourId: string | null
  sizeLabel: string | null
  calculator: CalculatorState | null
  /** The tracking link's source tag the visit arrived with, for the order buttons' events. */
  source: string | null
}

/** Whether any size of the item has a height or weight range, so the calculator can answer. */
function hasChart(sizes: readonly CatalogSize[]): boolean {
  return sizes.some((size) => size.heightCm !== null || size.weightKg !== null)
}

/**
 * The size calculator's answer for `height` and `weight`, in words, and the size it picks: the
 * size itself, or the larger of two when the height and the weight point at different sizes.
 *
 * Stock in `colour` decides the pick. A larger size that is sold out gives way to the nearest size
 * in between that is left; when none is left, the answer names the sold-out size in `askFor`, so
 * the order bar asks the shop when it is back.
 */
function advice(
  item: PublicCatalogItem,
  colour: { id: string } | null,
  height: number | null,
  weight: number | null,
  words: ShopWords,
): { result: string | null; size: string | null; askFor: string | null } {
  if (height === null || weight === null) return { result: null, size: null, askFor: null }
  const answer = recommendSize(item.sizes, { heightCm: height, weightKg: weight })
  if (answer === null) return { result: words.outsideChart, size: null, askFor: null }
  const left = (size: CatalogSize) => !isSoldOut(item, size, colour)
  if (answer.kind === `size`) {
    const label = answer.size.label
    return left(answer.size)
      ? { result: words.yourSizeIs(label), size: label, askFor: null }
      : { result: words.fitSoldOut(label), size: null, askFor: label }
  }
  const { smaller, larger } = answer
  if (left(larger)) {
    return { result: words.between(smaller.label, larger.label), size: larger.label, askFor: null }
  }
  // From just below the larger size down to the smaller one: the nearest size still in stock.
  const from = item.sizes.indexOf(smaller)
  const pick = item.sizes.slice(from, item.sizes.indexOf(larger)).reverse().find(left)
  return pick
    ? {
      result: words.betweenSoldOut(smaller.label, larger.label, pick.label),
      size: pick.label,
      askFor: null,
    }
    : {
      result: words.betweenNoneLeft(smaller.label, larger.label),
      size: null,
      askFor: larger.label,
    }
}

/**
 * An item's page (`/ao-khoac/ao-khoac-zip-nau`): its photos, price, colours and sizes, the size
 * calculator, the order bar with the message, and the facts an assistant can quote. An unknown
 * item answers 404; an item asked for under another category's path redirects to its own.
 *
 * The colour comes from `?color=` (else the first one left), the size from `?size=`, else the
 * calculator, else the size the shopper filters lists by, else the item's only size. When the
 * calculator was asked just now, its size comes first. The calculator reads `?height=` and
 * `?weight=`, else the visit's cookies, and remembers what it was given.
 */
export function itemRoute(lang: Lang) {
  const handler = define.handlers({
    GET(ctx) {
      const { category: categorySlug, item: slug } = ctx.params
      const catalog = ctx.state.catalog
      const item = catalog?.items.find((each) => each.slug === slug)
      const category = catalog?.categories.find((each) => each.slug === item?.categorySlug)
      if (!item || !category) throw new HttpError(404)
      if (item.categorySlug !== categorySlug) {
        const to = `${itemPath(lang, item.categorySlug, item.slug)}${ctx.url.search}`
        return new Response(null, { status: 308, headers: { location: to } })
      }
      const query = ctx.url.searchParams
      const cookies = cookiesOf(ctx.req)
      const origin = ctx.state.webAppOrigin
      const headers = new Headers()

      const askedColour = item.colours.find((each) => each.id === query.get(`color`))
      const colour = askedColour ??
        item.colours.find((each) => item.sizes.some((size) => !isSoldOut(item, size, each))) ??
        item.colours[0] ?? null

      let calculator: CalculatorState | null = null
      let advised: string | null = null
      // Asked just now with an answer: its size (or none, when it is sold out) wins over the size
      // the form sent along.
      let answered = false
      if (hasChart(item.sizes)) {
        const asked = query.has(`height`) || query.has(`weight`)
        const [savedHeight, savedWeight] = cookieValue(cookies, COOKIES.fit).split(`.`)
        const height = measure(asked ? query.get(`height`) : savedHeight, CATALOG_HEIGHT_MAX_CM)
        const weight = measure(asked ? query.get(`weight`) : savedWeight, CATALOG_WEIGHT_MAX_KG)
        if (asked) {
          // One cookie for both: Fresh keeps only the last `set-cookie` header of a page.
          const fit = height === null && weight === null ? `` : `${height ?? ``}.${weight ?? ``}`
          rememberCookie(headers, origin, COOKIES.fit, fit)
        }
        const answer = advice(item, colour, height, weight, WORDS[lang])
        calculator = { height, weight, result: answer.result, askFor: answer.askFor }
        advised = answer.size
        answered = asked && (answer.size !== null || answer.askFor !== null)
      }
      const filtered = cookieValue(cookies, COOKIES.size)
      // A single size, such as "Free size", is picked from the start.
      const only = item.sizes.length === 1 ? item.sizes[0].label : null
      const sizeLabel = (answered ? [advised] : [query.get(`size`), advised, filtered, only])
        .map((label) => label ? sizeByLabel(item, label) : undefined)
        .find((size) => size !== undefined)?.label ?? null

      return page<ItemData>(
        {
          item,
          category,
          colourId: colour?.id ?? null,
          sizeLabel,
          calculator,
          source: trackingSource(query),
        },
        { headers },
      )
    },
  })

  const component = define.page<typeof handler>(function Item({ data, state }) {
    const words = WORDS[lang]
    const origin = state.webAppOrigin
    const { item, category } = data
    const name = text(item.name, lang)
    const categoryName = text(category.name, lang)
    const path = itemPath(lang, item.categorySlug, item.slug)
    const cover = item.photos[0]
    const coverImage = cover ? responsiveImage(photoVariants(cover), `88vw`) : null
    const shareImage = cover ? photoAddresses([cover], origin)[0] : undefined
    const product = itemJsonLd(origin, lang, item, category)
    const sizes = item.sizes.filter((size) => !isSoldOut(item, size, null))
      .map((size) => size.label)
    const colours = item.colours.map((colour) => text(colour.name, lang))
    const details = [
      [words.material, text(item.material, lang)],
      [words.fit, text(item.fit, lang)],
      [words.care, text(item.care, lang)],
    ].filter(([, value]) => value)
    const description = text(item.description, lang)
    return (
      <ShopFrame
        state={state}
        lang={lang}
        path={path}
        head={{
          title: `${name}, ${formatPrice(item.price, lang)}`,
          description: (description || words.factsOrder).slice(0, 300),
          image: shareImage
            ? {
              url: shareImage,
              alt: text(cover.alt, lang) || name,
              width: coverImage?.width,
              height: coverImage?.height,
            }
            : undefined,
          jsonLd: [
            crumbsJsonLd(origin, path, lang, [
              { name: categoryName, href: categoryHref(origin, lang, category.slug) },
              { name },
            ]),
            ...(product ? [product] : []),
          ],
        }}
      >
        {coverImage && (
          <Head>
            <link
              rel="preload"
              as="image"
              type={coverImage.sources[0]?.type}
              fetchpriority="high"
              {
                // Preact's types lack `imagesizes`; spread, the attributes render as written.
                ...{
                  imagesrcset: coverImage.sources[0]?.srcset ?? coverImage.srcset,
                  imagesizes: `(min-width: 64rem) 55vw, 88vw`,
                }
              }
            />
          </Head>
        )}
        <ItemView
          lang={lang}
          origin={origin}
          path={path}
          item={itemModel(item, lang)}
          back={{ href: categoryPath(lang, category.slug), name: categoryName }}
          colourId={data.colourId}
          sizeLabel={data.sizeLabel}
          channels={orderChannels(state.contactLinks ?? [])}
          delivery={deliveryLine(state.now?.() ?? new Date(), lang)}
          calculator={data.calculator}
          source={data.source}
        >
          <section aria-labelledby="facts" class="flex flex-col gap-3" data-e2e="item-facts">
            <h2 id="facts" class="text-xl font-semibold tracking-tight">{words.facts}</h2>
            <p class="text-pretty">
              {words.factsPrice(name, formatPrice(item.price, lang))}{" "}
              {sizes.length > 0 && `${words.factsSizes(sizes.join(`, `))} `}
              {colours.length > 0 && `${words.factsColours(colours.join(`, `))} `}
              {words.factsOrder}
            </p>
            {description && <p class="text-muted text-pretty">{description}</p>}
          </section>
          {details.length > 0 && (
            <dl class="grid gap-4 sm:grid-cols-3">
              {details.map(([term, value]) => (
                <div key={term} class="flex flex-col gap-1">
                  <dt class="text-sm font-medium text-muted">{term}</dt>
                  <dd class="text-pretty">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {hasChart(item.sizes) && (
            <section aria-labelledby="size-table" class="flex flex-col gap-3">
              <h2 id="size-table" class="text-xl font-semibold tracking-tight">
                {words.sizeTable}
              </h2>
              <div class="overflow-x-auto">
                <table class="w-full text-left tabular-nums">
                  <thead class="text-sm">
                    <tr>
                      <th scope="col" class="py-2 pr-4 font-medium">{words.size}</th>
                      <th scope="col" class="py-2 pr-4 font-medium">{words.heightCm}</th>
                      <th scope="col" class="py-2 font-medium">{words.weightKg}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.sizes.map((size) => (
                      <tr key={size.id} class="border-t border-subtle">
                        <th scope="row" class="py-2 pr-4 font-semibold">{size.label}</th>
                        <td class="py-2 pr-4">{range(size.heightCm)}</td>
                        <td class="py-2">{range(size.weightKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </ItemView>
      </ShopFrame>
    )
  })
  return { handler, component }
}

/** A height or weight range as a size chart prints it: `160–170`, or `—` for none. */
function range(value: { min: number; max: number } | null): string {
  return value ? `${value.min}–${value.max}` : `—`
}
