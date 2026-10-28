import { formatMoney } from "@spy4x/platform/universal/money"
import type { Lang } from "./lang.ts"

/**
 * Every word the storefront shows, in Vietnamese and English (docs/shop/design.md, "Words").
 * Vietnamese is written as a friendly seller talks in chat; English is a faithful translation.
 *
 * @module
 */

/** The words of one language. */
export interface ShopWords {
  /** `<html lang>` and the Open Graph locale. */
  htmlLang: string
  ogLocale: string
  /** The locale prices are formatted in. */
  moneyLocale: string
  skip: string
  nav: string
  menu: string
  /** The language switch: what it says, and its accessible name, in the other language. */
  switchShort: string
  switchName: string
  switchLang: string
  list: string
  listCount: (count: number) => string
  faq: string
  categories: string
  info: string
  contact: string
  privacy: string
  terms: string
  homeTitle: string
  homeDescription: string
  headline: string
  quality: string
  newIn: string
  yourSize: string
  allSizes: string
  colour: string
  allColours: string
  filter: string
  noneInSize: (size: string) => string
  noneInFilter: string
  seeAll: string
  seeEverything: string
  emptyCatalog: string
  categoryDescription: (name: string) => string
  /** Words of the look tiles. */
  tile: {
    sizes: string
    colors: string
    sizeSoldOut: string
    chosenSize: string
    soldOut: string
  }
  back: (category: string) => string
  size: string
  soldOut: string
  sizeSoldOut: string
  sizeTable: string
  height: string
  weight: string
  heightCm: string
  weightKg: string
  calculator: string
  calculate: string
  yourSizeIs: (size: string) => string
  between: (smaller: string, larger: string) => string
  outsideChart: string
  /** The calculator's size is sold out in the colour picked, and no size in between is left. */
  fitSoldOut: (size: string) => string
  /** Between two sizes, the larger is sold out: `pick` is the nearest one in between in stock. */
  betweenSoldOut: (smaller: string, larger: string, pick: string) => string
  /** Between two sizes, and every size from one to the other is sold out. */
  betweenNoneLeft: (smaller: string, larger: string) => string
  material: string
  fit: string
  care: string
  facts: string
  factsPrice: (name: string, price: string) => string
  factsSizes: (sizes: string) => string
  factsColours: (colours: string) => string
  factsOrder: string
  photos: string
  noPhoto: string
  orderRegion: string
  orderMessage: string
  orderTelegram: string
  orderZalo: string
  askTelegram: string
  askZalo: string
  addToList: string
  copied: string
  copyFailed: string
  noChannel: string
  deliveryToday: string
  deliveryTomorrow: string
  /** The order message: its greeting, the parts of a line and the total. */
  message: {
    order: string
    orderMany: string
    ask: string
    colour: (name: string) => string
    size: (label: string) => string
    colourNotChosen: string
    sizeNotChosen: string
    total: (price: string) => string
  }
  listTitle: string
  listDescription: string
  listEmpty: string
  listBrowse: string
  remove: (name: string) => string
  total: string
  zaloTitle: string
  zaloDescription: string
  zaloHint: string
  zaloOpen: string
  faqTitle: string
  faqDescription: string
  notFound: string
}

