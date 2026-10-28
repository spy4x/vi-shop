import { listRoute } from "../shop/order-pages.tsx"

const route = listRoute(`vi`)
export const handler = route.handler
export default route.component
