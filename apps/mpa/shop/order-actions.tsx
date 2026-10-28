import { IconChatBubble, IconTelegram } from "@spy4x/preact-icons"
import type { OrderBarAction } from "@spy4x/preact-ui/order-bar"
import type { Lang } from "./lang.ts"
import type { OrderChannels, OrderIntent } from "./order.ts"
import { WORDS } from "./words.ts"

/**
 * The order buttons for the shop's chats, as submit buttons named `via`: Telegram first, so it is
 * the one accent-filled button, then Zalo. A chat the shop has no link for has no button.
 */
export function orderActions(
  lang: Lang,
  channels: OrderChannels,
  intent: OrderIntent,
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
    })
  }
  if (channels.zalo) {
    actions.push({
      label: intent === `ask` ? words.askZalo : words.orderZalo,
      shortLabel: `Zalo`,
      icon: <IconChatBubble aria-hidden="true" class="size-5" />,
      name: `via`,
      value: `zalo`,
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
