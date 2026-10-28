# Vi shop

[![CI](https://ci.antonshubin.com/api/badges/17/status.svg)](https://ci.antonshubin.com/repos/17)

A clothes catalog that looks like a fashion magazine and orders like a chat. Shoppers browse
looks, pick a size and colour, and send the order to the shop on Telegram or Zalo in one tap. The
shop edits its items in an admin panel. Vietnamese first, English too.

Built on [Seed](https://github.com/spy4x/seed), as Seed's first case outside SaaS: everything
another product could reuse goes back to Seed and the shared libraries.

**Status:** work in progress. The plan is in [docs/shop/spec.md](docs/shop/spec.md), the look in
[docs/shop/design.md](docs/shop/design.md), and the work in the
[open issues](https://github.com/spy4x/vi-shop/issues).

- Website: https://vi-shop.antonshubin.com
- Stack: Deno, Fresh, Preact, Postgres, Docker Compose, as in Seed.

## Develop

```sh
deno task init
deno task dev
```

The storefront reads the catalog from the API, so a fresh database shows an empty shop until
items are added in the admin panel. To see it with sample items and no API, run
`deno task lighthouse`, or start the sample API the way `apps/mpa/lighthouse/run.sh` does.

Seed's [development guide](docs/development.md) covers the rest.

## Licence

AGPL-3.0 ([LICENSE](LICENSE)). The code that came from Seed stays under its MIT licence
([LICENSES/MIT-Seed.txt](LICENSES/MIT-Seed.txt)).
