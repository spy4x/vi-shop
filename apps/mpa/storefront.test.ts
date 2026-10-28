import { expect } from "@std/expect"
import { describe, it } from "@std/testing/bdd"
import { App } from "fresh"
import AppWrapper from "./routes/_app.tsx"
import * as home from "./routes/index.tsx"
import * as homeEn from "./routes/en/index.tsx"
import * as category from "./routes/[category]/index.tsx"
import * as categoryEn from "./routes/en/[category]/index.tsx"
import * as item from "./routes/[category]/[item].tsx"
import * as itemEn from "./routes/en/[category]/[item].tsx"
import * as list from "./routes/danh-sach.tsx"
import * as order from "./routes/dat-hang.tsx"
import Faq from "./routes/hoi-dap.tsx"
import FaqEn from "./routes/en/faq.tsx"
import { handler as photo } from "./routes/anh/[id]/[file].ts"
import { handler as sitemap } from "./routes/sitemap.xml.ts"
import { handler as llms } from "./routes/llms.txt.ts"
import { pageMiddleware, securityHeadersMiddleware } from "./middleware.ts"
import { readContactLinks } from "./contact-links.ts"
import { shopStateMiddleware } from "./shop/middleware.ts"
import type { ShopCatalog } from "./shop/catalog.ts"
import { define, type State } from "./utils.ts"
import { SAMPLE_CATEGORIES, SAMPLE_CONTACT_LINKS, SAMPLE_ITEMS } from "./lighthouse/sample-shop.ts"

const site = `https://shop.example.com`
const config = {
  apiUrl: `http://api:8000`,
  webAppOrigin: site,
  apiOrigin: `https://app.example.com`,
}
const info = {
  remoteAddr: { transport: `tcp`, hostname: `192.0.2.7`, port: 4000 },
  completed: Promise.resolve(),
} as Deno.ServeHandlerInfo<Deno.NetAddr>
const sameOrigin = { origin: site, "sec-fetch-site": `same-origin` }
const securityHeaders = await securityHeadersMiddleware(config)

/** A page module as `App.route` takes it; `define.page` types its props for one handler. */
const view = (module: { default: unknown; handler?: unknown }) =>
  // deno-lint-ignore no-explicit-any
  ({ component: module.default, handler: module.handler }) as any

/** 10:00 in Ho Chi Minh City: before the same-day cut-off. */
const MORNING = new Date(`2026-10-28T03:00:00Z`)

/** The shop's pages behind the website's middleware, on `catalog`, with the sample chats. */
function shop(
  { catalog = { categories: SAMPLE_CATEGORIES, items: SAMPLE_ITEMS }, now = MORNING, links = true }:
    {
      catalog?: ShopCatalog
      now?: Date
      links?: boolean
    } = {},
) {
  const photos: string[] = []
  const handler = new App<State>()
    .use(securityHeaders)
    .use(pageMiddleware(config, () => Promise.reject(new Error(`no API`)), () => false))
    .use(define.middleware((ctx) => {
      ctx.state.contactLinks = links ? readContactLinks({ links: SAMPLE_CONTACT_LINKS }) : []
      ctx.state.now = () => now
      return ctx.next()
    }))
    .use(shopStateMiddleware(
      { current: () => catalog, refresh: () => Promise.resolve() },
      (id, file) => {
        photos.push(`${id}/${file}`)
        return Promise.resolve(
          file === `960.webp`
            ? new Response(`bytes`, { headers: { "content-type": `image/webp` } })
            : new Response(null, { status: 404 }),
        )
      },
    ))
    // deno-lint-ignore no-explicit-any
    .appWrapper(AppWrapper as any)
    .route(`/`, view(home))
    .route(`/en/`, view(homeEn))
    .route(`/danh-sach`, view(list))
    .route(`/dat-hang`, view(order))
    .route(`/hoi-dap`, view({ default: Faq }))
    .route(`/en/faq`, view({ default: FaqEn }))
    .get(`/anh/:id/:file`, photo.GET!)
    .get(`/sitemap.xml`, sitemap.GET!)
    .get(`/llms.txt`, llms.GET!)
    .route(`/en/:category`, view(categoryEn))
    .route(`/en/:category/:item`, view(itemEn))
    .route(`/:category`, view(category))
    .route(`/:category/:item`, view(item))
    .handler()
  const fetch = (path: string, init?: RequestInit) =>
    handler(new Request(`${site}${path}`, init), info)
  return { fetch, photos }
}

