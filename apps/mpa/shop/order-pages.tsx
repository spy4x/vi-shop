import { page } from "fresh"
import { Head } from "fresh/runtime"
import { readFormBody } from "@spy4x/server/http/bounded-body"
import { IconXMark } from "@spy4x/preact-icons"
import { buttonClasses } from "@spy4x/preact-ui/button"
import { OrderBar } from "@spy4x/preact-ui/order-bar"
import { responsiveImage } from "@spy4x/platform/universal/srcset"
import { FORM_LIMITS } from "../forms.ts"
import { define } from "../utils.ts"
import { type OrderPiece, pieceLine, text } from "./catalog.ts"
import { orderChannels } from "./channels.ts"
import { photoVariants } from "./parts.ts"
import { ShopFrame } from "./frame.tsx"
import { itemPath, type Lang, PATHS } from "./lang.ts"
import {
  deliveryLine,
  type OrderIntent,
  orderMessage,
  orderPreview,
  telegramOrderUrl,
} from "./order.ts"
import {
  addToList,
  COOKIES,
  cookiesOf,
  cookieValue,
  LIST_MAX_AGE_S,
  listLines,
  pickedPiece,
  readList,
  rememberCookie,
  removeFromList,
  writeList,
} from "./visit.ts"
import { formatPrice, WORDS } from "./words.ts"
import { barActions, orderActions, OrderBarMessage } from "./order-actions.tsx"

/** A text field of a form, or `""`. */
function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === `string` ? value : ``
}

/**
 * The last size `form` sent. An item page sends the size the calculator named first, as a hidden
 * field, and the size chip the shopper picked after it, so a picked size wins.
 */
function lastSize(form: FormData): string {
  const value = form.getAll(`size`).at(-1)
  return typeof value === `string` ? value : ``
}

/** A `303 See Other` to `location`, with `headers` added. */
function seeOther(location: string, headers = new Headers()): Response {
  headers.set(`location`, location)
  return new Response(null, { status: 303, headers })
}

/**
 * The order list (`/danh-sach`, `/en/list`): the pieces the shopper collected, as the chat draft
 * it is, with a button per line to remove it, the total and the two order buttons, which send the
 * whole list as one message. A form post adds (`add`, from an item page) or removes (`remove`, the
 * line's position) a piece; the list lives in a cookie and the page answers with a redirect back
 * to itself.
 */
export function listRoute(lang: Lang) {
  const handler = define.handlers({
    GET() {
      return page()
    },
    async POST(ctx) {
      const form = await readFormBody(ctx.req, FORM_LIMITS)
      const items = ctx.state.catalog?.items ?? []
      let entries = readList(cookieValue(cookiesOf(ctx.req), COOKIES.list))
      if (form.has(`add`)) {
        const piece = pickedPiece(items, {
          item: field(form, `item`),
          color: field(form, `color`),
          size: lastSize(form),
        })
        if (piece) {
          entries = addToList(entries, {
            item: piece.item.slug,
            colour: piece.colour?.id ?? null,
            size: piece.size?.id ?? null,
          })
        }
      } else if (form.has(`remove`)) {
        entries = removeFromList(entries, Number(field(form, `remove`)))
      }
      const headers = new Headers()
      const value = writeList(entries)
      rememberCookie(headers, ctx.state.webAppOrigin, COOKIES.list, value, LIST_MAX_AGE_S)
      return seeOther(PATHS.list[lang], headers)
    },
  })

  const component = define.page<typeof handler>(function List({ state, req }) {
    const words = WORDS[lang]
    const items = state.catalog?.items ?? []
    const lines = listLines(readList(cookieValue(cookiesOf(req), COOKIES.list)), items)
    const total = lines.reduce((sum, { piece }) => sum + piece.item.price, 0)
    const channels = orderChannels(state.contactLinks ?? [])
    const orderLines = lines.map(({ piece }) => pieceLine(piece, lang))
    const message = orderMessage(orderLines, lang, state.webAppOrigin)
    const preview = orderPreview(orderLines, lang)
    const actions = orderActions(lang, channels, `order`)
    return (
      <ShopFrame
        state={state}
        lang={lang}
        path={PATHS.list[lang]}
        head={{ title: words.listTitle, description: words.listDescription, noindex: true }}
      >
        <Head>
          <script src="/shop.js" defer></script>
        </Head>
        <div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 sm:px-6 lg:pt-12">
          <header class="flex flex-col gap-2">
            <h1 class="text-4xl font-extrabold leading-tight tracking-tighter text-balance">
              {words.listTitle}
            </h1>
            <p class="text-muted text-pretty">{words.listDescription}</p>
          </header>
          {lines.length === 0
            ? (
              <p class="text-lg text-pretty" data-e2e="list-empty">
                {words.listEmpty}{" "}
                <a
                  href={PATHS.home[lang]}
                  class="font-medium text-primary underline underline-offset-4"
                >
                  {words.listBrowse}
                </a>
              </p>
            )
            : (
              <form method="post" action={PATHS.list[lang]}>
                <ul class="flex flex-col divide-y divide-subtle" data-e2e="list-lines">
                  {lines.map(({ index, piece }) => (
                    <ListLine key={index} index={index} piece={piece} lang={lang} />
                  ))}
                </ul>
                <p class="flex justify-between border-t border-strong py-4 text-lg font-bold tabular-nums">
                  <span>{words.total}</span>
                  <span data-e2e="list-total">{formatPrice(total, lang)}</span>
                </p>
              </form>
            )}
        </div>
        {lines.length > 0 && (
          <form
            id="list-order"
            method="post"
            action={PATHS.order[lang]}
            class="mx-auto w-full max-w-3xl pb-0 sm:px-6 lg:pb-16"
            data-zalo={channels.zalo ?? undefined}
            data-message={message}
            data-copied={words.copied}
            data-copy-failed={words.copyFailed}
          >
            <input type="hidden" name="list" value="1" />
            {actions.length > 0
              ? (
                <OrderBar
                  message={<OrderBarMessage preview={preview} message={message} />}
                  actions={barActions(actions)}
                  note={deliveryLine(state.now?.() ?? new Date(), lang)}
                  labels={{ region: words.orderRegion, message: words.orderMessage }}
                />
              )
              : <p class="px-4 text-muted sm:px-0">{words.noChannel}</p>}
          </form>
        )}
      </ShopFrame>
    )
  })
  return { handler, component }
}

