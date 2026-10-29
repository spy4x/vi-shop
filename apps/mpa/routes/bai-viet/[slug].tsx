import { blogPostRoute } from "../../shop/blog-pages.tsx"

const route = blogPostRoute()
export const handler = route.handler
export default route.component