async function get(path: string, headers: HeadersInit = {}, options = {}) {
  const response = await shop(options).fetch(path, { headers })
  return { status: response.status, headers: response.headers, body: await response.text() }
}

/** The page's JSON-LD nodes of type `type`. */
function jsonLd(body: string, type: string): Record<string, unknown>[] {
  const nodes = [...body.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
    .flatMap((match) => {
      const value = JSON.parse(match[1])
      return value[`@graph`] ?? [value]
    })
  return nodes.filter((node: Record<string, unknown>) => node[`@type`] === type)
}

/** The slugs of the looks a list page shows, in order. */
function looks(body: string): string[] {
  return [...body.matchAll(/data-e2e="look-tile".*?href="\/(?:en\/)?[a-z-]+\/([a-z0-9-]+)"/gs)]
    .map((match) => match[1])
}

describe(`the home page`, () => {
  it(`shows the newest looks in Vietnamese, with the headline and today's delivery promise`, async () => {
    const { status, body } = await get(`/`)

    expect(status).toBe(200)
    expect(body).toContain(`<html lang="vi"`)
    expect(body).toContain(`Mặc để chuyển động.`)
    expect(body).toContain(`Giao trong ngày ở Đà Nẵng nếu đặt trước 16:00`)
    expect(looks(body)).toEqual(SAMPLE_ITEMS.map((each) => each.slug))
  })

  it(`is in English at /en/, and each language names the other with hreflang`, async () => {
    const vi = await get(`/`)
    const en = await get(`/en/`)

    expect(en.body).toContain(`<html lang="en"`)
    expect(en.body).toContain(`Dress to move.`)
    for (const body of [vi.body, en.body]) {
      expect(body).toContain(`<link rel="alternate" hreflang="vi" href="${site}/"`)
      expect(body).toContain(`<link rel="alternate" hreflang="en" href="${site}/en/"`)
      expect(body).toContain(`<link rel="alternate" hreflang="x-default" href="${site}/"`)
    }
    expect(vi.body).toMatch(/href="\/en\/"[^>]*data-e2e="language-switch"/)
  })

  it(`says tomorrow after 16:00 Vietnam time`, async () => {
    const { body } = await get(`/`, {}, { now: new Date(`2026-10-28T09:30:00Z`) })

    expect(body).toContain(`Đặt bây giờ, giao ngày mai ở Đà Nẵng`)
    expect(body).not.toContain(`Giao trong ngày`)
  })

  it(`keeps only the looks left in the chosen size, and remembers the size for the visit`, async () => {
    const { body, headers } = await get(`/?size=L`)

    expect(looks(body)).toEqual([`ao-thun-tap`, `bo-do-tap-do`])
    expect(headers.get(`set-cookie`)).toMatch(/^size=L; .*HttpOnly.*SameSite=Lax/)
    expect(looks((await get(`/`, { cookie: `size=L` })).body)).toEqual([
      `ao-thun-tap`,
      `bo-do-tap-do`,
    ])
  })

  it(`says when nothing is left in a size, with a link that clears it`, async () => {
    const onlyJacket = { categories: SAMPLE_CATEGORIES, items: SAMPLE_ITEMS.slice(0, 1) }

    const { body } = await get(`/?size=L`, {}, { catalog: onlyJacket })

    expect(body).toContain(`Chưa có món nào size L.`)
    expect(body).toContain(`href="/?size="`)
  })

  it(`says the shop is getting ready while there is nothing published`, async () => {
    const { status, body } = await get(`/`, {}, { catalog: { categories: [], items: [] } })

    expect(status).toBe(200)
    expect(body).toContain(`data-e2e="catalog-empty"`)
  })

  it(`describes the store with its chats and lists its looks for search engines`, async () => {
    const { body } = await get(`/`)

    const [store] = jsonLd(body, `ClothingStore`)
    expect(store.sameAs).toEqual([`https://t.me/vi_shop_sample`])
    expect(JSON.stringify(store.contactPoint)).toContain(`https://zalo.me/0901234567`)
    const [itemList] = jsonLd(body, `ItemList`)
    expect((itemList.itemListElement as unknown[]).length).toBe(SAMPLE_ITEMS.length)
  })
})

describe(`a category page`, () => {
  it(`shows its looks under its name, and filters them by colour`, async () => {
    const all = await get(`/bo-do`)
    const red = await get(`/bo-do?color=do`)

    expect(all.body).toContain(`>Bộ đồ</h1>`)
    expect(looks(all.body)).toEqual([`bo-do-tap-do`, `bo-do-tap-xanh-reu`])
    expect(looks(red.body)).toEqual([`bo-do-tap-do`])
  })

  it(`answers 404 for a category the shop does not have`, async () => {
    expect((await get(`/khong-co`)).status).toBe(404)
  })
})

describe(`an item page`, () => {
  it(`shows the price, colours and sizes, with a sold-out size struck and named so`, async () => {
    const { status, body } = await get(`/ao-khoac/ao-khoac-zip-nau`)

    expect(status).toBe(200)
    expect(body).toContain(`>Áo khoác zip</h1>`)
    expect(body).toMatch(/590\.000\s₫/)
    expect(body).toContain(`<s>L</s><span class="sr-only">, hết hàng</span>`)
    expect(body).toMatch(/<input[^>]*name="size"[^>]*value="L"[^>]*disabled/)
  })

  it(`previews the message and posts the order form to the order address`, async () => {
    const { body } = await get(`/ao-khoac/ao-khoac-zip-nau?size=M`)

    expect(body).toMatch(/Chào shop, mình muốn đặt:\n• Áo khoác zip, màu Nâu, size M, 590\.000\s₫/)
    expect(body).toMatch(/<form[^>]*id="order"[^>]*method="post"[^>]*action="\/dat-hang"/)
    expect(body).toContain(`Giao trong ngày ở Đà Nẵng nếu đặt trước 16:00`)
  })

  it(`picks the size from height and weight, and the larger one between two sizes`, async () => {
    const fits = await get(`/ao-khoac/ao-khoac-zip-nau?height=165&weight=55`)
    const between = await get(`/en/ao-khoac/ao-khoac-zip-nau?height=158&weight=58`)

    expect(fits.body).toContain(`Size của bạn: M`)
    expect(fits.body).toMatch(/<input[^>]*value="M"[^>]*checked/)
    expect(fits.headers.get(`set-cookie`)).toMatch(/^fit=165\.55; /)
    expect(between.body).toContain(`You are between S and M. M will be more comfortable.`)
    expect(between.body).toMatch(/size M, ₫590,000/)
  })

  it(`offers the nearest size in stock when the larger of two is sold out, and picks it`, async () => {
    const grey = SAMPLE_ITEMS[0].colours[1].id
    // The form sends the chip picked before (S) along; the answer's size wins over it.
    const { body } = await get(
      `/ao-khoac/ao-khoac-zip-nau?color=${grey}&size=S&height=158&weight=62`,
    )

    expect(body).toContain(
      `Size của bạn ở giữa S và L. L đang hết hàng, chọn M: size gần nhất còn hàng.`,
    )
    expect(body).toMatch(/<input[^>]*value="M"[^>]*checked/)
    expect(body).toMatch(new RegExp(`<input[^>]*value="${grey}"[^>]*checked`))
    expect(body).toMatch(/màu Xám, size M, 590\.000\s₫/)
  })

  it(`offers to ask when the one size that fits is sold out, with no size picked and no promise`, async () => {
    const { body } = await get(`/en/ao-khoac/ao-khoac-zip-nau?size=M&height=170&weight=65`)

    expect(body).toContain(`Your size is L, but L is sold out. Ask the shop when it is back.`)
    expect(body).not.toMatch(/<input[^>]*name="size"[^>]*checked/)
    expect(body).toMatch(/<input type="hidden" name="size" value="L"/)
    expect(body).toMatch(/<input type="hidden" name="intent" value="ask"/)
    expect(body).not.toContain(`Add to list`)
    expect(body).not.toContain(`Same-day delivery in Da Nang if you order before 16:00`)
  })

  it(`sends the calculator with the order form's colour and size, and lands on the answer`, async () => {
    const { body } = await get(`/ao-khoac/ao-khoac-zip-nau`)

    expect(body).toMatch(/<details[^>]*id="size-calculator"/)
    expect(body).toMatch(
      /<input[^>]*name="height"[^>]*form="order"|<input[^>]*form="order"[^>]*name="height"/,
    )
    expect(body).toMatch(
      /<button[^>]*form="order"[^>]*formmethod="get"[^>]*formaction="\/ao-khoac\/ao-khoac-zip-nau#size-calculator"/i,
    )
  })

  it(`shows phones the message in short, without the link, and the whole message on wider screens`, async () => {
    const { body } = await get(`/ao-khoac/ao-khoac-zip-nau?size=M`)
    const preview = body.match(/data-e2e="order-bar-preview"[^>]*>([^<]*)</)?.[1]

    expect(preview).toMatch(
      /^Chào shop, mình muốn đặt: Áo khoác zip, màu Nâu, size M, 590\.000\s₫$/,
    )
    expect(body).toMatch(
      /<span[^>]*class="line-clamp-2[^"]*lg:hidden"[^>]*data-e2e="order-bar-preview"/,
    )
    expect(body).toContain(`https://shop.example.com/ao-khoac/ao-khoac-zip-nau`)
  })

  it(`shows no calculator for an item whose sizes have no ranges`, async () => {
    const { body } = await get(`/ao/ao-ba-lo-free-size`)

    expect(body).not.toContain(`data-e2e="size-calculator"`)
    expect(body).toContain(`size Free size`)
  })

  it(`offers to ask when a sold-out item is back, without "Add to list" or a delivery promise`, async () => {
    const { body } = await get(`/bo-do/bo-do-tap-xanh-reu`)

    expect(body).not.toContain(`Giao trong ngày ở Đà Nẵng`)

    expect(body).toContain(`Chào shop, khi nào món này có lại vậy?`)
    expect(body).toContain(`Hỏi khi có lại qua Telegram`)
    expect(body).not.toContain(`Thêm vào danh sách`)
  })

  it(`describes the item as a product group with a variant per colour and size`, async () => {
    const { body } = await get(`/ao-khoac/ao-khoac-zip-nau`)

    const [group] = jsonLd(body, `ProductGroup`)
    const variants = group.hasVariant as {
      offers: { availability: string; priceCurrency: string }
    }[]
    expect(variants).toHaveLength(6)
    expect(variants.filter((v) => v.offers.availability.endsWith(`OutOfStock`))).toHaveLength(2)
    expect(variants[0].offers.priceCurrency).toBe(`VND`)
    expect(jsonLd(body, `BreadcrumbList`)).toHaveLength(1)
    expect(body).toContain(
      `<link rel="alternate" hreflang="en" href="${site}/en/ao-khoac/ao-khoac-zip-nau"`,
    )
  })

  it(`redirects to the item's own category, and answers 404 for an unknown item`, async () => {
    const moved = await get(`/quan/ao-khoac-zip-nau?size=M`)

    expect(moved.status).toBe(308)
    expect(moved.headers.get(`location`)).toBe(`/ao-khoac/ao-khoac-zip-nau?size=M`)
    expect((await get(`/ao-khoac/khong-co`)).status).toBe(404)
  })

  it(`says the shop has no order chat yet when it has neither link`, async () => {
    const { body } = await get(`/ao-khoac/ao-khoac-zip-nau`, {}, { links: false })

    expect(body).toContain(`data-e2e="no-channel"`)
    expect(body).toContain(`Shop đang cập nhật kênh đặt hàng. Quay lại sau nhé.`)
    expect(body).not.toContain(`data-e2e="order-bar"`)
  })
})

