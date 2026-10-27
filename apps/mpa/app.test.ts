import { expect } from "@std/expect"
import { describe, it } from "@std/testing/bdd"
import { App } from "fresh"
import { setBuildCache } from "fresh/internal"
import { asset } from "fresh/runtime"
import { readFormBody } from "@spy4x/server/http/bounded-body"
import { API_BODIES, FORM_LIMITS } from "./forms.ts"
import {
  pageMiddleware,
  securityHeadersMiddleware,
  staticFilesMiddleware,
  UNVERSIONED_FILE_CACHE,
} from "./middleware.ts"
import type { MpaConfig } from "./config.ts"
import type { State } from "./utils.ts"

const config: MpaConfig = {
  apiUrl: "http://api:8000",
  webAppOrigin: "https://app.example.com",
  apiOrigin: "https://app.example.com",
}
const sameOrigin = { origin: config.webAppOrigin, "sec-fetch-site": "same-origin" }
const info = {
  remoteAddr: { transport: "tcp", hostname: "192.0.2.7", port: 4000 },
  completed: Promise.resolve(),
} as Deno.ServeHandlerInfo<Deno.NetAddr>

/** A fake API that answers every call with `answer()` and records each request's JSON body. */
function fakeApi(answer: (path: string, method: string) => Response) {
  const calls: { method: string; path: string; body: unknown }[] = []
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init)
    const path = new URL(request.url).pathname
    const text = await request.text()
    calls.push({ method: request.method, path, body: text ? JSON.parse(text) : null })
    return answer(path, request.method)
  }
  return { calls, fetch: fetch as typeof globalThis.fetch }
}

/**
 * A form action as a page of the website writes one: it reads the form within the website's limits
 * and posts it to the API. The shop's website has no form of its own yet, so the middleware's tests
 * post to this one.
 */
async function subscribeAction(ctx: { req: Request; state: State }): Promise<Response> {
  const body = API_BODIES.subscribe(await readFormBody(ctx.req, FORM_LIMITS))
  await ctx.state.api.call("POST", "/api/subscribers", body)
  return new Response(null, { status: 303, headers: { location: "/subscribe?state=sent" } })
}

function appWith(fetch: typeof globalThis.fetch, newsletter: () => boolean = () => true) {
  return new App<State>()
    .use(pageMiddleware(config, fetch, newsletter))
    .get("/page", (ctx) => ctx.html("<p>page</p>"))
    .post("/subscribe", subscribeAction)
    .handler()
}

/** Runs `run` and returns every line it wrote with `console.error`, as text. */
async function errorLog(run: () => Promise<void>): Promise<string[]> {
  const logged: string[] = []
  const original = console.error
  console.error = (...args: unknown[]) => void logged.push(args.map(String).join(" "))
  try {
    await run()
  } finally {
    console.error = original
  }
  return logged
}

