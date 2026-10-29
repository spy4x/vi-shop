/**
 * The website's two languages and the address of every shop page in each. Vietnamese is the
 * default and lives at `/`; English at `/en` and under it. Items and categories keep the same slug in
 * both; the fixed pages have a path of their own in each language (docs/shop/spec.md, "SEO and
 * AEO").
 *
 * @module
 */

/** A language the website is written in. */
export type Lang = `vi` | `en`

/** Every language, the default first. */
export const LANGS: readonly Lang[] = [`vi`, `en`]

/** The language of a path: English under `/en`, Vietnamese everywhere else. */
export function langOf(path: string): Lang {
  return path === `/en` || path.startsWith(`/en/`) ? `en` : `vi`
}

/** The fixed pages, by language. */
export const PATHS = {
  home: { vi: `/`, en: `/en` },
  list: { vi: `/danh-sach`, en: `/en/list` },
  faq: { vi: `/hoi-dap`, en: `/en/faq` },
  order: { vi: `/dat-hang`, en: `/en/order` },
} as const satisfies Record<string, Record<Lang, string>>

/** A category's page, such as `/ao-khoac` or `/en/ao-khoac`. */
export function categoryPath(lang: Lang, category: string): string {
  return lang === `vi` ? `/${category}` : `/en/${category}`
}

/** An item's page, such as `/ao-khoac/ao-khoac-zip-nau`. */
export function itemPath(lang: Lang, category: string, item: string): string {
  return `${categoryPath(lang, category)}/${item}`
}

/**
 * The same page in the other language: a fixed page maps to its twin, any other path gains or
 * loses the `/en` prefix. The query is dropped, so the switch never carries a filter's state.
 */
export function twinPath(path: string): string {
  for (const pair of Object.values(PATHS)) {
    if (pair.vi === path) return pair.en
    if (pair.en === path || `${pair.en}/` === path) return pair.vi
  }
  if (path === `/en`) return `/`
  return langOf(path) === `en` ? path.slice(3) : `/en${path}`
}
