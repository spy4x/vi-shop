import { FaqList } from "@spy4x/preact-ui/faq-list"
import { faqPageJsonLd } from "@spy4x/platform/universal/seo"
import { define } from "../utils.ts"
import { ShopFrame } from "./frame.tsx"
import { type Lang, PATHS } from "./lang.ts"
import { crumbsJsonLd } from "./seo.ts"
import { WORDS } from "./words.ts"

/** One question and its answer in one or two sentences an assistant can quote. */
interface Question {
  question: string
  answer: string
}

/**
 * The FAQ, in both languages: ordering, payment, delivery, exchanges and sizing. It is the shop's
 * copy, kept here until Seed has FAQ entries edited in the admin panel.
 */
export const FAQ: Record<Lang, readonly Question[]> = {
  vi: [
    {
      question: `Đặt hàng thế nào?`,
      answer: `Mở trang sản phẩm, chọn màu và size, rồi bấm "Đặt qua Telegram" hoặc "Đặt qua ` +
        `Zalo". Tin nhắn đặt hàng đã được viết sẵn, bạn chỉ cần gửi cho shop.`,
    },
    {
      question: `Có cần tạo tài khoản không?`,
      answer: `Không. Bạn đặt hàng trong chat với shop, không cần đăng ký hay đăng nhập.`,
    },
    {
      question: `Thanh toán thế nào?`,
      answer:
        `Shop xác nhận đơn trong chat và báo cách thanh toán. Không có thanh toán trên trang ` +
        `web.`,
    },
    {
      question: `Bao lâu thì nhận được hàng?`,
      answer: `Ở Đà Nẵng, đơn đặt trước 16:00 (giờ Việt Nam) được giao trong ngày; đơn đặt sau ` +
        `16:00 được giao ngày hôm sau. Nơi khác, shop báo thời gian giao trong chat.`,
    },
    {
      question: `Làm sao biết mình mặc size nào?`,
      answer: `Trên trang sản phẩm, nhập chiều cao và cân nặng vào phần "Tính size", trang sẽ ` +
        `gợi ý size. Bảng size của từng món cũng nằm ngay trên trang đó.`,
    },
    {
      question: `Nếu mặc không vừa thì sao?`,
      answer: `Nhắn shop trong chat; shop sẽ hướng dẫn đổi size nếu size bạn cần còn hàng.`,
    },
    {
      question: `Sao giá cao hơn chỗ khác?`,
      answer: `Shop chọn vải tốt và may kỹ, nên giá cao hơn. Trên mỗi trang sản phẩm có chất ` +
        `liệu và cách may để bạn tự đánh giá.`,
    },
  ],
  en: [
    {
      question: `How do I order?`,
      answer: `Open an item's page, pick a colour and size, and press "Order on Telegram" or ` +
        `"Order on Zalo". The order message is written for you; you only send it to the shop.`,
    },
    {
      question: `Do I need an account?`,
      answer: `No. You order in a chat with the shop, with no sign-up and no sign-in.`,
    },
    {
      question: `How do I pay?`,
      answer: `The shop confirms your order in the chat and tells you how to pay. There is no ` +
        `payment on the website.`,
    },
    {
      question: `When will my order arrive?`,
      answer: `In Da Nang, orders placed before 16:00 (Vietnam time) are delivered the same day; ` +
        `orders placed later arrive the next day. Elsewhere, the shop tells you in the chat.`,
    },
    {
      question: `Which size should I pick?`,
      answer: `On an item's page, enter your height and weight under "Find it" and the page ` +
        `suggests a size. Each item's size chart is on the same page.`,
    },
    {
      question: `What if it does not fit?`,
      answer: `Message the shop in the chat; it will help you exchange the size if the one you ` +
        `need is in stock.`,
    },
    {
      question: `Why does it cost more than elsewhere?`,
      answer: `The shop chooses good fabric and careful sewing, so the price is higher. Each ` +
        `item's page shows the material and how it is made, so you can judge for yourself.`,
    },
  ],
}

/** The FAQ page (`/hoi-dap`, `/en/faq`): the questions as `<details>`, with `FAQPage` data. */
export function faqRoute(lang: Lang) {
  return define.page(function Faq({ state }) {
    const words = WORDS[lang]
    const path = PATHS.faq[lang]
    const questions = FAQ[lang]
    return (
      <ShopFrame
        state={state}
        lang={lang}
        path={path}
        head={{
          title: words.faqTitle,
          description: words.faqDescription,
          jsonLd: [
            faqPageJsonLd(
              questions.map(({ question, answer }) => ({ question, answerText: answer })),
            ),
            crumbsJsonLd(state.webAppOrigin, path, lang, [{ name: words.faqTitle }]),
          ],
        }}
      >
        <div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 lg:py-16">
          <h1 class="text-6xl font-extrabold leading-tight tracking-tighter text-balance">
            {words.faqTitle}
          </h1>
          <FaqList items={questions} headingLevel={2} />
        </div>
      </ShopFrame>
    )
  })
}
