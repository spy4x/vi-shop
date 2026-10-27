# AGENTS.md — Vi shop

Vi shop is a clothes catalog built on [Seed](https://github.com/spy4x/seed): a public website in
Vietnamese and English, and the admin panel where the seller edits items and contact links.
Shoppers order in Telegram or Zalo; the website takes no payments and has no customer accounts.

[Seed's `AGENTS.md`](https://github.com/spy4x/seed/blob/main/AGENTS.md) applies here, except its
sections "The live demo is not production" and "Financy". This file adds what is specific to the
shop.

## What the shop uses of Seed

- **On:** the public website (`apps/mpa`, Compose profile `mpa`), the admin panel (`apps/admin`,
  profile `admin`), the API and the worker behind them, and the file store (profile `files`).
- **Off, through the env file, never by deleting code:** billing (`BILLING_PROVIDER=off`), guest
  accounts (`GUEST_MODE=false`) and the public demo (`DEMO_MODE=false`). Seed has no switch for
  the SPA: in production `MPA_REDIRECT_RULE` sends every request to the SPA's host (`DOMAIN`) to
  the website instead, as `infra/envs/.env.example` says.
- **Gone from the website:** Seed's own pages (features, pricing, compare, admin, the API
  reference, the blog and the newsletter pages). `.seed/skip` lists every Seed path the shop
  deleted or replaced.

## Production

- Website: `https://vi-shop.antonshubin.com`. Admin panel: `https://admin.vi-shop.antonshubin.com`.
- The server is the one Seed's own demo runs on, shared with other projects, under `PROJECT=vi-shop`.
  `deno task deploy` deploys it, as [docs/deploy.md](docs/deploy.md) says.
- The production env file is `infra/envs/.env.prod`, committed encrypted as `.env.prod.age`
  (`deno task env:decrypt`).

## Seed syncs

The shop takes Seed's later changes as a patch: [docs/products.md](docs/products.md). The Seed
commit it last took is in `.seed/commit`.

## Where the product is described

The product spec is `docs/shop/spec.md`.
