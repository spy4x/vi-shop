import { itemRoute } from "../../../shop/item-page.tsx"

const route = itemRoute(`en`)
export const handler = route.handler
export default route.component
