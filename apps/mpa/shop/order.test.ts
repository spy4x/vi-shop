import { expect } from "@std/expect"
import { describe, it } from "@std/testing/bdd"
import { SAMPLE_CONTACT_LINKS, SAMPLE_ITEMS } from "../lighthouse/sample-shop.ts"
import { type OrderPiece, pieceLine } from "./catalog.ts"
import { orderChannels } from "./channels.ts"
import type { Lang } from "./lang.ts"
import { deliveryLine, orderMessage, telegramOrderUrl } from "./order.ts"

const origin = `https://vi-shop.example.com`
const jacket = SAMPLE_ITEMS.find((item) => item.slug === `ao-khoac-zip-nau`)!
const tee = SAMPLE_ITEMS.find((item) => item.slug === `ao-thun-tap`)!
const tank = SAMPLE_ITEMS.find((item) => item.slug === `ao-ba-lo-free-size`)!
const brownM: OrderPiece = { item: jacket, colour: jacket.colours[0], size: jacket.sizes[1] }

/** The message for `pieces`, built the way the order page builds it. */
const message = (pieces: OrderPiece[], lang: Lang, intent?: `order` | `ask`) =>
  orderMessage(pieces.map((piece) => pieceLine(piece, lang)), lang, origin, intent)

/** `text` with the narrow no-break spaces `Intl` puts in prices turned into plain spaces. */
const plain = (text: string) => text.replaceAll(/[\u00a0\u202f]/g, ` `)

describe(`the order message`, () => {
  it(`follows the design's Vietnamese template: greeting, the line, then the item's address`, () => {
    expect(plain(message([brownM], `vi`))).toBe(
      `Chào shop, mình muốn đặt:\n` +
        `• Áo khoác zip, màu Nâu, size M, 590.000 ₫\n` +
        `${origin}/ao-khoac/ao-khoac-zip-nau`,
    )
  })

  it(`is written in English, with the English address, on the English site`, () => {
    expect(plain(message([brownM], `en`))).toBe(
      `Hi, I'd like to order:\n` +
        `• Zip jacket, colour Brown, size M, ₫590,000\n` +
        `${origin}/en/ao-khoac/ao-khoac-zip-nau`,
    )
  })

  it(`says the size and colour are not chosen, so a shopper can still ask`, () => {
    const text = message([{ item: jacket, colour: null, size: null }], `vi`)

    expect(text).toContain(`• Áo khoác zip, màu: chưa chọn, size: chưa chọn, 590.000`)
  })

  it(`leaves the colour out for an item that has no colours to choose`, () => {
    const noColours = { ...tank, colours: [] }
    const text = message([{ item: noColours, colour: null, size: tank.sizes[0] }], `vi`)

    expect(plain(text)).toContain(`• Áo ba lỗ, size Free size, 220.000 ₫\n`)
    expect(text).not.toContain(`màu`)
  })

  it(`lists several pieces, each with its address, and ends with their total`, () => {
    const lines = [brownM, { item: tee, colour: tee.colours[0], size: tee.sizes[0] }]

    const text = plain(message(lines, `vi`))

    expect(text.split(`\n`)).toEqual([
      `Chào shop, mình muốn đặt các món này:`,
      `• Áo khoác zip, màu Nâu, size M, 590.000 ₫`,
      `${origin}/ao-khoac/ao-khoac-zip-nau`,
      `• Áo thun tập, màu Đen, size S, 290.000 ₫`,
      `${origin}/ao/ao-thun-tap`,
      `Tổng: 880.000 ₫`,
    ])
  })

  it(`asks when a sold-out piece is back instead of ordering it`, () => {
    const text = message([brownM], `vi`, `ask`)

    expect(text.split(`\n`)[0]).toBe(`Chào shop, khi nào món này có lại vậy?`)
  })
})

describe(`the order chats`, () => {
  it(`take the shop's Telegram and Zalo links from its contact links`, () => {
    expect(orderChannels(SAMPLE_CONTACT_LINKS)).toEqual({
      telegram: `https://t.me/vi_shop_sample`,
      zalo: `https://zalo.me/0901234567`,
    })
    expect(orderChannels([])).toEqual({ telegram: null, zalo: null })
  })

  it(`type the whole message into Telegram, line breaks and all`, () => {
    const url = new URL(telegramOrderUrl(`https://t.me/vi_shop_sample`, `Chào shop\n• Áo, M`))

    expect(url.origin + url.pathname).toBe(`https://t.me/vi_shop_sample`)
    expect(url.searchParams.get(`text`)).toBe(`Chào shop\n• Áo, M`)
  })
})

describe(`the delivery line`, () => {
  it(`promises same-day delivery until 15:59 Vietnam time`, () => {
    // 08:59 UTC is 15:59 in Ho Chi Minh City (UTC+7).
    expect(deliveryLine(new Date(`2026-10-28T08:59:00Z`), `vi`)).toBe(
      `Giao trong ngày ở Đà Nẵng nếu đặt trước 16:00`,
    )
  })

  it(`says tomorrow from 16:00 Vietnam time, and today again after midnight there`, () => {
    expect(deliveryLine(new Date(`2026-10-28T09:00:00Z`), `vi`)).toBe(
      `Đặt bây giờ, giao ngày mai ở Đà Nẵng`,
    )
    // 17:30 UTC is 00:30 the next day in Ho Chi Minh City.
    expect(deliveryLine(new Date(`2026-10-28T17:30:00Z`), `en`)).toBe(
      `Same-day delivery in Da Nang if you order before 16:00`,
    )
  })
})
