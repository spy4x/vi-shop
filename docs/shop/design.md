# Vi shop: design

The look and the screens of the public website, against the house design language
(`spy4x/preact-components`, `docs/design-language.md`). The admin panel uses Seed's admin shell
and screens unchanged; only the website gets the shop's own design.

## The idea: a magazine you order from by chat

Most clothes catalogs are a grid of small square thumbnails, a filter sidebar and a product page
that hides the size question below the fold. Shoppers here arrive from a chat on a phone, look at
clothes on a person, and want three answers: what does it look like on a body, is my size there,
how do I get it. The design answers those three, in that order, and drops the rest.

1. **Looks, not thumbnails.** Every photo is a tall 3:4 picture of the clothes on a person, shown
   large: one per screen width on a phone, an aligned contact sheet on a desktop. Words sit on
   and beside the photos in big, tight type, as in a fashion magazine.
2. **Size first.** A "Your size" chip row sits at the top of every list. Pick `M` once and the
   whole site answers "is there an M": items without one leave the list, and sold-out sizes are
   struck through everywhere. A size counts as sold out in a list when it is sold out in every
   colour; on an item page, when it is sold out in the colour picked. This replaces the question shoppers ask most in chats.
3. **The chat is the checkout.** The order bar shows the message the shopper is about to send, as
   a chat bubble, above the two messenger buttons. Nothing is hidden: no account, no form, no
   payment step.
4. **Movement that carries meaning.** A photo grows from its tile into the item page with a
   cross-document view transition (modern browsers only, as the direction says; no script). The
   photo strip snaps, one centred photo per swipe. Nothing else moves.
5. **Worth the price.** The clothes cost more than most, so the item page shows why before the
   price can put anyone off: a close-up of the fabric or a seam among the photos, the material and
   how it is made near the top, no discount banners and no "sale" red. Calm, confident words.
6. **Delivery today, said where it decides.** "Giao trong ngày ở Đà Nẵng nếu đặt trước 16:00"
   (same-day delivery in Da Nang if you order before 16:00) sits in the order bar, under the home
   headline and in the FAQ. After 16:00 Vietnam time the server renders "Đặt bây giờ, giao ngày
   mai ở Đà Nẵng" (order now, delivered tomorrow in Da Nang).

## Visual language