const vi: ShopWords = {
  htmlLang: `vi`,
  ogLocale: `vi_VN`,
  moneyLocale: `vi-VN`,
  skip: `Bỏ qua, đến nội dung`,
  nav: `Điều hướng chính`,
  menu: `Menu`,
  switchShort: `EN`,
  switchName: `English`,
  switchLang: `en`,
  list: `Danh sách`,
  listCount: (count) => count === 0 ? `Danh sách` : `Danh sách (${count})`,
  faq: `Hỏi đáp`,
  categories: `Danh mục`,
  info: `Thông tin`,
  contact: `Liên hệ`,
  privacy: `Quyền riêng tư`,
  terms: `Điều khoản`,
  homeTitle: `Vi shop: quần áo tập và mặc hằng ngày ở Đà Nẵng`,
  homeDescription: `Quần áo chất lượng cao, ảnh thật trên người mặc. Chọn màu và size, ` +
    `đặt qua Telegram hoặc Zalo, giao trong ngày ở Đà Nẵng nếu đặt trước 16:00.`,
  headline: `Mặc để chuyển động.`,
  quality: `Vải tốt, đường may kỹ. Giá cao hơn một chút, và xứng đáng.`,
  newIn: `Mẫu mới`,
  yourSize: `Size của bạn`,
  allSizes: `Tất cả`,
  colour: `Màu`,
  allColours: `Tất cả màu`,
  filter: `Lọc`,
  noneInSize: (size) => `Chưa có món nào size ${size}.`,
  noneInFilter: `Chưa có món nào hợp bộ lọc này.`,
  seeAll: `Xem tất cả size?`,
  seeEverything: `Xem tất cả mẫu?`,
  emptyCatalog: `Shop đang chụp ảnh các mẫu đầu tiên. Quay lại sau nhé.`,
  categoryDescription: (name) =>
    `${name} của Vi shop: ảnh thật, giá và size còn hàng. Đặt qua Telegram hoặc Zalo.`,
  tile: {
    sizes: `Size`,
    colors: `Màu`,
    sizeSoldOut: `hết hàng`,
    chosenSize: `size của bạn`,
    soldOut: `Hết hàng`,
  },
  back: (category) => `Quay lại ${category}`,
  size: `Size`,
  soldOut: `Hết hàng`,
  sizeSoldOut: `hết hàng`,
  sizeTable: `Bảng size`,
  height: `Chiều cao`,
  weight: `Cân nặng`,
  heightCm: `Chiều cao (cm)`,
  weightKg: `Cân nặng (kg)`,
  calculator: `Chưa biết size? Tính size`,
  calculate: `Tính size`,
  yourSizeIs: (size) => `Size của bạn: ${size}`,
  between: (smaller, larger) =>
    `Size của bạn ở giữa ${smaller} và ${larger}. Chọn ${larger} cho thoải mái.`,
  outsideChart: `Số đo này nằm ngoài bảng size. Nhắn shop để được tư vấn nhé.`,
  fitSoldOut: (size) =>
    `Size của bạn: ${size}, nhưng ${size} đang hết hàng. Hỏi shop khi nào có lại nhé.`,
  betweenSoldOut: (smaller, larger, pick) =>
    `Size của bạn ở giữa ${smaller} và ${larger}. ${larger} đang hết hàng, chọn ${pick}: size gần nhất còn hàng.`,
  betweenNoneLeft: (smaller, larger) =>
    `Size của bạn ở giữa ${smaller} và ${larger}, nhưng các size này đang hết hàng. Hỏi shop khi nào có lại nhé.`,
  material: `Chất liệu`,
  fit: `Form`,
  care: `Giặt và bảo quản`,
  facts: `Thông tin nhanh`,
  factsPrice: (name, price) => `${name} giá ${price}.`,
  factsSizes: (sizes) => `Size: ${sizes}.`,
  factsColours: (colours) => `Màu: ${colours}.`,
  factsOrder: `Đặt hàng qua Telegram hoặc Zalo: chọn màu và size, gửi tin nhắn, shop xác nhận ` +
    `và báo cách thanh toán.`,
  photos: `Ảnh sản phẩm`,
  noPhoto: `Ảnh đang được cập nhật`,
  orderRegion: `Đặt hàng`,
  orderMessage: `Tin nhắn của bạn`,
  orderTelegram: `Đặt qua Telegram`,
  orderZalo: `Đặt qua Zalo`,
  askTelegram: `Hỏi khi có lại qua Telegram`,
  askZalo: `Hỏi khi có lại qua Zalo`,
  addToList: `Thêm vào danh sách`,
  copied: `Đã chép tin nhắn. Dán vào Zalo.`,
  copyFailed: `Chưa chép được. Hãy chọn tin nhắn và chép tay nhé.`,
  noChannel: `Shop đang cập nhật kênh đặt hàng. Quay lại sau nhé.`,
  deliveryToday: `Giao trong ngày ở Đà Nẵng nếu đặt trước 16:00`,
  deliveryTomorrow: `Đặt bây giờ, giao ngày mai ở Đà Nẵng`,
  message: {
    order: `Chào shop, mình muốn đặt:`,
    orderMany: `Chào shop, mình muốn đặt các món này:`,
    ask: `Chào shop, khi nào món này có lại vậy?`,
    colour: (name) => `màu ${name}`,
    size: (label) => `size ${label}`,
    colourNotChosen: `màu: chưa chọn`,
    sizeNotChosen: `size: chưa chọn`,
    total: (price) => `Tổng: ${price}`,
  },
  listTitle: `Danh sách đặt hàng`,
  listDescription: `Gom nhiều món vào một tin nhắn, rồi gửi cho shop qua Telegram hoặc Zalo.`,
  listEmpty: `Danh sách còn trống. Thêm món từ trang sản phẩm.`,
  listBrowse: `Xem mẫu mới`,
  remove: (name) => `Bỏ ${name}`,
  total: `Tổng`,
  zaloTitle: `Gửi đơn qua Zalo`,
  zaloDescription: `Chép tin nhắn đặt hàng, rồi dán vào chat Zalo với shop.`,
  zaloHint: `Zalo không điền sẵn tin nhắn được. Chọn tin nhắn bên dưới, chép, rồi dán vào chat.`,
  zaloOpen: `Mở Zalo`,
  faqTitle: `Hỏi đáp`,
  faqDescription: `Cách đặt hàng, thanh toán, giao hàng, đổi size và chọn size ở Vi shop.`,
  notFound: `Không tìm thấy trang này.`,
}

