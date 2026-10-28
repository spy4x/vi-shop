import type { JSX } from "preact"
import type { PublicCatalogItem } from "@domain/catalog"
import { LookGrid } from "@spy4x/preact-ui/look-grid"
import { LookTile } from "@spy4x/preact-ui/look-tile"
import { RadioChips } from "@spy4x/preact-ui/radio-chips"
import { buttonClasses } from "@spy4x/preact-ui/button"
import { colourKey, text } from "./catalog.ts"
import { isSoldOut, photoVariants, sizeByLabel } from "./parts.ts"
import { itemPath, type Lang } from "./lang.ts"
import { formatPrice, WORDS } from "./words.ts"

/** A colour a category's filter offers: its key in the address and its name. */
export interface ColourChoice {
  key: string
  name: string
  swatch: string
}

/** What a list page hands {@link LookList}. */
export interface LookListProps {
  lang: Lang
  /** The page's own path: the filter form's action. */
  path: string
  /** The items that pass the filter, in order. */
  items: readonly PublicCatalogItem[]
  /** Every size label the page's items come in, for the size row. */
  sizes: readonly string[]
  /** The size the shopper filters by, or `""` for all. */
  size: string
  /** The colours to filter by, on a category page; none on the home page. */
  colours?: readonly ColourChoice[]
  /** The colour key the shopper filters by, or `""`. */
  colour?: string
  /** The list's accessible name. */
  label: string
}

/**
 * The size-first list of a home or category page: a "Your size" chip row (and, on a category
 * page, a colour row) in a `GET` form, then the looks. The filter works without JavaScript through
 * its "Filter" button; with JavaScript, `/shop.js` sends the form on every change and hides the
 * button. When nothing passes the filter, one line says so, with a link that clears it (`?size=`
 * also forgets the visit's size).
 */
export function LookList(
  { lang, path, items, sizes, size, colours = [], colour = ``, label }: LookListProps,
): JSX.Element {
  const words = WORDS[lang]
  return (
    <div class="flex flex-col gap-8">
      {sizes.length > 0 && (
        <form
          method="get"
          action={path}
          class="flex flex-wrap items-end gap-x-6 gap-y-4"
          data-autosubmit
          data-e2e="look-filter"
        >
          <RadioChips
            legend={words.yourSize}
            name="size"
            value={size}
            options={[
              { value: ``, label: words.allSizes },
              ...sizes.map((each) => ({ value: each, label: each })),
            ]}
          />
          {colours.length > 1 && (
            <RadioChips
              legend={words.colour}
              name="color"
              value={colour}
              options={[
                { value: ``, label: words.allColours },
                ...colours.map((each) => ({
                  value: each.key,
                  label: (
                    <span class="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        class="block size-3 rounded-full border border-strong"
                        style={{ backgroundColor: each.swatch }}
                      />
                      {each.name}
                    </span>
                  ),
                })),
              ]}
            />
          )}
          <button type="submit" class={buttonClasses(`outline`, `md`)} data-filter-submit>
            {words.filter}
          </button>
        </form>
      )}
      {items.length === 0
        ? (
          <p class="text-lg text-pretty" data-e2e="look-empty">
            {size ? words.noneInSize(size) : words.noneInFilter}{" "}
            <a
              href={`${path}?size=`}
              class="font-medium text-primary underline underline-offset-4"
            >
              {size ? words.seeAll : words.seeEverything}
            </a>
          </p>
        )
        : (
          <LookGrid label={label}>
            {items.map((item, index) => (
              <LookTile
                key={item.slug}
                href={itemPath(lang, item.categorySlug, item.slug)}
                name={text(item.name, lang)}
                price={formatPrice(item.price, lang)}
                photo={item.cover
                  ? { variants: photoVariants(item.cover), alt: text(item.cover.alt, lang) }
                  : PLACEHOLDER}
                sizes={item.sizes.map((each) => ({
                  label: each.label,
                  soldOut: isSoldOut(item, each, null),
                }))}
                chosenSize={size ? sizeByLabel(item, size)?.label : undefined}
                colors={item.colours.map((each) => ({
                  name: text(each.name, lang),
                  color: each.swatch,
                }))}
                soldOut={item.stock === `sold-out`}
                priority={index === 0}
                labels={words.tile}
              />
            ))}
          </LookGrid>
        )}
    </div>
  )
}

/** The photo of an item the seller has not photographed yet: a plain 3:4 card of the page colour. */
const PLACEHOLDER = {
  variants: [{ url: `/placeholder.svg`, width: 600, height: 800, type: `image/svg+xml` }],
  alt: ``,
}

/**
 * Whether `item` passes the filter: it comes in colour `colour` (a {@link colourKey}) when one is
 * set, and size `size` is left in it (in that colour, or in any) when a size is set.
 */
export function passesFilter(item: PublicCatalogItem, size: string, colour = ``): boolean {
  const picked = colour ? item.colours.find((each) => colourKey(each) === colour) : null
  if (picked === undefined) return false
  if (!size) return true
  const found = sizeByLabel(item, size)
  return found !== undefined && !isSoldOut(item, found, picked)
}
