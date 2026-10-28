import { HttpError, page } from "fresh"
import { Head } from "fresh/runtime"
import type { PublicCatalogCategory, PublicCatalogItem } from "@domain/catalog"
import { define } from "../utils.ts"
import { colourKey, sizeLabels, text } from "./catalog.ts"
import { ShopFrame } from "./frame.tsx"
import { categoryPath, type Lang, PATHS } from "./lang.ts"
import { type ColourChoice, LookList, passesFilter } from "./looks.tsx"
import { deliveryLine } from "./order.ts"
import { crumbsJsonLd, looksJsonLd, storeJsonLd, websiteJsonLd } from "./seo.ts"
import { COOKIES, cookiesOf, cookieValue, rememberCookie } from "./visit.ts"
import { WORDS } from "./words.ts"

/** What a list page renders: the filtered items and the filter's state. */
interface ListData {
  items: PublicCatalogItem[]
  sizes: string[]
  size: string
  colours: ColourChoice[]
  colour: string
  category: PublicCatalogCategory | null
}

/**
 * The size the shopper filters by: `?size=` when the address has one (`""` clears it), else the
 * visit's cookie, kept only when one of `labels` names it. The answer's headers remember it.
 */
function chosenSize(
  url: URL,
  request: Request,
  labels: readonly string[],
  origin: string,
): { size: string; headers: Headers } {
  const headers = new Headers()
  const asked = url.searchParams.get(`size`)
  const wanted = asked ?? cookieValue(cookiesOf(request), COOKIES.size)
  const size = labels.find((label) => label.toLowerCase() === wanted.trim().toLowerCase()) ?? ``
  if (asked !== null) rememberCookie(headers, origin, COOKIES.size, size)
  return { size, headers }
}

/** The colours of `items`, each once by its key, for a category's colour row. */
function colourChoices(items: readonly PublicCatalogItem[], lang: Lang): ColourChoice[] {
  const choices: ColourChoice[] = []
  for (const colour of items.flatMap((item) => item.colours)) {
    const key = colourKey(colour)
    if (key && !choices.some((choice) => choice.key === key)) {
      choices.push({ key, name: text(colour.name, lang), swatch: colour.swatch })
    }
  }
  return choices
}

/** The script that sends a filter form on every change; the page works without it. */
function FilterScript() {
  return (
    <Head>
      <script src="/shop.js" defer></script>
    </Head>
  )
}

/**
 * The home page (`/`, `/en/`): the headline, the delivery promise and the newest looks with the
 * size row. Its structured data is the site, the store and the list.
 */
export function homeRoute(lang: Lang) {
  const handler = define.handlers({
    GET(ctx) {
      const all = (ctx.state.catalog?.items ?? [])
        .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      const sizes = sizeLabels(all)
      const { size, headers } = chosenSize(ctx.url, ctx.req, sizes, ctx.state.webAppOrigin)
      const items = all.filter((item) => passesFilter(item, size))
      return page<ListData>(
        { items, sizes, size, colours: [], colour: ``, category: null },
        { headers },
      )
    },
  })
  const component = define.page<typeof handler>(function Home({ data, state }) {
    const words = WORDS[lang]
    const origin = state.webAppOrigin
    const path = PATHS.home[lang]
    const now = state.now?.() ?? new Date()
    const empty = (state.catalog?.items ?? []).length === 0
    return (
      <ShopFrame
        state={state}
        lang={lang}
        path={path}
        head={{
          title: words.homeTitle,
          description: words.homeDescription,
          jsonLd: [
            websiteJsonLd(origin, lang),
            storeJsonLd(origin, lang, state.contactLinks ?? []),
            ...(data.items.length > 0 ? [looksJsonLd(origin, path, lang, data.items)] : []),
          ],
        }}
      >
        <FilterScript />
        <div class="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-8 sm:px-6 lg:gap-14 lg:px-8 lg:pt-14">
          <header class="flex flex-col gap-4">
            <h1 class="text-6xl font-extrabold leading-tight tracking-tighter text-balance lg:text-9xl">
              {words.headline}
            </h1>
            <p class="text-lg font-medium text-pretty" data-e2e="delivery-line">
              {deliveryLine(now, lang)}
            </p>
            <p class="max-w-prose text-muted text-pretty">{words.quality}</p>
          </header>
          {empty
            ? <p class="text-lg text-pretty" data-e2e="catalog-empty">{words.emptyCatalog}</p>
            : (
              <LookList
                lang={lang}
                path={path}
                items={data.items}
                sizes={data.sizes}
                size={data.size}
                label={words.newIn}
              />
            )}
        </div>
      </ShopFrame>
    )
  })
  return { handler, component }
}

/**
 * A category's page (`/ao-khoac`, `/en/ao-khoac`): its name as the headline, then its looks with
 * the size row and the colour row. An unknown category answers 404.
 */
export function categoryRoute(lang: Lang) {
  const handler = define.handlers({
    GET(ctx) {
      const slug = ctx.params.category
      const category = ctx.state.catalog?.categories.find((each) => each.slug === slug)
      if (!category) throw new HttpError(404)
      const all = (ctx.state.catalog?.items ?? []).filter((item) => item.categorySlug === slug)
      const sizes = sizeLabels(all)
      const { size, headers } = chosenSize(ctx.url, ctx.req, sizes, ctx.state.webAppOrigin)
      const colours = colourChoices(all, lang)
      const asked = ctx.url.searchParams.get(`color`) ?? ``
      const colour = colours.some((each) => each.key === asked) ? asked : ``
      const items = all.filter((item) => passesFilter(item, size, colour))
      return page<ListData>({ items, sizes, size, colours, colour, category }, { headers })
    },
  })
  const component = define.page<typeof handler>(function Category({ data, state }) {
    const words = WORDS[lang]
    const origin = state.webAppOrigin
    const category = data.category!
    const name = text(category.name, lang)
    const path = categoryPath(lang, category.slug)
    return (
      <ShopFrame
        state={state}
        lang={lang}
        path={path}
        head={{
          title: name,
          description: words.categoryDescription(name),
          jsonLd: [
            crumbsJsonLd(origin, path, lang, [{ name }]),
            ...(data.items.length > 0 ? [looksJsonLd(origin, path, lang, data.items)] : []),
          ],
        }}
      >
        <FilterScript />
        <div class="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-8 sm:px-6 lg:gap-14 lg:px-8 lg:pt-14">
          <h1 class="text-6xl font-extrabold leading-tight tracking-tighter text-balance lg:text-9xl">
            {name}
          </h1>
          <LookList
            lang={lang}
            path={path}
            items={data.items}
            sizes={data.sizes}
            size={data.size}
            colours={data.colours}
            colour={data.colour}
            label={name}
          />
        </div>
      </ShopFrame>
    )
  })
  return { handler, component }
}
