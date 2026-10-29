// The shop's own Vietnamese words: Seed's `site` catalog has no Vietnamese, and the
// storefront keeps its words in `shop/words.ts` (AGENTS.md, "Languages").
// deno-lint-ignore-file ui-text/no-literal
import type { ComponentChildren, JSX } from "preact"
import { Head } from "fresh/runtime"
import { IconTag } from "@spy4x/preact-icons"
import { BrandMark } from "@spy4x/preact-ui/brand-mark"
import { FormatContext } from "@spy4x/preact-ui/format"
import { SEOHead } from "@spy4x/preact-system/seo-head"
import { SiteFooter, type SiteFooterGroup } from "@spy4x/preact-system/site-footer"
import { SiteHeader } from "@spy4x/preact-system/site-header"
import { breadcrumbListJsonLd } from "@spy4x/platform/universal/seo"
import { createFormatters } from "@spy4x/time/format"
import { AUTHOR_URL, REPOSITORY_URL, SITE_NAME } from "./brand.ts"
import { contactFooterLinks } from "./contact-links.ts"
import type { State } from "./utils.ts"

export { AUTHOR_URL, REPOSITORY_URL, SITE_NAME }

/** The language every page is written in, as `<html lang>` and Open Graph name it. */
export const SITE_LANG = `vi`

/**
 * How the website writes a date: Vietnamese, in UTC, so the server's own locale and zone never
 * change what a page says.
 */
const SITE_FORMAT = createFormatters({ locale: `vi-VN`, timeZone: `UTC` })

/** A page's breadcrumb trail, always rooted at the home page's full address. */
export function siteBreadcrumbsJsonLd(origin: string, path: string, name: string): unknown {
  return breadcrumbListJsonLd(`${origin}${path}`, [
    { name: SITE_NAME, href: `${origin}/` },
    { name },
  ])
}

/** The title and description of one page, for its `<head>` and its social previews. */
export interface SitePageHead {
  title: string
  description: string
  /** Keeps the page out of search results, as for an error page. */
  noindex?: boolean
  /** An image the page shares with, such as an item's photo. Its size is not stated. */
  image?: { url: string; alt: string }
  /** Structured data about the page, for its JSON-LD graph. */
  jsonLd?: readonly unknown[]
}

/**
 * A page's `<title>`: its own title, then the site's name, unless the title names the site
 * already, so no title says it twice.
 */
export function pageTitle(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`
}

/** What every page hands {@link SiteFrame}. */
export interface SiteFrameProps {
  /** The request's state: the website's own origin, for canonical links, and the contact links. */
  state: Pick<State, "webAppOrigin" | "contactLinks">
  /** The page's path on this website, such as `/privacy`, for its canonical address. */
  path: string
  head: SitePageHead
  children: ComponentChildren
}

/** The footer's links: the two legal pages, then the shop's contact links once there are any. */
const LEGAL_GROUP: SiteFooterGroup[] = [
  {
    title: `Thông tin`,
    links: [
      { label: `Quyền riêng tư`, href: `/privacy` },
      { label: `Điều khoản`, href: `/terms` },
    ],
  },
]

/**
 * The frame of every page of the public website: its head tags, a link that skips to the content,
 * the header with the shop's name, the content, and the footer with the legal pages and contacts. Every link
 * works with JavaScript turned off.
 */
export function SiteFrame({ state, path, head, children }: SiteFrameProps): JSX.Element {
  return (
    <>
      <Head>
        <SEOHead
          title={pageTitle(head.title)}
          description={head.description}
          canonical={`${state.webAppOrigin}${path}`}
          ogImage={head.image?.url}
          imageAlt={head.image?.alt}
          siteName={SITE_NAME}
          locale="vi_VN"
          noindex={head.noindex}
          jsonLd={head.jsonLd}
        />
      </Head>
      <a
        href="#main"
        class="sr-only rounded-control bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        data-e2e="skip-link"
      >
        Bỏ qua, đến nội dung
      </a>
      <SiteHeader
        currentPath={path}
        labels={{ menu: `Menu`, nav: `Điều hướng chính` }}
        brand={
          <a href="/" class="rounded-control" data-e2e="site-brand">
            <BrandMark Icon={IconTag} name={SITE_NAME} />
          </a>
        }
      />
      <main id="main" tabIndex={-1} class="outline-none">
        <FormatContext.Provider value={SITE_FORMAT}>{children}</FormatContext.Provider>
      </main>
      <SiteFooter
        brand={<BrandMark Icon={IconTag} name={SITE_NAME} />}
        groups={[
          ...LEGAL_GROUP,
          ...((state.contactLinks ?? []).length > 0
            ? [{ title: `Liên hệ`, links: contactFooterLinks(state.contactLinks ?? []) }]
            : []),
        ]}
        bottom={<p>© {SITE_NAME}</p>}
      />
    </>
  )
}

/** What a legal page hands {@link LegalPage}: its frame's props, with its title and summary. */
export interface LegalPageProps extends Omit<SiteFrameProps, "head"> {
  title: string
  /** The `<title>` and social title, when it says more than the `h1`. Defaults to `title`. */
  headTitle?: string
  description: string
  /** The date the text last changed, as people read it, such as `28/10/2026`. */
  updated: string
}

/**
 * A legal page's structured data: the page itself, part of the site the home page declares, and
 * its place under the home page.
 */
function legalPageJsonLd(
  origin: string,
  path: string,
  crumb: string,
  name: string,
  description: string,
): unknown[] {
  const url = `${origin}${path}`
  return [
    {
      "@type": `WebPage`,
      "@id": `${url}#webpage`,
      url,
      name,
      description,
      inLanguage: SITE_LANG,
      isPartOf: { "@id": `${origin}/#website` },
    },
    siteBreadcrumbsJsonLd(origin, path, crumb),
  ]
}

/**
 * A legal page: its title, the date it last changed, and its text in one reading column. Headings,
 * lists and links inside `children` get the page's prose styles.
 */
export function LegalPage(
  { state, path, title, headTitle, description, updated, children }: LegalPageProps,
): JSX.Element {
  return (
    <SiteFrame
      state={state}
      path={path}
      head={{
        title: headTitle ?? title,
        description,
        jsonLd: legalPageJsonLd(state.webAppOrigin, path, title, headTitle ?? title, description),
      }}
    >
      <div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 lg:py-16">
        <header class="flex flex-col gap-4">
          <h1 class="text-3xl font-semibold tracking-tight lg:text-4xl">{title}</h1>
          <p class="font-mono text-sm text-muted">Cập nhật lần cuối: {updated}</p>
        </header>
        <article class="flex min-w-0 flex-col gap-4 [&_a]:text-primary [&_a]:underline [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:text-pretty [&_p]:text-pretty [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {children}
        </article>
      </div>
    </SiteFrame>
  )
}
