import type { ComponentChildren, JSX } from "preact"
import { page } from "fresh"
import { Head } from "fresh/runtime"
import type { PublicBlogPost, PublicBlogPostSummary } from "@domain/blog"
import type { PublicCatalogItem } from "@domain/catalog"
import { DEFAULT_LANGUAGE } from "@domain/identity"
import { blogPostingJsonLd } from "@spy4x/platform/universal/seo"
import { createFormatters, type Formatters } from "@spy4x/time/format"
import { FormatContext } from "@spy4x/preact-ui/format"
import { LookGrid } from "@spy4x/preact-ui/look-grid"
import { Prose } from "@spy4x/preact-ui/prose"
import { RadioChips } from "@spy4x/preact-ui/radio-chips"
import { StoryTile, type StoryTileProps } from "@spy4x/preact-ui/story-tile"
import { TldrBox } from "@spy4x/preact-ui/tldr-box"
import { buttonClasses } from "@spy4x/preact-ui/button"
import { SITE_NAME } from "../brand.ts"
import { listPosts, readFeed, readPost } from "../blog.ts"
import type { Api } from "../api.ts"
import { define } from "../utils.ts"
import { ShopFrame } from "./frame.tsx"
import { NEWS_PATHS, PATHS, storyPath } from "./lang.ts"
import { Looks } from "./looks.tsx"
import { crumbsJsonLd, storeId } from "./seo.ts"
import { SignupForm } from "./signup.tsx"
import { NEWS_WORDS, WORDS } from "./words.ts"

/**
 * The shop's blog (issue #16), in Vietnamese only: the index at `/bai-viet` and each post at
 * `/bai-viet/<slug>`, from Seed's public blog API. Posts are stored under Seed's main language
 * code, which the shop writes in Vietnamese; a post in any other language is not the shop's and
 * answers 404. Every page sets `inLanguage: vi` itself and has no English twin.
 *
 * @module
 */

/** Vietnamese dates in their long form, `29 tháng 10, 2026`, in UTC so every reader sees one day. */
function longDates(format: Formatters): Formatters {
  return {
    ...format,
    date: (value, length = `long`) => format.date(value, length),
    utc: () => longDates(format.utc()),
  }
}
const DATES = longDates(
  createFormatters({ locale: `vi-VN`, timeZone: `UTC` }, {
    device: { locale: `vi-VN`, timeZone: `UTC` },
  }),
)

/** A cover as a tall 3:4 photo: the API knows one address and no sizes, so one width is assumed. */
function coverPhoto(url: string, alt: string): NonNullable<StoryTileProps[`cover`]> {
  return { variants: [{ url, width: 1200, height: 1600, type: imageType(url) }], alt }
}

/** The `Content-Type` a cover's address suggests; JPEG when it says nothing. */
function imageType(url: string): string {
  const extension = new URL(url, `https://x.invalid`).pathname.split(`.`).at(-1)?.toLowerCase()
  return { png: `image/png`, webp: `image/webp`, avif: `image/avif`, svg: `image/svg+xml` }[
    extension ?? ``
  ] ?? `image/jpeg`
}

/** The shop's live posts, newest first: the ones stored under the main language. */
async function shopPosts(api: Api): Promise<PublicBlogPostSummary[]> {
  return (await listPosts(api)).filter((post) => post.language === DEFAULT_LANGUAGE)
}

/**
 * The cover address of each of the newest posts, by slug, from the feed: the API's list of posts
 * names no cover. Empty when the feed cannot be read, and a post then gets a typographic cover.
 */
async function covers(api: Api): Promise<Map<string, string>> {
  try {
    return new Map(
      (await readFeed(api)).flatMap((post) => post.coverUrl ? [[post.slug, post.coverUrl]] : []),
    )
  } catch {
    return new Map()
  }
}

/** One post's tile; the lead one spans two columns from 1024 px. */
function storyTile(
  post: PublicBlogPostSummary,
  cover: string | undefined,
  { lead = false, priority = false, headingLevel = 2 }: {
    lead?: boolean
    priority?: boolean
    headingLevel?: 2 | 3
  } = {},
): JSX.Element {
  return (
    <StoryTile
      key={post.slug}
      href={storyPath(post.slug)}
      title={post.title}
      topic={post.topic ?? undefined}
      publishedAt={post.publishedAt}
      readMinutes={post.readingMinutes}
      cover={cover ? coverPhoto(cover, ``) : undefined}
      lead={lead}
      priority={priority}
      headingLevel={headingLevel}
      viewTransitionName={`story-${post.slug}`}
      labels={{ readTime: NEWS_WORDS.readTime }}
    />
  )
}

