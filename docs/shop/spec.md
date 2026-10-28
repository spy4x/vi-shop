# Vi shop: product spec

Asked for by the owner, 2026-10-28: "Prepare a repo for the shop - a simple catalog MPA with "Open
Telegram/Zalo to make an order" links, admin panel to edit items, links. Seed-quality and reusable
stuff back to Seed and the libs". Later the same day: Vietnamese (default) and English, prices in
VND, the name "Vi shop" for now, deployed to `vi-shop.antonshubin.com`, a public repository as a
case for Seed, SEO and AEO from the beginning, and a bold, modern design that rethinks how clothes
catalogs look and work. Later still, the shop's three strengths: high quality at a high price,
so not everyone buys; same-day delivery in Da Nang for orders placed before 16:00; and a size
calculator that turns height and weight into the size to pick.

## Problem

A small clothes seller in Vietnam takes orders in chats today. Shoppers see items as loose photos
in a messenger, ask "còn size M không?" (is there a size M?) one by one, and the seller answers the
same questions all day. Nothing can be found in Google or quoted by an AI assistant.

## Who uses it

- **The shopper**, on a phone, often arriving from a link in a chat, social post or search. Wants
  to see the clothes on a person, know the price and whether their size exists, and order without
  signing up.
- **The seller**, who adds items from their phone photos, sets prices and sizes, marks what sold
  out, and reads orders in Telegram and Zalo as before.

## Goal

A catalog website that shows the clothes at their best, answers the size and price questions
before they are asked, and turns a choice into a ready order message in the seller's chat. The
seller runs it from the admin panel without a developer.

## What sets the shop apart

- **Quality first, priced to match.** The price is high, so not everyone buys, and the site
  says why: close-up photos of fabric and seams, the material and how it is made, and no discount
  banners. A shopper who wants the cheapest option is not the audience.
- **Same-day delivery in Da Nang** for orders placed before 16:00 (Vietnam time). The site says it
  next to the order buttons, on the home page and in the FAQ, and the line changes to "tomorrow"
  after 16:00.
- **A size calculator.** The shopper enters height and weight and is told which size to pick, so
  "which size am I?" is answered before the chat.

## Non-goals

- No online payment, cart checkout, delivery tracking or customer accounts. The chat is the
  checkout; the seller confirms, takes payment and ships as they do now.
- No stock counts. Each colour and size of an item is either available or sold out.
- No reviews, no marketplace, no recommendations engine.
- The SPA, billing, guest accounts and the public demo from Seed are not used.

## What the shopper can do

1. Browse the newest looks on the home page, and the whole catalog by category.
2. Filter the catalog by size and colour, so only items available in their size show. The chosen
   size is kept for the visit.
3. Open an item: every photo, the price, the colours and sizes that are available, the material,
   fit and care, and a size table.
4. On an item page, enter their height and weight in the size calculator and see the size to
   pick, preselected in the size choice. The numbers are kept for the visit.
5. Pick a colour and size and press **Order on Telegram** or **Order on Zalo**. Telegram opens a
   chat with the shop and a ready message naming the item, colour, size, price and link. Zalo
   cannot pre-fill a message, so the page copies the same text and says "Paste it into the chat".
6. Collect several items in an **order list** and send them as one message. The list lives in a
   cookie in the shopper's browser, works without JavaScript, and needs no account.
7. Read the FAQ: how ordering, payment, delivery, exchanges and sizing work.
8. Switch between Vietnamese and English on any page, landing on the same page in the other
   language.

## What the seller can do (admin panel)

1. Add an item: name and description in both languages, price in VND, category, colours, sizes
   with the height and weight range each fits, material, fit and care, and photos straight from
   a phone (JPEG, PNG and iPhone HEIC).
2. Order the photos, pick the cover, and mark which colour a photo shows.
3. Mark any colour and size of the item as sold out; hide or publish the item.
4. Manage categories, in both languages.
5. Set the shop's contact links: Telegram username, Zalo phone number, and any other channel
   (Instagram, Facebook, phone). The order buttons and the footer use them.
6. Edit the FAQ entries, in both languages.

## Data

Every id is a UUID version 7. Text a shopper reads is stored in both languages.

