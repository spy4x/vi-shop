import type { ComponentChildren, JSX } from "preact"
import type { FreshContext } from "fresh"
import {
  DEFAULT_SUBSCRIBER_LIST,
  type SubscriptionConfirmState,
  type UnsubscribeState,
} from "@domain/subscribers"
import { DEFAULT_LANGUAGE } from "@domain/identity"
import { FORM_ACTIONS, SCREEN_PATHS } from "@ui/progressive.tsx"
import { SubscriptionConfirmScreen, UnsubscribeScreen } from "@ui/subscribe-screen.tsx"
import { isRecord } from "@spy4x/platform/universal/is-record"
import { createTranslator, type Translator } from "@spy4x/platform/universal/i18n"
import { I18nContext } from "@spy4x/preact-ui/i18n"
import { buttonClasses } from "@spy4x/preact-ui/button"
import { readFormBody } from "@spy4x/server/http/bounded-body"
import type { ApiAnswer } from "../api.ts"
import { API_BODIES, FORM_LIMITS } from "../forms.ts"
import { siteTranslator } from "../languages.ts"
import { define, type State } from "../utils.ts"
import { ShopFrame, type ShopHead } from "./frame.tsx"
import { NEWS_PATHS, PATHS } from "./lang.ts"
import { SignupForm } from "./signup.tsx"
import { NEWS_WORDS } from "./words.ts"

/**
 * The newsletter's pages on the shop (issue #16), in Vietnamese only and inside the shop's frame:
 * the sign-up at `/nhan-tin`, which draws every outcome on the server, and the pages the mailed
 * links open, at the addresses Seed's mails name (`/subscribe/confirm`, `/unsubscribe`), with
 * Seed's own confirm and unsubscribe screens in the shop's words. None of them is indexed.
 *
 * @module
 */

/** The pages a mailed link opens carry a signed token in their address: no `Referer` leaves them. */
const NO_REFERRER = { "referrer-policy": `no-referrer` }

/** The query a finished step redirects to: the page again, with no token in it. */
const DONE_QUERY = `?state=done`

/**
 * Seed's screens in the shop's Vietnamese: the keys they read come from {@link NEWS_WORDS}, any
 * other key from the website's main language as before. Made once.
 */
let screenText: Translator<string> | undefined
function screenTranslator(): Translator<string> {
  if (screenText) return screenText
  const base = siteTranslator(DEFAULT_LANGUAGE)
  const words: Record<string, string> = NEWS_WORDS.screens
  const vi = createTranslator({ language: `vi`, catalogs: [{ source: words }] })
  screenText = {
    language: `vi`,
    dir: `ltr`,
    t: (key, values) => key in words ? vi.t(key, values) : base.t(key, values),
    parts: (key, values) => key in words ? vi.parts(key, values) : base.parts(key, values),
  }
  return screenText
}

/** Seed's screens link "ask again" to its subscribe page; the shop's is `/nhan-tin`. */
function localize(path: string): string {
  return path === SCREEN_PATHS.subscribe ? NEWS_PATHS.signup : path
}

/** The narrow column every newsletter page sits in, under the shop's header. */
function Column({ children }: { children: ComponentChildren }): JSX.Element {
  return (
    <div class="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12 sm:px-6 lg:py-16">
      {children}
    </div>
  )
}

/** A newsletter page in the shop's frame, Vietnamese, with no English twin and no index entry. */
function renderPage(
  ctx: FreshContext<State>,
  path: string,
  title: string,
  body: JSX.Element,
  init: { status: number; headers?: Record<string, string> },
): Response | Promise<Response> {
  const head: ShopHead = { title, description: NEWS_WORDS.signupValue, noindex: true }
  return ctx.render(
    <ShopFrame state={ctx.state} lang="vi" path={path} head={head} twin={false} signup={false}>
      <Column>{body}</Column>
    </ShopFrame>,
    init,
  )
}

/** What `/nhan-tin` draws: the form, maybe with an error, or that the link is sent. */
interface SignupPage {
  email: string
  sent: boolean
  fieldError?: string
  formError?: string
  status: number
  retryAfter?: string
}

function renderSignup(ctx: FreshContext<State>, page: SignupPage): Response | Promise<Response> {
  const body = page.sent
    ? (
      <section class="flex flex-col gap-4" data-e2e="signup-sent">
        <h1 class="text-3xl font-semibold tracking-tight text-balance lg:text-4xl">
          {NEWS_WORDS.sentTitle}
        </h1>
        {/* Takes focus, so a screen reader reads the outcome after the post. */}
        <p class="text-pretty outline-none" role="status" tabIndex={-1} autofocus>
          {NEWS_WORDS.sentText(page.email)}
        </p>
        <a href={PATHS.home.vi} class={buttonClasses(`secondary`, `md`, `self-start`)}>
          {NEWS_WORDS.browse}
        </a>
      </section>
    )
    : (
      <SignupForm
        variant="page"
        email={page.email}
        fieldError={page.fieldError}
        formError={page.formError}
      />
    )
  return renderPage(ctx, NEWS_PATHS.signup, NEWS_WORDS.signupTitle, body, {
    status: page.status,
    headers: page.retryAfter ? { "retry-after": page.retryAfter } : {},
  })
}

