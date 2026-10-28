import type { ComponentChildren, JSX } from "preact"
import { useState } from "preact/hooks"
import type { Translator } from "@spy4x/platform/universal/i18n"
import { responsiveImage } from "@spy4x/platform/universal/srcset"
import { IconPlus } from "@spy4x/preact-icons"
import { buttonClasses } from "@spy4x/preact-ui/button"
import { Field } from "@spy4x/preact-ui/field"
import { I18nContext } from "@spy4x/preact-ui/i18n"
import { Input } from "@spy4x/preact-ui/input"
import { OrderBar } from "@spy4x/preact-ui/order-bar"
import { RadioChips } from "@spy4x/preact-ui/radio-chips"
import { SwatchChips } from "@spy4x/preact-ui/swatch-chips"
import { ZoomableImages } from "@spy4x/preact-ui/zoomable-images"
import { type Lang, PATHS } from "../shop/lang.ts"
import { isSoldOut, type ItemModel, orderLine, photoVariants, sizeByLabel } from "../shop/parts.ts"
import { barActions, orderActions, OrderBarMessage } from "../shop/order-actions.tsx"
import { type OrderChannels, orderMessage, orderPreview } from "../shop/order.ts"
import { formatPrice, WORDS } from "../shop/words.ts"

/**
 * The size calculator's `id`: its button sends the order form (so the colour and size picked go
 * with the height and weight, with or without scripts) to the item's own address with this
 * fragment. Without scripts the page lands on the answer; with them the island asks the same
 * address for the answer as JSON and shows it in place.
 */
const CALCULATOR_ID = `size-calculator`

/**
 * The photo viewer's counter, "2/5", in both languages: the one label of the library's lightbox
 * that is no prop of `ZoomableImages`, so it comes through the library's translator instead.
 */
const LIGHTBOX_WORDS: Translator<string> = {
  language: `vi`,
  dir: `ltr`,
  t: (key, values) =>
    key === `Lightbox.counterLabel` ? `${values?.position}/${values?.total}` : key,
  parts: (key) => [key],
}

/** The size calculator's state, worked out on the server from the address or the visit. */
export interface CalculatorState {
  /** The heights and weights the form shows, as the shopper typed them. */
  height: number | null
  weight: number | null
  /** The answer, such as "Your size: M", or `null` before the shopper asks. */
  result: string | null
  /**
   * The sold-out size the answer named when no size near it is left, such as `"L"`: until the
   * shopper picks another size, the order bar asks when it is back.
   */
  askFor: string | null
}

/** The item page's answer to the island's calculator: its state, and the size the page picks. */
export interface CalculatorAnswer extends CalculatorState {
  size: string | null
}

/** What the item page hands {@link ItemView}. */
export interface ItemViewProps {
  lang: Lang
  /** The website's origin, for the item's address in the message. */
  origin: string
  /** The item's own path, the calculator's action. */
  path: string
  /** The item in the shopper's language, with nothing the browser does not need. */
  item: ItemModel
  /** The category's page and name, for the link back. */
  back: { href: string; name: string }
  /** The colour and size picked from the address, the calculator or the size filter. */
  colourId: string | null
  sizeLabel: string | null
  channels: OrderChannels
  /**
   * The tracking link's source tag the visit arrived with (`utm_source`), or `null`. The order
   * buttons' events carry it, and the order form keeps it, so the calculator's answer does too.
   */
  source: string | null
  /** The delivery promise, worked out on the server at the time of the request. */
  delivery: string
  /** The calculator's state, or `null` when no size of the item has a height or weight range. */
  calculator: CalculatorState | null
  /** The item's facts, size chart and details, rendered on the server. */
  children?: ComponentChildren
}

/**
 * The item's photos, colours, sizes and order bar. It works as a plain form without JavaScript:
 * the colour and size are radio chips, the order buttons submit them to the order address, which
 * redirects to Telegram or shows the Zalo message to copy. Once hydrated, a colour moves its photos
 * first, the message follows every choice, and **Order on Zalo** copies the message and opens the
 * chat without leaving the page.
 */
