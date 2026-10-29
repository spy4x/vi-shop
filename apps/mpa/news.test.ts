import { expect } from "@std/expect"
import { describe, it } from "@std/testing/bdd"
import { App } from "fresh"
import type { PublicBlogPost } from "@domain/blog"
import { subscriberConfirmLink } from "../../libs/server/subscribers/subscribers.ts"
import AppWrapper from "./routes/_app.tsx"
import * as home from "./routes/index.tsx"
import * as homeEn from "./routes/en/index.tsx"
import * as item from "./routes/[category]/[item].tsx"
import * as blogIndex from "./routes/bai-viet/index.tsx"
import * as blogPost from "./routes/bai-viet/[slug].tsx"
import { handler as signup } from "./routes/nhan-tin.ts"
import { handler as confirm } from "./routes/subscribe/confirm.ts"
import { handler as unsubscribe } from "./routes/unsubscribe.ts"
import { handler as seedPost } from "./routes/blog/[slug].ts"
import { handler as sitemap } from "./routes/sitemap.xml.ts"
import { handler as llms } from "./routes/llms.txt.ts"
import Privacy from "./routes/privacy.tsx"
import { pageMiddleware } from "./middleware.ts"
import { shopStateMiddleware } from "./shop/middleware.ts"
import { define, type State } from "./utils.ts"
import { SAMPLE_CATEGORIES, SAMPLE_ITEMS } from "./lighthouse/sample-shop.ts"
import { postFeedItem, postSummary, SAMPLE_POSTS } from "./lighthouse/sample-blog.ts"

/**
 * The shop's Vietnamese blog and newsletter sign-up (issue #16), behind the website's middleware,
 * on a stand-in of the API's blog and subscriber routes that records what the website asks.
 */

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

/** A page module as `App.route` takes it. */
const view = (module: { default: unknown; handler?: unknown }) =>
  // deno-lint-ignore no-explicit-any
  ({ component: module.default, handler: module.handler }) as any

interface Options {
  posts?: PublicBlogPost[]
  newsletter?: boolean
  /** What the API answers a sign-up with; 202 for any address with an `@` by default. */
  subscribeStatus?: number
}

/** The website on the sample shop, with `posts` live and the newsletter on unless told. */
function shop({ posts = SAMPLE_POSTS, newsletter = true, subscribeStatus }: Options = {}) {
  const calls: { method: string; path: string; body: unknown }[] = []
  const api = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const body = request.method === `POST` && request.headers.get(`content-type`)?.includes(`json`)
      ? await request.json()
      : null
    calls.push({ method: request.method, path: `${url.pathname}${url.search}`, body })
    const json = (value: unknown, status = 200) => Response.json(value, { status })
    const path = url.pathname
    if (path === `/api/blog/posts`) return json({ posts: posts.map(postSummary) })
    if (path === `/api/blog/feed`) return json({ posts: posts.map(postFeedItem) })
    if (path.startsWith(`/api/blog/posts/`)) {
      const post = posts.find((each) => each.slug === path.split(`/`).at(-1))
      if (!post) return json({ error: { code: `not_found`, message: `Not found` } }, 404)
      return json({ post, readNext: posts.filter((each) => each !== post).map(postSummary) })
    }
    if (path === `/api/subscribers` && request.method === `POST`) {
      const status = subscribeStatus ?? (String(body?.email).includes(`@`) ? 202 : 400)
      return status === 202
        ? json({}, 202)
        : json({ error: { code: `bad_request`, message: `Refused in English` } }, status)
    }
    if (path === `/api/subscribers/confirm` && request.method === `GET`) {
      return json({ state: `confirm`, email: `an@example.com` })
    }
    if (path === `/api/subscribers/confirm`) return json({ state: `done` })
    if (path === `/api/subscribers/unsubscribe/preview`) {
      return json({ state: `confirm`, email: `an@example.com` })
    }
    if (path === `/api/subscribers/unsubscribe`) return json({ state: `done` })
    return json({ error: { code: `not_found`, message: `Not found` } }, 404)
  }
  const handler = new App<State>()
    .use(pageMiddleware(config, api as typeof globalThis.fetch, () => newsletter))
    .use(define.middleware((ctx) => {
      // What `blogLinkMiddleware` says: a post is live in the main language.
      ctx.state.blog = posts.length > 0
      ctx.state.contactLinks = []
      return ctx.next()
    }))
    .use(shopStateMiddleware(
      {
        current: () => ({ categories: SAMPLE_CATEGORIES, items: SAMPLE_ITEMS }),
        refresh: () => Promise.resolve(),
      },
      () => Promise.resolve(new Response(null, { status: 404 })),
    ))
    // deno-lint-ignore no-explicit-any
    .appWrapper(AppWrapper as any)
    .route(`/`, view(home))
    .route(`/en`, view(homeEn))
    .route(`/bai-viet`, view(blogIndex))
    .route(`/bai-viet/:slug`, view(blogPost))
    .get(`/nhan-tin`, signup.GET!)
    .post(`/nhan-tin`, signup.POST!)
    .get(`/subscribe/confirm`, confirm.GET!)
    .post(`/subscribe/confirm`, confirm.POST!)
    .get(`/unsubscribe`, unsubscribe.GET!)
    .post(`/unsubscribe`, unsubscribe.POST!)
    .get(`/blog/:slug`, seedPost.GET!)
    .get(`/sitemap.xml`, sitemap.GET!)
    .get(`/llms.txt`, llms.GET!)
    .route(`/privacy`, view({ default: Privacy }))
    .route(`/:category/:item`, view(item))
    .handler()
  const fetch = async (path: string, init?: RequestInit) => {
    const response = await handler(new Request(`${site}${path}`, init), info)
    return { status: response.status, headers: response.headers, body: await response.text() }
  }
  return { fetch, calls }
}