/**
 * `/nhan-tin`: `GET` shows the sign-up; `POST` asks the API for a confirm link and draws the
 * outcome on the server. The answer reads the same for a new address and one already on the list,
 * as the API's own does, so the page never tells who is subscribed. The success page repeats the
 * address, so a mistyped one is easy to spot; it is drawn in the answer to the post rather than
 * after a redirect, since an address never rides in a URL. While the API takes no subscriptions,
 * both answer 503 with the error and no form.
 */
export const signupHandlers = define.handlers({
  GET(ctx) {
    if (!ctx.state.newsletter) return renderOff(ctx)
    return renderSignup(ctx, { email: ``, sent: false, status: 200 })
  },
  async POST(ctx) {
    if (!ctx.state.newsletter) return renderOff(ctx)
    const form = API_BODIES.subscribe(await readFormBody(ctx.req, FORM_LIMITS))
    const email = form.email.trim()
    if (email === ``) {
      return renderSignup(ctx, { email, sent: false, fieldError: NEWS_WORDS.empty, status: 400 })
    }
    // The list is always the shop's one; no language, so the mails are the main language's,
    // which the shop writes in Vietnamese (libs/server/mail/shop-subscriber-words.ts).
    const answer = await ctx.state.api.call(`POST`, `/api/subscribers`, {
      email,
      list: DEFAULT_SUBSCRIBER_LIST,
    })
    if (answer.status === 202) return renderSignup(ctx, { email, sent: true, status: 200 })
    // A 400 is an address the API refused; anything else is the API failing.
    return renderSignup(ctx, {
      email,
      sent: false,
      ...(answer.status === 400
        ? { fieldError: NEWS_WORDS.invalid }
        : { formError: NEWS_WORDS.failed }),
      status: answer.status,
      retryAfter: answer.retryAfter,
    })
  },
})

function renderOff(ctx: FreshContext<State>): Response | Promise<Response> {
  return renderPage(
    ctx,
    NEWS_PATHS.signup,
    NEWS_WORDS.signupTitle,
    <p class="text-pretty" role="alert" data-e2e="signup-off">{NEWS_WORDS.failed}</p>,
    { status: 503 },
  )
}

const CONFIRM_STATES = [`confirm`, `done`, `expired`, `invalid`] as const
const UNSUBSCRIBE_STATES = [`confirm`, `done`, `not-recognised`] as const

function linkOf(url: URL): { list: string; token: string } {
  return { list: url.searchParams.get(`list`) ?? ``, token: url.searchParams.get(`token`) ?? `` }
}

/**
 * The state a token route answered with, and the address while it asks for the click. The API
 * answers a refused token with a 4xx status and its state as the error's reason; anything else,
 * an API that cannot be reached included, reads as `error`.
 */
function stepOf<S extends string>(
  answer: ApiAnswer,
  known: readonly S[],
): { state: S | `error`; email?: string } {
  const body = answer.body
  if (!isRecord(body)) return { state: `error` }
  const said = isRecord(body.error) ? body.error.reason : body.state
  const state = known.find((candidate) => candidate === said)
  if (!state) return { state: `error` }
  return typeof body.email === `string` ? { state, email: body.email } : { state }
}

interface TokenPage<S> {
  state: S
  email?: string
  list: string
  token: string
  status: number
  retryAfter?: string
}

function tokenHeaders(page: { retryAfter?: string }): Record<string, string> {
  return page.retryAfter ? { ...NO_REFERRER, "retry-after": page.retryAfter } : NO_REFERRER
}

function renderConfirm(
  ctx: FreshContext<State>,
  page: TokenPage<SubscriptionConfirmState>,
): Response | Promise<Response> {
  return renderPage(
    ctx,
    FORM_ACTIONS.subscribeConfirm,
    NEWS_WORDS.confirmTitle,
    <I18nContext.Provider value={screenTranslator()}>
      <SubscriptionConfirmScreen
        state={page.state}
        email={page.email}
        list={page.list}
        token={page.token}
        error={null}
        pending={false}
        localize={localize}
        onward={{ href: PATHS.home.vi, label: NEWS_WORDS.browse }}
      />
    </I18nContext.Provider>,
    { status: page.status, headers: tokenHeaders(page) },
  )
}