/** The page's dates in Vietnamese, around a blog page's content. */
function Dated({ children }: { children: ComponentChildren }): JSX.Element {
  return <FormatContext.Provider value={DATES}>{children}</FormatContext.Provider>
}

/** What the index renders. */
interface IndexData {
  posts: PublicBlogPostSummary[]
  covers: Map<string, string>
  topics: string[]
  topic: string
}

/**
 * The blog's index, `/bai-viet`: the title and a line about it, topic chips once two topics or
 * more have posts (`?topic=`, a `GET` form that works without JavaScript and keeps out of search
 * results), then the posts as story tiles, the newest leading. With no post: one line and a link to
 * the catalog, kept out of search results too.
 */
export function blogIndexRoute() {
  const handler = define.handlers({
    async GET(ctx) {
      const [posts, coverMap] = await Promise.all([shopPosts(ctx.state.api), covers(ctx.state.api)])
      const topics = [...new Set(posts.flatMap((post) => post.topic ? [post.topic] : []))]
      const asked = ctx.url.searchParams.get(`topic`) ?? ``
      const topic = topics.length > 1 && topics.includes(asked) ? asked : ``
      return page<IndexData>({
        posts: topic ? posts.filter((post) => post.topic === topic) : posts,
        covers: coverMap,
        topics,
        topic,
      })
    },
  })
  const component = define.page<typeof handler>(function BlogIndex({ data, state, url }) {
    const origin = state.webAppOrigin
    const path = NEWS_PATHS.blog
    const { posts, topics, topic } = data
    const filtered = url.searchParams.has(`topic`)
    return (
      <ShopFrame
        state={state}
        lang="vi"
        path={path}
        twin={false}
        head={{
          title: NEWS_WORDS.blogTitle,
          description: NEWS_WORDS.blogIntro,
          noindex: posts.length === 0 || filtered,
          jsonLd: [
            {
              "@type": `Blog`,
              "@id": `${origin}${path}#blog`,
              url: `${origin}${path}`,
              name: NEWS_WORDS.blogTitle,
              description: NEWS_WORDS.blogIntro,
              inLanguage: `vi`,
              publisher: { "@id": storeId(origin) },
            },
            crumbsJsonLd(origin, path, `vi`, [{ name: NEWS_WORDS.crumb }]),
          ],
        }}
      >
        {topics.length > 1 && (
          <Head>
            <script src="/shop.js" defer></script>
          </Head>
        )}
        <div class="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <header class="flex max-w-3xl flex-col gap-4">
            <h1 class="text-6xl font-extrabold leading-tight tracking-tighter text-balance">
              {NEWS_WORDS.blog}
            </h1>
            <p class="text-lg text-muted text-pretty">{NEWS_WORDS.blogIntro}</p>
          </header>
          {topics.length > 1 && (
            <form
              method="get"
              action={path}
              class="flex flex-wrap items-end gap-x-6 gap-y-4"
              data-autosubmit
              data-e2e="topic-filter"
            >
              <RadioChips
                legend={NEWS_WORDS.topics}
                name="topic"
                value={topic}
                options={[
                  { value: ``, label: NEWS_WORDS.allTopics },
                  ...topics.map((each) => ({ value: each, label: each })),
                ]}
              />
              <button type="submit" class={buttonClasses(`outline`, `md`)} data-filter-submit>
                {WORDS.vi.filter}
              </button>
            </form>
          )}
          {posts.length === 0
            ? (
              <section class="flex flex-col gap-2" data-e2e="blog-empty">
                <h2 class="text-xl font-semibold tracking-tight">{NEWS_WORDS.blogEmptyTitle}</h2>
                <p class="text-lg text-pretty">
                  {NEWS_WORDS.blogEmptyText}{" "}
                  <a
                    href={PATHS.home.vi}
                    class="font-medium underline underline-offset-4"
                  >
                    {NEWS_WORDS.blogEmptyLink}
                  </a>.
                </p>
              </section>
            )
            : (
              <Dated>
                {/* The lead tile is a direct child, so the grid gives it two columns. */}
                <LookGrid label={NEWS_WORDS.posts}>
                  {posts.map((post, index) =>
                    storyTile(post, data.covers.get(post.slug), {
                      lead: index === 0,
                      priority: index === 0,
                    })
                  )}
                </LookGrid>
              </Dated>
            )}
        </div>
      </ShopFrame>
    )
  })
  return { handler, component }
}

/**
 * The items a post's body links to, in the order it first links each, from the live catalog: an
 * item no longer published is dropped. A link counts when it points at an item's page on this
 * website, in either language, as a path or a full address.
 */