/** A sign-up form post, as a browser without JavaScript sends it. */
function form(fields: Record<string, string>): RequestInit {
  return {
    method: `POST`,
    headers: { ...sameOrigin, "content-type": `application/x-www-form-urlencoded` },
    body: new URLSearchParams(fields),
  }
}

/** The page's JSON-LD nodes of type `type`. */
function jsonLd(body: string, type: string): Record<string, unknown>[] {
  return [...body.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
    .flatMap((match) => {
      const value = JSON.parse(match[1])
      return value[`@graph`] ?? [value]
    })
    .filter((node: Record<string, unknown>) => node[`@type`] === type)
}

/** The addresses of the story tiles a page shows, in order. */
function stories(body: string): string[] {
  return [...body.matchAll(/data-e2e="story-tile".*?href="(\/bai-viet\/[a-z0-9-]+)"/gs)]
    .map((match) => match[1])
}

/** The slugs of the look tiles inside the "Món trong bài" section. */
function postItems(body: string): string[] {
  const section = body.match(/data-e2e="post-items".*?<\/section>/s)?.[0] ?? ``
  return [...section.matchAll(/data-e2e="look-tile".*?href="\/[a-z-]+\/([a-z0-9-]+)"/gs)]
    .map((match) => match[1])
}

const NOINDEX = /<meta name="robots" content="noindex/

describe(`the blog's index`, () => {
  it(`lists every live post as a story tile, the newest leading, indexed and in Vietnamese`, async () => {
    const { status, body } = await shop().fetch(`/bai-viet`)

    expect(status).toBe(200)
    expect(stories(body)).toEqual(SAMPLE_POSTS.map((post) => `/bai-viet/${post.slug}`))
    expect(body).toMatch(
      /<li class="lg:col-span-2">(?:<!--[^>]*-->)?<div[^>]*data-e2e="story-tile"/,
    )
    expect(body).toContain(`Mẫu mới, chuyện vải và cách chọn size, kể từ shop ở Đà Nẵng.`)
    expect(body).toContain(`28 tháng 10, 2026`)
    expect(body).toContain(`4 phút đọc`)
    expect(body).not.toMatch(NOINDEX)
    expect(jsonLd(body, `Blog`)[0].inLanguage).toBe(`vi`)
    expect(body).not.toContain(`rel="alternate" hreflang`)
  })

  it(`offers topic chips with two topics or more, and a topic's list stays out of search results`, async () => {
    const all = await shop().fetch(`/bai-viet`)
    expect(all.body).toContain(`data-e2e="topic-filter"`)

    const { body } = await shop().fetch(`/bai-viet?topic=${encodeURIComponent(`Chất liệu`)}`)
    expect(stories(body)).toEqual([`/bai-viet/vai-du-hai-lop`, `/bai-viet/giat-do-tap`])
    expect(body).toMatch(NOINDEX)
    expect(body).toContain(`<link rel="canonical" href="${site}/bai-viet"`)

    const one = await shop({ posts: SAMPLE_POSTS.slice(1) }).fetch(`/bai-viet`)
    expect(one.body).not.toContain(`data-e2e="topic-filter"`)
  })

  it(`says there is no post yet in one line, links the catalog and stays out of search results`, async () => {
    const { status, body } = await shop({ posts: [] }).fetch(`/bai-viet`)

    expect(status).toBe(200)
    expect(body).toContain(`Chưa có bài viết nào`)
    expect(body).toMatch(
      /Bài đầu tiên đang được viết\. Trong lúc chờ,\s*<a href="\/"[^>]*>xem mẫu mới<\/a>/,
    )
    expect(body).toMatch(NOINDEX)
    expect(stories(body)).toEqual([])
  })
})

describe(`the Blog link and the footer sign-up`, () => {
  it(`show on Vietnamese pages once a post is live, and the sign-up posts to /nhan-tin`, async () => {
    const { body } = await shop().fetch(`/`)

    expect(body).toMatch(/<header.*<a [^>]*href="\/bai-viet".*<\/header>/s)
    expect(body).toMatch(/<footer.*<a [^>]*href="\/bai-viet".*<\/footer>/s)
    expect(body).toMatch(/<footer.*data-e2e="signup".*<form method="post" action="\/nhan-tin"/s)
    expect(body).toContain(`Mẫu mới qua email`)

    const empty = await shop({ posts: [] }).fetch(`/`)
    expect(empty.body).not.toContain(`href="/bai-viet"`)
  })

  it(`never show on English pages`, async () => {
    const { body } = await shop().fetch(`/en`)

    expect(body).not.toContain(`/bai-viet`)
    expect(body).not.toContain(`data-e2e="signup"`)
    expect(body).not.toContain(`/nhan-tin`)
  })

  it(`hide the sign-up while the newsletter is off`, async () => {
    const { body } = await shop({ newsletter: false }).fetch(`/`)

    expect(body).not.toContain(`data-e2e="signup"`)
  })
})

describe(`a post`, () => {
  const jacketPost = `/bai-viet/chon-size-ao-khoac`

  it(`shows its cover, trail, title, date, "In short" and body, as a Vietnamese BlogPosting`, async () => {
    const { status, body } = await shop().fetch(jacketPost)

    expect(status).toBe(200)
    expect(body).toContain(`data-e2e="post-cover"`)
    expect(body).toContain(`<link rel="preload" as="image" href="${site}/anh/`)
    expect(body).toContain(`Chọn size áo khoác zip cho buổi chạy sáng</h1>`)
    expect(body).toContain(`28 tháng 10, 2026`)
    expect(body).toContain(`data-e2e="tldr-box"`)
    expect(body).toContain(`Tóm tắt`)
    const [posting] = jsonLd(body, `BlogPosting`)
    expect(posting.inLanguage).toBe(`vi`)
    const [trail] = jsonLd(body, `BreadcrumbList`)
    expect(
      (trail.itemListElement as { name: string }[]).map((crumb) => crumb.name),
    ).toEqual([`Vi shop`, `Bài viết`, `Chọn size áo khoác zip cho buổi chạy sáng`])
    expect(body).not.toContain(`rel="alternate" hreflang`)
  })

  it(`shows a live tile for each item its body links to, once each, in order`, async () => {
    const { body } = await shop().fetch(jacketPost)

    expect(postItems(body)).toEqual([`ao-khoac-zip-nau`, `quan-short-chay-bo`])
    expect(body).toMatch(/data-e2e="post-items".*590\.000/s)
  })

  it(`drops a linked item the catalog no longer has`, async () => {
    const [first] = SAMPLE_POSTS
    const gone = { ...first, html: `${first.html}<p><a href="/ao/khong-con-ban">cũ</a></p>` }
    const { body } = await shop({ posts: [gone] }).fetch(jacketPost)

    expect(postItems(body)).toEqual([`ao-khoac-zip-nau`, `quan-short-chay-bo`])
  })

  it(`ends with the sign-up band instead of the footer's, and three posts to read next`, async () => {
    const fourth = { ...SAMPLE_POSTS[2], slug: `bai-thu-tu`, title: `Bài thứ tư` }
    const fifth = { ...SAMPLE_POSTS[2], slug: `bai-thu-nam`, title: `Bài thứ năm` }
    const { body } = await shop({ posts: [...SAMPLE_POSTS, fourth, fifth] }).fetch(jacketPost)

    expect(body.match(/data-e2e="signup"/g)?.length).toBe(1)
    expect(body).not.toMatch(/<footer.*data-e2e="signup"/s)
    const readNext = body.match(/data-e2e="read-next".*?<\/section>/s)?.[0] ?? ``
    expect(stories(readNext)).toEqual([
      `/bai-viet/vai-du-hai-lop`,
      `/bai-viet/giat-do-tap`,
      `/bai-viet/bai-thu-tu`,
    ])
  })

  it(`answers 404 in the shop's frame for a post that is not live`, async () => {
    const { status, body } = await shop().fetch(`/bai-viet/khong-co`)

    expect(status).toBe(404)
    expect(body).toContain(`Không tìm thấy bài viết này.`)
    expect(body).toContain(`data-e2e="shop-frame"`)
  })

  it(`answers 404 for a post written in another language`, async () => {
    const spanish = { ...SAMPLE_POSTS[1], language: `es` as const }
    const { status } = await shop({ posts: [SAMPLE_POSTS[0], spanish] })
      .fetch(`/bai-viet/vai-du-hai-lop`)

    expect(status).toBe(404)
  })

  it(`is reached from Seed's address of a post, which an issue's button links to`, async () => {
    const { status, headers } = await shop().fetch(`/blog/chon-size-ao-khoac`)

    expect(status).toBe(301)
    expect(headers.get(`location`)).toBe(jacketPost)
  })
})

describe(`signing up without JavaScript`, () => {
  it(`says the link is sent, naming the address, the same for a new and a listed address`, async () => {
    const { fetch, calls } = shop()

    const fresh = await fetch(`/nhan-tin`, form({ email: `new@example.com`, list: `news` }))
    const listed = await fetch(`/nhan-tin`, form({ email: `old@example.com`, list: `news` }))

    expect(fresh.status).toBe(200)
    expect(fresh.body).toContain(`Kiểm tra hộp thư`)
    expect(fresh.body).toContain(`Shop vừa gửi link xác nhận đến new@example.com.`)
    // The pages differ only in the address and the render's nonce.
    const page = (body: string) => body.replaceAll(/nonce="[^"]*"/g, ``)
    expect(page(listed.body).replaceAll(`old@`, `new@`)).toBe(page(fresh.body))
    expect(calls.filter((call) => call.path === `/api/subscribers`).map((call) => call.body))
      .toEqual([
        { email: `new@example.com`, list: `news` },
        { email: `old@example.com`, list: `news` },
      ])
  })

  it(`asks for an address when the field is empty, without asking the API`, async () => {
    const { fetch, calls } = shop()
    const { status, body } = await fetch(`/nhan-tin`, form({ email: `  `, list: `news` }))

    expect(status).toBe(400)
    expect(body).toContain(`Nhập email để nhận tin.`)
    const input = body.match(/<input[^>]*name="email"[^>]*>/)?.[0] ?? ``
    expect(input).toContain(`autofocus`)
    expect(input).toMatch(/aria-describedby="[^"]*signup-email-error/)
    expect(body).toMatch(/id="signup-email-error"[^>]*>Nhập email để nhận tin\./)
    expect(calls.some((call) => call.path === `/api/subscribers`)).toBe(false)
  })

  it(`ties a refused address to the field, keeps it typed, and gives it focus`, async () => {
    const { status, body } = await shop().fetch(`/nhan-tin`, form({ email: `ten`, list: `news` }))

    expect(status).toBe(400)
    expect(body).toContain(`Email này chưa đúng. Kiểm tra lại, ví dụ: ten@gmail.com`)
    expect(body).toMatch(/<input[^>]*value="ten"/)
    expect(body).not.toContain(`Refused in English`)
  })

  it(`says the link could not be sent under the form when the API fails`, async () => {
    const { status, body } = await shop({ subscribeStatus: 502 })
      .fetch(`/nhan-tin`, form({ email: `an@example.com`, list: `news` }))

    expect(status).toBe(502)
    expect(body).toMatch(
      /role="alert"[^>]*>Chưa gửi được link xác nhận\. Thử lại sau một phút nhé\./,
    )
    expect(body).toMatch(/<input[^>]*value="an@example\.com"/)
  })

  it(`keeps the sign-up page out of search results`, async () => {
    const { body } = await shop().fetch(`/nhan-tin`)

    expect(body).toMatch(NOINDEX)
    expect(body.match(/data-e2e="signup"/g)?.length).toBe(1)
  })
})

