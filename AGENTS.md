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
in the env file and not deployed.

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
