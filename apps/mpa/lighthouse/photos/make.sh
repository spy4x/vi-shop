#!/usr/bin/env bash
# Draws the sample shop's placeholder photos (sample-shop.ts): for each photo, a 3:4 picture in its
# colour's swatch, lighter at the top, at every width the sample lists, as WebP. Run from the
# repository root after changing the sample's photos. Needs ImageMagick 7 (`magick`).
set -euo pipefail
HERE=apps/mpa/lighthouse/photos
deno eval --quiet '
  import { samplePhotoColours } from "./apps/mpa/lighthouse/sample-shop.ts"
  for (const { id, swatch } of samplePhotoColours()) console.log(id, swatch)
' | while read -r id swatch; do
  mkdir -p "$HERE/$id"
  for width in 480 960; do
    height=$((width * 4 / 3))
    magick -size "${width}x${height}" "gradient:${swatch}-${swatch}" \
      \( -size "${width}x${height}" gradient:'rgba(255,255,255,0.35)'-'rgba(255,255,255,0)' \) \
      -compose over -composite -quality 70 "$HERE/$id/$width.webp"
  done
done