| Record       | Holds                                                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Category     | slug, name (vi, en), position                                                                                                                                     |
| Item         | slug, name (vi, en), description (vi, en), material, fit and care (vi, en), price in dong (integer), category, status (draft, published, hidden), published time |
| Colour       | item, name (vi, en), swatch hex                                                                                                                                      |
| Size         | item, label (`S`, `M`, `L`, `Free size`), position, optional height range (cm) and weight range (kg) for the size calculator                                       |
| Sold out     | item, colour, size: one row per combination that is sold out                                                                                                    |
| Photo        | item, optional colour, position, alt text (vi, en), the processed image variants                                                                                  |
| Contact link | kind (telegram, zalo, instagram, facebook, phone, e-mail), value, position                                                                                        |
| FAQ entry    | question and answer (vi, en), position                                                                                                                            |

Photos are processed by the worker after upload (the browser uploads straight to the file
store), and catalog photos get a public read path, since the file store signs downloads for group
members only: metadata is stripped (iPhone photos carry the GPS location of where they were taken), HEIC is converted, and each photo is stored in a few widths as AVIF and
WebP for `srcset`.

## SEO and AEO

From the first deploy:

- **Server-rendered pages that work without JavaScript**, as every Seed website page does.
- **Two languages with their own URLs:** Vietnamese at `/`, English at `/en/`, `hreflang` between
  them and `x-default` to Vietnamese. Slugs are Vietnamese without diacritics
  (`/ao-khoac/ao-khoac-zip-nau`), the same item and category slug under `/en/`. Fixed pages have their own English paths (`/en/list`, `/en/faq`).
- **Structured data:** `ClothingStore` with social profiles as `sameAs` and the Zalo number as `telephone`; on each item `Product`
  with `Offer` (`priceCurrency: VND`, availability from the sold-out colour and size pairs), `color`, `size`,
  `material` and every image; `BreadcrumbList`; `ItemList` on category pages; `FAQPage` on the
  FAQ.
- **Sitemap with images and both languages**, `robots.txt`, `llms.txt` listing every published
  item with its price and sizes, and the RSS of new items.
- **IndexNow** ping when an item is published or changes price or availability.
- **Answers an assistant can quote:** every item page has a short factual block (price, sizes,
  material, fit, how to order) in plain sentences, and the FAQ answers in one or two sentences
  each.
- **Speed:** the first photo is preloaded and sized; other photos lazy-load from `srcset`.
  Lighthouse mobile at least 95 for performance and 100 for the rest, checked in CI as in Seed.
- **Open Graph:** each item's cover photo is its share image, so a link pasted into Zalo,
  Telegram or Facebook shows the item.

## Done when

- [ ] A shopper on a 390 px phone can find an item in their size, open it, and send an order
      message to the shop on Telegram, and copy it for Zalo, in either language.
- [ ] The seller can add an item from iPhone photos, set its price and sizes, publish it, and see
      it on the website, without a developer.
- [ ] Every page passes the Lighthouse budget, and each item page passes Google's Rich Results
      test as a product.
- [ ] The website runs at `vi-shop.antonshubin.com` and the admin panel at
      `admin.vi-shop.antonshubin.com`.
- [ ] The reusable parts are merged and released in Seed and the shared libraries, and this
      repository takes them with a sync.

## The order the work lands in

Reusable work is done in Seed and the libraries first; the shop takes it with a sync.

| #   | Where                                                    | What                                                                                     |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | vi-shop                                                  | Product setup: brand, Seed's own site removed, apps switched off, CI, deploy, domain.    |
| 2   | Seed                                                     | Image processing for uploads: metadata stripped, HEIC converted, AVIF and WebP widths.   |
| 3   | Seed ([#276](https://github.com/spy4x/seed/issues/276)) | The website in several languages, with a per-product default (Vietnamese at `/`, English at `/en/`).                                  |
| 4   | Seed                                                     | Contact links: a site setting edited in the admin panel.                                 |
| 5   | preact-components                                        | Storefront patterns in the design language: the look tile, colour swatches, order bar.   |
| 6   | Seed                                                     | Catalog module: categories, items, colours, sizes with height and weight ranges, photos; admin screens; public pages. |
| 7   | vi-shop                                                  | The storefront: the shop's design, order messages, order list, FAQ, SEO and AEO, the size calculator, the delivery line. |
| 8   | vi-shop                                                  | The first catalog: the eight items of the first photo session, with prices from the owner. |

Steps 2 to 5 can run side by side; 6 needs 2 and 4; 7 needs 1, 3, 5 and 6.
