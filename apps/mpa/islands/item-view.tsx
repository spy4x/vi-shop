import type { ComponentChildren, JSX } from "preact"
import { useState } from "preact/hooks"
import { responsiveImage } from "@spy4x/platform/universal/srcset"
import { IconPlus } from "@spy4x/preact-icons"
import { buttonClasses } from "@spy4x/preact-ui/button"
import { Field } from "@spy4x/preact-ui/field"
import { Input } from "@spy4x/preact-ui/input"
import { OrderBar } from "@spy4x/preact-ui/order-bar"
import { RadioChips } from "@spy4x/preact-ui/radio-chips"
import { SwatchChips } from "@spy4x/preact-ui/swatch-chips"
import { type Lang, PATHS } from "../shop/lang.ts"
import {
  isSoldOut,
  type ItemModel,
  lookTransitionName,
  orderLine,
  photoVariants,
  sizeByLabel,
} from "../shop/parts.ts"
import { barActions, orderActions } from "../shop/order-actions.tsx"
import { type OrderChannels, orderMessage } from "../shop/order.ts"
import { formatPrice, WORDS } from "../shop/words.ts"

/** The size calculator's state, worked out on the server from the address or the visit. */
export interface CalculatorState {
  /** The heights and weights the form shows, as the shopper typed them. */
  height: number | null
  weight: number | null
  /** The answer, such as "Your size: M", or `null` before the shopper asks. */
  result: string | null
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
  const { lang, origin, path, item, back, channels, delivery, calculator, children } = props
  const words = WORDS[lang]
  const [colourId, setColourId] = useState(props.colourId)
  const [sizeLabel, setSizeLabel] = useState(props.sizeLabel)
  const [status, setStatus] = useState<string | null>(null)

  const colour = item.colours.find((each) => each.id === colourId) ?? null
  const picked = sizeLabel ? sizeByLabel(item, sizeLabel) ?? null : null
  const size = picked && !isSoldOut(item, picked, colour) ? picked : null
  const soldOut = item.stock === `sold-out` ||
    (item.sizes.length === 0
      ? isSoldOut(item, null, colour)
      : item.sizes.every((each) => isSoldOut(item, each, colour)))
  const intent = soldOut ? `ask` : `order`
  const message = orderMessage(
    [orderLine(item, colour?.name ?? null, size?.label ?? null)],
    lang,
    origin,
    intent,
  )

  const photos = colour
    ? [
      ...item.photos.filter((photo) => photo.colourId === colour.id),
      ...item.photos.filter((photo) => photo.colourId !== colour.id),
    ]
    : item.photos

  const actions = orderActions(lang, channels, intent)

  const onSubmit = async (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => {
    const via = (event.submitter as HTMLButtonElement | null)?.value
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
        class="overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-focus lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:overflow-visible"
        data-e2e="item-photos"
      >
        {photos.length === 0
          ? (
            <p class="mx-4 flex aspect-3/4 items-center justify-center rounded-primary bg-hover text-muted lg:mx-0">
              {words.noPhoto}
            </p>
          )
          : (
            <ul class="flex snap-x snap-mandatory gap-2 px-4 lg:flex-col lg:gap-4 lg:px-0">
              {photos.map((photo, index) => {
                const image = responsiveImage(
                  photoVariants(photo),
                  `(min-width: 64rem) 55vw, 88vw`,
                )
                return (
                  <li key={photo.id} class="w-[88%] shrink-0 snap-center lg:w-full">
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
                        class="block aspect-3/4 w-full object-cover"
                        style={index === 0
                          ? { viewTransitionName: lookTransitionName(item.slug) }
                          : undefined}
                      />
                    </picture>
                  </li>
                )
              })}
            </ul>
          )}
      </section>

      <div class="flex flex-col gap-6 px-4 lg:col-start-2 lg:row-start-1 lg:px-0">
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
            open={calculator.result !== null}
            class="rounded-primary border border-subtle px-4 py-3"
            data-e2e="size-calculator"
          >
            <summary class="cursor-pointer font-medium">{words.calculator}</summary>
            <form method="get" action={path} class="mt-4 flex flex-wrap items-end gap-3">
              {colour && <input type="hidden" name="color" value={colour.id} />}
              <Field id="height" label={words.heightCm} class="w-32">
                <Input
                  type="number"
                  name="height"
                  inputMode="numeric"
                  min={1}
                  max={250}
                  required
                  defaultValue={calculator.height?.toString() ?? ``}
                />
              </Field>
              <Field id="weight" label={words.weightKg} class="w-32">
                <Input
                  type="number"
                  name="weight"
                  inputMode="numeric"
                  min={1}
                  max={300}
                  required
                  defaultValue={calculator.weight?.toString() ?? ``}
                />
              </Field>
              <button type="submit" class={buttonClasses(`outline`, `md`)}>
                {words.calculate}
              </button>
            </form>
            {calculator.result && (
              <p role="status" class="mt-3 font-semibold text-pretty" data-e2e="size-advice">
                {calculator.result}
              </p>
            )}
          </details>
        )}
      </div>

      {children && (
        <div class="flex flex-col gap-8 px-4 lg:col-start-1 lg:row-start-3 lg:px-0">
          {children}
        </div>
      )}

      {actions.length > 0
        ? (
          <OrderBar
            form="order"
            class="lg:col-start-2 lg:row-start-2 lg:self-start"
            message={message}
            actions={barActions(actions)}
            secondary={soldOut ? undefined : {
              label: words.addToList,
              icon: <IconPlus aria-hidden="true" class="size-5" />,
              name: `add`,
              value: `1`,
              attributes: { formaction: PATHS.list[lang] },
            }}
            status={status ?? (soldOut ? words.soldOut : undefined)}
            note={delivery}
            labels={{ region: words.orderRegion, message: words.orderMessage }}
          />
        )
        : (
          <p class="px-4 text-muted lg:col-start-2 lg:row-start-2 lg:px-0" data-e2e="no-channel">
            {words.noChannel}
          </p>
        )}
    </div>
  )
}
