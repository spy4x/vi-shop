import { NEWS_PATHS } from "../../shop/lang.ts"
import { define } from "../../utils.ts"

/** Seed's address of the blog, which its admin links to: the shop's is `/bai-viet`. */
export const handler = define.handlers({
  GET: () => new Response(null, { status: 301, headers: { location: NEWS_PATHS.blog } }),
})
