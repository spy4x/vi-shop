import { contactHref } from "@spy4x/platform/universal/contact"
import type { PublicContactLink } from "@domain/contact-links"
import type { OrderChannels } from "./order.ts"

/** The order chats among the contact links the admin panel keeps. */
export function orderChannels(links: readonly PublicContactLink[]): OrderChannels {
  const href = (kind: `telegram` | `zalo`) => {
    const link = links.find((each) => each.kind === kind)
    return link ? contactHref(link.kind, link.value) : null
  }
  return { telegram: href(`telegram`), zalo: href(`zalo`) }
}