function formPost(path: string, fields: Record<string, string>, headers = sameOrigin): Request {
  return new Request(`${config.webAppOrigin}${path}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(fields),
  })
}

describe("pageMiddleware", () => {
  const subscription = { email: "ada@example.com", list: "news" }

  it("refuses a subscription another site posts before the API hears of it", async () => {
    const { calls, fetch } = fakeApi(() => Response.json({}, { status: 202 }))

    const response = await appWith(fetch)(
      formPost("/subscribe", subscription, {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      }),
      info,
    )

    expect(response.status).toBe(403)
    expect(calls).toEqual([])
  })

  it("lets the site's own subscribe form through to the API", async () => {
    const { calls, fetch } = fakeApi(() => Response.json({}, { status: 202 }))

    const response = await appWith(fetch)(formPost("/subscribe", subscription), info)

    expect(response.status).not.toBe(403)
    expect(calls.map((call) => call.path)).toEqual(["/api/subscribers"])
  })

  it("lets a same-origin post under no-referrer through, whose origin is null", async () => {
    const { calls, fetch } = fakeApi(() => Response.json({}, { status: 202 }))

    const response = await appWith(fetch)(
      formPost("/subscribe", subscription, { origin: "null", "sec-fetch-site": "same-origin" }),
      info,
    )

    expect(response.status).not.toBe(403)
    expect(calls).toHaveLength(1)
  })

  it("answers a form over the size cap with 413 and never calls the API", async () => {
    const { calls, fetch } = fakeApi(() => Response.json({}))

    const response = await appWith(fetch)(
      formPost("/subscribe", { email: "x".repeat(300 * 1024), list: "news" }),
      info,
    )

    expect(response.status).toBe(413)
    expect(calls).toEqual([])
  })

  it("answers 400 to a post whose body is not a form and never calls the API", async () => {
    const { calls, fetch } = fakeApi(() => Response.json({}))
    const request = new Request(`${config.webAppOrigin}/subscribe`, {
      method: "POST",
      headers: { ...sameOrigin, "content-type": "application/json" },
      body: JSON.stringify({ email: "ada@example.com", list: "news" }),
    })

    const response = await appWith(fetch)(request, info)

    expect(response.status).toBe(400)
    expect(calls).toEqual([])
  })

  it("lets a browser keep a page but revalidate it before showing it again", async () => {
    const { fetch } = fakeApi(() => Response.json({}))

    const response = await appWith(fetch)(new Request(`${config.webAppOrigin}/page`), info)

    expect(response.headers.get("cache-control")).toBe("no-cache")
  })
})

describe("securityHeadersMiddleware", () => {
  /** The app as `main.ts` builds it: the security headers first, then the page middleware. */
  async function securedApp(appConfig = config) {
    const { fetch } = fakeApi(() => Response.json({}))
    return new App<State>()
      .use(await securityHeadersMiddleware(appConfig))
      .use(pageMiddleware(appConfig, fetch, () => true))
      .get("/page", (ctx) => ctx.html("<p>page</p>"))
      .get("/broken", () => {
        throw new Error("a route failed")
      })
      .post("/subscribe", subscribeAction)
      .handler()
  }

  const policy =
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; " +
    "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; " +
    "frame-ancestors 'none'"

  function expectSecurityHeaders(response: Response) {
    expect(response.headers.get("content-security-policy")).toBe(policy)
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    expect(response.headers.get("x-frame-options")).toBe("DENY")
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=15552000; includeSubDomains",
    )
  }

  it("sends the policy, nosniff, no-referrer, the frame ban and HSTS with a page", async () => {
    const response = await (await securedApp())(new Request(`${config.webAppOrigin}/page`), info)

    expect(response.status).toBe(200)
    expectSecurityHeaders(response)
    expect(response.headers.get("cache-control")).toBe("no-cache")
  })

  it("sends them with the 404 of an unknown address, inside the site's frame", async () => {
    const response = await (await securedApp())(new Request(`${config.webAppOrigin}/nope`), info)

    expect(response.status).toBe(404)
    expectSecurityHeaders(response)
    const page = await response.text()
    expect(page).toContain("Không tìm thấy trang")
    expect(page).toContain(`data-e2e="site-brand"`)
  })

  it("sends them with the 500 of a route that throws, inside the site's frame, and logs the error with the path but not the query", async () => {
    let response = new Response()
    const logged = await errorLog(async () => {
      response = await (await securedApp())(
        new Request(`${config.webAppOrigin}/broken?token=token-from-the-link`),
        info,
      )
    })

    expect(response.status).toBe(500)
    expectSecurityHeaders(response)
    expect(response.headers.get("cache-control")).toBe("no-cache")
    const page = await response.text()
    expect(page).toContain("Đã có lỗi xảy ra")
    expect(page).toContain(`data-e2e="site-brand"`)
    expect(logged).toHaveLength(1)
    expect(logged[0]).toContain("GET /broken failed")
    expect(logged[0]).toContain("a route failed")
    expect(logged[0]).not.toContain("token-from-the-link")
  })

  it("sends them with the refusal of a post from another site", async () => {
    const response = await (await securedApp())(
      formPost("/subscribe", { email: "ada@example.com", list: "news" }, {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      }),
      info,
    )

    expect(response.status).toBe(403)
    expectSecurityHeaders(response)
  })

  it("lets a form on a website with its own domain redirect to the SPA, and nowhere else", async () => {
    const website = { ...config, webAppOrigin: "https://www.example.com" }

    const response = await (await securedApp(website))(
      new Request(`${website.webAppOrigin}/page`),
      info,
    )

    expect(response.headers.get("content-security-policy")).toBe(
      policy.replace("form-action 'self'", "form-action 'self' https://app.example.com"),
    )
  })

  it("allows the Umami origin to load its tracker and take its events, and nothing more", async () => {
    const analytics = { origin: "https://stats.example.com", websiteId: "site" }

    const response = await (await securedApp({ ...config, analytics }))(
      new Request(`${config.webAppOrigin}/page`),
      info,
    )

    expect(response.headers.get("content-security-policy")).toBe(
      policy
        .replace("script-src 'self'", "script-src 'self' https://stats.example.com")
        .replace("connect-src 'self'", "connect-src 'self' https://stats.example.com"),
    )
  })
})

describe("an MPA on its own domain", () => {
  const ownDomain = { ...config, webAppOrigin: "https://www.example.com" }

  /** An app whose one action calls the API, with a fake API that records each call's headers. */
  function ownDomainApp() {
    const seen: Headers[] = []
    const fetch = (input: string | URL | Request, init?: RequestInit) => {
      seen.push(new Request(input, init).headers)
      return Promise.resolve(Response.json({}))
    }
    const handler = new App<State>()
      .use(pageMiddleware(ownDomain, fetch as typeof globalThis.fetch, () => true))
      .post("/act", async (ctx) => {
        await ctx.state.api.call("POST", "/api/subscribers")
        return new Response(null, { status: 204 })
      })
      .handler()
    const post = (headers: Record<string, string>) =>
      handler(new Request(`${ownDomain.webAppOrigin}/act`, { method: "POST", headers }), info)
    return { seen, post }
  }

  it("presents its own posts to the API as coming from the API's origin", async () => {
    const { seen, post } = ownDomainApp()

    const response = await post({ origin: ownDomain.webAppOrigin, "sec-fetch-site": "same-origin" })

    expect(response.status).toBe(204)
    expect(seen[0].get("origin")).toBe(ownDomain.apiOrigin)
    expect(seen[0].get("sec-fetch-site")).toBe("same-origin")
  })

  it("refuses a post from the API's origin before calling the API", async () => {
    const { seen, post } = ownDomainApp()

    const response = await post({ origin: ownDomain.apiOrigin, "sec-fetch-site": "same-origin" })

    expect(response.status).toBe(403)
    expect(seen).toEqual([])
  })

  it("passes an origin of null on unchanged for the API to judge", async () => {
    const { seen, post } = ownDomainApp()

    await post({ origin: "null", "sec-fetch-site": "same-origin" })

    expect(seen[0].get("origin")).toBe("null")
  })
})

describe("staticFilesMiddleware", () => {
  /** An app in production mode whose build holds one static file, `/shots/home.webp`. */
  function staticApp() {
    const app = new App<State>().use(staticFilesMiddleware())
    setBuildCache(app, {
      root: ".",
      islandRegistry: new Map(),
      clientEntry: "",
      features: { errorOverlay: false },
      getFsRoutes: () => [],
      getEntryAssets: () => [],
      readFile: (pathname) =>
        Promise.resolve(
          pathname === "/shots/home.webp"
            ? {
              hash: "home",
              size: 4,
              contentType: "image/webp",
              readable: new Uint8Array(4),
              close: () => {},
            }
            : null,
        ),
    }, "production")
    return app.handler()
  }

  it("sends a file whose address carries the build id as immutable for a year", async () => {
    const response = await staticApp()(
      new Request(`${config.webAppOrigin}${asset("/shots/home.webp")}`),
      info,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable")
  })

  it("sends a file whose address has no build id for an hour, never as immutable", async () => {
    const response = await staticApp()(
      new Request(`${config.webAppOrigin}/shots/home.webp`),
      info,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe(UNVERSIONED_FILE_CACHE)
    expect(UNVERSIONED_FILE_CACHE).toBe("public, max-age=3600")
  })
})