export function linkedItems(
  html: string,
  origin: string,
  items: readonly PublicCatalogItem[],
): PublicCatalogItem[] {
  const found: PublicCatalogItem[] = []
  for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]*)"/g)) {
    let url: URL
    try {
      url = new URL(href.replaceAll(`&amp;`, `&`), origin)
    } catch {
      continue
    }
    if (url.origin !== new URL(origin).origin) continue
    const parts = url.pathname.split(`/`).filter(Boolean)
    const path = parts[0] === `en` ? parts.slice(1) : parts
    if (path.length !== 2) continue
    const [category, slug] = path
    const item = items.find((each) => each.categorySlug === category && each.slug === slug) ??
      items.find((each) => each.slug === slug)
    if (item && !found.includes(item)) found.push(item)
  }
  return found
}

/** What a post page renders, or `null` for no live post of the shop's at the address. */
type PostData = {
  post: PublicBlogPost
  readNext: PublicBlogPostSummary[]
  covers: Map<string, string>
} | null

/**
 * One post, `/bai-viet/<slug>`: on a wide screen the cover on the left and the trail, title, date
 * and reading time and "In short" on the right; then the body, "Món trong bài" with a live tile
 * for every item the body links to, the sign-up (the footer leaves its copy out), three posts to
 * read next and a link to all of them. On a phone the same, stacked. A post that is not live
 * answers 404 inside the shop's frame.
 */
export function blogPostRoute() {
  const handler = define.handlers({
    async GET(ctx) {
      const [found, coverMap] = await Promise.all([
        readPost(ctx.state.api, ctx.params.slug ?? ``),
        covers(ctx.state.api),
      ])
      if (!found || found.post.language !== DEFAULT_LANGUAGE) {
        return page<PostData>(null, { status: 404 })
      }
      return page<PostData>({
        post: found.post,
        readNext: found.readNext.slice(0, 3),
        covers: coverMap,
      })
    },
  })
  const component = define.page<typeof handler>(function BlogPost({ data, state }) {
    if (!data) return <PostNotFound state={state} />
    const { post, readNext } = data
    const origin = state.webAppOrigin
    const path = storyPath(post.slug)
    const url = `${origin}${path}`
    const cover = post.coverUrl ? new URL(post.coverUrl, origin).href : null
    const items = linkedItems(post.html, origin, state.catalog?.items ?? [])
    const published = DATES.utc().date(post.publishedAt)
    return (
      <ShopFrame
        state={state}
        lang="vi"
        path={path}
        twin={false}
        signup={false}
        head={{
          title: post.seoTitle ?? post.title,
          description: post.description,
          image: cover ? { url: cover, alt: post.coverAlt ?? `` } : undefined,
          jsonLd: [
            blogPostingJsonLd({
              url,
              headline: post.title,
              description: post.description,
              image: cover ?? `${origin}/favicon.svg`,
              datePublished: new Date(post.publishedAt),
              dateModified: post.updatedAt === null ? undefined : new Date(post.updatedAt),
              author: { name: post.authorName ?? SITE_NAME },
              publisher: { id: storeId(origin) },
              section: post.topic ?? undefined,
              inLanguage: `vi`,
              readingMinutes: post.readingMinutes,
              blog: {
                id: `${origin}${NEWS_PATHS.blog}#blog`,
                name: NEWS_WORDS.blogTitle,
                url: `${origin}${NEWS_PATHS.blog}`,
              },
            }),
            crumbsJsonLd(origin, path, `vi`, [
              { name: NEWS_WORDS.crumb, href: `${origin}${NEWS_PATHS.blog}` },
              { name: post.title },
            ]),
          ],
        }}
      >
        <Head>
          <meta property="article:published_time" content={post.publishedAt} />
          {post.updatedAt && <meta property="article:modified_time" content={post.updatedAt} />}
          {cover && <link rel="preload" as="image" href={cover} fetchpriority="high" />}
        </Head>
        <Dated>
          <article class="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
            <div class={cover ? `grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12` : `max-w-3xl`}>
              {cover && (
                <img
                  src={cover}
                  alt={post.coverAlt ?? ``}
                  width={1200}
                  height={1600}
                  sizes="(min-width: 64rem) 55vw, 100vw"
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                  class="block aspect-3/4 w-full rounded-primary bg-hover object-cover lg:col-span-7"
                  style={{ viewTransitionName: `story-${post.slug}` }}
                  data-e2e="post-cover"
                />
              )}
              <header class="flex flex-col gap-6 lg:col-span-5">
                <nav aria-label={NEWS_WORDS.trail}>
                  <ol class="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <li>
                      <a href={PATHS.home.vi} class="underline-offset-4 hover:underline">
                        {SITE_NAME}
                      </a>
                    </li>
                    <li aria-hidden="true">›</li>
                    <li>
                      <a href={NEWS_PATHS.blog} class="underline-offset-4 hover:underline">
                        {NEWS_WORDS.crumb}
                      </a>
                    </li>
                  </ol>
                </nav>
                <div class="flex flex-col gap-3">
                  {post.topic && (
                    <p class="font-mono text-sm font-medium text-muted">{post.topic}</p>
                  )}
                  <h1 class="text-4xl font-extrabold leading-tight tracking-tighter text-balance">
                    {post.title}
                  </h1>
                  <p class="text-sm text-muted tabular-nums" data-e2e="post-meta">
                    <time dateTime={post.publishedAt}>{published}</time>
                    {` · ${NEWS_WORDS.readTime(post.readingMinutes)}`}
                    {post.updatedAt && (
                      <>
                        {` · `}
                        <time dateTime={post.updatedAt}>
                          {NEWS_WORDS.updated(DATES.utc().date(post.updatedAt))}
                        </time>
                      </>
                    )}
                  </p>
                </div>
                <TldrBox items={post.tldr} title={NEWS_WORDS.tldr} />
              </header>
            </div>
            {/* The API's HTML, rendered by Seed's safe Markdown renderer (docs/blog.md). */}
            <Prose html={post.html} class="max-w-2xl" />
            {items.length > 0 && (
              <section aria-labelledby="in-post" class="flex flex-col gap-6" data-e2e="post-items">
                <h2 id="in-post" class="text-2xl font-semibold tracking-tight">
                  {NEWS_WORDS.inPost}
                </h2>
                <Looks lang="vi" items={items} label={NEWS_WORDS.inPost} eager={false} />
              </section>
            )}
          </article>
          <div class="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 pb-16 sm:px-6 lg:px-8">
            {state.newsletter && <SignupForm variant="band" />}
            {readNext.length > 0 && (
              <section aria-labelledby="read-next" class="flex flex-col gap-6" data-e2e="read-next">
                <h2 id="read-next" class="text-2xl font-semibold tracking-tight">
                  {NEWS_WORDS.readNext}
                </h2>
                <LookGrid label={NEWS_WORDS.readNext}>
                  {readNext.map((each) =>
                    storyTile(each, data.covers.get(each.slug), { headingLevel: 3 })
                  )}
                </LookGrid>
              </section>
            )}
            <a href={NEWS_PATHS.blog} class={buttonClasses(`outline`, `md`, `self-start`)}>
              {NEWS_WORDS.allPosts}
            </a>
          </div>
        </Dated>
      </ShopFrame>
    )
  })
  return { handler, component }
}

