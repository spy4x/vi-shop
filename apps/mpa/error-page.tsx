import { type FreshContext, HttpError } from "fresh"
import { Button } from "@spy4x/preact-ui/button"
import { SiteFrame } from "./site.tsx"
import type { State } from "./utils.ts"

/**
 * The page for an error no route handled, inside the site's frame: "Không tìm thấy trang" for the
 * 404 of an unknown address, "Đã có lỗi xảy ra" for anything else. `pageMiddleware` renders it, not
 * a `routes/_error.tsx`: Fresh would render that one outside every middleware, without the security
 * headers.
 *
 * A server error is logged with the request's method and path. The query is left out: it may hold
 * a token.
 */
export function renderErrorPage(ctx: FreshContext<State>, error: unknown): Promise<Response> {
  const status = error instanceof HttpError ? error.status : 500
  if (status >= 500) console.error(`${ctx.req.method} ${ctx.url.pathname} failed:`, error)
  const notFound = status === 404
  const title = notFound ? `Không tìm thấy trang` : `Đã có lỗi xảy ra`
  const description = notFound
    ? `Không có trang nào ở địa chỉ này. Có thể đường dẫn đã cũ.`
    : `Không thể hiển thị trang. Vui lòng thử lại sau một phút.`
  return Promise.resolve(ctx.render(
    <SiteFrame
      state={ctx.state}
      path={ctx.url.pathname}
      head={{ title, description, noindex: true }}
    >
      <section
        aria-labelledby="error-title"
        class="site-glow flex min-h-[60vh] items-center"
        data-e2e="error-page"
        data-analytics-view={notFound ? "not-found" : "error-page"}
      >
        <div class="mx-auto flex w-full max-w-md flex-col items-start gap-6 px-4 py-16">
          <p class="font-mono text-6xl font-semibold text-muted" aria-hidden="true">
            {notFound ? 404 : 500}
          </p>
          <h1 id="error-title" class="text-3xl font-semibold tracking-tight">{title}</h1>
          <p class="text-muted text-pretty">{description}</p>
          <div class="flex w-full flex-col gap-4 sm:flex-row">
            {!notFound && <Button href={ctx.url.pathname}>Thử lại</Button>}
            <Button href="/" variant={notFound ? "primary" : "outline"}>Về trang chủ</Button>
          </div>
        </div>
      </section>
    </SiteFrame>,
    { status },
  ))
}
