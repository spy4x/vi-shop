import { storyPath } from "../../shop/lang.ts"
import { define } from "../../utils.ts"

/**
 * Seed's address of a post (`blogPostPath`), which a newsletter issue's button and the admin link
 * to: answers 301 to the shop's own, `/bai-viet/<slug>`.
 */
export const handler = define.handlers({
  GET: (ctx) =>
    new Response(null, {
      status: 301,
      headers: { location: storyPath(encodeURIComponent(ctx.params.slug ?? ``)) },
    }),
})
