import { HOME_HEAD } from "./routes/index.tsx"
import { PRIVACY_HEAD } from "./routes/privacy.tsx"
import { TERMS_HEAD } from "./routes/terms.tsx"

/** One public page, as `sitemap.xml` and `llms.txt` describe it. */
export interface SitePage {
  path: string
  /** The page's `<title>`, taken from its head. */
  title: string
  /** The page's meta description, taken from its head. */
  description: string
  /**
   * The day the page's content last changed, `YYYY-MM-DD`, when the page states one itself. Never
   * the build date: a date that changes on every deploy tells a crawler nothing.
   */
  updated?: string
  /**
   * The page is English at every language's address, such as a legal page, so only its English
   * address is listed. Every other page is listed once per language.
   */
  oneLanguage?: boolean
}

/** A page entry from its head, so the title and description are written once, on the page. */
function sitePage(
  path: string,
  head: { title: string; description: string },
  updated?: string,
  oneLanguage?: boolean,
): SitePage {
  return { path, title: head.title, description: head.description, updated, oneLanguage }
}

/**
 * The website's public pages, in the order a visitor meets them. It lives apart from `site.tsx`
 * because it reads every page's head, and every page imports `site.tsx`.
 */
export const SITE_PAGES: readonly SitePage[] = [
  sitePage(`/`, HOME_HEAD),
  sitePage(`/privacy`, PRIVACY_HEAD, PRIVACY_HEAD.updated),
  sitePage(`/terms`, TERMS_HEAD, TERMS_HEAD.updated),
]