/** The 404 of a post that is not live, inside the shop's frame, with a way back to the blog. */
function PostNotFound(
  { state }: { state: Parameters<typeof ShopFrame>[0][`state`] },
): JSX.Element {
  return (
    <ShopFrame
      state={state}
      lang="vi"
      path={NEWS_PATHS.blog}
      twin={false}
      head={{ title: NEWS_WORDS.postNotFound, description: NEWS_WORDS.blogIntro, noindex: true }}
    >
      <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-16 sm:px-6">
        <h1 class="text-4xl font-extrabold leading-tight tracking-tighter text-balance">
          {NEWS_WORDS.postNotFound}
        </h1>
        <a href={NEWS_PATHS.blog} class={buttonClasses(`outline`, `md`, `self-start`)}>
          {NEWS_WORDS.allPosts}
        </a>
      </div>
    </ShopFrame>
  )
}

/** The blog's index or one post, as `sitemap.xml` and `llms.txt` list it. */
export interface StoryPage {
  path: string
  title: string
  description: string
  /** The last significant change: the newest post's for the index, else the post's own. */
  lastmod: string
  /** The cover's address as the API gives it, maybe relative to the website. */
  cover?: string
}

/**
 * The blog's index, then every live post of the shop's, newest first. Empty when no post is live,
 * and when the API cannot answer: the sitemap and `llms.txt` still list the other pages then.
 */
export async function storyPages(api: Api): Promise<StoryPage[]> {
  let posts: PublicBlogPostSummary[]
  try {
    posts = await shopPosts(api)
  } catch {
    return []
  }
  if (posts.length === 0) return []
  const coverMap = await covers(api)
  const pages = posts.map((post) => ({
    path: storyPath(post.slug),
    title: post.title,
    description: post.description,
    lastmod: post.updatedAt ?? post.publishedAt,
    ...(coverMap.has(post.slug) ? { cover: coverMap.get(post.slug) } : {}),
  }))
  const index = {
    path: NEWS_PATHS.blog,
    title: NEWS_WORDS.blogTitle,
    description: NEWS_WORDS.blogIntro,
    lastmod: pages.map((page) => page.lastmod).sort().at(-1)!,
  }
  return [index, ...pages]
}
