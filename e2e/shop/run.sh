#!/usr/bin/env bash
# Runs the storefront's browser tests (`e2e/shop/*.shop.ts`, `deno task e2e:shop`) on a catalog
# with items: starts the shop API stand-in (apps/mpa/lighthouse/shop-api.ts, the sample shop) on
# 48422 and the built MPA (`deno task mpa:build` first) on 48420, then runs Playwright. Needs no
# database. Arguments go to Playwright. CI runs this script (.woodpecker/ci.yml) in the
# `lighthouse` step, which builds the MPA; run it the same way on a machine, from the repository
# root, with a browser Playwright can start.
set -euo pipefail

[ -f apps/mpa/_fresh/server.js ] || { echo "no MPA build: run deno task mpa:build first"; exit 1; }

SCRATCH=$(mktemp -d)
PIDS=()
cleanup() {
  set +e
  for pid in "${PIDS[@]}"; do
    # `deno serve` does not exit on SIGTERM when it has open connections: stop it for good.
    kill -TERM "$pid" 2>/dev/null
    for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null || break; sleep 0.2; done
    kill -KILL "$pid" 2>/dev/null
  done
  find "$SCRATCH" -delete
}
trap cleanup EXIT INT TERM

wait_for() { # <name> <pid> <url>
  for _ in $(seq 1 120); do
    curl -fsS --max-time 2 -o /dev/null "$3" 2>/dev/null && return 0
    kill -0 "$2" 2>/dev/null || { echo "$1 stopped"; tail -n 40 "$SCRATCH/$1.log"; return 1; }
    sleep 0.5
  done
  echo "$1 did not answer at $3 within 60 s"
  tail -n 40 "$SCRATCH/$1.log"
  return 1
}

timeout 900 deno run --allow-net=127.0.0.1 --allow-read=apps/mpa/lighthouse/photos \
  apps/mpa/lighthouse/shop-api.ts 48422 >"$SCRATCH/api.log" 2>&1 &
PIDS+=($!)
wait_for api "${PIDS[-1]}" http://127.0.0.1:48422/api/catalog

# The website's own host is this address, so the order form's same-origin check holds.
ENV=dev DOMAIN=app.example.com MPA_DOMAIN=127.0.0.1:48420 API_URL=http://127.0.0.1:48422 \
  timeout 900 deno serve --allow-all --port 48420 --host 127.0.0.1 apps/mpa/_fresh/server.js \
  >"$SCRATCH/mpa.log" 2>&1 &
PIDS+=($!)
wait_for mpa "${PIDS[-1]}" http://127.0.0.1:48420/health

SHOP_BASE_URL=http://127.0.0.1:48420 timeout 600 deno run -A --node-modules-dir \
  npm:playwright@1.57.0 test --config=e2e/shop/playwright.config.ts "$@"