describe(`the mailed links`, () => {
  it(`open the confirm page in the shop's frame, in Vietnamese, unlisted and never stored`, async () => {
    const link = new URL(subscriberConfirmLink(site, `news`, `token-1`))
    const { status, headers, body } = await shop().fetch(`${link.pathname}${link.search}`)

    expect(status).toBe(200)
    expect(body).toContain(`data-e2e="shop-frame"`)
    expect(body).toContain(`Gửi tin mẫu mới đến an@example.com?`)
    expect(body).toMatch(NOINDEX)
    expect(headers.get(`cache-control`)).toBe(`no-store`)
    expect(headers.get(`referrer-policy`)).toBe(`no-referrer`)
  })

  it(`confirm with a click, then say so with a link to the catalog`, async () => {
    const { fetch } = shop()
    const posted = await fetch(`/subscribe/confirm`, form({ list: `news`, token: `token-1` }))
    expect(posted.status).toBe(303)
    expect(posted.headers.get(`location`)).toBe(`/subscribe/confirm?state=done`)

    const { body } = await fetch(`/subscribe/confirm?state=done`)
    expect(body).toContain(`Bạn đã đăng ký nhận tin`)
    expect(body).toMatch(/<a[^>]*href="\/"[^>]*>Xem mẫu mới<\/a>/)
  })

  it(`unsubscribe in Vietnamese, then offer to sign up again at /nhan-tin`, async () => {
    const { fetch } = shop()
    const asked = await fetch(`/unsubscribe?list=news&token=token-1`)
    expect(asked.body).toContain(`Ngừng gửi tin mẫu mới đến an@example.com?`)
    expect(asked.headers.get(`cache-control`)).toBe(`no-store`)

    const { body } = await fetch(`/unsubscribe?state=done`)
    expect(body).toContain(`Bạn đã hủy đăng ký`)
    expect(body).toMatch(/<a[^>]*href="\/nhan-tin"[^>]*>Đăng ký lại<\/a>/)
  })
})

