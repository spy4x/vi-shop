import { expect } from "@std/expect"
import { describe, it } from "@std/testing/bdd"
import { blogTeaserIssue } from "../blog/blog-publish-job.ts"
import { renderSubscriberIssue } from "../jobs/subscriber-issue.ts"
import { subscriberConfirmMail, subscriberWelcomeMail } from "../jobs/subscriber-mail.ts"
import { uuidV7 } from "@spy4x/platform/universal/uuid"

const brand = { webAppUrl: `https://vi-shop.example.com` }

describe(`the shop's subscriber mails`, () => {
  it(`confirm an address in Vietnamese, with the writer's subject, button and footer`, () => {
    const mail = subscriberConfirmMail(brand, {
      to: `an@example.com`,
      link: `https://vi-shop.example.com/subscribe/confirm?list=news&token=t`,
      language: `en`,
    })

    expect(mail.subject).toBe(`Xác nhận nhận tin từ Vi shop`)
    expect(mail.text).toContain(`Có người vừa đăng ký nhận tin mẫu mới của Vi shop`)
    expect(mail.text).toContain(`Link dùng được trong 3 ngày.`)
    expect(mail.html).toContain(`Xác nhận đăng ký`)
    expect(mail.text).toContain(`Nếu bạn không đăng ký, cứ bỏ qua email này.`)
    expect(mail.text).not.toContain(`Confirm`)
  })

  it(`welcome a subscriber in Vietnamese, with "Hủy đăng ký" as the unsubscribe link`, () => {
    const mail = subscriberWelcomeMail(brand, {
      to: `an@example.com`,
      unsubscribeLink: `https://vi-shop.example.com/api/subscribers/unsubscribe?list=news&token=t`,
      language: `en`,
    })

    expect(mail.subject).toBe(`Bạn đã đăng ký nhận tin Vi shop`)
    expect(mail.text).toContain(`Cảm ơn bạn. Email tiếp theo đến khi có mẫu mới`)
    expect(mail.text).toContain(`Bạn nhận email này vì đã đăng ký ở vi-shop.example.com.`)
    expect(mail.html).toContain(`Hủy đăng ký`)
    expect(mail.text).not.toContain(`Unsubscribe`)
  })

  it(`send a post's issue with a Vietnamese button and footer`, () => {
    const issue = renderSubscriberIssue(
      brand,
      blogTeaserIssue({
        id: uuidV7(),
        slug: `chon-size`,
        title: `Chọn size`,
        description: `Cách chọn size.`,
        tldr: [],
        language: `en`,
      }, `https://vi-shop.example.com`),
      `en`,
    )

    expect(issue.letter.text).toContain(`Đọc tiếp`)
    expect(issue.letter.text).toContain(`Bạn nhận email này vì đã đăng ký ở vi-shop.example.com.`)
    expect(issue.letter.html).toContain(`Hủy đăng ký`)
    expect(issue.letter.text).not.toContain(`Read the post`)
  })

  it(`keep Seed's words for a subscriber of another language`, () => {
    const mail = subscriberConfirmMail(brand, {
      to: `eva@example.com`,
      link: `https://vi-shop.example.com/es/subscribe/confirm?list=news&token=t`,
      language: `es`,
    })

    expect(mail.subject).toBe(`Confirma tu suscripción a vi-shop.example.com`)
  })
})
