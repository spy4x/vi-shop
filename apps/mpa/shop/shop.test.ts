import { expect } from "@std/expect"
import { describe, it } from "@std/testing/bdd"
import { SAMPLE_CATEGORIES, SAMPLE_ITEMS, sampleSummaries } from "../lighthouse/sample-shop.ts"
import { createCatalogSource } from "./catalog.ts"
import { twinPath } from "./lang.ts"
import { passesFilter } from "./looks.tsx"
import { isSoldOut } from "./parts.ts"
import { addToList, listLines, measure, readList, removeFromList, writeList } from "./visit.ts"

const jacket = SAMPLE_ITEMS.find((item) => item.slug === `ao-khoac-zip-nau`)!
const [brown, grey] = jacket.colours
const [, m, l] = jacket.sizes

describe(`the language switch`, () => {
  it(`lands on the same page in the other language`, () => {
    expect(twinPath(`/`)).toBe(`/en/`)
    expect(twinPath(`/en/`)).toBe(`/`)
    expect(twinPath(`/en`)).toBe(`/`)
    expect(twinPath(`/ao-khoac/ao-khoac-zip-nau`)).toBe(`/en/ao-khoac/ao-khoac-zip-nau`)
    expect(twinPath(`/en/ao-khoac`)).toBe(`/ao-khoac`)
    expect(twinPath(`/danh-sach`)).toBe(`/en/list`)
    expect(twinPath(`/en/faq`)).toBe(`/hoi-dap`)
  })
})

describe(`sold out`, () => {
  it(`counts a size as sold out only when it is sold out in every colour`, () => {
    const lInBrownOnly = { ...jacket, soldOut: [{ colourId: brown.id, sizeId: l.id }] }

    expect(isSoldOut(lInBrownOnly, l, null)).toBe(false)
    expect(isSoldOut(lInBrownOnly, l, brown)).toBe(true)
    expect(isSoldOut(lInBrownOnly, l, grey)).toBe(false)
    expect(isSoldOut(jacket, l, null)).toBe(true)
  })

  it(`keeps an item out of a size's list when that size is sold out everywhere`, () => {
    expect(passesFilter(jacket, `M`)).toBe(true)
    expect(passesFilter(jacket, `m`)).toBe(true)
    expect(passesFilter(jacket, `L`)).toBe(false)
    expect(passesFilter(jacket, `XL`)).toBe(false)
    expect(passesFilter(jacket, `M`, `nau`)).toBe(true)
    expect(passesFilter(jacket, ``, `do`)).toBe(false)
  })
})

describe(`the order list cookie`, () => {
  const entry = { item: jacket.slug, colour: brown.id, size: m.id }

  it(`reads back what it wrote, and adds the same piece only once`, () => {
    const list = addToList(addToList([], entry), entry)

    expect(list).toEqual([entry])
    expect(readList(writeList(list))).toEqual([entry])
  })

  it(`drops parts that are not an entry, so a tampered cookie names no other value`, () => {
    const value = `${writeList([entry])}~../etc.-.-~ao.not-a-uuid.-~x.-.-.-~${jacket.slug}.-.-`

    expect(readList(value)).toEqual([entry, { item: jacket.slug, colour: null, size: null }])
  })

  it(`removes the piece at a position and keeps the others in order`, () => {
    const other = { item: `ao-thun-tap`, colour: null, size: null }

    expect(removeFromList([entry, other], 0)).toEqual([other])
    expect(removeFromList([entry, other], 7)).toEqual([entry, other])
  })

  it(`leaves out a piece whose item or size the catalog no longer has`, () => {
    const gone = { item: `khong-con`, colour: null, size: null }
    const oldSize = { ...entry, size: `019a3000-0000-7000-8000-999999999999` }

    const lines = listLines([gone, entry, oldSize], SAMPLE_ITEMS)

    expect(lines.map(({ index, piece }) => [index, piece.size?.label])).toEqual([[1, `M`]])
  })
})

describe(`the size calculator's numbers`, () => {
  it(`takes whole numbers from 1 to the chart's top and nothing else`, () => {
    expect(measure(`170`, 250)).toBe(170)
    expect(measure(` 65 `, 300)).toBe(65)
    expect(measure(`0`, 250)).toBe(null)
    expect(measure(`251`, 250)).toBe(null)
    expect(measure(`17.5`, 250)).toBe(null)
    expect(measure(``, 250)).toBe(null)
    expect(measure(null, 250)).toBe(null)
  })
})

describe(`the catalog snapshot`, () => {
  /** A fake API with the sample shop; `down` makes every call fail. */
  function fakeApi() {
    const state = { down: false, calls: 0 }
    const fetch = (input: string | URL | Request) => {
      state.calls++
      if (state.down) return Promise.reject(new TypeError(`connection refused`))
      const path = new URL(input instanceof Request ? input.url : input).pathname
      if (path === `/api/catalog`) {
        return Promise.resolve(Response.json({
          settings: { currency: `VND`, languages: [`vi`, `en`] },
          categories: SAMPLE_CATEGORIES,
          items: sampleSummaries(),
        }))
      }
      const slug = decodeURIComponent(path.split(`/`).at(-1)!)
      const item = SAMPLE_ITEMS.find((each) => each.slug === slug)
      return Promise.resolve(item ? Response.json({ item }) : new Response(null, { status: 404 }))
    }
    return { state, fetch: fetch as typeof globalThis.fetch }
  }

  it(`reads every published item with its sizes, colours and photos`, async () => {
    const api = fakeApi()
    const source = createCatalogSource({ apiUrl: `http://api:8000`, fetch: api.fetch })

    await source.refresh()

    expect(source.current().items.map((item) => item.slug)).toEqual(
      SAMPLE_ITEMS.map((item) => item.slug),
    )
    expect(source.current().items[0].sizes.map((size) => size.label)).toEqual([`S`, `M`, `L`])
  })

  it(`keeps the last snapshot while the API is down, and asks again only after the minute`, async () => {
    let now = 0
    const api = fakeApi()
    const source = createCatalogSource({
      apiUrl: `http://api:8000`,
      fetch: api.fetch,
      now: () => now,
    })
    await source.refresh()
    api.state.down = true
    const calls = api.state.calls

    now = 59_999
    expect(source.current().items).toHaveLength(SAMPLE_ITEMS.length)
    expect(api.state.calls).toBe(calls)
    now = 60_000
    source.current()
    await source.refresh()

    expect(api.state.calls).toBeGreaterThan(calls)
    expect(source.current().items).toHaveLength(SAMPLE_ITEMS.length)
  })
})