describe(`ordering without JavaScript`, () => {
  function post(path: string, fields: Record<string, string>, cookie = ``, options = {}) {
    return shop(options).fetch(path, {
      method: `POST`,
      headers: { ...sameOrigin, ...(cookie ? { cookie } : {}) },
      body: new URLSearchParams(fields),
    })
  }

  it(`redirects "Order on Telegram" to the chat with the message typed in`, async () => {
    const response = await post(`/dat-hang`, {
      item: `ao-khoac-zip-nau`,
      color: SAMPLE_ITEMS[0].colours[1].id,
      size: `M`,
      intent: `order`,
      via: `telegram`,
    })

    expect(response.status).toBe(303)
    const location = new URL(response.headers.get(`location`)!)
    expect(location.origin + location.pathname).toBe(`https://t.me/vi_shop_sample`)
    expect(location.searchParams.get(`text`)).toMatch(
      /^Chào shop, mình muốn đặt:\n• Áo khoác zip, màu Xám, size M, 590\.000\s₫\nhttps:\/\/shop\.example\.com\/ao-khoac\/ao-khoac-zip-nau$/,
    )
  })

  it(`orders the size chip picked after the size the calculator named`, async () => {
    const body = new URLSearchParams([
      [`item`, `ao-khoac-zip-nau`],
      [`size`, `L`],
      [`size`, `M`],
      [`via`, `telegram`],
    ])
    const response = await shop().fetch(`/dat-hang`, { method: `POST`, headers: sameOrigin, body })

    expect(new URL(response.headers.get(`location`)!).searchParams.get(`text`)).toContain(`size M,`)
  })

  it(`shows the message to copy and a link to the Zalo chat for "Order on Zalo"`, async () => {
    const response = await post(`/dat-hang`, { item: `ao-thun-tap`, size: `S`, via: `zalo` })
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toMatch(/data-e2e="zalo-message"[^>]*>Chào shop, mình muốn đặt:\n• Áo thun tập/)
    expect(body).toMatch(/href="https:\/\/zalo\.me\/0901234567"[^>]*data-e2e="zalo-open"/)
  })

  it(`sends a form that names no item back home`, async () => {
    const response = await post(`/dat-hang`, { item: `khong-co`, via: `telegram` })

    expect(response.status).toBe(303)
    expect(response.headers.get(`location`)).toBe(`/`)
  })

  it(`adds a piece to the order list, shows it, orders it, and removes it`, async () => {
    const added = await post(`/danh-sach`, { add: `1`, item: `ao-thun-tap`, size: `M` })
    const cookie = added.headers.get(`set-cookie`)!.split(`;`)[0]

    expect(added.status).toBe(303)
    expect(added.headers.get(`location`)).toBe(`/danh-sach`)
    const page = await shop().fetch(`/danh-sach`, { headers: { cookie } })
    const body = await page.text()
    expect(body).toContain(`data-e2e="list-lines"`)
    expect(body).toContain(`Danh sách (1)`)
    expect(body).toMatch(/data-e2e="list-total">290\.000\s₫/)

    const ordered = await post(`/dat-hang`, { list: `1`, via: `telegram` }, cookie)
    expect(new URL(ordered.headers.get(`location`)!).searchParams.get(`text`)).toContain(
      `• Áo thun tập, màu: chưa chọn, size M`,
    )

    const removed = await post(`/danh-sach`, { remove: `0` }, cookie)
    expect(removed.headers.get(`set-cookie`)).toMatch(/^list=; .*Max-Age=0/)
  })

  it(`refuses a post from another site`, async () => {
    const response = await shop().fetch(`/dat-hang`, {
      method: `POST`,
      headers: { origin: `https://evil.example`, "sec-fetch-site": `cross-site` },
      body: new URLSearchParams({ item: `ao-thun-tap`, via: `telegram` }),
    })

    expect(response.status).toBe(403)
  })
})

