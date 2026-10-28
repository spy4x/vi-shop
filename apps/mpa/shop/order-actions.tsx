import type { JSX } from "preact"
import { IconChatBubble, IconTelegram } from "@spy4x/preact-icons"
import type { OrderBarAction } from "@spy4x/preact-ui/order-bar"
import type { Lang } from "./lang.ts"
import type { OrderChannels, OrderIntent } from "./order.ts"
import { WORDS } from "./words.ts"

/**
 * What an order button's click tells Umami, as Seed's `docs/catalog.md` ("Order buttons") names it:
 * the item's slug (the slugs, comma-separated, on the order list) and the tracking link's source
 * tag the visit arrived with, if any. Nothing about the shopper. Without Umami's tracker on the
 * page the attributes send nothing.
 */
export interface OrderTrack {
  item: string
  source: string | null
}

/** The `data-umami-*` attributes of the button that orders on `channel`. */
function trackAttributes(channel: string, track: OrderTrack): Record<string, string> {
  return {
    "data-umami-event": `order-${channel}`,
    "data-umami-event-item": track.item,
    ...(track.source ? { "data-umami-event-source": track.source } : {}),
  }
}

/**
 * The order buttons for the shop's chats, as submit buttons named `via`: Telegram first, so it is
 * the one accent-filled button, then Zalo. A chat the shop has no link for has no button. Each
 * click is an Umami event (`order-telegram`, `order-zalo`) with `track`.
 */
export function orderActions(
  lang: Lang,
  channels: OrderChannels,
  intent: OrderIntent,
  track: OrderTrack,
): OrderBarAction[] {
  const words = WORDS[lang]
  const actions: OrderBarAction[] = []
  if (channels.telegram) {
    actions.push({
      label: intent === `ask` ? words.askTelegram : words.orderTelegram,
      shortLabel: `Telegram`,
      icon: <IconTelegram aria-hidden="true" class="size-5" />,
      name: `via`,
      value: `telegram`,
      attributes: trackAttributes(`telegram`, track),
    })
  }
  if (channels.zalo) {
    actions.push({
      label: intent === `ask` ? words.askZalo : words.orderZalo,
      shortLabel: `Zalo`,
      icon: <IconChatBubble aria-hidden="true" class="size-5" />,
      name: `via`,
      value: `zalo`,
      attributes: trackAttributes(`zalo`, track),
    })
  }
  return actions
}

/** The actions as `OrderBar` takes them: one or two. Call it only when there is at least one. */
export function barActions(
  actions: readonly OrderBarAction[],
): readonly [OrderBarAction] | readonly [OrderBarAction, OrderBarAction] {
  return actions.slice(0, 2) as [OrderBarAction] | [OrderBarAction, OrderBarAction]
}

/**
 * What an order bar's bubble shows: on a phone, where the bar is stuck over the page, `preview`
 * in at most two lines; from `lg`, beside the photos, the whole `message` the chat receives.
 */
export function OrderBarMessage(
  { preview, message }: { preview: string; message: string },
): JSX.Element {
  return (
    <>
      <span class="line-clamp-2 whitespace-normal lg:hidden" data-e2e="order-bar-preview">
        {preview}
      </span>
      <span class="max-lg:hidden">{message}</span>
    </>
  )
}
