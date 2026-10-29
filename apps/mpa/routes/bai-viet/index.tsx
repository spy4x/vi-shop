import { blogIndexRoute } from "../../shop/blog-pages.tsx"

const route = blogIndexRoute()
export const handler = route.handler
export default route.component
