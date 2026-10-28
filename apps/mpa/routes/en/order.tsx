import { orderRoute } from "../../shop/order-pages.tsx"

const route = orderRoute(`en`)
export const handler = route.handler
export default route.component
