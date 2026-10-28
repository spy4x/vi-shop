import { hhmmInTz } from "@spy4x/time/tz"
import { itemPath, type Lang } from "./lang.ts"
import { formatPrice, WORDS } from "./words.ts"

/**
 * The order step: the message a shopper sends the shop, the Telegram link that carries it, and the
 * delivery promise beside them (docs/shop/design.md, "Item" and "Words"). The item page's island
 * builds the same message in the browser, so this module imports no server code.
 *
 * @module
 */

/** One piece in an order, in the shopper's language (`orderLine` builds one from an item). */
export interface OrderLine {
  /** The item's name, slug and category's slug, for the line and the page's address. */
  name: string
  item: string
  category: string
  /** The price in dong. */
  price: number
  /** The colour's name; `null` when not picked yet; left out when the item has no colours. */
  colour?: string | null
  /** The size's label; `null` when not picked yet; left out when the item has no sizes. */
  size?: string | null
}

/** What the message asks for: to order, or when a sold-out item is back. */
export type OrderIntent = `order` | `ask`

/** One line of the message: the name, the colour and size (or that they are not chosen), the price. */
function lineText({ name, colour, size, price }: OrderLine, lang: Lang): string {
  const words = WORDS[lang].message
  const parts = [name]
  if (colour !== undefined) parts.push(colour ? words.colour(colour) : words.colourNotChosen)
  if (size !== undefined) parts.push(size ? words.size(size) : words.sizeNotChosen)
  parts.push(formatPrice(price, lang))
  return `• ${parts.join(`, `)}`
}

/**
 * The message, in the shopper's language, as the shop reads it in the chat:
 *
 * ```text
 * Chào shop, mình muốn đặt:
 * • Áo khoác zip, màu Nâu, size M, 590.000 ₫
 * https://vi-shop.antonshubin.com/ao-khoac/ao-khoac-zip-nau
 * ```
 *
 * Each piece is a line with its page's address under it; several pieces end with the total. The
 * `ask` intent asks when a sold-out piece is back instead.
 */
export function orderMessage(
  lines: readonly OrderLine[],
  lang: Lang,
  origin: string,
  intent: OrderIntent = `order`,
): string {
  const words = WORDS[lang].message
  const greeting = intent === `ask` ? words.ask : lines.length > 1 ? words.orderMany : words.order
  const body = lines.flatMap((line) => [
    lineText(line, lang),
    `${origin}${itemPath(lang, line.category, line.item)}`,
  ])
  const total = lines.length > 1
    ? [words.total(formatPrice(lines.reduce((sum, line) => sum + line.price, 0), lang))]
    : []
  return [greeting, ...body, ...total].join(`\n`)
}

/**
 * The message as a phone's order bar quotes it: the greeting and the pieces on one line, without
 * the addresses or the total, such as `Chào shop, mình muốn đặt: Áo khoác zip, màu Nâu, size M,
 * 590.000 ₫`. The full {@link orderMessage} is what the chat receives.
 */
export function orderPreview(
  lines: readonly OrderLine[],
  lang: Lang,
  intent: OrderIntent = `order`,
): string {
  const words = WORDS[lang].message
  const greeting = intent === `ask` ? words.ask : lines.length > 1 ? words.orderMany : words.order
  return `${greeting} ${lines.map((line) => lineText(line, lang).slice(2)).join(`; `)}`
}

/** The shop's chats an order can go to: the first Telegram and the first Zalo contact link. */
export interface OrderChannels {
  /** `https://t.me/<username>`, or `null` when the shop has no Telegram link. */
  telegram: string | null
  /** `https://zalo.me/<phone>`, or `null` when the shop has no Zalo link. */
  zalo: string | null
}

/**
 * The Telegram chat with the message typed in: `https://t.me/<username>?text=<message>`. Zalo has
 * no such parameter, so its link opens the chat and the shopper pastes the message.
 */
export function telegramOrderUrl(chat: string, message: string): string {
  return `${chat}?text=${encodeURIComponent(message)}`
}

/** The zone the delivery promise is kept in. */
export const SHOP_TIME_ZONE = `Asia/Ho_Chi_Minh`

/** The last order time, Vietnam time, for delivery the same day. */
export const SAME_DAY_CUTOFF = `16:00`

/**
 * The delivery line for an order placed at `now`: same day before 16:00 Vietnam time, tomorrow
 * from 16:00. A page that shows it must not be kept past the minute (`no-cache`, set by
 * `pageMiddleware`), so it never says "today" after the cut-off.
 */
export function deliveryLine(now: Date, lang: Lang): string {
  const words = WORDS[lang]
  return hhmmInTz(now, SHOP_TIME_ZONE) < SAME_DAY_CUTOFF
    ? words.deliveryToday
    : words.deliveryTomorrow
}
