// The shop's own Vietnamese words: Seed's `site` catalog has no Vietnamese, and the
// storefront keeps its words in `shop/words.ts` (AGENTS.md, "Languages").
// deno-lint-ignore-file ui-text/no-literal
import { LegalPage, SITE_NAME } from "../site.tsx"
import { define } from "../utils.ts"

/** The terms page's title, summary and the date its text last changed. */
export const TERMS_HEAD = {
  title: `Điều khoản`,
  description: `Cách đặt hàng ở ${SITE_NAME}: giá, size và đơn hàng được xác nhận trong chat ` +
    `Telegram hoặc Zalo trước khi giao.`,
  updated: `2026-10-28`,
} as const

/** The few rules of ordering from the shop: the chat is the checkout. */
export default define.page(function Terms({ state }) {
  return (
    <LegalPage
      state={state}
      path="/terms"
      title={TERMS_HEAD.title}
      description={TERMS_HEAD.description}
      updated="28/10/2026"
    >
      <h2 id="catalog">Danh mục</h2>
      <p>
        Trang web cho bạn xem các mẫu quần áo, giá và size còn hàng. Chúng tôi cố gắng giữ thông tin
        luôn đúng, nhưng giá và tình trạng còn hàng chỉ chắc chắn khi cửa hàng xác nhận trong chat.
      </p>
      <h2 id="orders">Đặt hàng và thanh toán</h2>
      <p>
        Trang web không nhận thanh toán. Bạn đặt hàng bằng cách nhắn tin cho cửa hàng qua Telegram
        hoặc Zalo. Đơn hàng chỉ được tính khi cửa hàng xác nhận mẫu, màu, size, giá, cách thanh toán
        và giao hàng với bạn.
      </p>
      <h2 id="exchanges">Đổi hàng</h2>
      <p>
        Cách đổi size hoặc trả hàng được cửa hàng thống nhất với bạn trong chat, trước khi giao.
      </p>
      <h2 id="changes">Thay đổi</h2>
      <p>
        Khi điều khoản thay đổi, ngày cập nhật ở đầu trang cũng thay đổi. Đơn hàng đã xác nhận giữ
        nguyên điều kiện đã thống nhất.
      </p>
      <p lang="en">
        In English: the website shows the catalog but takes no payments. An order exists once the
        shop confirms the item, size, price, payment and delivery with you in Telegram or Zalo.
      </p>
    </LegalPage>
  )
})