- **Type:** Geist, as every product, in sentence case. The editorial headline this design wants
  is larger and heavier than the design language allows today (a marketing hero is weight 700 at
  `text-4xl`, `text-6xl` from `lg`). It depends on a "Storefront display" step added to the
  language in preact-components
  ([spy4x/preact-components#1030](https://github.com/spy4x/preact-components/issues/1030)):
  weight 800, tight tracking, the home headline at about `text-6xl` on a phone and `text-9xl` on a
  desktop, the item name at `text-4xl`. Until that lands, the site uses the language's hero sizes.
  Geist covers Vietnamese; check the stacked tone marks (`ặ`, `ữ`, `ỗ`) at the heavy weight.
- **Colour:** the library's neutrals, light and dark palettes. The shop's brand hue is the last
  free one on the design language's wheel, chartreuse at about 105°, at the lightness of 0.38 to 0.5
  the language allows for a white label: athletic, which suits activewear. It appears only on the
  primary action (the **Order on Telegram** button; Zalo is the secondary button beside it, so a view
  has one accent-filled button), the selected size and colour, the brand mark and the favicon. Prices are set in the
  text colour, heavy and large, never as coloured stickers.
- **Photos:** the seller's phone photos, never filtered or recoloured, so the colour a shopper sees
  is the colour that arrives. Each is cropped to 3:4 around the clothes, on the page colour, with
  no card border. The photo is the card.
- **Space:** generous between looks, tight inside the order bar. The library's spacing scale
  throughout.

Patterns the design language lacks (the look tile, colour swatches as a choice, the sticky order
bar with a message preview, the size-first chip row) are added to preact-components and its
design language first, as a "Storefront" section, then used here.

## Screens

Every screen is drawn at 390 px and 1440 px, in the light and dark palettes, with its empty,
loading-free (server-rendered), error and long-text states. All of them work without JavaScript.

### Home (`/`, `/en`)

The newest looks, full size, with the brand's headline over the first one.

```text
390 px                                  1440 px
┌──────────────────────────┐            ┌──────────────────────────────────────────────────────────┐
│ VI SHOP        EN  ☰    │            │ VI SHOP    Áo  Quần  Bộ  Đồ tập  Hỏi đáp      EN  Danh sách (2) │
├──────────────────────────┤            ├──────────────────────────────────────────────────────────┤
│ Size của bạn: XS S [M] L │            │  Mặc để                    Size của bạn: XS S [M] L XL   │
│                          │            │  chuyển động.              ┌────────┐                    │
│ ┌──────────────────────┐ │            │  ┌──────────┐  ┌────────┐ │        │  ┌──────────┐      │
│ │                      │ │            │  │          │  │        │ │ photo  │  │          │      │
│ │      photo 3:4       │ │            │  │  photo   │  │ photo  │ │        │  │  photo   │      │
│ │                      │ │            │  │  (tall)  │  │        │ └────────┘  │          │      │
│ │ Mặc để               │ │            │  │          │  └────────┘ Bộ đồ đỏ    │          │      │
│ │ chuyển động.         │ │            │  └──────────┘  Áo khoác  390.000 ₫  └──────────┘      │
│ └──────────────────────┘ │            │  Quần short    590.000 ₫ S M ~L~    Bộ đồ xanh        │
│ Áo khoác zip   590.000 ₫│            │  250.000 ₫     S M L               390.000 ₫          │
│ S [M] ~L~   ● ●          │            │  aligned columns: 3 at 1440, 2 at 768, 1 at 390       │
│ ┌──────────────────────┐ │            └──────────────────────────────────────────────────────────┘
│ │      next look       │ │
```

- The size row filters the list on the server (`?size=M`, kept in a cookie for the visit).
- Under each look: the name, the price, the sizes (the chosen one marked, sold-out ones struck
  through) and the colour dots. The whole look is one link.
- Empty state, when no item fits the chosen size: "Chưa có món nào size M. Xem tất cả size?" with
  a link that clears the size.

### Category (`/ao-khoac`, `/en/ao-khoac`)

The same list as the home page, for one category, with a colour filter next to the size row. The
category name is the page's headline, set as large as the home page's.

### Item (`/ao-khoac/ao-khoac-zip-nau`)

```text
390 px                                  1440 px
┌──────────────────────────┐            ┌───────────────────────────────┬──────────────────────────┐
│ ← Áo khoác        EN  ☰ │            │                               │ Áo khoác zip             │
│ ┌──────────────────────┐ │            │                               │ nâu                      │
│ │                      │ │            │       photo 1 (3:4),          │ 590.000 ₫                │
│ │  photo strip, swipe  │ │            │       photos scroll down      │                          │
│ │   ● ○ ○ ○ ○          │ │            │       in a column             │ Màu  ● Nâu  ○ Xám        │
│ └──────────────────────┘ │            │                               │ Size  S  [M]  ~L~        │
│ Áo khoác zip nâu         │            │                               │ Bảng size ↓              │
│ 590.000 ₫                │            │                               │ ┌──────────────────────┐ │
│ Màu  ● Nâu  ○ Xám        │            │                               │ │ Mình muốn đặt Áo     │ │
│ Size  S  [M]  ~L~        │            │                               │ │ khoác zip, Nâu, M,   │ │
│ Chất liệu, form, giặt    │            │                               │ │ 590.000 ₫ …          │ │
│ Bảng size                │            │                               │ └──────────────────────┘ │
│ Cách đặt hàng            │            │                               │ [ Đặt qua Telegram ]     │
├──────────────────────────┤            │                               │ ( Đặt qua Zalo )         │
│ “Mình muốn đặt … M …”    │            │                               │ + Thêm vào danh sách     │
│ [Telegram]  (Zalo)   (+) │            │                               │ Chất liệu · Form · Giặt  │
└──────────────────────────┘            └───────────────────────────────┴──────────────────────────┘
  sticky order bar                        sticky panel on the right
```

In the wireframes, `[ ]` is the one accent-filled button and `( )` a secondary one.

- Picking a colour shows that colour's photos first. Without JavaScript the colour and size are
  radio chips in a form, and the order buttons are submit buttons that redirect to the messenger
  with the message built on the server.
- The order bar's first line is the message itself, in a chat bubble, so the shopper sees exactly
  what will be sent.
- **Order on Telegram** opens `https://t.me/<username>?text=<message>`. **Order on Zalo** opens
  `https://zalo.me/<phone>`; with JavaScript it copies the message first and says "Đã chép tin
  nhắn. Dán vào Zalo." (Message copied. Paste it into Zalo.); without JavaScript the message is
  shown selectable above the link.
- Under the size chips, "Chưa biết size? Tính size" (not sure of your size? find it) opens the
  size calculator: height in cm and weight in kg, two number fields in a GET form. The server
  answers from this item's size ranges and selects that size. If height and weight point at
  different sizes, it names both and suggests the larger: "Size của bạn ở giữa S và M. Chọn M cho
  thoải mái." The numbers are kept for the visit. With JavaScript the answer and the size it
  picks appear in place, without a reload. An item whose sizes have no ranges shows no calculator.
- A photo opens full size in a lightbox: the arrow keys move between the item's photos, Escape
  closes it, and focus returns to the photo.
- The order bar carries the delivery line from point 6 above the buttons.
- With no size picked, the buttons stay enabled and the message says "size: chưa chọn" (size: not
  chosen), so a shopper can still ask.
- Sold out: the price is struck, the bar says "Hết hàng" (sold out) and offers "Hỏi khi có lại"
  (ask when it is back), which opens the same chat with a back-in-stock question.

### Order list (`/danh-sach`, `/en/list`)

Several items in one message. Rendered as the chat draft it is: each line an item with its photo,
colour, size and price, the total, and the two messenger buttons. Lines are removed with a button
per line. The list is a cookie (item, colour and size ids only), updated by form posts.

### FAQ (`/hoi-dap`, `/en/faq`)

How to order, payment, delivery, exchanges, sizing, as `<details>` entries edited in the admin
panel, with `FAQPage` structured data.

## Words

Vietnamese first, written as a friendly seller talks in chat ("Mình muốn đặt…", "bạn"), short.
English as a faithful translation. The order message template, in Vietnamese:

```text
Chào shop, mình muốn đặt:
• Áo khoác zip, màu Nâu, size M, 590.000 ₫
https://vi-shop.antonshubin.com/ao-khoac/ao-khoac-zip-nau
```

The delivery line and the size calculator, in English: "Same-day delivery in Da Nang if you order
before 16:00", "Not sure of your size? Find it", "Height (cm)", "Weight (kg)", "Your size: M",
"You are between S and M. M will be more comfortable." Pages that show the delivery line are not
cached past the minute, so the line never says "today" after 16:00.

## Keyboard and accessibility

- Every look is one link with the item's name as its accessible name; the price and sizes are
  read after it.
- Size and colour are native radio groups (`RadioChips`), so arrow keys move between them.
- The photo strip is a list of images with alt text from the admin panel; it never traps focus.
- A struck-through size also says "hết hàng" (sold out) to screen readers.
- Focus is visible on every control, in both palettes. Contrast meets WCAG AA, including text on
  top of photos, which sits on a scrim.

## How it was designed

The owner asked for this design in chat with the quota nearly spent, so the lead wrote this
spec alone instead of running the design skill's five roles. The `design-reviewer` gate still
runs on every PR that changes the website.
