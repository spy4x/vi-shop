import { homeRoute } from "../shop/list-pages.tsx"
import { WORDS } from "../shop/words.ts"
import type { SitePageHead } from "../site.tsx"

/** The home page's title and description, as search results, social previews and `llms.txt` show them. */
export const HOME_HEAD = {
  title: WORDS.vi.homeTitle,
  description: WORDS.vi.homeDescription,
} as const satisfies SitePageHead

const route = homeRoute(`vi`)
export const handler = route.handler
export default route.component
