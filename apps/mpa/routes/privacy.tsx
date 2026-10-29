// The shop's own Vietnamese words: Seed's `site` catalog has no Vietnamese, and the
// storefront keeps its words in `shop/words.ts` (AGENTS.md, "Languages").
// deno-lint-ignore-file ui-text/no-literal
import { LegalPage, REPOSITORY_URL, SITE_NAME } from "../site.tsx"
import { define } from "../utils.ts"

/** The privacy page's title, summary and the date its text last changed. */
export const PRIVACY_HEAD = {
  title: `Quyền riêng tư`,
  description: `${SITE_NAME} lưu gì về bạn: không tài khoản, không cookie, không bán ` +
    `dữ liệu. Đơn hàng được trao đổi qua Telegram hoặc Zalo.`,
  updated: `2026-10-29`,
} as const

/**
 * What the shop's website keeps about a shopper, and what it does not, in plain words. The shop has
 * no customer accounts: orders go through the shopper's own chat with the shop.
 */
export default define.page(function Privacy({ state }) {
  return (
    <LegalPage
      state={state}
      path="/privacy"
      title={PRIVACY_HEAD.title}
      description={PRIVACY_HEAD.description}
      updated="29/10/2026"
    >
      <p>
        Trang này nói rõ trang web {new URL(state.webAppOrigin).host} lưu gì về bạn và vì sao.
      </p>
      <h2 id="website">Trang web</h2>
      <ul>
        <li>
          Bạn không cần tạo tài khoản để xem hay đặt hàng, nên trang web không có tài khoản nào của
          bạn.
        </li>
        <li>Trang web không đặt cookie và không có quảng cáo.</li>
        <li>
          {state.analytics
            ? `Trang web đếm lượt xem bằng Umami, một công cụ thống kê chúng tôi tự vận hành: không cookie, không lưu địa chỉ IP hay thông tin nào cho biết bạn là ai.`
            : `Trang web không thu thập thống kê lượt truy cập.`}
        </li>
        <li>
          Máy chủ ghi nhật ký truy cập, gồm địa chỉ IP và loại trình duyệt, để vận hành và sửa lỗi.
          Nhật ký chỉ được giữ trong thời gian ngắn rồi tự động bị xóa, và không dùng vào việc khác.
        </li>
      </ul>
      <h2 id="orders">Đặt hàng</h2>
      <p>
        Khi bạn đặt hàng, bạn nhắn tin cho cửa hàng qua Telegram hoặc Zalo. Tin nhắn, tên và số điện
        thoại của bạn nằm trong ứng dụng chat đó, theo chính sách riêng tư của Telegram hoặc Zalo.
        Cửa hàng chỉ dùng chúng để xác nhận, giao hàng và trả lời bạn.
      </p>
      <h2 id="newsletter">Đăng ký nhận tin</h2>
      <p>
        Nếu bạn đăng ký nhận tin, chúng tôi lưu email của bạn cho đến khi bạn hủy đăng ký, và chỉ
        dùng nó để gửi tin mẫu mới và bài viết mới.
      </p>
      <h2 id="not">Những điều chúng tôi không làm</h2>
      <p>
        Chúng tôi không bán, không chia sẻ dữ liệu của bạn và không gửi email nào bạn không đăng ký.
      </p>
      <h2 id="questions">Câu hỏi</h2>
      <p>
        Muốn hỏi hoặc yêu cầu xóa tin nhắn? Hãy nhắn trực tiếp cho cửa hàng trong chat, hoặc{" "}
        <a href={`${REPOSITORY_URL}/issues`}>viết cho chúng tôi trên GitHub</a>.
      </p>
      <p lang="en">
        In English: this website has no accounts, sets no cookies and shows no ads. Orders happen in
        your own Telegram or Zalo chat with the shop. Server logs with your IP address are kept for
        a short time to run the site, then deleted automatically. If you subscribe, we keep your
        email address until you unsubscribe, and use it only to send new pieces and new posts.
      </p>
    </LegalPage>
  )
})
