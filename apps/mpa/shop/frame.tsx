import type { ComponentChildren, JSX } from "preact"
import { Head } from "fresh/runtime"
import { IconTag } from "@spy4x/preact-icons"
import { BrandMark } from "@spy4x/preact-ui/brand-mark"
import { buttonClasses } from "@spy4x/preact-ui/button"
import { SEOHead } from "@spy4x/preact-system/seo-head"
import { SiteFooter } from "@spy4x/preact-system/site-footer"
import { SiteHeader } from "@spy4x/preact-system/site-header"
import { SITE_NAME } from "../brand.ts"
import { contactFooterLinks } from "../contact-links.ts"
import type { State } from "../utils.ts"
import { text } from "./catalog.ts"
import { categoryPath, type Lang, LANGS, PATHS, twinPath } from "./lang.ts"
import { WORDS } from "./words.ts"

/** The head of one shop page: its title, description, share image and structured data. */
export interface ShopHead {
  title: string
  description: string
  image?: { url: string; alt: string; width?: number; height?: number }
  noindex?: boolean
  jsonLd?: readonly unknown[]
}

/** What every shop page hands {@link ShopFrame}. */
export interface ShopFrameProps {
  state: Pick<State, `webAppOrigin` | `contactLinks` | `catalog` | `listCount`>
  lang: Lang
  /** The page's path in this language, for its canonical address and its twin's. */
  path: string
  head: ShopHead
  /** Whether the page has a twin in the other language: every shop page does, a legal page not. */
  twin?: boolean
  children: ComponentChildren
}

/** A page's `<title>`: its own words, then the shop's name unless they already say it. */
export function shopTitle(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`
}

/**
 * The frame of every shop page, in the page's language: the head with its canonical address and
 * `hreflang` links to both languages (`x-default` is Vietnamese), a skip link, the header with the
 * categories, the FAQ, the language switch and the order list, the content, and the footer with
 * the contact links. Every link works without JavaScript. The page is a column at least the
 * screen's height, so the footer stays at the bottom of a short page.
 */
export function ShopFrame(
  { state, lang, path, head, twin = true, children }: ShopFrameProps,
): JSX.Element {
  const words = WORDS[lang]
  const origin = state.webAppOrigin
  const other = twinPath(path)
  const byLang = { [lang]: path, [LANGS.find((each) => each !== lang)!]: other }
  const categories = (state.catalog?.categories ?? []).map((category) => ({
    label: text(category.name, lang),
    href: categoryPath(lang, category.slug),
  }))
  return (
    <>
      <Head>
        <SEOHead
          title={shopTitle(head.title)}
          description={head.description}
          canonical={`${origin}${path}`}
          ogImage={head.image?.url}
          imageAlt={head.image?.alt}
          imageWidth={head.image?.width}
          imageHeight={head.image?.height}
          siteName={SITE_NAME}
          locale={words.ogLocale}
          noindex={head.noindex}
          jsonLd={head.jsonLd}
        />
        {twin &&
          LANGS.map((each) => (
            <link key={each} rel="alternate" hreflang={each} href={`${origin}${byLang[each]}`} />
          ))}
        {twin && <link rel="alternate" hreflang="x-default" href={`${origin}${byLang.vi}`} />}
      </Head>
      {/* A column at least the screen's height, so a short page keeps its footer at the bottom. */}
      <div class="flex min-h-dvh flex-col" data-e2e="shop-frame">
        <a
          href="#main"
          class="sr-only rounded-control bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
          data-e2e="skip-link"
        >
          {words.skip}
        </a>
        <SiteHeader
          currentPath={path}
          labels={{ menu: words.menu, nav: words.nav }}
          brand={
            <a href={PATHS.home[lang]} class="rounded-control" data-e2e="site-brand">
              <BrandMark Icon={IconTag} name={SITE_NAME} />
            </a>
          }
          links={[...categories, { label: words.faq, href: PATHS.faq[lang] }]}
          actions={
            <div class="flex items-center gap-1">
              <a
                href={twin ? other : PATHS.home[lang === `vi` ? `en` : `vi`]}
                hreflang={words.switchLang}
                lang={words.switchLang}
                aria-label={words.switchName}
                class={buttonClasses(`ghost`, `sm`)}
                data-e2e="language-switch"
              >
                {words.switchShort}
              </a>
              <a
                href={PATHS.list[lang]}
                class={buttonClasses(`ghost`, `sm`, `tabular-nums`)}
                data-e2e="list-link"
              >
                {words.listCount(state.listCount ?? 0)}
              </a>
            </div>
          }
        />
        <main id="main" tabIndex={-1} class="flex-1 outline-none">{children}</main>
        <SiteFooter
          brand={<BrandMark Icon={IconTag} name={SITE_NAME} />}
          groups={[
            ...(categories.length > 0 ? [{ title: words.categories, links: categories }] : []),
            {
              title: words.info,
              links: [
                { label: words.faq, href: PATHS.faq[lang] },
                { label: words.privacy, href: `/privacy` },
                { label: words.terms, href: `/terms` },
              ],
            },
            ...((state.contactLinks ?? []).length > 0
              ? [{ title: words.contact, links: contactFooterLinks(state.contactLinks ?? []) }]
              : []),
          ]}
          bottom={<p>© {SITE_NAME}</p>}
        />
      </div>
    </>
  )
}