function renderUnsubscribe(
  ctx: FreshContext<State>,
  page: TokenPage<UnsubscribeState>,
): Response | Promise<Response> {
  return renderPage(
    ctx,
    FORM_ACTIONS.unsubscribe,
    NEWS_WORDS.unsubscribeTitle,
    <I18nContext.Provider value={screenTranslator()}>
      <UnsubscribeScreen
        state={page.state}
        email={page.email}
        list={page.list}
        token={page.token}
        error={null}
        pending={false}
        localize={localize}
      />
    </I18nContext.Provider>,
    { status: page.status, headers: tokenHeaders(page) },
  )
}

/**
 * `/subscribe/confirm`, the page a confirm mail's link opens: `GET` shows what the link holds and
 * asks for a click, so a mail scanner that follows it subscribes no one; `POST` confirms it and
 * 303s to this page without the token. The posted form names no language, so the subscriber's
 * mails stay the shop's Vietnamese.
 */
export const confirmHandlers = define.handlers({
  async GET(ctx) {
    if (ctx.url.searchParams.get(`state`) === `done`) {
      return renderConfirm(ctx, { state: `done`, list: ``, token: ``, status: 200 })
    }
    const { list, token } = linkOf(ctx.url)
    if (!list || !token) return renderConfirm(ctx, { state: `invalid`, list, token, status: 400 })
    if (!ctx.state.newsletter) {
      return renderConfirm(ctx, { state: `error`, list, token, status: 503 })
    }
    const answer = await ctx.state.api.call(
      `GET`,
      `/api/subscribers/confirm?${new URLSearchParams({ list, token })}`,
    )
    return renderConfirm(ctx, {
      ...stepOf(answer, CONFIRM_STATES),
      list,
      token,
      status: answer.status,
    })
  },
  async POST(ctx) {
    const body = API_BODIES.subscriptionConfirm(await readFormBody(ctx.req, FORM_LIMITS))
    if (!ctx.state.newsletter) {
      return renderConfirm(ctx, { state: `error`, ...body, status: 503 })
    }
    const answer = await ctx.state.api.call(`POST`, `/api/subscribers/confirm`, {
      list: body.list,
      token: body.token,
    })
    const step = stepOf(answer, CONFIRM_STATES)
    if (step.state === `done`) {
      return ctx.redirect(`${FORM_ACTIONS.subscribeConfirm}${DONE_QUERY}`, 303)
    }
    return renderConfirm(ctx, {
      ...step,
      list: body.list,
      token: body.token,
      status: answer.status,
      retryAfter: answer.retryAfter,
    })
  },
})

/**
 * `/unsubscribe`, where the API sends a person who opens a mail's unsubscribe link: `GET` shows the
 * address it removes and asks for a click; `POST` removes it and 303s to this page without the
 * token. A mail client's one-click unsubscribe posts to the API directly and never comes here.
 */
export const unsubscribeHandlers = define.handlers({
  async GET(ctx) {
    if (ctx.url.searchParams.get(`state`) === `done`) {
      return renderUnsubscribe(ctx, { state: `done`, list: ``, token: ``, status: 200 })
    }
    const { list, token } = linkOf(ctx.url)
    if (!list || !token) {
      return renderUnsubscribe(ctx, { state: `not-recognised`, list, token, status: 404 })
    }
    if (!ctx.state.newsletter) {
      return renderUnsubscribe(ctx, { state: `error`, list, token, status: 503 })
    }
    const answer = await ctx.state.api.call(
      `GET`,
      `/api/subscribers/unsubscribe/preview?${new URLSearchParams({ list, token })}`,
    )
    return renderUnsubscribe(ctx, {
      ...stepOf(answer, UNSUBSCRIBE_STATES),
      list,
      token,
      status: answer.status,
      retryAfter: answer.retryAfter,
    })
  },
  async POST(ctx) {
    const body = API_BODIES.subscriptionToken(await readFormBody(ctx.req, FORM_LIMITS))
    if (!ctx.state.newsletter) {
      return renderUnsubscribe(ctx, { state: `error`, ...body, status: 503 })
    }
    // The API's unsubscribe reads the token from the query or a form body, never from JSON: it is
    // the RFC 8058 one-click target too.
    const answer = await ctx.state.api.call(
      `POST`,
      `/api/subscribers/unsubscribe?${new URLSearchParams(body)}`,
    )
    const step = stepOf(answer, UNSUBSCRIBE_STATES)
    if (step.state === `done`) return ctx.redirect(`${FORM_ACTIONS.unsubscribe}${DONE_QUERY}`, 303)
    return renderUnsubscribe(ctx, {
      ...step,
      ...body,
      status: answer.status,
      retryAfter: answer.retryAfter,
    })
  },
})