const en: ShopWords = {
  htmlLang: `en`,
  ogLocale: `en_US`,
  moneyLocale: `en`,
  skip: `Skip to content`,
  nav: `Main navigation`,
  menu: `Menu`,
  switchShort: `VI`,
  switchName: `Tiếng Việt`,
  switchLang: `vi`,
  list: `List`,
  listCount: (count) => count === 0 ? `List` : `List (${count})`,
  faq: `FAQ`,
  categories: `Categories`,
  info: `About`,
  contact: `Contact`,
  privacy: `Privacy (Vietnamese)`,
  terms: `Terms (Vietnamese)`,
  homeTitle: `Vi shop: activewear and everyday clothes in Da Nang`,
  homeDescription: `High-quality clothes, photographed on real people. Pick a colour and size, ` +
    `order on Telegram or Zalo, with same-day delivery in Da Nang if you order before 16:00.`,
  headline: `Dress to move.`,
  quality: `Good fabric, careful seams. It costs a little more, and it is worth it.`,
  newIn: `New in`,
  yourSize: `Your size`,
  allSizes: `All`,
  colour: `Colour`,
  allColours: `All colours`,
  filter: `Filter`,
  noneInSize: (size) => `Nothing in size ${size} yet.`,
  noneInFilter: `Nothing matches this filter yet.`,
  seeAll: `See all sizes?`,
  seeEverything: `See everything?`,
  emptyCatalog: `The shop is photographing its first pieces. Come back soon.`,
  categoryDescription: (name) =>
    `${name} at Vi shop: real photos, prices and the sizes in stock. Order on Telegram or Zalo.`,
  tile: {
    sizes: `Sizes`,
    colors: `Colours`,
    sizeSoldOut: `sold out`,
    chosenSize: `your size`,
    soldOut: `Sold out`,
  },
  back: (category) => `Back to ${category}`,
  size: `Size`,
  soldOut: `Sold out`,
  sizeSoldOut: `sold out`,
  sizeTable: `Size chart`,
  height: `Height`,
  weight: `Weight`,
  heightCm: `Height (cm)`,
  weightKg: `Weight (kg)`,
  calculator: `Not sure of your size? Find it`,
  calculate: `Find my size`,
  yourSizeIs: (size) => `Your size: ${size}`,
  between: (smaller, larger) =>
    `You are between ${smaller} and ${larger}. ${larger} will be more comfortable.`,
  outsideChart: `These measurements are outside the size chart. Message the shop for advice.`,
  fitSoldOut: (size) =>
    `Your size is ${size}, but ${size} is sold out. Ask the shop when it is back.`,
  betweenSoldOut: (smaller, larger, pick) =>
    `You are between ${smaller} and ${larger}. ${larger} is sold out, so take ${pick}: the nearest size in stock.`,
  betweenNoneLeft: (smaller, larger) =>
    `You are between ${smaller} and ${larger}, and those sizes are sold out. Ask the shop when they are back.`,
  material: `Material`,
  fit: `Fit`,
  care: `Care`,
  facts: `Quick facts`,
  factsPrice: (name, price) => `${name} costs ${price}.`,
  factsSizes: (sizes) => `Sizes: ${sizes}.`,
  factsColours: (colours) => `Colours: ${colours}.`,
  factsOrder: `Order on Telegram or Zalo: pick a colour and size, send the message, and the shop ` +
    `confirms and tells you how to pay.`,
  photos: `Photos`,
  noPhoto: `Photo coming soon`,
  orderRegion: `Order`,
  orderMessage: `Your message`,
  orderTelegram: `Order on Telegram`,
  orderZalo: `Order on Zalo`,
  askTelegram: `Ask on Telegram when it is back`,
  askZalo: `Ask on Zalo when it is back`,
  addToList: `Add to list`,
  copied: `Message copied. Paste it into Zalo.`,
  copyFailed: `Could not copy. Select the message and copy it by hand.`,
  noChannel: `The shop is setting up its order chats. Come back soon.`,
  deliveryToday: `Same-day delivery in Da Nang if you order before 16:00`,
  deliveryTomorrow: `Order now, delivered tomorrow in Da Nang`,
  message: {
    order: `Hi, I'd like to order:`,
    orderMany: `Hi, I'd like to order these:`,
    ask: `Hi, when will this be back in stock?`,
    colour: (name) => `colour ${name}`,
    size: (label) => `size ${label}`,
    colourNotChosen: `colour: not chosen`,
    sizeNotChosen: `size: not chosen`,
    total: (price) => `Total: ${price}`,
  },
  listTitle: `Order list`,
  listDescription:
    `Put several pieces in one message, then send it to the shop on Telegram or Zalo.`,
  listEmpty: `Your list is empty. Add pieces from their pages.`,
  listBrowse: `See what is new`,
  remove: (name) => `Remove ${name}`,
  total: `Total`,
  zaloTitle: `Send your order on Zalo`,
  zaloDescription: `Copy the order message, then paste it into your Zalo chat with the shop.`,
  zaloHint: `Zalo cannot fill in a message. Select the message below, copy it, and paste it ` +
    `into the chat.`,
  zaloOpen: `Open Zalo`,
  faqTitle: `FAQ`,
  faqDescription: `How ordering, payment, delivery, size exchanges and sizing work at Vi shop.`,
  notFound: `This page was not found.`,
}

/** The words of each language. */
export const WORDS: Record<Lang, ShopWords> = { vi, en }

/** The catalog's currency: every price is a whole number of dong. */
export const SHOP_CURRENCY = `VND`

/** A price in dong as the language writes it: `590.000 ₫` in Vietnamese, `₫590,000` in English. */
export function formatPrice(amount: number, lang: Lang): string {
  return formatMoney(amount, SHOP_CURRENCY, WORDS[lang].moneyLocale)
}
