import type { JSX } from "preact"
import { DEFAULT_SUBSCRIBER_LIST } from "@domain/subscribers"
import { Button } from "@spy4x/preact-ui/button"
import { Field } from "@spy4x/preact-ui/field"
import { Input } from "@spy4x/preact-ui/input"
import { NEWS_PATHS } from "./lang.ts"
import { NEWS_WORDS } from "./words.ts"

/** What a page hands {@link SignupForm}. */
export interface SignupFormProps {
  /**
   * Where it sits: the footer's aside, the band at the end of a post, or the sign-up page itself,
   * whose heading is the page's `h1`.
   */
  variant: `footer` | `band` | `page`
  /** The address typed, kept after a refusal. */
  email?: string
  /** The field's error: tied to the field, and the field takes focus. */
  fieldError?: string | null
  /** An error the API tied to no field, under the form; it takes focus. */
  formError?: string | null
}

/**
 * The newsletter's sign-up (issue #16): a heading, what the shop sends and how often, the address
 * and a secondary button, since the accent fill stays for ordering. A plain `<form method="post">`
 * to `/nhan-tin`, which draws every outcome on the server, so it works without JavaScript. One per
 * page: a page that shows it in its content leaves it out of the footer (`ShopFrame`'s `signup`).
 */
export function SignupForm(
  { variant, email = ``, fieldError = null, formError = null }: SignupFormProps,
): JSX.Element {
  const Heading = variant === `page` ? `h1` : `h2`
  return (
    <section
      aria-labelledby="signup-heading"
      class={variant === `band`
        ? `grid gap-6 rounded-primary bg-surface p-6 sm:p-8 lg:grid-cols-2 lg:gap-12`
        : `flex flex-col gap-4`}
      data-e2e="signup"
    >
      <div class="flex flex-col gap-2">
        <Heading
          id="signup-heading"
          class={variant === `page`
            ? `text-4xl font-extrabold leading-tight tracking-tighter text-balance`
            : `text-xl font-semibold tracking-tight text-balance`}
        >
          {NEWS_WORDS.signupHeading}
        </Heading>
        <p class={`text-pretty ${variant === `footer` ? `text-sm text-muted` : `text-muted`}`}>
          {NEWS_WORDS.signupValue}
        </p>
      </div>
      <form
        method="post"
        action={NEWS_PATHS.signup}
        class="flex flex-col gap-4"
        data-e2e="signup-form"
      >
        <input type="hidden" name="list" value={DEFAULT_SUBSCRIBER_LIST} />
        <Field
          id="signup-email"
          label={NEWS_WORDS.email}
          error={fieldError}
          hint={NEWS_WORDS.hint}
          required
        >
          <Input
            name="email"
            type="email"
            autocomplete="email"
            inputMode="email"
            value={email}
            required
            autofocus={fieldError !== null}
            data-e2e="signup-email"
          />
        </Field>
        {formError && (
          <p
            class="text-sm text-danger outline-none"
            role="alert"
            tabIndex={-1}
            autofocus
            data-e2e="signup-error"
          >
            {formError}
          </p>
        )}
        <Button type="submit" variant="secondary" class="self-start" data-e2e="signup-submit">
          {NEWS_WORDS.submit}
        </Button>
      </form>
    </section>
  )
}
