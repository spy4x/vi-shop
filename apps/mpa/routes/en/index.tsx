import { homeRoute } from "../../shop/list-pages.tsx"

const route = homeRoute(`en`)
export const handler = route.handler
export default route.component
