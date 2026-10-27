<div align="center">

# Vi shop

**A small clothes shop's catalog: see the clothes, pick a colour and size, and order in Telegram
or Zalo. Vietnamese first, English too. Built on [Seed](https://github.com/spy4x/seed).**

[![CI](https://ci.antonshubin.com/api/badges/17/status.svg)](https://ci.antonshubin.com/repos/17)

[Website](https://vi-shop.antonshubin.com) · [Product spec](docs/shop/spec.md) ·
[Deploy](docs/deploy.md) · [All docs](docs/README.md)

</div>

The website is a placeholder until the storefront lands. The seller edits items, prices, sizes and
contact links in the admin panel; shoppers need no account and order in their own chat with the
shop.

## How it is built

This repository is a copy of [Seed](https://github.com/spy4x/seed), the SaaS starter, and takes
Seed's later changes as a patch ([docs/products.md](docs/products.md)). It uses Seed's public
website (`apps/mpa`), admin panel (`apps/admin`), API and worker. Seed's SPA, billing, guest
accounts and public demo are switched off in the env file ([AGENTS.md](AGENTS.md)).

## Development

```sh
deno task init   # the env file with generated secrets
deno task dev    # the development stack
deno task check  # format, lint, type check and unit tests
```

[docs/development.md](docs/development.md) has the rest.