describe(`the FAQ`, () => {
  it(`answers in both languages, with FAQPage data`, async () => {
    const vi = await get(`/hoi-dap`)
    const en = await get(`/en/faq`)

    expect(vi.body).toContain(`Đặt hàng thế nào?`)
    expect(en.body).toContain(`How do I order?`)
    expect(jsonLd(vi.body, `FAQPage`)).toHaveLength(1)
  })
})

describe(`the security policy`, () => {
  it(`lets the item page's island script run with its render's nonce, and no other inline script`, async () => {
    const { headers, body } = await get(`/ao-khoac/ao-khoac-zip-nau`)
    const nonce = body.match(/<script[^>]* nonce="([0-9a-f]+)"/)?.[1]
    const policy = headers.get(`content-security-policy`) ?? ``

    expect(nonce).toBeDefined()
    expect(policy).toContain(`script-src 'self' 'nonce-${nonce}';`)
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/)
  })

  it(`lets the order form send the shopper on to the Telegram chat`, async () => {
    const { headers } = await get(`/`)

    expect(headers.get(`content-security-policy`)).toMatch(
      /form-action 'self'[^;]* https:\/\/t\.me;/,
    )
  })

  it(`allows the swatches' style attributes, and keeps style blocks on the site's own files`, async () => {
    const { headers } = await get(`/`)
    const policy = headers.get(`content-security-policy`) ?? ``

    expect(policy).toContain(`style-src-attr 'unsafe-inline'`)
    expect(policy).toMatch(/style-src 'self';/)
  })
})

