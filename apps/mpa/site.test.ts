import { expect } from "@std/expect"
import { describe, it } from "@std/testing/bdd"
import { App } from "fresh"
import AppWrapper from "./routes/_app.tsx"
import Home from "./routes/index.tsx"
import Privacy from "./routes/privacy.tsx"
import Terms from "./routes/terms.tsx"
import { handler as robots } from "./routes/robots.txt.ts"
import { handler as sitemap } from "./routes/sitemap.xml.ts"
import { handler as llms } from "./routes/llms.txt.ts"
import { pageMiddleware } from "./middleware.ts"
import type { State } from "./utils.ts"

/** The website on its own domain, next to the API's host, as in production. */
const config = {
  apiUrl: "http://api:8000",
  webAppOrigin: "https://shop.example.com",
  apiOrigin: "https://app.example.com",
}
const site = config.webAppOrigin
const info = {
  remoteAddr: { transport: "tcp", hostname: "192.0.2.7", port: 4000 },
  completed: Promise.resolve(),
} as Deno.ServeHandlerInfo<Deno.NetAddr>

const neverCalled = () => Promise.reject(new Error("the website called the API"))

/** A page component, typed for `App.route`: `define.page` types its props for one handler. */
const view = (component: unknown) => component as Parameters<App<State>["appWrapper"]>[0]

/** The website's pages behind its middleware and its `_app` document, as in production. */
const handler = new App<State>()
  .use(pageMiddleware(config, neverCalled, () => false))
  .appWrapper(view(AppWrapper))
  .route("/", { component: view(Home) })
  .route("/privacy", { component: view(Privacy) })
  .route("/terms", { component: view(Terms) })
  .get("/robots.txt", robots.GET!)
  .get("/sitemap.xml", sitemap.GET!)
  .get("/llms.txt", llms.GET!)
  .handler()

async function get(path: string): Promise<{ status: number; body: string }> {
  const response = await handler(new Request(`${site}${path}`), info)
  return { status: response.status, body: await response.text() }
}

describe("the shop's website", () => {
  it("serves the home page in Vietnamese, with its one English line marked as English", async () => {
    const { status, body } = await get("/")

    expect(status).toBe(200)
    expect(body).toContain(`<html lang="vi"`)
    expect(body).toContain(`<title>Vi shop: quần áo, sắp ra mắt</title>`)
    expect(body).toMatch(/<p lang="en"[^>]*data-e2e="home-english"[^>]*>Vi shop/)
  })

  it("names neither Seed nor its author's offer, and links to no page that is gone", async () => {
    for (const path of ["/", "/privacy", "/terms"]) {
      const { body } = await get(path)
      expect(body).not.toMatch(/Seed|seedsaas|Anton|Hire|\/try|\/pricing|\/features|\/compare/)
    }
  })

  it("links every page to the privacy and terms pages from its footer", async () => {
    for (const path of ["/", "/privacy", "/terms"]) {
      const { body } = await get(path)
      expect(body).toContain(`href="/privacy"`)
      expect(body).toContain(`href="/terms"`)
    }
  })

  it("serves the privacy and terms pages, each with its own heading", async () => {
    expect((await get("/privacy")).body).toContain(`>Quyền riêng tư</h1>`)
    expect((await get("/terms")).body).toContain(`>Điều khoản</h1>`)
  })

  it("lists exactly the three pages in the sitemap, on the website's own origin", async () => {
    const { body } = await get("/sitemap.xml")

    const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
    expect(urls).toEqual([`${site}/`, `${site}/privacy`, `${site}/terms`])
  })

  it("points robots.txt at the one sitemap the website serves", async () => {
    const { body } = await get("/robots.txt")

    expect(body.match(/^Sitemap: .*$/gm)).toEqual([`Sitemap: ${site}/sitemap.xml`])
  })

  it("describes the shop in llms.txt with its pages and its repository", async () => {
    const { body } = await get("/llms.txt")

    expect(body).toContain(`# Vi shop`)
    expect(body).toContain(`${site}/privacy`)
    expect(body).toContain(`https://github.com/spy4x/vi-shop`)
    expect(body).not.toContain(`MIT`)
  })
})