describe(`search engines and assistants`, () => {
  it(`find the blog and each post in the sitemap, with dates and covers`, async () => {
    const { body } = await shop().fetch(`/sitemap.xml`)

    const entry = (path: string) =>
      body.match(new RegExp(`<url>\\s*<loc>${site}${path}</loc>.*?</url>`, `s`))?.[0] ?? ``
    expect(entry(`/bai-viet`)).toContain(`<lastmod>2026-10-28`)
    expect(entry(`/bai-viet/chon-size-ao-khoac`)).toContain(`<lastmod>2026-10-28`)
    expect(entry(`/bai-viet/chon-size-ao-khoac`)).toContain(`<image:loc>${site}/anh/`)
    expect(entry(`/bai-viet/giat-do-tap`)).toContain(`<lastmod>2026-10-27`)
    expect((await shop({ posts: [] }).fetch(`/sitemap.xml`)).body).not.toContain(`/bai-viet`)
  })

  it(`find the posts in llms.txt`, async () => {
    const { body } = await shop().fetch(`/llms.txt`)

    expect(body).toContain(`## Bài viết (Tiếng Việt)`)
    expect(body).toContain(
      `[Chọn size áo khoác zip cho buổi chạy sáng](${site}/bai-viet/chon-size-ao-khoac)`,
    )
  })
})

describe(`the privacy page`, () => {
  it(`says what the newsletter keeps, and no longer promises no promotional email`, async () => {
    const { body } = await shop().fetch(`/privacy`)

    expect(body).toContain(`Nếu bạn đăng ký nhận tin, chúng tôi lưu email của bạn cho đến khi bạn`)
    expect(body).toContain(`không gửi email nào bạn không đăng`)
    expect(body).not.toContain(`không gửi email quảng cáo`)
    expect(body).toContain(`If you subscribe, we keep your`)
  })
})