/** One line of the list: the cover, the name linked to its page, colour, size, price, remove. */
function ListLine({ index, piece, lang }: { index: number; piece: OrderPiece; lang: Lang }) {
  const words = WORDS[lang]
  const { item, colour, size } = piece
  const name = text(item.name, lang)
  const cover = item.photos[0]
  const image = cover ? responsiveImage(photoVariants(cover), `5rem`) : null
  const parts = [
    colour ? text(colour.name, lang) : null,
    size ? `${words.size} ${size.label}` : null,
  ].filter(Boolean)
  return (
    <li class="flex items-center gap-4 py-4">
      {image
        ? (
          <picture class="block w-20 shrink-0 overflow-hidden rounded-control bg-hover">
            {image.sources.map((source) => (
              <source key={source.type} type={source.type} srcset={source.srcset} sizes="5rem" />
            ))}
            <img
              src={image.src}
              srcset={image.srcset}
              sizes="5rem"
              width={image.width}
              height={image.height}
              alt=""
              loading="lazy"
              decoding="async"
              class="block aspect-3/4 w-full object-cover"
            />
          </picture>
        )
        : <span class="block aspect-3/4 w-20 shrink-0 rounded-control bg-hover" />}
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <a
          href={itemPath(lang, item.categorySlug, item.slug)}
          class="font-medium underline-offset-4 hover:underline"
        >
          {name}
        </a>
        {parts.length > 0 && <p class="text-sm text-muted">{parts.join(` · `)}</p>}
        <p class="font-bold tabular-nums">{formatPrice(item.price, lang)}</p>
      </div>
      <button
        type="submit"
        name="remove"
        value={String(index)}
        aria-label={words.remove(name)}
        class={buttonClasses(`ghost`, `none`, `min-h-11 min-w-11 justify-center`)}
      >
        <IconXMark aria-hidden="true" class="size-5" />
      </button>
    </li>
  )
}

/** What the Zalo page shows: the message to copy and the chat to paste it into. */
interface ZaloData {
  message: string
  zalo: string
}

/**
 * Where the order buttons post (`/dat-hang`, `/en/order`), the way they work without JavaScript:
 * the message is built here from the item, colour and size the form names (or from the order
 * list, with `list`), in the page's language. **Order on Telegram** answers with a redirect to
 * the chat with the message typed in. Zalo has no such link, so **Order on Zalo** answers with a
 * page that shows the message to copy and a link that opens the chat. A form that names nothing
 * left in the catalog, or a chat the shop does not have, goes back to the page it came from.
 */
export function orderRoute(lang: Lang) {
  const handler = define.handlers({
    GET() {
      return seeOther(PATHS.home[lang])
    },
    async POST(ctx) {
      const form = await readFormBody(ctx.req, FORM_LIMITS)
      const items = ctx.state.catalog?.items ?? []
      const fromList = form.has(`list`)
      const pieces = fromList
        ? listLines(readList(cookieValue(cookiesOf(ctx.req), COOKIES.list)), items)
          .map(({ piece }) => piece)
        : [pickedPiece(items, {
          item: field(form, `item`),
          color: field(form, `color`),
          size: lastSize(form),
        })].filter((piece) => piece !== null)
      const lines = pieces.map((piece) => pieceLine(piece, lang))
      const back = fromList
        ? PATHS.list[lang]
        : lines.length === 0
        ? PATHS.home[lang]
        : itemPath(lang, lines[0].category, lines[0].item)
      if (lines.length === 0) return seeOther(back)
      const intent: OrderIntent = !fromList && field(form, `intent`) === `ask` ? `ask` : `order`
      const message = orderMessage(lines, lang, ctx.state.webAppOrigin, intent)
      const channels = orderChannels(ctx.state.contactLinks ?? [])
      const via = field(form, `via`)
      if (via === `telegram` && channels.telegram) {
        return seeOther(telegramOrderUrl(channels.telegram, message))
      }
      if (via === `zalo` && channels.zalo) {
        return page<ZaloData>({ message, zalo: channels.zalo })
      }
      return seeOther(back)
    },
  })

  const component = define.page<typeof handler>(function Zalo({ data, state }) {
    const words = WORDS[lang]
    return (
      <ShopFrame
        state={state}
        lang={lang}
        path={PATHS.order[lang]}
        twin={false}
        head={{ title: words.zaloTitle, description: words.zaloDescription, noindex: true }}
      >
        <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6 lg:py-16">
          <h1 class="text-4xl font-extrabold leading-tight tracking-tighter text-balance">
            {words.zaloTitle}
          </h1>
          <p class="text-pretty">{words.zaloHint}</p>
          <blockquote
            class="select-all whitespace-pre-line break-words rounded-2xl rounded-ee-sm bg-track px-4 py-3"
            data-e2e="zalo-message"
          >
            {data.message}
          </blockquote>
          <a
            href={data.zalo}
            class={buttonClasses(`primary`, `lg`, `self-start`)}
            data-e2e="zalo-open"
          >
            {words.zaloOpen}
          </a>
        </div>
      </ShopFrame>
    )
  })
  return { handler, component }
}
