import { listRoute } from "../../shop/order-pages.tsx"

const route = listRoute(`en`)
export const handler = route.handler
export default route.component