describe(`the photos`, () => {
  const id = SAMPLE_ITEMS[0].photos[0].id

  it(`are served from the website's own host, from the API`, async () => {
    const { fetch, photos } = shop()
    const response = await fetch(`/anh/${id}/960.webp`)

    expect(response.status).toBe(200)
    expect(response.headers.get(`content-type`)).toBe(`image/webp`)
    expect(await response.text()).toBe(`bytes`)
    expect(photos).toEqual([`${id}/960.webp`])
  })

  it(`answer 404 for an address that is no photo width, without asking the API`, async () => {
    const { fetch, photos } = shop()

    expect((await fetch(`/anh/${id}/960.png`)).status).toBe(404)
    expect((await fetch(`/anh/not-an-id/960.webp`)).status).toBe(404)
    expect((await fetch(`/anh/${id}/480.webp`)).status).toBe(404)
    expect(photos).toEqual([`${id}/480.webp`])
  })
})

describe(`the sitemap and llms.txt`, () => {
  it(`list every item in both languages, with its photos`, async () => {
    const { body } = await get(`/sitemap.xml`)

    expect(body).toContain(`<loc>${site}/ao-khoac/ao-khoac-zip-nau</loc>`)
    expect(body).toContain(`<loc>${site}/en/ao-khoac/ao-khoac-zip-nau</loc>`)
    expect(body).toContain(`<image:loc>${site}/anh/${SAMPLE_ITEMS[0].photos[0].id}/960.webp`)
    expect(body).toContain(`<loc>${site}/en/faq</loc>`)
    expect(body).not.toContain(`danh-sach`)
  })

  it(`give an assistant each item's price and the sizes left`, async () => {
    const { body } = await get(`/llms.txt`)

    expect(body).toMatch(
      /\[Zip jacket\]\(https:\/\/shop\.example\.com\/en\/ao-khoac\/ao-khoac-zip-nau\): ₫590,000; Sizes: S, M; Colours: Brown, Grey/,
    )
  })
})