export default function ItemView(props: ItemViewProps): JSX.Element {
  const { lang, origin, path, item, back, channels, delivery, calculator, source, children } = props
  const words = WORDS[lang]
  const [colourId, setColourId] = useState(props.colourId)
  const [sizeLabel, setSizeLabel] = useState(props.sizeLabel)
  const [status, setStatus] = useState<string | null>(null)
  const [answer, setAnswer] = useState(calculator)
  const [pending, setAsking] = useState(false)

  const colour = item.colours.find((each) => each.id === colourId) ?? null
  const picked = sizeLabel ? sizeByLabel(item, sizeLabel) ?? null : null
  const size = picked && !isSoldOut(item, picked, colour) ? picked : null
  const soldOut = item.stock === `sold-out` ||
    (item.sizes.length === 0
      ? isSoldOut(item, null, colour)
      : item.sizes.every((each) => isSoldOut(item, each, colour)))
  const askFor = size === null ? answer?.askFor ?? null : null
  // Asking when a size is back: no "Add to list" and no delivery to promise.
  const asking = soldOut || askFor !== null
  const intent = asking ? `ask` : `order`
  const line = orderLine(item, colour?.name ?? null, size?.label ?? askFor)
  const message = orderMessage([line], lang, origin, intent)
  const preview = orderPreview([line], lang, intent)

  const photos = colour
    ? [
      ...item.photos.filter((photo) => photo.colourId === colour.id),
      ...item.photos.filter((photo) => photo.colourId !== colour.id),
    ]
    : item.photos

  const actions = orderActions(lang, channels, intent, { item: item.slug, source })

  /**
   * The calculator's button: the same address the form would load, asked for JSON, so the answer
   * and the size it picks appear in place. The address goes into the history, so a reload shows
   * the same answer. When the request fails, the page loads the address as it would without
   * scripts.
   */
  const calculate = async (form: HTMLFormElement, submitter: HTMLElement) => {
    const query = new URLSearchParams(
      [...new FormData(form, submitter)].map(([key, value]) => [key, String(value)]),
    )
    const address = `${path}?${query}`
    setAsking(true)
    try {
      const response = await fetch(address, { headers: { accept: `application/json` } })
      if (!response.ok) throw new Error(`The calculator answered ${response.status}`)
      const next = await response.json() as CalculatorAnswer
      setAnswer(next)
      setSizeLabel(next.size)
      setStatus(null)
      history.replaceState(history.state, ``, `${address}#${CALCULATOR_ID}`)
    } catch {
      location.assign(`${address}#${CALCULATOR_ID}`)
    } finally {
      setAsking(false)
    }
  }

  const onSubmit = async (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => {
    const submitter = event.submitter as HTMLButtonElement | null
    if (submitter?.dataset.calculate !== undefined) {
      event.preventDefault()
      if (!pending) await calculate(event.currentTarget, submitter)
      return
    }
    const via = submitter?.value
    if (via !== `zalo` || !channels.zalo) return
    event.preventDefault()
    try {
      await navigator.clipboard.writeText(message)
      setStatus(words.copied)
      globalThis.open(channels.zalo, `_blank`, `noopener`)
    } catch {
      setStatus(words.copyFailed)
    }
  }

  return (
    <div class="mx-auto grid w-full max-w-7xl grid-cols-1 gap-y-8 pb-0 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr_auto] lg:gap-x-12 lg:px-8 lg:pb-16 lg:pt-8">
      <section
        aria-label={words.photos}
        tabIndex={0}
        class="snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-focus lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:snap-none lg:overflow-visible"
        data-e2e="item-photos"
      >
        {photos.length === 0
          ? (
            <p class="mx-4 flex aspect-3/4 items-center justify-center rounded-primary bg-hover text-muted lg:mx-0">
              {words.noPhoto}
            </p>
          )
          : (
            // On a phone, a swipe stops on the next photo, centred: each photo is the screen less
            // a 24 px gutter on each side, so the neighbours peek in. The list is as wide as its
            // photos and gutters, so the last gutter scrolls too and the last photo can centre.
            <ul
              class="flex w-max gap-2 px-6 py-1 lg:w-auto lg:flex-col lg:gap-4 lg:px-0"
              data-lightbox
            >
              {photos.map((photo, index) => {
                const image = responsiveImage(
                  photoVariants(photo),
                  `(min-width: 64rem) 55vw, 88vw`,
                )
                return (
                  // Each photo opens full size. Its focus ring goes on the list item, around the
                  // rounded frame, in the room the list's 4 px padding leaves.
                  <li
                    key={photo.id}
                    class="w-[calc(100vw-3rem)] shrink-0 snap-center snap-always rounded-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus lg:w-full"
                  >
                    <picture class="block overflow-hidden rounded-primary bg-hover">
                      {image.sources.map((source) => (
                        <source
                          key={source.type}
                          type={source.type}
                          srcset={source.srcset}
                          sizes={image.sizes}
                        />
                      ))}
                      <img
                        src={image.src}
                        srcset={image.srcset}
                        sizes={image.sizes}
                        width={image.width}
                        height={image.height}
                        alt={photo.alt}
                        loading={index === 0 ? `eager` : `lazy`}
                        fetchpriority={index === 0 ? `high` : undefined}
                        decoding="async"
                        class="block aspect-3/4 w-full object-cover focus-visible:outline-none"
                      />
                    </picture>
                  </li>
                )
              })}
            </ul>
          )}
        <I18nContext.Provider value={LIGHTBOX_WORDS}>
          <ZoomableImages
            zoomLabel={words.lightbox.zoom}
            label={words.lightbox.viewer}
            closeLabel={words.lightbox.close}
            previousLabel={words.lightbox.previous}
            nextLabel={words.lightbox.next}
            fallbackAlt={item.name}
          />
        </I18nContext.Provider>
      </section>

      {/* Sticky beside the photos from `lg`; on a phone, the order bar comes last. */}
      <div class="max-lg:contents lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:gap-8 lg:self-start lg:overflow-y-auto">
        <div class="flex flex-col gap-6 px-4 lg:px-0">
          <a
            href={back.href}
            class="self-start rounded-sm text-sm font-medium text-muted underline-offset-4 hover:underline"
            data-e2e="item-back"
          >
            ← {words.back(back.name)}
          </a>
          <div class="flex flex-col gap-2">
            <h1 class="text-4xl font-extrabold leading-tight tracking-tighter text-balance">
              {item.name}
            </h1>
            <p
              class="flex items-baseline gap-3 text-3xl font-bold tabular-nums"
              data-e2e="item-price"
            >
              {soldOut ? <s class="text-muted">{formatPrice(item.price, lang)}</s> : (
                formatPrice(item.price, lang)
              )}
              {soldOut && <span class="text-base font-semibold">{words.soldOut}</span>}
            </p>
          </div>
          <form
            id="order"
            method="post"
            action={PATHS.order[lang]}
            class="flex flex-col gap-4"
            onSubmit={onSubmit}
            data-e2e="item-order-form"
          >
            <input type="hidden" name="item" value={item.slug} />
            <input type="hidden" name="intent" value={intent} />
            {source && <input type="hidden" name="utm_source" value={source} />}
            {/* Before the size chips: the order step takes the last size sent, a chip if picked. */}
            {askFor && <input type="hidden" name="size" value={askFor} />}
            {item.colours.length > 0 && (
              <SwatchChips
                legend={words.colour}
                name="color"
                value={colourId}
                onChange={(value) => {
                  setColourId(value)
                  setStatus(null)
                }}
                options={item.colours.map((each) => ({
                  value: each.id,
                  name: each.name,
                  color: each.swatch,
                }))}
              />
            )}
            {item.sizes.length > 0 && (
              <RadioChips
                legend={words.size}
                name="size"
                value={size?.label ?? null}
                onChange={(value) => {
                  setSizeLabel(value)
                  setStatus(null)
                }}
                options={item.sizes.map((each) => {
                  const gone = isSoldOut(item, each, colour)
                  return {
                    value: each.label,
                    disabled: gone,
                    label: gone
                      ? (
                        <>
                          <s>{each.label}</s>
                          <span class="sr-only">{`, ${words.sizeSoldOut}`}</span>
                        </>
                      )
                      : each.label,
                  }
                })}
              />
            )}
          </form>
          {calculator && (
            <details
              id={CALCULATOR_ID}
              open={calculator.result !== null}
              class="rounded-primary border border-subtle px-4 py-3"
              data-e2e="size-calculator"
            >
              <summary class="cursor-pointer font-medium">{words.calculator}</summary>
              <div class="mt-4 flex flex-wrap items-end gap-3">
                <Field id="height" label={words.heightCm} class="w-32">
                  <Input
                    type="number"
                    name="height"
                    form="order"
                    inputMode="numeric"
                    min={1}
                    max={250}
                    defaultValue={calculator.height?.toString() ?? ``}
                  />
                </Field>
                <Field id="weight" label={words.weightKg} class="w-32">
                  <Input
                    type="number"
                    name="weight"
                    form="order"
                    inputMode="numeric"
                    min={1}
                    max={300}
                    defaultValue={calculator.weight?.toString() ?? ``}
                  />
                </Field>
                <button
                  type="submit"
                  form="order"
                  formMethod="get"
                  formAction={`${path}#${CALCULATOR_ID}`}
                  data-calculate
                  aria-disabled={pending || undefined}
                  class={buttonClasses(`outline`, `md`, `min-h-12`)}
                >
                  {words.calculate}
                </button>
              </div>
              {/* Always there, so a screen reader hears an answer that arrives in place. */}
              <p
                role="status"
                class="mt-3 font-semibold text-pretty empty:mt-0"
                data-e2e="size-advice"
              >
                {answer?.result}
              </p>
            </details>
          )}
        </div>

        {actions.length > 0
          ? (
            <OrderBar
              form="order"
              class="max-lg:order-last"
              message={<OrderBarMessage preview={preview} message={message} />}
              actions={barActions(actions)}
              secondary={asking ? undefined : {
                label: words.addToList,
                icon: <IconPlus aria-hidden="true" class="size-5" />,
                name: `add`,
                value: `1`,
                attributes: { formaction: PATHS.list[lang] },
              }}
              status={status ?? undefined}
              // A sold-out piece has no delivery to promise; the price already says "Sold out".
              note={asking ? undefined : delivery}
              labels={{ region: words.orderRegion, message: words.orderMessage }}
            />
          )
          : (
            <p class="px-4 text-muted max-lg:order-last lg:px-0" data-e2e="no-channel">
              {words.noChannel}
            </p>
          )}
      </div>

      {children && (
        <div class="flex flex-col gap-8 px-4 lg:col-start-1 lg:row-start-3 lg:px-0">
          {children}
        </div>
      )}
    </div>
  )
}
