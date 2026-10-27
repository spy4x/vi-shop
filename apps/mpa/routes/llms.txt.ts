import { llmsTxt } from "@spy4x/platform/universal/seo"
import { REPOSITORY_URL, SITE_NAME } from "../brand.ts"
import { SITE_PAGES } from "../pages.ts"
import { define } from "../utils.ts"
import { HOME_HEAD } from "./index.tsx"

/**
 * The website for AI assistants (llmstxt.org): what the shop is, then every public page with its
 * description, on this website's own origin, and where the website's code lives.
 */
export const handler = define.handlers({
  GET(ctx) {
    const body = llmsTxt({
      title: SITE_NAME,
      summary: HOME_HEAD.description,
      sections: [
        {
          title: `Pages`,
          links: SITE_PAGES.map(({ path, title, description }) => ({
            title,
            url: `${ctx.state.webAppOrigin}${path}`,
            description,
          })),
        },
        {
          title: `Source code`,
          links: [{
            title: `${SITE_NAME} on GitHub`,
            url: REPOSITORY_URL,
            description: `The website's code, built on Seed.`,
          }],
        },
      ],
    })
    return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } })
  },
})
