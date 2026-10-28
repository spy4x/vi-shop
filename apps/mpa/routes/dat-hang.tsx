import { orderRoute } from "../shop/order-pages.tsx"

const route = orderRoute(`vi`)
export const handler = route.handler
export default route.component
