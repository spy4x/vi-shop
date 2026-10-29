# AGENTS.md — Vi shop

Vi shop is a clothes catalog built on [Seed](https://github.com/spy4x/seed). Shoppers browse the
public website and order by opening a chat with the shop on Telegram or Zalo; there is no cart
payment and no customer account. The shop's staff edit items and contact links in the admin panel.

Seed's `AGENTS.md` applies here (read it at
`https://github.com/spy4x/seed/blob/main/AGENTS.md`), except its sections "The live demo is not
production" and "Financy", which hold for the template only. This file adds what is specific to
the shop.

## What the shop is

- [docs/shop/spec.md](docs/shop/spec.md): the product, its scope, the data, SEO and AEO, and the
  order the work lands in.
- [docs/shop/design.md](docs/shop/design.md): the design direction, screens and wireframes.
- [docs/products.md](docs/products.md): how this repository takes Seed's later changes
  (`.seed/commit`, `.seed/skip`).

## Seed first

Vi shop is Seed's public case for a non-SaaS product. Anything another product built on Seed
could use (the catalog module, image processing, a website in two languages, contact links) is
built in Seed or in the shared libraries first, merged and released there, and arrives here with
a sync, as "Give back to Seed" in `docs/products.md` says. This repository keeps only what names
the shop: its brand, copy, categories, and the order-message wording.

## Apps that run

The website (`apps/mpa`), the admin panel (`apps/admin`), the API and the worker. The SPA, billing,
guest accounts and the public demo stay in the code, so syncs from Seed apply cleanly, but are off
in the env file: `BILLING_PROVIDER=off`, `GUEST_MODE=false`, `DEMO_MODE=false`, `SPA=false`. With
the SPA off, Compose runs no SPA container and the API refuses account routes outside the admin
host. In production `MPA_REDIRECT_RULE` also sends every request to the SPA's host (`DOMAIN`, `/api`
included) to the website (`infra/envs/.env.example` says why the rule is written that long).

The first operator is made on the server with `deno task operator:create <address>` (Seed's
`docs/deploy.md`).

## The storefront

The website is the storefront, in `apps/mpa`:

- `shop/`: the shop's own code. `catalog.ts` keeps a one-minute snapshot of the public catalog API
  and is server-only (it imports arktype through `@domain/catalog`). `parts.ts`, `order.ts`,
  `lang.ts`, `words.ts` and `order-actions.tsx` are what the item page's island loads, so they
  import no server code and only types from `@domain/catalog`.
- `islands/item-view.tsx`: the item page's photos, colour and size choice and order bar.
- Routes: Vietnamese at `/`, `/<category>`, `/<category>/<item>`, `/danh-sach` (the order list),
  `/dat-hang` (the order step), `/hoi-dap` (FAQ), and the Vietnamese-only blog (`/bai-viet`) and
  newsletter sign-up (`/nhan-tin`); English under `/en/` with `/en/list`, `/en/order` and
  `/en/faq`. `/anh/<photo id>/<file>` passes the catalog's photos through from the
  API, since the website's host does not route `/api`.
- `lighthouse/sample-shop.ts` and `lighthouse/photos/` are the sample shop that the Lighthouse run
  and the tests use; `lighthouse/shop-api.ts` serves it.
- Every page works without JavaScript: the order buttons are a form that redirects to Telegram or
  shows the Zalo message to copy, and the order list lives in a cookie.

## Languages

Vietnamese is the default language, English the second. Every page, label, item text and
structured-data string exists in both. Prices are in Vietnamese dong (VND), stored as an integer
number of dong.

## Product photos

The owner's photos never go into this repository: it is public. They are uploaded through the
admin panel. Sample items for development use generated placeholder images.

## Where it runs

`vi-shop.antonshubin.com` (website) and `admin.vi-shop.antonshubin.com` (admin), on Seed's server,
deployed the way Seed deploys itself (`docs/deploy.md`). Other projects run on that server and are
not ours to touch.
The production env file is committed encrypted as `infra/envs/.env.prod.age` (age64 per line);
`deno task env:decrypt` writes `infra/envs/.env.prod`, which `deno task deploy` reads.

## A chat message in Vietnamese

A chat message in Vietnamese comes from the shop's owner, a business person with no technical
background, not from the developer. This overrides the global "English only" for that reply.

- Reply in Vietnamese, also when the message has no diacritics ("cai gi day" is "what is this?").
- Talk business: customers, orders, sales, what shoppers see on the website and staff see in the
  admin panel, cost and time.
- Leave out code, git, PRs, file paths, frameworks, servers and deploys. When something technical
  matters, say what it means for the shop in plain words.
- Code, commits, PRs and issues stay in English. A chat message in English comes from the
  developer, as usual.
