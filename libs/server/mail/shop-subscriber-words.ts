/**
 * The shop's own words for the newsletter's mails: the confirm mail, the welcome mail, and an
 * issue's button and footer. The shop's blog and newsletter are Vietnamese only (issue #16), and
 * Seed has no Vietnamese, so a subscriber of the main language, which the shop's own pages always
 * sign up in, gets these words. Any other language keeps Seed's catalog. Only the subscriber mail
 * builders read this; every other mail, such as an operator's sign-in code, stays Seed's.
 *
 * Shop-owned: Seed has no such file, and docs/shop/spec.md ("What the shop changed in Seed's
 * files") lists the lines of Seed's builders that call it.
 *
 * @module
 */

import { createTranslator, type Translator } from "@spy4x/platform/universal/i18n"
import { DEFAULT_LANGUAGE, type Language } from "@domain/identity"
import mailEn from "@i18n/mail/en.json" with { type: "json" }
import { translatorFor } from "./mail.ts"

/** The Vietnamese of each subscriber mail key, the UX writer's copy (issue #16). */
export const SUBSCRIBER_MAIL_VI = {
  "SubscriberConfirmMail.subject": `Xác nhận nhận tin từ Vi shop`,
  "SubscriberConfirmMail.asked": `Có người vừa đăng ký nhận tin mẫu mới và bài viết mới của ` +
    `Vi shop bằng địa chỉ này. Nếu là bạn, bấm nút bên dưới để xác nhận.`,
  "SubscriberConfirmMail.within": `Link dùng được trong 3 ngày. Sau khi xác nhận, shop gửi ` +
    `email khi có mẫu mới và bài viết mới, hoặc khi món đã hết có lại, nhiều nhất mỗi tuần ` +
    `một lần.`,
  "SubscriberConfirmMail.button": `Xác nhận đăng ký`,
  "SubscriberConfirmMail.ignore":
    `Nếu bạn không đăng ký, cứ bỏ qua email này. Shop sẽ không gửi gì thêm.`,
  "SubscriberWelcomeMail.subject": `Bạn đã đăng ký nhận tin Vi shop`,
  "SubscriberWelcomeMail.subscribed": `Cảm ơn bạn. Email tiếp theo đến khi có mẫu mới và bài ` +
    `viết mới, hoặc khi món đã hết có lại, nhiều nhất mỗi tuần một lần. Muốn hỏi size hay ` +
    `đặt hàng, cứ nhắn shop qua Telegram hoặc Zalo.`,
  "SubscriberWelcomeMail.reason": `Bạn nhận email này vì đã đăng ký ở {host}.`,
  "SubscriberWelcomeMail.unsubscribe": `Hủy đăng ký`,
  "SubscriberIssue.reason": `Bạn nhận email này vì đã đăng ký ở {host}.`,
  "SubscriberIssue.readPost": `Đọc tiếp`,
} as const satisfies Partial<Record<keyof typeof mailEn, string>>

let vietnamese: Translator<string> | undefined

/**
 * The words of a subscriber mail in `language`: the shop's Vietnamese for the main language, Seed's
 * catalog ({@link translatorFor}) for any other.
 */
export function subscriberMailText(language: Language): Translator<string> {
  if (language !== DEFAULT_LANGUAGE) return translatorFor(language)
  vietnamese ??= createTranslator({
    language: `vi`,
    catalogs: [{ source: mailEn, translation: SUBSCRIBER_MAIL_VI }],
  })
  return vietnamese
}
