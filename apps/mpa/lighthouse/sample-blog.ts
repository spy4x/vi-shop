import type { PublicBlogFeedItem, PublicBlogPost, PublicBlogPostSummary } from "@domain/blog"
import { DEFAULT_LANGUAGE } from "@domain/identity"

/**
 * The sample blog for the Lighthouse run, the browser tests and local screenshots: three
 * Vietnamese posts in two topics, stored under Seed's main language code as the shop's posts are.
 * The first links two sample items (sample-shop.ts) and has a sample photo as its cover; the other
 * two have no cover. Written for this sample, never the owner's text or photos.
 *
 * @module
 */

/** A sample post, published `days` days before 2026-10-28. */
function post(
  input: Omit<PublicBlogPost, `language` | `publishedAt` | `translations` | `headings`> & {
    days: number
  },
): PublicBlogPost {
  const { days, ...rest } = input
  return {
    ...rest,
    language: DEFAULT_LANGUAGE,
    publishedAt: new Date(Date.UTC(2026, 9, 28) - days * 86_400_000).toISOString(),
    translations: [],
    headings: [],
  }
}

/** The sample posts, newest first. */
export const SAMPLE_POSTS: PublicBlogPost[] = [
  post({
    slug: `chon-size-ao-khoac`,
    title: `Chọn size áo khoác zip cho buổi chạy sáng`,
    seoTitle: null,
    description: `Cách đo vai và ngực để chọn đúng size áo khoác zip, và vì sao form vừa hợp ` +
      `với buổi chạy sáng sớm.`,
    topic: `Chọn size`,
    updatedAt: null,
    readingMinutes: 4,
    tldr: [
      `Đo vòng ngực khi thở bình thường, không hóp bụng.`,
      `Giữa hai size, chọn size lớn hơn nếu bạn mặc thêm áo bên trong.`,
    ],
    coverUrl: `/anh/019a3000-0000-7000-8000-003000000001/960.webp`,
    coverAlt: `Áo khoác zip màu nâu`,
    html: `<p>Áo khoác cho buổi chạy sáng cần vừa vặn: rộng quá thì bay gió, chật quá thì khó ` +
      `cử động.</p><h2 id="do-size">Đo thế nào</h2><p>Đo vòng ngực khi thở bình thường. Rồi ` +
      `so với bảng size của <a href="/ao-khoac/ao-khoac-zip-nau">áo khoác zip</a>.</p>` +
      `<p>Đi cùng <a href="https://shop.example.com/quan/quan-short-chay-bo">quần short chạy ` +
      `bộ</a> là đủ cho một buổi sáng mát. Xem lại <a href="/ao-khoac/ao-khoac-zip-nau">áo ` +
      `khoác zip</a> trước khi đặt.</p>`,
    authorName: null,
    days: 0,
  }),
  post({
    slug: `vai-du-hai-lop`,
    title: `Vải dù hai lớp: vì sao chắn gió mà vẫn thoáng`,
    seoTitle: null,
    description: `Lớp ngoài chắn gió, lớp trong thoát mồ hôi: chất liệu của áo khoác zip.`,
    topic: `Chất liệu`,
    updatedAt: null,
    readingMinutes: 3,
    tldr: [`Lớp ngoài chắn gió.`, `Lớp trong thoát mồ hôi.`],
    coverUrl: null,
    coverAlt: null,
    html: `<p>Vải dù hai lớp giữ ấm khi trời gió mà không bí.</p>`,
    authorName: null,
    days: 3,
  }),
  post({
    slug: `giat-do-tap`,
    title: `Giặt đồ tập thế nào cho bền màu`,
    seoTitle: null,
    description: `Nước lạnh, lộn trái, không sấy nóng: ba thói quen giữ màu đồ tập.`,
    topic: `Chất liệu`,
    updatedAt: `2026-10-27T00:00:00.000Z`,
    readingMinutes: 2,
    tldr: [],
    coverUrl: null,
    coverAlt: null,
    html: `<p>Giặt máy nước lạnh, lộn trái. Không sấy nóng.</p>`,
    authorName: null,
    days: 6,
  }),
]

/** A post as the API's list of posts answers it. */
export function postSummary(post: PublicBlogPost): PublicBlogPostSummary {
  const { slug, language, title, description, topic, publishedAt, updatedAt, readingMinutes } = post
  return { slug, language, title, description, topic, publishedAt, updatedAt, readingMinutes }
}

/** A post as the API's feed answers it. */
export function postFeedItem(post: PublicBlogPost): PublicBlogFeedItem {
  return { ...postSummary(post), html: post.html, coverUrl: post.coverUrl, authorName: null }
}
